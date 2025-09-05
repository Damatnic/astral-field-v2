'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  X, 
  AlertCircle, 
  Trophy, 
  Users, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  Star
} from 'lucide-react'

interface Notification {
  id: string
  type: 'draft' | 'trade' | 'waiver' | 'matchup' | 'achievement' | 'general'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  priority: 'low' | 'medium' | 'high'
}

interface NotificationCenterProps {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onDelete: (id: string) => void
}

const notificationConfig = {
  draft: { icon: Trophy, color: 'text-yellow-400 bg-yellow-500/10' },
  trade: { icon: Users, color: 'text-blue-400 bg-blue-500/10' },
  waiver: { icon: TrendingUp, color: 'text-green-400 bg-green-500/10' },
  matchup: { icon: Calendar, color: 'text-purple-400 bg-purple-500/10' },
  achievement: { icon: Star, color: 'text-orange-400 bg-orange-500/10' },
  general: { icon: AlertCircle, color: 'text-gray-400 bg-gray-500/10' }
}

export const NotificationCenter = React.memo(function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // Sort by priority (high first), then by timestamp (newest first)
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }
    return b.timestamp.getTime() - a.timestamp.getTime()
  })

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkRead(notification.id)
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-medium text-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl z-50 max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-b border-gray-700">
                {(['all', 'unread'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      filter === filterType
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                    {filterType === 'unread' && unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-gray-600 text-xs rounded">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Actions */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                  <button
                    onClick={onMarkAllRead}
                    className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </button>
                  <span className="text-xs text-gray-500">
                    {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto">
                {sortedNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      You're all caught up!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {sortedNotifications.map((notification, index) => {
                      const config = notificationConfig[notification.type]
                      const Icon = config.icon

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 hover:bg-gray-700/30 transition-colors cursor-pointer ${
                            !notification.read ? 'bg-blue-500/5' : ''
                          } ${notification.priority === 'high' ? 'border-l-4 border-red-500' : ''}`}
                        >
                          <div className="flex space-x-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${config.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className={`text-sm font-medium ${
                                  notification.read ? 'text-gray-300' : 'text-white'
                                }`}>
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-400 mb-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {formatTime(notification.timestamp)}
                                </span>
                                
                                <div className="flex space-x-2">
                                  {notification.priority === 'high' && (
                                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                      High
                                    </span>
                                  )}
                                  {!notification.read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onMarkRead(notification.id)
                                      }}
                                      className="p-1 text-gray-400 hover:text-green-400 rounded"
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onDelete(notification.id)
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-400 rounded"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
})

// Mock data generator for development
export const createMockNotifications = (): Notification[] => [
  {
    id: '1',
    type: 'draft',
    title: 'Draft Starting Soon!',
    message: 'Your league "Championship Dynasty" draft begins in 30 minutes.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    read: false,
    actionUrl: '/leagues/1/draft',
    priority: 'high'
  },
  {
    id: '2',
    type: 'trade',
    title: 'Trade Proposal Received',
    message: 'Mike wants to trade Derrick Henry for your Josh Allen.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    actionUrl: '/leagues/1/trades',
    priority: 'medium'
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Achievement Unlocked!',
    message: 'Congratulations! You scored 150+ points this week.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    read: true,
    priority: 'low'
  }
]