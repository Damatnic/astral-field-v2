import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface FeedbackSubmission {
  type: 'bug' | 'feature_request' | 'general' | 'ui_ux' | 'performance';
  category: 'draft' | 'trades' | 'scoring' | 'mobile' | 'general' | 'performance';
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  steps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  rating?: number;
}

export interface Feedback {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  rating: number | null;
  createdAt: string;
  responses: Array<{
    id: string;
    response: string;
    status: string;
    createdAt: string;
    respondedByUser: {
      name: string;
    };
  }>;
}

export function useFeedback() {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = useCallback(async (submission: FeedbackSubmission): Promise<string | null> => {
    if (!session?.user) {
      setError('You must be logged in to submit feedback');
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...submission,
          browserInfo: navigator.userAgent,
          pageUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      return data.feedbackId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  const getUserFeedback = useCallback(async (limit = 50, offset = 0): Promise<Feedback[]> => {
    if (!session?.user) {
      throw new Error('You must be logged in to view feedback');
    }

    try {
      const response = await fetch(`/api/feedback/user?limit=${limit}&offset=${offset}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch feedback');
      }

      return data.feedback;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feedback';
      setError(errorMessage);
      return [];
    }
  }, [session]);

  const getFeedbackById = useCallback(async (id: string): Promise<Feedback | null> => {
    if (!session?.user) {
      throw new Error('You must be logged in to view feedback');
    }

    try {
      const response = await fetch(`/api/feedback/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch feedback');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feedback';
      setError(errorMessage);
      return null;
    }
  }, [session]);

  const respondToFeedback = useCallback(async (
    feedbackId: string,
    response: string,
    status: 'acknowledged' | 'in_progress' | 'resolved' | 'closed',
    estimatedResolution?: Date
  ): Promise<boolean> => {
    if (!session?.user?.isAdmin) {
      setError('Admin access required');
      return false;
    }

    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response,
          status,
          estimatedResolution: estimatedResolution?.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to respond to feedback');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to respond to feedback';
      setError(errorMessage);
      return false;
    }
  }, [session]);

  return {
    submitFeedback,
    getUserFeedback,
    getFeedbackById,
    respondToFeedback,
    isSubmitting,
    error,
    setError,
    canRespondToFeedback: session?.user?.isAdmin || false,
  };
}

// Quick feedback trigger for common scenarios
export function useFeedbackTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackSubmission['type']>('general');

  const triggerFeedback = useCallback((type: FeedbackSubmission['type'] = 'general') => {
    setFeedbackType(type);
    setIsOpen(true);
  }, []);

  const triggerBugReport = useCallback(() => triggerFeedback('bug'), [triggerFeedback]);
  const triggerFeatureRequest = useCallback(() => triggerFeedback('feature_request'), [triggerFeedback]);
  const triggerUIFeedback = useCallback(() => triggerFeedback('ui_ux'), [triggerFeedback]);

  return {
    isOpen,
    setIsOpen,
    feedbackType,
    triggerFeedback,
    triggerBugReport,
    triggerFeatureRequest,
    triggerUIFeedback,
  };
}