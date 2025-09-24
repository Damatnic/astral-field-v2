import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { OptimizedQueries } from '@/lib/db/optimized-queries';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = performance.now();

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
    // Use optimized query with caching
    const standings = await OptimizedQueries.getLeagueStandings(leagueId);
    
    if (!standings) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Add cache headers for client-side caching
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('X-Cache-Status', 'OPTIMIZED');

    // Record performance
    const endTime = performance.now();
    performanceMonitor.recordApiResponse(
      '/api/leagues/[leagueId]/standings/optimized',
      endTime - startTime,
      200
    );

    return res.status(200).json({
      standings,
      cached: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching optimized standings:', error);
    
    // Record error performance
    const endTime = performance.now();
    performanceMonitor.recordApiResponse(
      '/api/leagues/[leagueId]/standings/optimized',
      endTime - startTime,
      500
    );

    return res.status(500).json({ error: 'Failed to fetch standings' });
  }
}