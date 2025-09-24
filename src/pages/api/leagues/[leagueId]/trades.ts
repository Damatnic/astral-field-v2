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

  const { leagueId } = req.query;
  const { status = 'all', teamId } = req.query;

  if (!leagueId || typeof leagueId !== 'string') {
    return res.status(400).json({ error: 'Invalid league ID' });
  }

  try {
    // Verify user has access to this league
    const team = await prisma.team.findFirst({
      where: {
        leagueId,
        ownerId: session.user.id
      }
    });

    if (!team) {
      return res.status(403).json({ error: 'You do not have access to this league' });
    }

    // Build query filters
    const where: any = {
      leagueId,
      type: 'trade'
    };

    if (status !== 'all') {
      where.status = status;
    }

    if (teamId) {
      where.OR = [
        { teamId },
        { relatedData: { path: ['toTeamId'], equals: teamId } }
      ];
    }

    // Get trades
    const trades = await prisma.transaction.findMany({
      where,
      include: {
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
        createdAt: 'desc'
      }
    });

    // Format trades for response
    const formattedTrades = await Promise.all(trades.map(async (trade) => {
      const relatedData = trade.relatedData as any;
      
      // Get receiving team
      const receivingTeam = await prisma.team.findUnique({
        where: { id: relatedData.toTeamId },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Get player details
      const [givingPlayers, receivingPlayers] = await Promise.all([
        prisma.player.findMany({
          where: { id: { in: trade.playerIds } },
          select: {
            id: true,
            name: true,
            position: true,
            team: true,
            imageUrl: true
          }
        }),
        prisma.player.findMany({
          where: { id: { in: relatedData.receivingPlayerIds || [] } },
          select: {
            id: true,
            name: true,
            position: true,
            team: true,
            imageUrl: true
          }
        })
      ]);

      return {
        id: trade.id,
        status: trade.status,
        createdAt: trade.createdAt,
        processedAt: trade.processedAt,
        expiresAt: relatedData.expiresAt,
        fromTeam: {
          id: trade.team.id,
          name: trade.team.name,
          owner: trade.team.owner.name || trade.team.owner.email
        },
        toTeam: receivingTeam ? {
          id: receivingTeam.id,
          name: receivingTeam.name,
          owner: receivingTeam.owner.name || receivingTeam.owner.email
        } : null,
        givingPlayers,
        receivingPlayers,
        message: relatedData.message,
        warnings: relatedData.warnings,
        isMyTrade: trade.team.ownerId === session.user.id,
        isForMe: receivingTeam?.ownerId === session.user.id
      };
    }));

    return res.status(200).json({ trades: formattedTrades });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return res.status(500).json({ error: 'Failed to fetch trades' });
  }
}