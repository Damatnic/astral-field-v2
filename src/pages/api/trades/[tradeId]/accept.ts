import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { tradeProcessor } from '@/lib/trades/trade-processor';

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
  if (!tradeId || typeof tradeId !== 'string') {
    return res.status(400).json({ error: 'Invalid trade ID' });
  }

  try {
    const result = await tradeProcessor.acceptTrade(tradeId, session.user.id);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Trade accepted successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error accepting trade:', error);
    return res.status(500).json({ error: 'Failed to accept trade' });
  }
}