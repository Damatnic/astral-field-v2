import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { notificationService } from '@/lib/notifications/notification-service';

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
    const { limit = '20' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }

    const notifications = await notificationService.getNotificationHistory(
      session.user.id,
      limitNum
    );

    return res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return res.status(500).json({
      error: 'Failed to fetch notification history'
    });
  }
}