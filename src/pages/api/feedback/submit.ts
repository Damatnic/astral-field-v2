import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { feedbackService } from '@/lib/feedback/feedback-service';
import { rateLimit } from '@/lib/utils/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

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

  // Rate limiting
  try {
    await limiter.check(res, 5, session.user.id); // 5 submissions per minute per user
  } catch {
    return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
  }

  try {
    const {
      type,
      category,
      title,
      description,
      priority,
      steps,
      expectedBehavior,
      actualBehavior,
      browserInfo,
      pageUrl,
      screenshot,
      rating
    } = req.body;

    // Validation
    if (!type || !category || !title || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, category, title, description' 
      });
    }

    const validTypes = ['bug', 'feature_request', 'general', 'ui_ux', 'performance'];
    const validCategories = ['draft', 'trades', 'scoring', 'mobile', 'general', 'performance'];
    const validPriorities = ['low', 'medium', 'high', 'critical'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Submit feedback
    const feedbackId = await feedbackService.submitFeedback({
      userId: session.user.id,
      type,
      category,
      title: title.trim(),
      description: description.trim(),
      priority: priority || 'medium',
      steps: steps?.trim(),
      expectedBehavior: expectedBehavior?.trim(),
      actualBehavior: actualBehavior?.trim(),
      browserInfo,
      pageUrl,
      screenshot,
      rating
    });

    return res.status(201).json({
      success: true,
      feedbackId,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      error: 'Failed to submit feedback. Please try again.'
    });
  }
}