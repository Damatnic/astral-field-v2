import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { commissionerTools } from '@/lib/commissioner/commissioner-tools';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { leagueId } = req.query;
  if (!leagueId || typeof leagueId !== 'string') {
    return res.status(400).json({ error: 'Invalid league ID' });
  }

  try {
    const {
      leagueName,
      rosterSize,
      pickTimeLimit,
      tradeDeadlineWeek,
      waiverType,
      waiverMode,
      scoringType,
      playoffWeeks,
      playoffTeams,
      isPublic
    } = req.body;

    await commissionerTools.updateLeagueSettings(
      leagueId,
      {
        leagueName,
        rosterSize,
        pickTimeLimit,
        tradeDeadlineWeek,
        waiverType,
        waiverMode,
        scoringType,
        playoffWeeks,
        playoffTeams,
        isPublic
      },
      session.user.id
    );

    return res.status(200).json({
      success: true,
      message: 'League settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating league settings:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to update league settings' 
    });
  }
}