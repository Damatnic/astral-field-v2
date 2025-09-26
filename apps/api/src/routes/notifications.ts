import { Router } from 'express'
import { validateRequest, validateLeagueAccess } from '../middleware/validation'
import { intelligentNotificationService } from '../services/intelligent-notifications'
import { logger } from '../server'
import { z } from 'zod'

const router = Router()

// Validation schemas
const getNotificationsSchema = z.object({
  query: z.object({
    limit: z.string().transform(Number).optional(),
    unreadOnly: z.string().transform(Boolean).optional(),
    types: z.string().optional().transform((str) => str ? str.split(',') : undefined)
  })
})

const markReadSchema = z.object({
  body: z.object({
    notificationId: z.string()
  })
})

const processActionSchema = z.object({
  body: z.object({
    notificationId: z.string(),
    actionId: z.string()
  })
})

const processLeagueNotificationsSchema = z.object({
  body: z.object({
    leagueId: z.string(),
    options: z.object({
      force: z.boolean().optional(),
      types: z.array(z.string()).optional()
    }).optional()
  })
})

// Get user notifications
router.get('/', 
  validateRequest(getNotificationsSchema),
  async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      const { limit, unreadOnly, types } = req.query

      logger.info('Fetching user notifications', {
        userId,
        limit,
        unreadOnly,
        types
      })

      const notifications = await intelligentNotificationService.getUserNotifications(
        userId,
        { limit, unreadOnly, types }
      )

      res.json({
        success: true,
        type: 'user_notifications',
        data: notifications,
        timestamp: new Date().toISOString(),
        metadata: {
          totalStored: notifications.stored.length,
          totalRealtime: notifications.realtime.length,
          total: notifications.total
        }
      })

    } catch (error) {
      logger.error('Failed to fetch user notifications', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
        timestamp: new Date().toISOString()
      })
    }
  }
)

// Mark notification as read
router.post('/mark-read',
  validateRequest(markReadSchema),
  async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      const { notificationId } = req.body

      logger.info('Marking notification as read', {
        userId,
        notificationId
      })

      const result = await intelligentNotificationService.markAsRead(notificationId, userId)

      res.json({
        success: true,
        type: 'mark_read',
        data: result,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Failed to mark notification as read', error)
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
        timestamp: new Date().toISOString()
      })
    }
  }
)

// Process notification action
router.post('/action',
  validateRequest(processActionSchema),
  async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      const { notificationId, actionId } = req.body

      logger.info('Processing notification action', {
        userId,
        notificationId,
        actionId
      })

      const result = await intelligentNotificationService.processNotificationAction(
        notificationId,
        actionId,
        userId
      )

      res.json({
        success: true,
        type: 'notification_action',
        data: result,
        timestamp: new Date().toISOString(),
        metadata: {
          actionId,
          processed: true
        }
      })

    } catch (error) {
      logger.error('Failed to process notification action', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process notification action',
        timestamp: new Date().toISOString()
      })
    }
  }
)

// Process league notifications (admin/commissioner)
router.post('/process-league',
  validateRequest(processLeagueNotificationsSchema),
  validateLeagueAccess,
  async (req, res) => {
    try {
      const userId = req.user?.id
      const { leagueId, options } = req.body

      // Check if user is commissioner of the league
      const league = await prisma?.leagues.findUnique({
        where: { id: leagueId }
      })

      if (!league || league.commissionerId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only league commissioners can process league notifications'
        })
      }

      logger.info('Processing league notifications', {
        userId,
        leagueId,
        options
      })

      const result = await intelligentNotificationService.processIntelligentNotifications(
        leagueId,
        options
      )

      res.json({
        success: true,
        type: 'league_notification_processing',
        data: result,
        timestamp: new Date().toISOString(),
        metadata: {
          leagueId,
          processingTime: Date.now() // Would calculate actual time
        }
      })

    } catch (error) {
      logger.error('Failed to process league notifications', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process league notifications',
        timestamp: new Date().toISOString()
      })
    }
  }
)

// Get notification statistics
router.get('/stats',
  async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      // Get notification statistics for the user
      const notifications = await intelligentNotificationService.getUserNotifications(
        userId,
        { limit: 100 }
      )

      const stats = {
        total: notifications.total,
        unread: notifications.stored.filter(n => !n.readAt).length,
        byType: {},
        byPriority: {},
        recent: notifications.stored.slice(0, 5)
      }

      // Count by type
      notifications.stored.forEach(notification => {
        const data = JSON.parse(notification.data as string || '{}')
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1
      })

      res.json({
        success: true,
        type: 'notification_stats',
        data: stats,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Failed to get notification statistics', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get notification statistics',
        timestamp: new Date().toISOString()
      })
    }
  }
)

// Bulk mark as read
router.post('/mark-all-read',
  async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      logger.info('Marking all notifications as read', { userId })

      // Mark all unread notifications as read
      const result = await prisma?.notifications.updateMany({
        where: {
          userId,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      })

      res.json({
        success: true,
        type: 'bulk_mark_read',
        data: { updated: result?.count || 0 },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Failed to mark all notifications as read', error)
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read',
        timestamp: new Date().toISOString()
      })
    }
  }
)

// Get notification preferences
router.get('/preferences',
  async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      // Get user preferences for notifications
      const preferences = await prisma?.user_preferences.findUnique({
        where: { userId }
      })

      const notificationSettings = preferences?.notificationSettings || {
        email: true,
        push: true,
        types: {
          performance_alert: true,
          anomaly_alert: true,
          sentiment_alert: false,
          injury_alert: true,
          trade_opportunity: true,
          waiver_recommendation: true
        },
        frequency: 'immediate',
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      }

      res.json({
        success: true,
        type: 'notification_preferences',
        data: notificationSettings,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Failed to get notification preferences', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get notification preferences',
        timestamp: new Date().toISOString()
      })
    }
  }
)

// Update notification preferences
router.post('/preferences',
  async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      const { preferences } = req.body

      logger.info('Updating notification preferences', { userId, preferences })

      // Update user notification preferences
      await prisma?.user_preferences.upsert({
        where: { userId },
        update: {
          notificationSettings: preferences
        },
        create: {
          userId,
          notificationSettings: preferences,
          emailNotifications: preferences.email || true,
          pushNotifications: preferences.push || true
        }
      })

      res.json({
        success: true,
        type: 'update_preferences',
        data: { updated: true },
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Failed to update notification preferences', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences',
        timestamp: new Date().toISOString()
      })
    }
  }
)

export { router as notificationRoutes }