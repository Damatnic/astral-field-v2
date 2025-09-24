import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { notificationService } from '@/lib/notifications/notification-service';

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

  try {
    await notificationService.unsubscribeFromPush(session.user.id);

    return res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return res.status(500).json({
      error: 'Failed to unsubscribe from push notifications'
    });
  }
}