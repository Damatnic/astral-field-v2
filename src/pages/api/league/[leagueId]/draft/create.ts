import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';

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

  const { leagueId } = req.query;
  if (!leagueId || typeof leagueId !== 'string') {
    return res.status(400).json({ error: 'Invalid league ID' });
  }

  try {
    // Verify user is commissioner
    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        commissionerId: session.user.id
      },
      include: {
        teams: true,
        settings: true
      }
    });

    if (!league) {
      return res.status(403).json({ error: 'Only commissioner can create a draft' });
    }

    // Check if draft already exists
    const existingDraft = await prisma.draft.findFirst({
      where: {
        leagueId,
        status: {
          in: ['WAITING', 'IN_PROGRESS', 'PAUSED']
        }
      }
    });

    if (existingDraft) {
      return res.status(400).json({ error: 'An active draft already exists for this league' });
    }

    const {
      draftDate,
      draftType = 'SNAKE',
      pickTimeLimit = 90,
      draftOrder = null
    } = req.body;

    // Create the draft
    const draft = await prisma.draft.create({
      data: {
        leagueId,
        draftType,
        status: 'WAITING',
        scheduledTime: draftDate ? new Date(draftDate) : null,
        draftOrder: draftOrder || [],
        currentRound: 0,
        currentPick: 0
      }
    });

    // Update league settings if needed
    if (pickTimeLimit) {
      await prisma.league.update({
        where: { id: leagueId },
        data: {
          settings: {
            update: {
              pickTimeLimit
            }
          }
        }
      });
    }

    // If draft order is provided, update team positions
    if (draftOrder && Array.isArray(draftOrder)) {
      for (let i = 0; i < draftOrder.length; i++) {
        await prisma.team.update({
          where: { id: draftOrder[i] },
          data: { draftPosition: i + 1 }
        });
      }
    }

    return res.status(201).json({
      success: true,
      draft,
      message: 'Draft created successfully'
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    return res.status(500).json({ error: 'Failed to create draft' });
  }
}