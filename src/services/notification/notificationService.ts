'use client'

import socketService, { type SocketEvent } from '../websocket/socketService'

export type NotificationType = 
  | 'trade_proposal'
  | 'trade_accepted'
  | 'trade_rejected'
  | 'waiver_won'
  | 'waiver_lost'
  | 'lineup_reminder'
  | 'player_injury'
  | 'player_news'
  | 'game_start'
  | 'close_matchup'
  | 'weekly_recap'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  data?: any
  read: boolean
  userId: string
  leagueId?: string
  createdAt: string
  expiresAt?: string
  actionUrl?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export interface PushNotificationConfig {
  enabled: boolean
  types: {
    trades: boolean
    waivers: boolean
    lineups: boolean
    scores: boolean
    news: boolean
  }
  quietHours: {
    enabled: boolean
    start: string // "22:00"
    end: string   // "08:00"
  }
  gameDay: {
    enabled: boolean
    frequency: 'minimal' | 'normal' | 'frequent'
  }
}

class NotificationService {
  private notifications: Notification[] = []
  private listeners: Set<(notifications: Notification[]) => void> = new Set()
  private pushConfig: PushNotificationConfig = {
    enabled: false,
    types: {
      trades: true,
      waivers: true,
      lineups: true,
      scores: true,
      news: false
    },
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "08:00"
    },
    gameDay: {
      enabled: true,
      frequency: 'normal'
    }
  }

  async initialize(userId: string): Promise<void> {
    try {
      // Load user's notification preferences
      await this.loadUserPreferences(userId)
      
      // Load existing notifications
      await this.loadNotifications(userId)
      
      // Set up socket event handlers
      this.setupSocketHandlers()
      
      // Request notification permissions if needed
      await this.requestPermissions()
      
    } catch (error) {
      console.error('Failed to initialize notifications:', error)
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  async createNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<void> {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString()
    }

    this.notifications.unshift(newNotification)
    this.notifyListeners()

    // Show browser notification if enabled and appropriate
    if (this.shouldShowPushNotification(newNotification)) {
      await this.showPushNotification(newNotification)
    }

    // Store in localStorage for persistence
    this.saveNotifications()
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      this.notifyListeners()
      this.saveNotifications()
    }
  }

  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => n.read = true)
    this.notifyListeners()
    this.saveNotifications()
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications = this.notifications.filter(n => n.id !== notificationId)
    this.notifyListeners()
    this.saveNotifications()
  }

  async clearOld(daysOld: number = 7): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    this.notifications = this.notifications.filter(n => 
      new Date(n.createdAt) > cutoffDate
    )
    this.notifyListeners()
    this.saveNotifications()
  }

  getNotifications(): Notification[] {
    return [...this.notifications]
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async updatePreferences(config: Partial<PushNotificationConfig>): Promise<void> {
    this.pushConfig = { ...this.pushConfig, ...config }
    
    // Save to localStorage
    localStorage.setItem('notification_preferences', JSON.stringify(this.pushConfig))
    
    // If notifications were disabled, clear any scheduled ones
    if (!this.pushConfig.enabled) {
      // Clear any pending notifications
    }
  }

  getPreferences(): PushNotificationConfig {
    return { ...this.pushConfig }
  }

  private setupSocketHandlers(): void {
    // Trade notifications
    socketService.on('trade_proposal', (event: SocketEvent) => {
      this.createNotification({
        type: 'trade_proposal',
        title: 'New Trade Proposal',
        message: 'You have received a new trade proposal',
        userId: event.userId || '',
        leagueId: event.leagueId,
        data: event.data,
        priority: 'high',
        actionUrl: `/leagues/${event.leagueId}/trades`
      })
    })

    socketService.on('trade_accepted', (event: SocketEvent) => {
      this.createNotification({
        type: 'trade_accepted',
        title: 'Trade Accepted',
        message: 'Your trade proposal has been accepted!',
        userId: event.userId || '',
        leagueId: event.leagueId,
        data: event.data,
        priority: 'high',
        actionUrl: `/leagues/${event.leagueId}/trades`
      })
    })

    socketService.on('trade_rejected', (event: SocketEvent) => {
      this.createNotification({
        type: 'trade_rejected',
        title: 'Trade Rejected',
        message: 'Your trade proposal has been rejected',
        userId: event.userId || '',
        leagueId: event.leagueId,
        data: event.data,
        priority: 'normal',
        actionUrl: `/leagues/${event.leagueId}/trades`
      })
    })

    // Waiver notifications
    socketService.on('waiver_processed', (event: SocketEvent) => {
      const successful = event.data.status === 'successful'
      this.createNotification({
        type: successful ? 'waiver_won' : 'waiver_lost',
        title: successful ? 'Waiver Claim Won!' : 'Waiver Claim Lost',
        message: successful 
          ? `You successfully claimed ${event.data.player_name}`
          : `Your waiver claim for ${event.data.player_name} was unsuccessful`,
        userId: event.userId || '',
        leagueId: event.leagueId,
        data: event.data,
        priority: successful ? 'high' : 'normal',
        actionUrl: `/leagues/${event.leagueId}/waiver`
      })
    })

    // Live scoring notifications
    socketService.on('player_scores', (event: SocketEvent) => {
      if (this.pushConfig.gameDay.enabled) {
        const gameUpdate = event.data
        // Only notify for significant scoring plays
        gameUpdate.playerUpdates?.forEach((playerUpdate: any) => {
          if (playerUpdate.points >= 10) { // Significant scoring play
            this.createNotification({
              type: 'player_news',
              title: 'Big Play!',
              message: `${playerUpdate.playerName} just scored ${playerUpdate.points} fantasy points!`,
              userId: event.userId || '',
              leagueId: event.leagueId,
              data: playerUpdate,
              priority: 'normal'
            })
          }
        })
      }
    })
  }

  private shouldShowPushNotification(notification: Notification): boolean {
    if (!this.pushConfig.enabled) return false

    // Check notification type preferences
    const typeEnabled = this.getTypeEnabled(notification.type)
    if (!typeEnabled) return false

    // Check quiet hours
    if (this.pushConfig.quietHours.enabled && this.isInQuietHours()) {
      return notification.priority === 'urgent'
    }

    // Check game day frequency
    if (this.isGameDay() && this.pushConfig.gameDay.frequency === 'minimal') {
      return notification.priority === 'high' || notification.priority === 'urgent'
    }

    return true
  }

  private getTypeEnabled(type: NotificationType): boolean {
    switch (type) {
      case 'trade_proposal':
      case 'trade_accepted':
      case 'trade_rejected':
        return this.pushConfig.types.trades
      case 'waiver_won':
      case 'waiver_lost':
        return this.pushConfig.types.waivers
      case 'lineup_reminder':
        return this.pushConfig.types.lineups
      case 'close_matchup':
        return this.pushConfig.types.scores
      case 'player_injury':
      case 'player_news':
        return this.pushConfig.types.news
      default:
        return true
    }
  }

  private isInQuietHours(): boolean {
    const now = new Date()
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0')
    
    const start = this.pushConfig.quietHours.start
    const end = this.pushConfig.quietHours.end
    
    if (start <= end) {
      return currentTime >= start && currentTime <= end
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end
    }
  }

  private isGameDay(): boolean {
    const today = new Date().getDay()
    return today === 0 || today === 1 || today === 4 // Sunday, Monday, Thursday
  }

  private async showPushNotification(notification: Notification): Promise<void> {
    if (Notification.permission !== 'granted') return

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        silent: notification.priority === 'low'
      })

      browserNotification.onclick = () => {
        window.focus()
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl
        }
        browserNotification.close()
      }

      // Auto-close after 5 seconds unless urgent
      if (notification.priority !== 'urgent') {
        setTimeout(() => {
          browserNotification.close()
        }, 5000)
      }
    } catch (error) {
      console.error('Failed to show push notification:', error)
    }
  }

  private notifyListeners(): void {
    const notifications = this.getNotifications()
    this.listeners.forEach(listener => {
      try {
        listener(notifications)
      } catch (error) {
        console.error('Notification listener error:', error)
      }
    })
  }

  private async loadUserPreferences(userId: string): Promise<void> {
    try {
      const saved = localStorage.getItem('notification_preferences')
      if (saved) {
        this.pushConfig = { ...this.pushConfig, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }

  private async loadNotifications(userId: string): Promise<void> {
    try {
      const saved = localStorage.getItem(`notifications_${userId}`)
      if (saved) {
        this.notifications = JSON.parse(saved)
        this.notifyListeners()
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  private saveNotifications(): void {
    try {
      // In a real app, we'd save this to a database
      // For now, use localStorage
      const userId = 'current_user' // Would get from auth
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(this.notifications))
    } catch (error) {
      console.error('Failed to save notifications:', error)
    }
  }

  // Utility methods for creating common notifications
  async notifyLineupReminder(userId: string, leagueId: string, hoursUntilDeadline: number): Promise<void> {
    await this.createNotification({
      type: 'lineup_reminder',
      title: 'Set Your Lineup',
      message: `Lineup locks in ${hoursUntilDeadline} hours. Make sure your lineup is set!`,
      userId,
      leagueId,
      priority: hoursUntilDeadline <= 2 ? 'high' : 'normal',
      actionUrl: `/leagues/${leagueId}/roster`
    })
  }

  async notifyPlayerInjury(userId: string, playerName: string, injuryStatus: string): Promise<void> {
    await this.createNotification({
      type: 'player_injury',
      title: 'Player Injury Update',
      message: `${playerName} is now ${injuryStatus}`,
      userId,
      priority: injuryStatus === 'OUT' ? 'high' : 'normal',
      data: { playerName, injuryStatus }
    })
  }

  async notifyCloseMatchup(userId: string, leagueId: string, opponent: string, pointDiff: number): Promise<void> {
    await this.createNotification({
      type: 'close_matchup',
      title: 'Close Matchup!',
      message: `You're ${pointDiff > 0 ? 'ahead of' : 'behind'} ${opponent} by ${Math.abs(pointDiff).toFixed(1)} points`,
      userId,
      leagueId,
      priority: 'normal',
      data: { opponent, pointDiff }
    })
  }
}

const notificationService = new NotificationService()
export default notificationService