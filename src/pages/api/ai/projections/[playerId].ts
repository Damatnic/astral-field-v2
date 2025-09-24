import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { aiProjectionEngine } from '@/lib/ai/player-projections';
import { redis } from '@/lib/cache/redis-client';

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

  const { playerId } = req.query;
  const { week, season = new Date().getFullYear().toString() } = req.query;

  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Player ID required' });
  }

  if (!week || typeof week !== 'string') {
    return res.status(400).json({ error: 'Week number required' });
  }

  const weekNum = parseInt(week, 10);
  const seasonNum = parseInt(season as string, 10);

  if (isNaN(weekNum) || weekNum < 1 || weekNum > 18) {
    return res.status(400).json({ error: 'Invalid week number (1-18)' });
  }

  if (isNaN(seasonNum) || seasonNum < 2020 || seasonNum > 2030) {
    return res.status(400).json({ error: 'Invalid season year' });
  }

  try {
    const projection = await aiProjectionEngine.generateProjections(
      playerId,
      weekNum,
      seasonNum
    );

    return res.status(200).json({
      success: true,
      projection,
      generated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating AI projection:', error);
    return res.status(500).json({
      error: 'Failed to generate projection',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}