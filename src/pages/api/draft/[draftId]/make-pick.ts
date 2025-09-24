import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';
import { draftStateManager } from '@/lib/draft/draft-state';

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
  const { playerId } = req.body;

  if (!draftId || typeof draftId !== 'string') {
    return res.status(400).json({ error: 'Invalid draft ID' });
  }

  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }

  try {
    // Get user's team in this draft
    const team = await prisma.team.findFirst({
      where: {
        ownerId: session.user.id,
        league: {
          drafts: {
            some: {
              id: draftId
            }
          }
        }
      }
    });

    if (!team) {
      return res.status(403).json({ error: 'You do not have a team in this draft' });
    }

    // Make the pick through the state manager
    const result = await draftStateManager.makePick(draftId, team.id, playerId, false);

    if (result.success) {
      return res.status(200).json({
        success: true,
        pick: result.pick,
        message: 'Pick made successfully'
      });
    } else {
      return res.status(400).json({
        error: result.error || 'Failed to make pick'
      });
    }
  } catch (error) {
    console.error('Error making pick:', error);
    return res.status(500).json({ error: 'Failed to make pick' });
  }
}