'use client'

import { useState, useEffect } from 'react'
import { 
  BellIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
  ArrowsRightLeftIcon,
  TrophyIcon,
  FireIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/outline'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  actionable: boolean
  actions?: NotificationAction[]
  createdAt: string
  readAt?: string
}

interface NotificationAction {
  id: string
  label: string
  type: 'api_call' | 'navigation' | 'external_link'
  payload: Record<string, any>
}

interface IntelligentNotificationsProps {
  userId: string
  onNotificationClick?: (notification: Notification) => void
}

export function IntelligentNotifications({ userId, onNotificationClick }: IntelligentNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [preferences, setPreferences] = useState<any>({})

  useEffect(() => {
    fetchNotifications()
    fetchPreferences()
    
    // Set up polling for new notifications
    const interval = setInterval(fetchNotifications, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [userId])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const allNotifications = [...data.data.stored, ...data.data.realtime]
        setNotifications(allNotifications)
        setUnreadCount(allNotifications.filter(n => !n.readAt).length)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notificationId })
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, readAt: new Date().toISOString() }
              : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
        )
        setUnreadCount(0)
        toast.success('All notifications marked as read')
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }

  const executeAction = async (notification: Notification, action: NotificationAction) => {
    try {
      const response = await fetch('/api/notifications/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          notificationId: notification.id,
          actionId: action.id
        })
      })
      
      if (response.ok) {
        toast.success(`${action.label} executed successfully`)
        
        // Handle different action types
        if (action.type === 'navigation') {
          // Would trigger navigation in the app
          onNotificationClick?.(notification)
        } else if (action.type === 'external_link') {
          window.open(action.payload.url, '_blank')
        }
      }
    } catch (error) {
      console.error('Failed to execute action:', error)
      toast.error(`Failed to execute ${action.label}`)
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      'performance_alert': TrophyIcon,
      'anomaly_alert': ShieldCheckIcon,
      'sentiment_alert': ChatBubbleLeftRightIcon,
      'injury_alert': ExclamationTriangleIcon,
      'trade_opportunity': ArrowsRightLeftIcon,
      'waiver_recommendation': FireIcon,
      'default': SparklesIcon
    }
    return iconMap[type as keyof typeof iconMap] || iconMap.default
  }

  const getPriorityColor = (priority: string) => {
    const colorMap = {
      'critical': 'border-red-500 bg-red-500/10',
      'high': 'border-orange-500 bg-orange-500/10',
      'medium': 'border-yellow-500 bg-yellow-500/10',
      'low': 'border-blue-500 bg-blue-500/10'
    }
    return colorMap[priority as keyof typeof colorMap] || colorMap.low
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.readAt) return false
    if (filter === 'actionable' && !notification.actionable) return false
    if (filter !== 'all' && filter !== 'unread' && filter !== 'actionable' && notification.type !== filter) return false
    return true
  })

  const displayedNotifications = showAll ? filteredNotifications : filteredNotifications.slice(0, 5)

  if (loading) {
    return (
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center space-x-3">
          <BellIcon className="h-6 w-6 text-blue-400 animate-pulse" />
          <div className="text-white">Loading notifications...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <BellIcon className="h-6 w-6 text-blue-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">
            Intelligent Notifications
          </h3>
          <span className="text-sm text-gray-400">
            ({unreadCount} unread)
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark All Read
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="text-xs"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 overflow-x-auto">
        {['all', 'unread', 'actionable', 'performance_alert', 'trade_opportunity', 'waiver_recommendation', 'anomaly_alert'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              filter === filterOption
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            {filterOption.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {displayedNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BellIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <div>No notifications found</div>
            <div className="text-sm">You're all caught up!</div>
          </div>
        ) : (
          displayedNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type)
            const isUnread = !notification.readAt
            
            return (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                  isUnread ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 bg-slate-800/50'
                } ${getPriorityColor(notification.priority)}`}
                onClick={() => {
                  if (isUnread) markAsRead(notification.id)
                  onNotificationClick?.(notification)
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    notification.priority === 'critical' ? 'bg-red-500/20' :
                    notification.priority === 'high' ? 'bg-orange-500/20' :
                    notification.priority === 'medium' ? 'bg-yellow-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      notification.priority === 'critical' ? 'text-red-400' :
                      notification.priority === 'high' ? 'text-orange-400' :
                      notification.priority === 'medium' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-white text-sm truncate">
                        {notification.title}
                      </h4>
                      {isUnread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {Math.round(notification.confidence * 100)}% confidence
                      </span>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          notification.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          notification.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          notification.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {notification.priority} priority
                        </span>
                        
                        <span className="text-xs text-gray-400 flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {new Date(notification.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      
                      {notification.actionable && notification.actions && (
                        <div className="flex space-x-1">
                          {notification.actions.slice(0, 2).map((action) => (
                            <Button
                              key={action.id}
                              size="sm"
                              variant="outline"
                              className="text-xs py-1 px-2 h-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                executeAction(notification, action)
                              }}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 5 && !showAll && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(true)}
          >
            Show {filteredNotifications.length - 5} More Notifications
          </Button>
        </div>
      )}

      {/* AI Intelligence Summary */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30 p-4">
        <div className="flex items-center space-x-3 mb-2">
          <SparklesIcon className="h-5 w-5 text-purple-400" />
          <h4 className="font-semibold text-white">AI Intelligence Summary</h4>
        </div>
        <div className="text-sm text-gray-300">
          {unreadCount > 0 ? (
            `${unreadCount} new intelligent insights available. Your AI coach has detected ${
              filteredNotifications.filter(n => n.actionable).length
            } actionable opportunities to improve your team performance.`
          ) : (
            'All caught up! Your AI coach is continuously monitoring for new opportunities and insights.'
          )}
        </div>
      </div>
    </div>
  )
}