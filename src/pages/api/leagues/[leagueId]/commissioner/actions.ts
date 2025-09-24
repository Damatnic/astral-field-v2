import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { commissionerTools } from '@/lib/commissioner/commissioner-tools';

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

  const { leagueId } = req.query;
  if (!leagueId || typeof leagueId !== 'string') {
    return res.status(400).json({ error: 'Invalid league ID' });
  }

  const { action } = req.body;

  try {
    switch (action) {
      case 'adjust_score':
        const { teamId, week, adjustment, reason, playerId } = req.body;
        await commissionerTools.adjustScore(
          leagueId,
          { teamId, week, adjustment, reason, playerId },
          session.user.id
        );
        return res.status(200).json({
          success: true,
          message: 'Score adjustment applied successfully'
        });

      case 'force_process_waivers':
        await commissionerTools.forceProcessWaivers(leagueId, session.user.id);
        return res.status(200).json({
          success: true,
          message: 'Waivers processed successfully'
        });

      case 'reset_draft_order':
        const { newOrder } = req.body;
        await commissionerTools.resetDraftOrder(leagueId, newOrder, session.user.id);
        return res.status(200).json({
          success: true,
          message: 'Draft order reset successfully'
        });

      case 'move_player':
        const { playerId: playerToMove, fromTeamId, toTeamId, reason: moveReason } = req.body;
        await commissionerTools.movePlayer(
          leagueId,
          playerToMove,
          fromTeamId,
          toTeamId,
          moveReason,
          session.user.id
        );
        return res.status(200).json({
          success: true,
          message: 'Player moved successfully'
        });

      case 'advance_week':
        await commissionerTools.advanceWeek(leagueId, session.user.id);
        return res.status(200).json({
          success: true,
          message: 'Week advanced successfully'
        });

      case 'toggle_roster_lock':
        const { teamId: teamToLock, locked } = req.body;
        await commissionerTools.toggleRosterLock(
          leagueId,
          teamToLock,
          locked,
          session.user.id
        );
        return res.status(200).json({
          success: true,
          message: `Roster ${locked ? 'locked' : 'unlocked'} successfully`
        });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error executing commissioner action:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to execute action' 
    });
  }
}