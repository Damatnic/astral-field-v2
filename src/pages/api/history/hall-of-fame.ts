import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { leagueHistoryService } from '@/lib/history/league-history';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const leagueId = req.query.leagueId as string;
  
  if (!leagueId) {
    return res.status(400).json({ error: 'League ID required' });
  }

  if (req.method === 'GET') {
    try {
      const hallOfFame = await leagueHistoryService.getHallOfFame(leagueId);
      return res.status(200).json(hallOfFame);
    } catch (error) {
      console.error('Error fetching Hall of Fame:', error);
      return res.status(500).json({ error: 'Failed to fetch Hall of Fame' });
    }
  }

  if (req.method === 'POST') {
    try {
      if (req.body.action === 'nominate') {
        const { nomineeId, category, achievements, citation } = req.body;
        
        const nomination = await leagueHistoryService.nominateForHallOfFame(
          leagueId,
          nomineeId,
          category,
          achievements,
          citation
        );
        
        return res.status(200).json({
          success: true,
          nomination,
          message: 'Nomination submitted successfully'
        });
      }

      if (req.body.action === 'vote') {
        const { nominationId } = req.body;
        
        await leagueHistoryService.voteForHallOfFame(nominationId, session.user.id);
        
        return res.status(200).json({
          success: true,
          message: 'Vote submitted successfully'
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('Error processing Hall of Fame action:', error);
      return res.status(500).json({ error: 'Failed to process action' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}