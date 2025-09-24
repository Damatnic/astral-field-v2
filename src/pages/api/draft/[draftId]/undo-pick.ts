import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';
import { draftStateManager } from '@/lib/draft/draft-state';
import { broadcastToDraft } from '@/lib/socket/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { draftId } = req.query;
  if (!draftId || typeof draftId !== 'string') {
    return res.status(400).json({ error: 'Invalid draft ID' });
  }

  try {
    // Verify user is commissioner
    const draft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        league: {
          commissionerId: session.user.id
        }
      },
      include: {
        picks: {
          orderBy: {
            pickNumber: 'desc'
          },
          take: 1,
          include: {
            player: true,
            team: true
          }
        }
      }
    });

    if (!draft) {
      return res.status(403).json({ error: 'Only commissioner can undo picks' });
    }

    if (draft.status !== 'IN_PROGRESS' && draft.status !== 'PAUSED') {
      return res.status(400).json({ error: 'Cannot undo picks in current draft state' });
    }

    const lastPick = draft.picks[0];
    if (!lastPick) {
      return res.status(400).json({ error: 'No picks to undo' });
    }

    // Delete the last pick
    await prisma.draftPick.delete({
      where: { id: lastPick.id }
    });

    // Update draft state
    const newRound = lastPick.round;
    const newPick = lastPick.pickNumber;
    
    await prisma.draft.update({
      where: { id: draftId },
      data: {
        currentRound: newRound,
        currentPick: newPick
      }
    });

    // Reinitialize draft state to reflect the change
    await draftStateManager.initializeDraft(draftId);
    const state = draftStateManager.getState(draftId);

    // Broadcast the undo
    broadcastToDraft(draftId, 'draft:pickUndone', {
      undonePickId: lastPick.id,
      player: {
        id: lastPick.player.id,
        name: lastPick.player.name
      },
      team: {
        id: lastPick.team.id,
        name: lastPick.team.name
      },
      newState: state
    });

    return res.status(200).json({
      success: true,
      message: `Undid pick: ${lastPick.player.name} by ${lastPick.team.name}`,
      state
    });
  } catch (error) {
    console.error('Error undoing pick:', error);
    return res.status(500).json({ error: 'Failed to undo pick' });
  }
}