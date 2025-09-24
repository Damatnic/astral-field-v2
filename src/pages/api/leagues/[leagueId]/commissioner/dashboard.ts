import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { commissionerTools } from '@/lib/commissioner/commissioner-tools';

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

  const { leagueId } = req.query;
  if (!leagueId || typeof leagueId !== 'string') {
    return res.status(400).json({ error: 'Invalid league ID' });
  }

  try {
    // Verify commissioner access
    const isCommissioner = await commissionerTools.verifyCommissioner(leagueId, session.user.id);
    if (!isCommissioner) {
      return res.status(403).json({ error: 'Only commissioner can access this dashboard' });
    }

    // Get dashboard data
    const dashboardData = await commissionerTools.getCommissionerDashboard(leagueId);
    
    // Get recent commissioner actions
    const actionHistory = await commissionerTools.getActionHistory(leagueId, 10);

    return res.status(200).json({
      ...dashboardData,
      actionHistory
    });
  } catch (error) {
    console.error('Error fetching commissioner dashboard:', error);
    return res.status(500).json({ error: 'Failed to load commissioner dashboard' });
  }
}