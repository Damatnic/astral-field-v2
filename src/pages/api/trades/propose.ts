import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { tradeProcessor } from '@/lib/trades/trade-processor';
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
    message,
    leagueId
  } = req.body;

  try {
    // Verify user owns the from team
    const fromTeam = await prisma.team.findFirst({
      where: {
        id: fromTeamId,
        ownerId: session.user.id
      }
    });

    if (!fromTeam) {
      return res.status(403).json({ error: 'You do not own this team' });
    }

    // Analyze trade value
    const analysis = await tradeValueCalculator.analyzeTrade(
      fromTeamId,
      toTeamId,
      givingPlayerIds,
      receivingPlayerIds,
      leagueId
    );

    // Propose the trade
    const result = await tradeProcessor.proposeTrade(
      {
        fromTeamId,
        toTeamId,
        givingPlayerIds,
        receivingPlayerIds,
        message
      },
      leagueId,
      session.user.id
    );

    if (result.success) {
      return res.status(201).json({
        success: true,
        tradeId: result.tradeId,
        analysis
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        analysis
      });
    }
  } catch (error) {
    console.error('Error proposing trade:', error);
    return res.status(500).json({ error: 'Failed to propose trade' });
  }
}