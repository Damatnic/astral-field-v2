'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check, CheckCheck, Trash2, Settings, Filter } from 'lucide-react'
import { notificationManager, Notification, NotificationType } from '@/lib/notifications/notification-manager'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Subscribe to notification updates
    const unsubscribe = notificationManager.subscribe((notifs) => {
      setNotifications(notifs)
      setUnreadCount(notificationManager.getUnreadCount())
    })

    // Load initial notifications
    setNotifications(notificationManager.getNotifications())
    setUnreadCount(notificationManager.getUnreadCount())

    return unsubscribe
  }, [])

  useEffect(() => {
    // Close panel when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const filteredNotifications = filterType === 'all'
    ? notifications
    : notifications.filter(n => n.type === filterType)

  const handleMarkAsRead = (notificationId: string) => {
    notificationManager.markAsRead(notificationId)
  }

  const handleMarkAllAsRead = () => {
    notificationManager.markAllAsRead()
  }

  const handleRemove = (notificationId: string) => {
    notificationManager.removeNotification(notificationId)
  }

  const handleClearAll = () => {
    notificationManager.clearAll()
    setIsOpen(false)
  }

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-500/5'
      case 'high':
        return 'border-l-orange-500 bg-orange-500/5'
      case 'normal':
        return 'border-l-blue-500 bg-blue-500/5'
      case 'low':
        return 'border-l-slate-500 bg-slate-500/5'
      default:
        return 'border-l-slate-500 bg-slate-500/5'
    }
  }

  const getTypeIcon = (type: NotificationType) => {
    const iconClass = "w-4 h-4"
    switch (type) {
      case 'trade':
        return <span className={iconClass}>🔄</span>
      case 'waiver':
        return <span className={iconClass}>⚡</span>
      case 'matchup':
        return <span className={iconClass}>⚔️</span>
      case 'news':
        return <span className={iconClass}>📰</span>
      case 'lineup':
        return <span className={iconClass}>📋</span>
      case 'system':
        return <span className={iconClass}>⚙️</span>
      default:
        return <span className={iconClass}>🔔</span>
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-400" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-96 max-h-[600px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-blue-400"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-red-400"
                      title="Clear all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter */}
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  All
                </button>
                {(['trade', 'waiver', 'matchup', 'news', 'lineup', 'system'] as NotificationType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                      filterType === type
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 border-l-4 ${getPriorityColor(notification.priority)} ${
                        !notification.read ? '' : 'opacity-60'
                      } hover:bg-slate-800/50 transition-colors group`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Type Icon */}
                        <div className="mt-0.5">
                          {getTypeIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-white text-sm">
                              {notification.title}
                            </h4>
                            <button
                              onClick={() => handleRemove(notification.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 transition-all"
                            >
                              <X className="w-3 h-3 text-slate-400" />
                            </button>
                          </div>
                          
                          <p className="text-sm text-slate-300 mt-1">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-500">
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </span>

                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  Mark read
                                </button>
                              )}
                              {notification.actionUrl && (
                                <a
                                  href={notification.actionUrl}
                                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                                  onClick={() => {
                                    handleMarkAsRead(notification.id)
                                    setIsOpen(false)
                                  }}
                                >
                                  {notification.actionLabel || 'View'}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

