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
        league: {
          include: {
            teams: true
          }
        }
      }
    });

    if (!draft) {
      return res.status(403).json({ error: 'Only commissioner can start the draft' });
    }

    if (draft.status !== 'WAITING') {
      return res.status(400).json({ error: 'Draft has already started' });
    }

    // Check if we have enough teams
    if (draft.league.teams.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 teams to start draft' });
    }

    // Randomize draft order if not set
    if (!draft.draftOrder || draft.draftOrder.length === 0) {
      const teamIds = draft.league.teams.map(t => t.id);
      const shuffledOrder = teamIds.sort(() => Math.random() - 0.5);
      
      await prisma.draft.update({
        where: { id: draftId },
        data: {
          draftOrder: shuffledOrder,
          status: 'IN_PROGRESS',
          startTime: new Date(),
          currentRound: 1,
          currentPick: 1
        }
      });

      // Update team draft positions
      for (let i = 0; i < shuffledOrder.length; i++) {
        await prisma.team.update({
          where: { id: shuffledOrder[i] },
          data: { draftPosition: i + 1 }
        });
      }
    } else {
      // Just update status
      await prisma.draft.update({
        where: { id: draftId },
        data: {
          status: 'IN_PROGRESS',
          startTime: new Date(),
          currentRound: 1,
          currentPick: 1
        }
      });
    }

    // Initialize draft state
    const state = await draftStateManager.initializeDraft(draftId);

    // Broadcast draft started
    broadcastToDraft(draftId, 'draft:started', {
      draftOrder: draft.draftOrder,
      state
    });

    return res.status(200).json({
      success: true,
      message: 'Draft started successfully',
      state
    });
  } catch (error) {
    console.error('Error starting draft:', error);
    return res.status(500).json({ error: 'Failed to start draft' });
  }
}