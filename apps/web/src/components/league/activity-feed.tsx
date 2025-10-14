'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  ArrowRightLeft,
  PlusCircle,
  MinusCircle,
  Trophy,
  MessageSquare,
  ThumbsUp,
  Heart,
  Laugh,
  Users,
  Clock,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'trade' | 'add' | 'drop' | 'lineup' | 'comment' | 'award'
  user: string
  action: string
  details?: string
  timestamp: Date
  reactions?: {
    type: string
    count: number
    users: string[]
  }[]
}

interface LeagueActivityFeedProps {
  activities: ActivityItem[]
  currentUserId?: string
  onReact?: (activityId: string, reaction: string) => void
}

export function LeagueActivityFeed({
  activities,
  currentUserId,
  onReact
}: LeagueActivityFeedProps) {
  const [filterType, setFilterType] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'trade': return { icon: ArrowRightLeft, color: 'text-blue-400', bg: 'bg-blue-500/10' }
      case 'add': return { icon: PlusCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
      case 'drop': return { icon: MinusCircle, color: 'text-red-400', bg: 'bg-red-500/10' }
      case 'lineup': return { icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' }
      case 'comment': return { icon: MessageSquare, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
      case 'award': return { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
      default: return { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10' }
    }
  }

  const reactions = [
    { icon: ThumbsUp, type: 'like', label: '👍' },
    { icon: Heart, type: 'love', label: '❤️' },
    { icon: Laugh, type: 'laugh', label: '😂' },
    { icon: Trophy, type: 'fire', label: '🔥' }
  ]

  const filteredActivities = filterType === 'all'
    ? activities
    : activities.filter(a => a.type === filterType)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">League Activity</h2>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filter</span>
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {['all', 'trade', 'add', 'drop', 'lineup', 'comment', 'award'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium text-sm transition-all capitalize',
                  filterType === type
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                )}
              >
                {type}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Stream */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredActivities.map((activity, idx) => {
            const iconData = getActivityIcon(activity.type)
            const Icon = iconData.icon

            return (
              <motion.div
                key={activity.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.02 }}
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn('p-2 rounded-lg', iconData.bg)}>
                    <Icon className={cn('w-5 h-5', iconData.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-white">
                          <span className="font-semibold">{activity.user}</span>
                          {' '}
                          <span className="text-slate-300">{activity.action}</span>
                        </p>
                        {activity.details && (
                          <p className="text-sm text-slate-400 mt-1">{activity.details}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</span>
                      </div>
                    </div>

                    {/* Reactions */}
                    <div className="flex items-center gap-2 mt-3">
                      {reactions.map((reaction) => {
                        const userReaction = activity.reactions?.find(r => r.type === reaction.type)
                        const hasReacted = userReaction?.users.includes(currentUserId || '')

                        return (
                          <button
                            key={reaction.type}
                            onClick={() => onReact?.(activity.id, reaction.type)}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                              hasReacted
                                ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                                : 'bg-slate-900/50 border border-slate-700/30 text-slate-400 hover:bg-slate-800/50 hover:border-slate-600'
                            )}
                          >
                            <span>{reaction.label}</span>
                            {userReaction && userReaction.count > 0 && (
                              <span className={cn(hasReacted ? 'text-blue-400' : 'text-slate-400')}>
                                {userReaction.count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Load More */}
      {filteredActivities.length >= 20 && (
        <div className="text-center">
          <button className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium transition-all">
            Load More Activity
          </button>
        </div>
      )}
    </div>
  )
}

