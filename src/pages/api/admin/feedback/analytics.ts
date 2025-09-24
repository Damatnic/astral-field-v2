import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { feedbackService } from '@/lib/feedback/feedback-service';
import { redis } from '@/lib/cache/redis-client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { timeRange = '30d' } = req.query;
    
    const validTimeRanges = ['7d', '30d', '90d'];
    if (!validTimeRanges.includes(timeRange as string)) {
      return res.status(400).json({ 
        error: 'Invalid time range. Must be one of: 7d, 30d, 90d' 
      });
    }

    // Check cache first
    const cacheKey = `admin:feedback:analytics:${timeRange}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const analytics = await feedbackService.getFeedbackAnalytics(timeRange as '7d' | '30d' | '90d');

    // Cache for different durations based on time range
    let cacheDuration = 300; // 5 minutes default
    if (timeRange === '7d') cacheDuration = 180;   // 3 minutes for recent data
    else if (timeRange === '30d') cacheDuration = 300; // 5 minutes
    else cacheDuration = 600; // 10 minutes for longer periods

    await redis.setex(cacheKey, cacheDuration, JSON.stringify(analytics));

    return res.status(200).json(analytics);

  } catch (error) {
    console.error('Error fetching feedback analytics:', error);
    return res.status(500).json({
      error: 'Failed to fetch feedback analytics'
    });
  }
}