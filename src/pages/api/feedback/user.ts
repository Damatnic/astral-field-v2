import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { feedbackService } from '@/lib/feedback/feedback-service';

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

  try {
    const { limit = '50', offset = '0' } = req.query;
    
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    if (isNaN(limitNum) || isNaN(offsetNum) || limitNum < 1 || limitNum > 100 || offsetNum < 0) {
      return res.status(400).json({ 
        error: 'Invalid limit or offset. Limit must be 1-100, offset must be >= 0.' 
      });
    }

    const feedback = await feedbackService.getUserFeedback(
      session.user.id,
      limitNum,
      offsetNum
    );

    return res.status(200).json({
      feedback,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: feedback.length === limitNum
      }
    });

  } catch (error) {
    console.error('Error fetching user feedback:', error);
    return res.status(500).json({
      error: 'Failed to fetch feedback'
    });
  }
}