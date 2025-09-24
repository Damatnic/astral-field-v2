import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { liveScoreProcessor } from '@/lib/scoring/live-score-processor';
import { prisma } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { leagueId } = req.query;
  const { week } = req.query;

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

    switch (req.method) {
      case 'GET':
        // Get live scores
        const targetWeek = week ? parseInt(week as string) : undefined;
        const scores = await liveScoreProcessor.getLiveScores(leagueId, targetWeek);
        return res.status(200).json(scores);

      case 'POST':
        // Start live scoring
        await liveScoreProcessor.startLiveScoring(leagueId);
        return res.status(200).json({ 
          success: true, 
          message: 'Live scoring started' 
        });

      case 'DELETE':
        // Stop live scoring
        liveScoreProcessor.stopLiveScoring(leagueId);
        return res.status(200).json({ 
          success: true, 
          message: 'Live scoring stopped' 
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling live scores:', error);
    return res.status(500).json({ error: 'Failed to process live scores' });
  }
}