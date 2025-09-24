import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { feedbackService } from '@/lib/feedback/feedback-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid feedback ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const feedback = await feedbackService.getFeedbackById(id, session.user.id);
        if (!feedback) {
          return res.status(404).json({ error: 'Feedback not found' });
        }
        return res.status(200).json(feedback);

      case 'POST':
        // Respond to feedback (admin only)
        if (!session.user.isAdmin) {
          return res.status(403).json({ error: 'Admin access required' });
        }

        const { response, status, estimatedResolution } = req.body;
        if (!response || !status) {
          return res.status(400).json({ error: 'Response and status are required' });
        }

        const validStatuses = ['acknowledged', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }

        await feedbackService.respondToFeedback(
          id,
          {
            response: response.trim(),
            status,
            estimatedResolution: estimatedResolution ? new Date(estimatedResolution) : undefined
          },
          session.user.id
        );

        return res.status(200).json({
          success: true,
          message: 'Response added successfully'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling feedback request:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized to view this feedback') {
      return res.status(403).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}