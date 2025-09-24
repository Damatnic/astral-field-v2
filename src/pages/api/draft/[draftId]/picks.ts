import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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
    // Verify user has access to this draft
    const draft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        league: {
          teams: {
            some: {
              ownerId: session.user.id
            }
          }
        }
      }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found or access denied' });
    }

    // Get all picks for this draft
    const picks = await prisma.draftPick.findMany({
      where: { draftId },
      include: {
        player: {
          include: {
            stats: {
              where: {
                season: new Date().getFullYear(),
                week: 0 // Season total
              }
            }
          }
        },
        team: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        pickNumber: 'asc'
      }
    });

    // Format picks for response
    const formattedPicks = picks.map(pick => ({
      id: pick.id,
      round: pick.round,
      pickNumber: pick.pickNumber,
      team: {
        id: pick.team.id,
        name: pick.team.name,
        owner: pick.team.owner.name || pick.team.owner.email
      },
      player: {
        id: pick.player.id,
        name: pick.player.name,
        position: pick.player.position,
        team: pick.player.team,
        byeWeek: pick.player.byeWeek,
        adp: pick.player.adp,
        projectedPoints: pick.player.projectedPoints,
        stats: pick.player.stats[0] || null
      },
      isAutoPick: pick.isAutoPick,
      pickTime: pick.pickTime
    }));

    return res.status(200).json({ picks: formattedPicks });
  } catch (error) {
    console.error('Error fetching draft picks:', error);
    return res.status(500).json({ error: 'Failed to fetch draft picks' });
  }
}