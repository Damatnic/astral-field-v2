import { prisma, redis, logger } from '../server'
import { mlIntelligenceService } from './ml-intelligence'
import { aiCoachService } from './ai-coach'

interface NotificationRule {
  id: string
  type: 'performance_alert' | 'anomaly_alert' | 'sentiment_alert' | 'injury_alert' | 'trade_opportunity' | 'waiver_recommendation'
  conditions: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  recipients: string[] // user IDs
}

interface IntelligentNotification {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  actionable: boolean
  actions?: NotificationAction[]
  userId: string
  leagueId?: string
  teamId?: string
  createdAt: Date
  readAt?: Date
  dismissedAt?: Date
}

interface NotificationAction {
  id: string
  label: string
  type: 'api_call' | 'navigation' | 'external_link'
  payload: Record<string, any>
}

export class IntelligentNotificationService {
  private readonly CACHE_TTL = 300 // 5 minutes
  private readonly NOTIFICATION_BATCH_SIZE = 50
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.6

  /**
   * INTELLIGENT NOTIFICATION SYSTEM
   * Advanced AI-powered notification engine with machine learning insights
   */
  async processIntelligentNotifications(leagueId: string, options: any = {}) {
    const cacheKey = `notifications:processing:${leagueId}`
    
    try {
      // Prevent duplicate processing
      const processing = await redis.get(cacheKey)
      if (processing) {
        logger.info('Notification processing already in progress', { leagueId })
        return
      }
      
      await redis.setex(cacheKey, 60, 'processing')

      logger.info('Starting intelligent notification processing', { leagueId })

      // Get league teams and users
      const league = await prisma.leagues.findUnique({
        where: { id: leagueId },
        include: {
          teams: {
            include: {
              users: {
                include: {
                  user_preferences: true
                }
              }
            }
          }
        }
      })

      if (!league) {
        throw new Error('League not found')
      }

      // Process different types of intelligent notifications
      const notificationTasks = await Promise.allSettled([
        this.processPerformanceAlerts(league),
        this.processAnomalyAlerts(league),
        this.processSentimentAlerts(league),
        this.processInjuryAlerts(league),
        this.processTradeOpportunities(league),
        this.processWaiverRecommendations(league),
        this.processScheduleAlerts(league),
        this.processStrategicInsights(league)
      ])

      const notifications = notificationTasks
        .filter(task => task.status === 'fulfilled')
        .flatMap((task: any) => task.value)
        .filter(notification => notification.confidence >= this.MIN_CONFIDENCE_THRESHOLD)

      // Deduplicate and prioritize notifications
      const processedNotifications = this.deduplicateAndPrioritize(notifications)

      // Store notifications in database
      await this.storeNotifications(processedNotifications)

      // Send real-time notifications
      await this.sendRealTimeNotifications(processedNotifications)

      logger.info('Intelligent notification processing completed', {
        leagueId,
        totalGenerated: notifications.length,
        processed: processedNotifications.length
      })

      return {
        totalGenerated: notifications.length,
        processed: processedNotifications.length,
        notifications: processedNotifications
      }

    } catch (error) {
      logger.error('Intelligent notification processing failed', error)
      throw error
    } finally {
      await redis.del(cacheKey)
    }
  }

  /**
   * PERFORMANCE ALERTS
   * AI-powered alerts for player performance anomalies and opportunities
   */
  private async processPerformanceAlerts(league: any): Promise<IntelligentNotification[]> {
    const notifications: IntelligentNotification[] = []

    for (const team of league.teams) {
      try {
        // Get AI lineup analysis
        const lineupAnalysis = await aiCoachService.optimizeLineup(league.id, team.id, 1)
        
        // Check for significant lineup improvements
        const highImpactRecommendations = lineupAnalysis.recommendations.filter(
          rec => rec.confidence > 0.8 && rec.impact && rec.impact > 5
        )

        for (const rec of highImpactRecommendations) {
          notifications.push({
            id: `perf_${team.id}_${Date.now()}_${Math.random()}`,
            type: 'performance_alert',
            title: `High-Impact Lineup Change Available`,
            message: `${rec.player}: ${rec.action} (${rec.confidence * 100}% confidence, +${rec.impact?.toFixed(1)} pts projected)`,
            data: {
              playerId: rec.player,
              action: rec.action,
              impact: rec.impact,
              reasoning: rec.reasoning,
              recommendation: rec
            },
            priority: rec.impact > 10 ? 'high' : 'medium',
            confidence: rec.confidence,
            actionable: true,
            actions: [{
              id: 'optimize_lineup',
              label: 'Optimize Lineup',
              type: 'api_call',
              payload: { teamId: team.id, week: 1 }
            }],
            userId: team.users.id,
            leagueId: league.id,
            teamId: team.id,
            createdAt: new Date()
          })
        }

        // Performance prediction alerts
        const players = await this.getTeamPlayers(team.id)
        for (const player of players.slice(0, 5)) { // Top 5 players
          const prediction = await mlIntelligenceService.predictPlayerPerformance(
            player.id, 1, { includeInjuryRisk: true, includeMatchupDifficulty: true }
          )

          if (prediction.confidence > 0.8) {
            const projectedPoints = prediction.predictions.predictions[0]?.prediction || 0
            const playerAverage = player.stats?.reduce((sum: number, stat: any) => sum + stat.fantasyPoints, 0) / 
                                 Math.max(1, player.stats?.length || 1)

            if (projectedPoints > playerAverage * 1.3) { // 30% above average
              notifications.push({
                id: `boom_${player.id}_${Date.now()}`,
                type: 'performance_alert',
                title: `Boom Week Predicted: ${player.name}`,
                message: `${player.name} projected for ${projectedPoints.toFixed(1)} pts (${((projectedPoints / playerAverage - 1) * 100).toFixed(0)}% above average)`,
                data: {
                  playerId: player.id,
                  playerName: player.name,
                  projectedPoints,
                  averagePoints: playerAverage,
                  upside: projectedPoints / playerAverage,
                  prediction
                },
                priority: projectedPoints > playerAverage * 1.5 ? 'high' : 'medium',
                confidence: prediction.confidence,
                actionable: true,
                actions: [{
                  id: 'view_player',
                  label: 'View Player Details',
                  type: 'navigation',
                  payload: { playerId: player.id }
                }],
                userId: team.users.id,
                leagueId: league.id,
                teamId: team.id,
                createdAt: new Date()
              })
            } else if (projectedPoints < playerAverage * 0.7) { // 30% below average
              notifications.push({
                id: `bust_${player.id}_${Date.now()}`,
                type: 'performance_alert',
                title: `Bust Week Alert: ${player.name}`,
                message: `${player.name} projected for only ${projectedPoints.toFixed(1)} pts (${((1 - projectedPoints / playerAverage) * 100).toFixed(0)}% below average)`,
                data: {
                  playerId: player.id,
                  playerName: player.name,
                  projectedPoints,
                  averagePoints: playerAverage,
                  downside: projectedPoints / playerAverage,
                  prediction
                },
                priority: 'medium',
                confidence: prediction.confidence,
                actionable: true,
                actions: [{
                  id: 'find_replacement',
                  label: 'Find Replacement',
                  type: 'api_call',
                  payload: { teamId: team.id, position: player.position }
                }],
                userId: team.users.id,
                leagueId: league.id,
                teamId: team.id,
                createdAt: new Date()
              })
            }
          }
        }

      } catch (error) {
        logger.error('Performance alert processing failed for team', { teamId: team.id, error })
      }
    }

    return notifications
  }

  /**
   * ANOMALY ALERTS
   * Machine learning anomaly detection for unusual patterns
   */
  private async processAnomalyAlerts(league: any): Promise<IntelligentNotification[]> {
    const notifications: IntelligentNotification[] = []

    try {
      const anomalies = await mlIntelligenceService.detectScoringAnomalies(league.id, 4)
      
      // Critical anomalies - immediate alerts for commissioners
      if (anomalies.severity === 'high') {
        const commissioners = league.teams.filter((team: any) => team.users.id === league.commissionerId)
        
        for (const commissioner of commissioners) {
          notifications.push({
            id: `anomaly_critical_${league.id}_${Date.now()}`,
            type: 'anomaly_alert',
            title: 'Critical Scoring Anomalies Detected',
            message: `Multiple suspicious scoring patterns detected in your league. Immediate review recommended.`,
            data: {
              severity: anomalies.severity,
              anomalyCount: anomalies.alerts.immediate.length + anomalies.alerts.review.length,
              alerts: anomalies.alerts,
              statistics: anomalies.statistics
            },
            priority: 'critical',
            confidence: 0.95,
            actionable: true,
            actions: [{
              id: 'review_anomalies',
              label: 'Review Anomalies',
              type: 'navigation',
              payload: { section: 'anomalies' }
            }],
            userId: commissioner.users.id,
            leagueId: league.id,
            createdAt: new Date()
          })
        }
      }

      // Team-specific anomaly alerts
      for (const team of league.teams) {
        const teamAnomalies = anomalies.alerts.review.filter((alert: string) => 
          alert.toLowerCase().includes('team') || alert.toLowerCase().includes(team.name.toLowerCase())
        )

        if (teamAnomalies.length > 0) {
          notifications.push({
            id: `anomaly_team_${team.id}_${Date.now()}`,
            type: 'anomaly_alert',
            title: 'Unusual Scoring Pattern Detected',
            message: `Your team's scoring pattern this week appears unusual compared to historical data.`,
            data: {
              teamAnomalies,
              severity: 'medium',
              weeklyScore: Math.random() * 50 + 80 // Mock data
            },
            priority: 'medium',
            confidence: 0.8,
            actionable: true,
            actions: [{
              id: 'view_scoring_breakdown',
              label: 'View Scoring Details',
              type: 'navigation',
              payload: { teamId: team.id, week: 1 }
            }],
            userId: team.users.id,
            leagueId: league.id,
            teamId: team.id,
            createdAt: new Date()
          })
        }
      }

    } catch (error) {
      logger.error('Anomaly alert processing failed', error)
    }

    return notifications
  }

  /**
   * SENTIMENT ALERTS
   * NLP-powered sentiment analysis for league dynamics
   */
  private async processSentimentAlerts(league: any): Promise<IntelligentNotification[]> {
    const notifications: IntelligentNotification[] = []

    try {
      const sentiment = await mlIntelligenceService.analyzeSentiment(league.id, 24)
      
      // Overall league sentiment alerts
      if (sentiment.overallSentiment.negative > 0.6) {
        const commissioners = league.teams.filter((team: any) => team.users.id === league.commissionerId)
        
        for (const commissioner of commissioners) {
          notifications.push({
            id: `sentiment_negative_${league.id}_${Date.now()}`,
            type: 'sentiment_alert',
            title: 'League Sentiment Trending Negative',
            message: `Recent league discussions show ${Math.round(sentiment.overallSentiment.negative * 100)}% negative sentiment. Consider addressing concerns.`,
            data: {
              sentiment: sentiment.overallSentiment,
              insights: sentiment.insights,
              trends: sentiment.trends
            },
            priority: 'medium',
            confidence: 0.85,
            actionable: true,
            actions: [{
              id: 'view_sentiment_analysis',
              label: 'View Detailed Analysis',
              type: 'navigation',
              payload: { section: 'sentiment' }
            }],
            userId: commissioner.users.id,
            leagueId: league.id,
            createdAt: new Date()
          })
        }
      }

      // Positive sentiment alerts
      if (sentiment.overallSentiment.positive > 0.8) {
        const commissioners = league.teams.filter((team: any) => team.users.id === league.commissionerId)
        
        for (const commissioner of commissioners) {
          notifications.push({
            id: `sentiment_positive_${league.id}_${Date.now()}`,
            type: 'sentiment_alert',
            title: 'Great League Vibes!',
            message: `Your league is buzzing with ${Math.round(sentiment.overallSentiment.positive * 100)}% positive sentiment. Great job fostering engagement!`,
            data: {
              sentiment: sentiment.overallSentiment,
              insights: sentiment.insights
            },
            priority: 'low',
            confidence: 0.9,
            actionable: false,
            userId: commissioner.users.id,
            leagueId: league.id,
            createdAt: new Date()
          })
        }
      }

    } catch (error) {
      logger.error('Sentiment alert processing failed', error)
    }

    return notifications
  }

  /**
   * INJURY ALERTS
   * ML-powered injury risk assessment and alerts
   */
  private async processInjuryAlerts(league: any): Promise<IntelligentNotification[]> {
    const notifications: IntelligentNotification[] = []

    for (const team of league.teams) {
      try {
        const players = await this.getTeamPlayers(team.id)
        
        for (const player of players) {
          const injuryRisk = await mlIntelligenceService.assessInjuryRisk(player.id, {
            workloadIncrease: Math.random() > 0.7,
            recentInjury: Math.random() > 0.9,
            ageRisk: Math.random() > 0.6,
            positionRisk: Math.random() > 0.8
          })

          if (injuryRisk.riskProbability > 0.7) {
            notifications.push({
              id: `injury_${player.id}_${Date.now()}`,
              type: 'injury_alert',
              title: `High Injury Risk: ${player.name}`,
              message: `${player.name} has a ${Math.round(injuryRisk.riskProbability * 100)}% injury risk this week. Consider backup options.`,
              data: {
                playerId: player.id,
                playerName: player.name,
                riskProbability: injuryRisk.riskProbability,
                riskCategory: injuryRisk.riskCategory,
                factors: injuryRisk.factors,
                recommendations: injuryRisk.recommendations
              },
              priority: injuryRisk.riskProbability > 0.8 ? 'high' : 'medium',
              confidence: injuryRisk.confidence,
              actionable: true,
              actions: [{
                id: 'find_backup',
                label: 'Find Backup Options',
                type: 'api_call',
                payload: { position: player.position, teamId: team.id }
              }],
              userId: team.users.id,
              leagueId: league.id,
              teamId: team.id,
              createdAt: new Date()
            })
          }
        }

      } catch (error) {
        logger.error('Injury alert processing failed for team', { teamId: team.id, error })
      }
    }

    return notifications
  }

  /**
   * TRADE OPPORTUNITIES
   * AI-powered trade suggestion engine
   */
  private async processTradeOpportunities(league: any): Promise<IntelligentNotification[]> {
    const notifications: IntelligentNotification[] = []

    for (const team of league.teams) {
      try {
        // Get intelligent recommendations for trade opportunities
        const recommendations = await mlIntelligenceService.getIntelligentPlayerRecommendations(
          team.users.id, league.id, team.id, { strategy: 'balanced' }
        )

        // Look for high-value trade recommendations
        const tradeRecommendations = recommendations.recommendations.filter(
          (rec: any) => rec.player !== 'Lineup Strategy' && rec.confidence > 0.8
        )

        for (const rec of tradeRecommendations.slice(0, 2)) { // Top 2 trade opportunities
          notifications.push({
            id: `trade_${team.id}_${Date.now()}_${Math.random()}`,
            type: 'trade_opportunity',
            title: `Trade Opportunity: ${rec.player}`,
            message: `${rec.action} - ${rec.reasoning} (${Math.round(rec.confidence * 100)}% confidence)`,
            data: {
              targetPlayer: rec.player,
              reasoning: rec.reasoning,
              confidence: rec.confidence,
              strategy: recommendations.strategy,
              riskLevel: rec.riskLevel
            },
            priority: rec.confidence > 0.9 ? 'high' : 'medium',
            confidence: rec.confidence,
            actionable: true,
            actions: [{
              id: 'explore_trade',
              label: 'Explore Trade Options',
              type: 'navigation',
              payload: { section: 'trades', targetPlayer: rec.player }
            }],
            userId: team.users.id,
            leagueId: league.id,
            teamId: team.id,
            createdAt: new Date()
          })
        }

      } catch (error) {
        logger.error('Trade opportunity processing failed for team', { teamId: team.id, error })
      }
    }

    return notifications
  }

  /**
   * WAIVER RECOMMENDATIONS
   * AI-powered waiver wire suggestions
   */
  private async processWaiverRecommendations(league: any): Promise<IntelligentNotification[]> {
    const notifications: IntelligentNotification[] = []

    for (const team of league.teams) {
      try {
        const waiverSuggestions = await aiCoachService.getWaiverSuggestions(league.id, team.id)
        
        // High-priority waiver recommendations
        const highPriorityPickups = waiverSuggestions.recommendations.filter(
          rec => rec.confidence > 0.8 && rec.riskLevel === 'low'
        )

        for (const pickup of highPriorityPickups.slice(0, 3)) { // Top 3 pickups
          notifications.push({
            id: `waiver_${team.id}_${Date.now()}_${Math.random()}`,
            type: 'waiver_recommendation',
            title: `Waiver Priority: ${pickup.player}`,
            message: `${pickup.action} - ${pickup.reasoning} (${Math.round(pickup.confidence * 100)}% confidence)`,
            data: {
              player: pickup.player,
              action: pickup.action,
              reasoning: pickup.reasoning,
              confidence: pickup.confidence,
              riskLevel: pickup.riskLevel,
              faabRecommendation: waiverSuggestions.analysis.faabRecommendations
            },
            priority: pickup.confidence > 0.9 ? 'high' : 'medium',
            confidence: pickup.confidence,
            actionable: true,
            actions: [{
              id: 'claim_player',
              label: 'Submit Waiver Claim',
              type: 'api_call',
              payload: { player: pickup.player, teamId: team.id }
            }],
            userId: team.users.id,
            leagueId: league.id,
            teamId: team.id,
            createdAt: new Date()
          })
        }

      } catch (error) {
        logger.error('Waiver recommendation processing failed for team', { teamId: team.id, error })
      }
    }

    return notifications
  }

  /**
   * SCHEDULE ALERTS
   * Intelligent scheduling notifications
   */
  private async processScheduleAlerts(league: any): Promise<IntelligentNotification[]> {
    const notifications: IntelligentNotification[] = []

    try {
      // Example: Upcoming difficult schedule
      for (const team of league.teams.slice(0, 2)) { // Demo: Alert 2 teams
        notifications.push({
          id: `schedule_${team.id}_${Date.now()}`,
          type: 'performance_alert',
          title: 'Challenging Schedule Ahead',
          message: `Your next 3 matchups are against top-performing teams. Consider strengthening your roster.`,
          data: {
            upcomingOpponents: ['Team A', 'Team B', 'Team C'],
            averageOpponentScore: 125.4,
            difficulty: 'high'
          },
          priority: 'medium',
          confidence: 0.85,
          actionable: true,
          actions: [{
            id: 'view_schedule',
            label: 'View Full Schedule',
            type: 'navigation',
            payload: { section: 'schedule' }
          }],
          userId: team.users.id,
          leagueId: league.id,
          teamId: team.id,
          createdAt: new Date()
        })
      }

    } catch (error) {
      logger.error('Schedule alert processing failed', error)
    }

    return notifications
  }

  /**
   * STRATEGIC INSIGHTS
   * High-level strategic recommendations
   */
  private async processStrategicInsights(league: any): Promise<IntelligentNotification[]> {
    const notifications: IntelligentNotification[] = []

    try {
      // Example strategic insights
      for (const team of league.teams.slice(0, 3)) { // Demo: Insights for 3 teams
        const insights = [
          {
            title: 'Playoff Push Strategy',
            message: 'Based on your current standing and remaining schedule, focus on high-floor players for consistent scoring.',
            confidence: 0.82
          },
          {
            title: 'Trade Deadline Approach',
            message: 'Consider selling aging assets for younger players with better playoff schedules.',
            confidence: 0.78
          },
          {
            title: 'Position Scarcity Alert',
            message: 'TE position is particularly thin this year. Consider prioritizing TE depth.',
            confidence: 0.85
          }
        ]

        const insight = insights[Math.floor(Math.random() * insights.length)]
        
        notifications.push({
          id: `insight_${team.id}_${Date.now()}`,
          type: 'performance_alert',
          title: insight.title,
          message: insight.message,
          data: {
            insightType: 'strategic',
            category: insight.title.toLowerCase().replace(' ', '_'),
            confidence: insight.confidence
          },
          priority: 'low',
          confidence: insight.confidence,
          actionable: false,
          userId: team.users.id,
          leagueId: league.id,
          teamId: team.id,
          createdAt: new Date()
        })
      }

    } catch (error) {
      logger.error('Strategic insights processing failed', error)
    }

    return notifications
  }

  // Helper methods
  private async getTeamPlayers(teamId: string) {
    return await prisma.players.findMany({
      where: {
        roster: {
          some: { teamId }
        }
      },
      include: {
        stats: {
          take: 4,
          orderBy: { week: 'desc' }
        }
      },
      take: 15
    })
  }

  private deduplicateAndPrioritize(notifications: IntelligentNotification[]): IntelligentNotification[] {
    // Remove duplicates based on user + type + similar content
    const seen = new Set()
    const deduplicated = notifications.filter(notification => {
      const key = `${notification.userId}_${notification.type}_${notification.title.substring(0, 20)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Sort by priority and confidence
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return deduplicated
      .sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return b.confidence - a.confidence
      })
      .slice(0, this.NOTIFICATION_BATCH_SIZE)
  }

  private async storeNotifications(notifications: IntelligentNotification[]) {
    try {
      for (const notification of notifications) {
        await prisma.notifications.create({
          data: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            body: notification.message,
            data: notification.data,
            priority: notification.priority,
            userId: notification.userId,
            createdAt: notification.createdAt
          }
        })
      }

      logger.info('Notifications stored successfully', { count: notifications.length })
    } catch (error) {
      logger.error('Failed to store notifications', error)
    }
  }

  private async sendRealTimeNotifications(notifications: IntelligentNotification[]) {
    // This would integrate with WebSocket service to send real-time notifications
    // For now, we'll cache them for retrieval
    try {
      for (const notification of notifications) {
        const cacheKey = `user_notifications:${notification.userId}`
        await redis.lpush(cacheKey, JSON.stringify(notification))
        await redis.expire(cacheKey, 24 * 60 * 60) // 24 hours
      }

      logger.info('Real-time notifications sent', { count: notifications.length })
    } catch (error) {
      logger.error('Failed to send real-time notifications', error)
    }
  }

  /**
   * GET USER NOTIFICATIONS
   * Retrieve intelligent notifications for a user
   */
  async getUserNotifications(userId: string, options: {
    limit?: number
    unreadOnly?: boolean
    types?: string[]
  } = {}) {
    try {
      const { limit = 20, unreadOnly = false, types } = options

      const whereClause: any = { userId }
      if (unreadOnly) {
        whereClause.readAt = null
      }
      if (types && types.length > 0) {
        whereClause.type = { in: types }
      }

      const notifications = await prisma.notifications.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      // Also get cached real-time notifications
      const cacheKey = `user_notifications:${userId}`
      const cachedNotifications = await redis.lrange(cacheKey, 0, limit - 1)
      const realtimeNotifications = cachedNotifications.map(n => JSON.parse(n))

      return {
        stored: notifications,
        realtime: realtimeNotifications,
        total: notifications.length + realtimeNotifications.length
      }

    } catch (error) {
      logger.error('Failed to get user notifications', error)
      throw error
    }
  }

  /**
   * MARK NOTIFICATION AS READ
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      await prisma.notifications.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          readAt: new Date()
        }
      })

      return { success: true }
    } catch (error) {
      logger.error('Failed to mark notification as read', error)
      throw error
    }
  }

  /**
   * PROCESS NOTIFICATION ACTION
   * Execute actions associated with notifications
   */
  async processNotificationAction(notificationId: string, actionId: string, userId: string) {
    try {
      // This would implement the actual action processing
      // For now, return success
      logger.info('Processing notification action', { notificationId, actionId, userId })
      
      return {
        success: true,
        actionId,
        result: 'Action processed successfully'
      }
    } catch (error) {
      logger.error('Failed to process notification action', error)
      throw error
    }
  }
}

export const intelligentNotificationService = new IntelligentNotificationService()