/**
 * In-App Notification Manager
 * Centralized notification system for the application
 */

export type NotificationType = 'trade' | 'waiver' | 'matchup' | 'news' | 'lineup' | 'system'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
}

export interface NotificationPreferences {
  trades: boolean
  waivers: boolean
  matchup: boolean
  news: boolean
  lineup: boolean
  system: boolean
}

class NotificationManager {
  private notifications: Notification[] = []
  private listeners: Set<(notifications: Notification[]) => void> = new Set()
  private preferences: NotificationPreferences = {
    trades: true,
    waivers: true,
    matchup: true,
    news: true,
    lineup: true,
    system: true
  }

  /**
   * Add a new notification
   */
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification {
    // Check if notification type is enabled
    if (!this.preferences[notification.type]) {
      return notification as Notification // Return dummy notification but don't add it
    }

    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    }

    this.notifications.unshift(newNotification)

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100)
    }

    this.notifyListeners()
    return newNotification
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      this.notifyListeners()
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true)
    this.notifyListeners()
  }

  /**
   * Remove a notification
   */
  removeNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId)
    this.notifyListeners()
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = []
    this.notifyListeners()
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications]
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.read)
  }

  /**
   * Get notification count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type: NotificationType): Notification[] {
    return this.notifications.filter(n => n.type === type)
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Update notification preferences
   */
  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences }
    localStorage.setItem('notification-preferences', JSON.stringify(this.preferences))
  }

  /**
   * Get notification preferences
   */
  getPreferences(): NotificationPreferences {
    // Load from localStorage on first access
    const saved = localStorage.getItem('notification-preferences')
    if (saved) {
      try {
        this.preferences = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse notification preferences', e)
      }
    }
    return { ...this.preferences }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const notifications = this.getNotifications()
    this.listeners.forEach(listener => listener(notifications))
  }
}

// Singleton instance
export const notificationManager = new NotificationManager()

/**
 * Helper functions for common notification types
 */

export function notifyTradeProposal(proposingTeam: string, receivingTeam: string, tradeId: string): void {
  notificationManager.addNotification({
    type: 'trade',
    priority: 'high',
    title: 'New Trade Proposal',
    message: `${proposingTeam} has proposed a trade with ${receivingTeam}`,
    actionUrl: `/trades?id=${tradeId}`,
    actionLabel: 'View Trade',
    metadata: { tradeId, proposingTeam, receivingTeam }
  })
}

export function notifyTradeAccepted(teamName: string, tradeId: string): void {
  notificationManager.addNotification({
    type: 'trade',
    priority: 'high',
    title: 'Trade Accepted!',
    message: `${teamName} has accepted your trade proposal`,
    actionUrl: `/trades?id=${tradeId}`,
    actionLabel: 'View Trade',
    metadata: { tradeId, teamName }
  })
}

export function notifyTradeRejected(teamName: string, tradeId: string): void {
  notificationManager.addNotification({
    type: 'trade',
    priority: 'normal',
    title: 'Trade Rejected',
    message: `${teamName} has rejected your trade proposal`,
    actionUrl: `/trades`,
    actionLabel: 'View Trades',
    metadata: { tradeId, teamName }
  })
}

export function notifyWaiverClaim(playerName: string, status: 'success' | 'failed'): void {
  notificationManager.addNotification({
    type: 'waiver',
    priority: status === 'success' ? 'high' : 'normal',
    title: status === 'success' ? 'Waiver Claim Successful!' : 'Waiver Claim Failed',
    message: status === 'success'
      ? `You successfully claimed ${playerName} from waivers`
      : `Your waiver claim for ${playerName} was unsuccessful`,
    actionUrl: '/waivers',
    actionLabel: 'View Waivers',
    metadata: { playerName, status }
  })
}

export function notifyMatchupStart(opponent: string, week: number): void {
  notificationManager.addNotification({
    type: 'matchup',
    priority: 'normal',
    title: 'Matchup Starting',
    message: `Your Week ${week} matchup against ${opponent} is starting`,
    actionUrl: '/matchups',
    actionLabel: 'View Matchup',
    metadata: { opponent, week }
  })
}

export function notifyMatchupResult(opponent: string, result: 'win' | 'loss' | 'tie', week: number): void {
  const resultText = result === 'win' ? 'Victory!' : result === 'loss' ? 'Tough Loss' : 'Tie Game'
  
  notificationManager.addNotification({
    type: 'matchup',
    priority: 'high',
    title: resultText,
    message: `Week ${week} matchup against ${opponent} has ended`,
    actionUrl: '/matchups',
    actionLabel: 'View Results',
    metadata: { opponent, result, week }
  })
}

export function notifyLineupReminder(daysUntilLockout: number): void {
  notificationManager.addNotification({
    type: 'lineup',
    priority: daysUntilLockout <= 1 ? 'urgent' : 'normal',
    title: 'Set Your Lineup',
    message: `Lineup locks in ${daysUntilLockout} ${daysUntilLockout === 1 ? 'day' : 'days'}`,
    actionUrl: '/team',
    actionLabel: 'Edit Lineup',
    metadata: { daysUntilLockout }
  })
}

export function notifyPlayerNews(playerName: string, headline: string, playerId: string): void {
  notificationManager.addNotification({
    type: 'news',
    priority: 'normal',
    title: `${playerName} News`,
    message: headline,
    actionUrl: `/players/${playerId}`,
    actionLabel: 'View Player',
    metadata: { playerName, playerId, headline }
  })
}

export function notifySystemMessage(title: string, message: string, priority: NotificationPriority = 'normal'): void {
  notificationManager.addNotification({
    type: 'system',
    priority,
    title,
    message,
    metadata: {}
  })
}

