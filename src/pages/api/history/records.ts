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
      const category = req.query.category as string | undefined;
      const records = await leagueHistoryService.getLeagueRecords(leagueId, category);
      
      return res.status(200).json(records);
    } catch (error) {
      console.error('Error fetching league records:', error);
      return res.status(500).json({ error: 'Failed to fetch records' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { category, recordType, value, holder, context } = req.body;
      
      const newRecord = await leagueHistoryService.updateRecord(
        leagueId,
        category,
        recordType,
        value,
        holder,
        context
      );
      
      if (newRecord) {
        return res.status(200).json({
          success: true,
          record: newRecord,
          message: 'New record set!'
        });
      } else {
        return res.status(200).json({
          success: false,
          message: 'Not a new record'
        });
      }
    } catch (error) {
      console.error('Error updating record:', error);
      return res.status(500).json({ error: 'Failed to update record' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}