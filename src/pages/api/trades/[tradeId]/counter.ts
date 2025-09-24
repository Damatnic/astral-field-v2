import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { tradeProcessor } from '@/lib/trades/trade-processor';
import { tradeValueCalculator } from '@/lib/trades/trade-value-calculator';

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

  const { tradeId } = req.query;
  const {
    fromTeamId,
    toTeamId,
    givingPlayerIds,
    receivingPlayerIds,
    message
  } = req.body;

  if (!tradeId || typeof tradeId !== 'string') {
    return res.status(400).json({ error: 'Invalid trade ID' });
  }

  try {
    // Get original trade for league ID
    const originalTrade = await prisma.transaction.findUnique({
      where: { id: tradeId }
    });

    if (!originalTrade) {
      return res.status(404).json({ error: 'Original trade not found' });
    }

    // Analyze counter trade value
    const analysis = await tradeValueCalculator.analyzeTrade(
      fromTeamId,
      toTeamId,
      givingPlayerIds,
      receivingPlayerIds,
      originalTrade.leagueId
    );

    // Counter the trade
    const result = await tradeProcessor.counterTrade(
      tradeId,
      {
        fromTeamId,
        toTeamId,
        givingPlayerIds,
        receivingPlayerIds,
        message
      },
      session.user.id
    );

    if (result.success) {
      return res.status(201).json({
        success: true,
        tradeId: result.tradeId,
        analysis,
        message: 'Counter offer sent'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        analysis
      });
    }
  } catch (error) {
    console.error('Error countering trade:', error);
    return res.status(500).json({ error: 'Failed to counter trade' });
  }
}