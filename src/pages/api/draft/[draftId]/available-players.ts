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
  const { position, search, limit = '100', offset = '0' } = req.query;

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

    // Get all drafted player IDs
    const draftedPlayerIds = await prisma.draftPick.findMany({
      where: { draftId },
      select: { playerId: true }
    }).then(picks => picks.map(p => p.playerId));

    // Build where clause for available players
    const whereClause: any = {
      id: {
        notIn: draftedPlayerIds
      }
    };

    if (position && typeof position === 'string' && position !== 'ALL') {
      whereClause.position = position;
    }

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { team: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get available players
    const players = await prisma.player.findMany({
      where: whereClause,
      include: {
        stats: {
          where: {
            season: new Date().getFullYear(),
            week: 0 // Season projections
          }
        }
      },
      orderBy: [
        { adp: 'asc' },
        { projectedPoints: 'desc' }
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Get total count for pagination
    const totalCount = await prisma.player.count({
      where: whereClause
    });

    // Format players for response
    const formattedPlayers = players.map(player => ({
      id: player.id,
      name: player.name,
      position: player.position,
      team: player.team || 'FA',
      byeWeek: player.byeWeek || 0,
      adp: player.adp || 999,
      positionRank: player.positionRank || 999,
      projectedPoints: player.projectedPoints || 0,
      stats: player.stats[0] || null,
      imageUrl: player.imageUrl
    }));

    return res.status(200).json({
      players: formattedPlayers,
      totalCount,
      hasMore: parseInt(offset as string) + players.length < totalCount
    });
  } catch (error) {
    console.error('Error fetching available players:', error);
    return res.status(500).json({ error: 'Failed to fetch available players' });
  }
}