import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { scoringScheduler } from '@/lib/scoring/scoring-scheduler';
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
  if (!leagueId || typeof leagueId !== 'string') {
    return res.status(400).json({ error: 'Invalid league ID' });
  }

  try {
    // Verify user is commissioner
    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        commissionerId: session.user.id
      }
    });

    if (!league) {
      return res.status(403).json({ error: 'Only commissioner can control scoring' });
    }

    switch (req.method) {
      case 'GET':
        // Get scoring status
        const isRunning = scoringScheduler.isScoringRunning(leagueId);
        return res.status(200).json({
          leagueId,
          isAutoScoringEnabled: isRunning,
          currentWeek: league.currentWeek
        });

      case 'POST':
        const { action } = req.body;
        
        switch (action) {
          case 'start_auto':
            await scoringScheduler.scheduleAutoScoring(leagueId);
            return res.status(200).json({
              success: true,
              message: 'Automatic scoring scheduled'
            });

          case 'stop_auto':
            scoringScheduler.stopAutoScoring(leagueId);
            return res.status(200).json({
              success: true,
              message: 'Automatic scoring stopped'
            });

          case 'start_manual':
            await scoringScheduler.startManualScoring(leagueId);
            return res.status(200).json({
              success: true,
              message: 'Live scoring started manually'
            });

          case 'stop_manual':
            await scoringScheduler.stopManualScoring(leagueId);
            return res.status(200).json({
              success: true,
              message: 'Live scoring stopped manually'
            });

          case 'finalize_week':
            // Manually finalize current week
            await scoringScheduler['finalizeWeekScores'](leagueId);
            return res.status(200).json({
              success: true,
              message: 'Week scores finalized'
            });

          default:
            return res.status(400).json({ error: 'Invalid action' });
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error controlling scoring:', error);
    return res.status(500).json({ error: 'Failed to control scoring' });
  }
}