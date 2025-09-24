import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { tradeValueCalculator } from '@/lib/trades/trade-value-calculator';
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

  const {
    fromTeamId,
    toTeamId,
    givingPlayerIds,
    receivingPlayerIds,
    leagueId
  } = req.body;

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

    // Analyze the trade
    const analysis = await tradeValueCalculator.analyzeTrade(
      fromTeamId,
      toTeamId,
      givingPlayerIds,
      receivingPlayerIds,
      leagueId
    );

    // Get player details for UI
    const [givingPlayers, receivingPlayers] = await Promise.all([
      prisma.player.findMany({
        where: { id: { in: givingPlayerIds } },
        select: {
          id: true,
          name: true,
          position: true,
          team: true,
          imageUrl: true,
          projectedPoints: true,
          adp: true,
          positionRank: true
        }
      }),
      prisma.player.findMany({
        where: { id: { in: receivingPlayerIds } },
        select: {
          id: true,
          name: true,
          position: true,
          team: true,
          imageUrl: true,
          projectedPoints: true,
          adp: true,
          positionRank: true
        }
      })
    ]);

    return res.status(200).json({
      analysis,
      givingPlayers,
      receivingPlayers
    });
  } catch (error) {
    console.error('Error analyzing trade:', error);
    return res.status(500).json({ error: 'Failed to analyze trade' });
  }
}