import { prisma } from '@/lib/db';
import { notificationService } from '@/lib/notifications/notification-service';

export interface FeedbackSubmission {
  userId: string;
  type: 'bug' | 'feature_request' | 'general' | 'ui_ux' | 'performance';
  category: 'draft' | 'trades' | 'scoring' | 'mobile' | 'general' | 'performance';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  steps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  browserInfo?: string;
  pageUrl?: string;
  screenshot?: string;
  rating?: number; // 1-5 stars for general feedback
}

export interface FeedbackResponse {
  id: string;
  respondedBy: string;
  response: string;
  status: 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  estimatedResolution?: Date;
}

export class FeedbackService {
  async submitFeedback(submission: FeedbackSubmission): Promise<string> {
    try {
      // Create feedback record
      const feedback = await prisma.feedback.create({
        data: {
          userId: submission.userId,
          type: submission.type,
          category: submission.category,
          title: submission.title,
          description: submission.description,
          priority: submission.priority,
          steps: submission.steps,
          expectedBehavior: submission.expectedBehavior,
          actualBehavior: submission.actualBehavior,
          browserInfo: submission.browserInfo,
          pageUrl: submission.pageUrl,
          screenshot: submission.screenshot,
          rating: submission.rating,
          status: 'open'
        }
      });

      // Auto-assign priority based on type and content
      const adjustedPriority = this.calculatePriority(submission);
      if (adjustedPriority !== submission.priority) {
        await prisma.feedback.update({
          where: { id: feedback.id },
          data: { priority: adjustedPriority }
        });
      }

      // Notify admins for high-priority feedback
      if (adjustedPriority === 'high' || adjustedPriority === 'critical') {
        await this.notifyAdminsOfHighPriorityFeedback(feedback.id, submission);
      }

      // Send confirmation to user
      await notificationService.sendNotification(
        [{ userId: submission.userId, method: 'push' }],
        {
          title: 'Feedback Received',
          body: `Thank you for your ${submission.type.replace('_', ' ')}. We'll review it soon.`,
          data: {
            feedbackId: feedback.id,
            type: 'feedback_confirmation'
          }
        },
        'feedback_confirmation'
      );

      return feedback.id;

    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }

  async getFeedbackById(id: string, userId?: string): Promise<any> {
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        responses: {
          include: {
            respondedByUser: {
              select: {
                name: true,
                isAdmin: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Only allow user to see their own feedback or admins to see all
    if (userId && feedback?.userId !== userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true }
      });

      if (!user?.isAdmin) {
        throw new Error('Unauthorized to view this feedback');
      }
    }

    return feedback;
  }

  async getUserFeedback(userId: string, limit = 50, offset = 0): Promise<any[]> {
    return await prisma.feedback.findMany({
      where: { userId },
      include: {
        responses: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            respondedByUser: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async respondToFeedback(
    feedbackId: string,
    response: Omit<FeedbackResponse, 'id'>,
    respondedBy: string
  ): Promise<void> {
    try {
      // Create response
      const feedbackResponse = await prisma.feedbackResponse.create({
        data: {
          feedbackId,
          respondedBy,
          response: response.response,
          status: response.status,
          estimatedResolution: response.estimatedResolution
        }
      });

      // Update feedback status
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: { 
          status: response.status === 'closed' ? 'closed' : 'in_progress',
          lastResponseAt: new Date()
        }
      });

      // Notify user of response
      const feedback = await prisma.feedback.findUnique({
        where: { id: feedbackId },
        select: { userId: true, title: true }
      });

      if (feedback) {
        await notificationService.sendNotification(
          [{ userId: feedback.userId, method: 'push' }],
          {
            title: 'Feedback Response',
            body: `We've responded to your feedback: "${feedback.title}"`,
            data: {
              feedbackId,
              type: 'feedback_response'
            }
          },
          'feedback_response'
        );
      }

    } catch (error) {
      console.error('Error responding to feedback:', error);
      throw new Error('Failed to respond to feedback');
    }
  }

  async getFeedbackAnalytics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<any> {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
    }

    const [
      totalFeedback,
      feedbackByType,
      feedbackByCategory,
      feedbackByPriority,
      feedbackByStatus,
      averageRating,
      responseTime
    ] = await Promise.all([
      prisma.feedback.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.feedback.groupBy({
        by: ['type'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      }),
      prisma.feedback.groupBy({
        by: ['category'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      }),
      prisma.feedback.groupBy({
        by: ['priority'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      }),
      prisma.feedback.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      }),
      prisma.feedback.aggregate({
        where: { 
          createdAt: { gte: startDate },
          rating: { not: null }
        },
        _avg: { rating: true }
      }),
      prisma.feedback.findMany({
        where: {
          createdAt: { gte: startDate },
          lastResponseAt: { not: null }
        },
        select: {
          createdAt: true,
          lastResponseAt: true
        }
      })
    ]);

    // Calculate average response time in hours
    const avgResponseTime = responseTime.length > 0
      ? responseTime.reduce((sum, feedback) => {
          if (feedback.lastResponseAt) {
            const diff = feedback.lastResponseAt.getTime() - feedback.createdAt.getTime();
            return sum + (diff / (1000 * 60 * 60)); // Convert to hours
          }
          return sum;
        }, 0) / responseTime.length
      : 0;

    return {
      total: totalFeedback,
      byType: Object.fromEntries(feedbackByType.map(item => [item.type, item._count.id])),
      byCategory: Object.fromEntries(feedbackByCategory.map(item => [item.category, item._count.id])),
      byPriority: Object.fromEntries(feedbackByPriority.map(item => [item.priority, item._count.id])),
      byStatus: Object.fromEntries(feedbackByStatus.map(item => [item.status, item._count.id])),
      averageRating: averageRating._avg.rating || 0,
      averageResponseTimeHours: Math.round(avgResponseTime * 10) / 10,
      timeRange
    };
  }

  private calculatePriority(submission: FeedbackSubmission): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;

    // Base score by type
    switch (submission.type) {
      case 'bug':
        score += 3;
        break;
      case 'performance':
        score += 2;
        break;
      case 'ui_ux':
        score += 1;
        break;
      case 'feature_request':
        score += 1;
        break;
      default:
        score += 1;
    }

    // Adjust by category
    if (submission.category === 'scoring') score += 2;
    if (submission.category === 'draft') score += 2;
    if (submission.category === 'trades') score += 1;

    // Look for critical keywords
    const criticalKeywords = ['crash', 'error', 'broken', 'not working', 'urgent'];
    const description = submission.description.toLowerCase();
    if (criticalKeywords.some(keyword => description.includes(keyword))) {
      score += 2;
    }

    // Rating influence (low rating = higher priority)
    if (submission.rating && submission.rating <= 2) {
      score += 2;
    } else if (submission.rating && submission.rating <= 3) {
      score += 1;
    }

    // Convert score to priority
    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private async notifyAdminsOfHighPriorityFeedback(
    feedbackId: string,
    submission: FeedbackSubmission
  ): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true }
    });

    const targets = admins.map(admin => ({ userId: admin.id, method: 'push' as const }));

    await notificationService.sendNotification(
      targets,
      {
        title: `${submission.priority.toUpperCase()} Priority Feedback`,
        body: `${submission.type}: ${submission.title}`,
        data: {
          feedbackId,
          priority: submission.priority,
          type: 'admin_feedback_alert'
        }
      },
      'admin_feedback_alert',
      'high'
    );
  }
}

export const feedbackService = new FeedbackService();