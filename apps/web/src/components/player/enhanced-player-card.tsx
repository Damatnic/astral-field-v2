'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Flame,
  AlertCircle,
  ArrowRightLeft,
  PlusCircle,
  MinusCircle,
  BarChart3,
  Newspaper,
  Sparkles,
  MoreVertical,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayerCardProps {
  player: {
    id: string
    name: string
    position: string
    team: string
    fantasyPoints: number
    projectedPoints: number
    status?: 'ACTIVE' | 'INJURED' | 'OUT' | 'QUESTIONABLE' | 'DOUBTFUL'
    trending?: 'up' | 'down' | 'hot'
    lastFiveGames?: number[]
    ownership?: number
    isOnMyTeam?: boolean
  }
  variant?: 'compact' | 'expanded' | 'detailed'
  onAction?: (action: string, playerId: string) => void
  showQuickActions?: boolean
}

export function EnhancedPlayerCard({
  player,
  variant = 'compact',
  onAction,
  showQuickActions = true
}: PlayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'QUESTIONABLE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'DOUBTFUL': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'OUT':
      case 'INJURED': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: 'bg-red-500/10 text-red-400 border-red-500/20',
      RB: 'bg-green-500/10 text-green-400 border-green-500/20',
      WR: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      TE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      K: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      DST: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      DEF: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    }
    return colors[position] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }

  const getTrendingIcon = () => {
    switch (player.trending) {
      case 'hot':
        return <Flame className="w-4 h-4 text-red-400" />
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  const quickActions = [
    { icon: PlusCircle, label: 'Add', action: 'add', color: 'text-emerald-400 hover:text-emerald-300' },
    { icon: MinusCircle, label: 'Drop', action: 'drop', color: 'text-red-400 hover:text-red-300' },
    { icon: ArrowRightLeft, label: 'Trade', action: 'trade', color: 'text-blue-400 hover:text-blue-300' },
    { icon: BarChart3, label: 'Stats', action: 'stats', color: 'text-purple-400 hover:text-purple-300' },
    { icon: Newspaper, label: 'News', action: 'news', color: 'text-yellow-400 hover:text-yellow-300' },
    { icon: Sparkles, label: 'AI', action: 'ai', color: 'text-pink-400 hover:text-pink-300' }
  ]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative group',
        'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
        'border border-slate-700/50 rounded-xl',
        'hover:border-slate-600/50 hover:shadow-xl hover:shadow-blue-500/10',
        'transition-all duration-300 cursor-pointer overflow-hidden',
        variant === 'expanded' && 'p-4',
        variant === 'compact' && 'p-3'
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white truncate">{player.name}</h3>
              {getTrendingIcon()}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium border',
                getPositionColor(player.position)
              )}>
                {player.position}
              </span>
              <span className="text-sm text-slate-400">{player.team}</span>
              {player.status && player.status !== 'ACTIVE' && (
                <span className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium border',
                  getStatusColor(player.status)
                )}>
                  {player.status}
                </span>
              )}
            </div>
          </div>

          {/* Stats Preview */}
          <div className="flex flex-col items-end ml-3">
            <div className="text-2xl font-bold text-white tabular-nums">
              {player.fantasyPoints.toFixed(1)}
            </div>
            <div className="text-xs text-slate-400">
              Proj: {player.projectedPoints.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Quick Actions Menu */}
        {showQuickActions && (
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-slate-700/50"
              >
                <div className="grid grid-cols-6 gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.action}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAction?.(action.action, player.id)
                        setShowActions(false)
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg',
                        'bg-slate-800/50 hover:bg-slate-700/50',
                        'transition-colors duration-200',
                        action.color
                      )}
                    >
                      <action.icon className="w-4 h-4" />
                      <span className="text-xs">{action.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && variant !== 'compact' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-slate-700/50"
            >
              {/* Last 5 Games Mini Chart */}
              {player.lastFiveGames && (
                <div className="mb-3">
                  <div className="text-xs text-slate-400 mb-2">Last 5 Games</div>
                  <div className="flex items-end gap-1 h-16">
                    {player.lastFiveGames.map((points, idx) => {
                      const maxPoints = Math.max(...player.lastFiveGames!)
                      const height = (points / maxPoints) * 100
                      return (
                        <div
                          key={idx}
                          className="flex-1 relative group/bar"
                        >
                          <div
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-400 hover:to-blue-300"
                            style={{ height: `${height}%` }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                            {points.toFixed(1)} pts
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {player.ownership !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Owned:</span>
                    <span className="text-white font-medium">{player.ownership}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg:</span>
                  <span className="text-white font-medium">
                    {player.lastFiveGames 
                      ? (player.lastFiveGames.reduce((a, b) => a + b, 0) / player.lastFiveGames.length).toFixed(1)
                      : player.fantasyPoints.toFixed(1)
                    }
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions Toggle Button */}
      {showQuickActions && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowActions(!showActions)
          }}
          className={cn(
            'absolute top-2 right-2 z-20',
            'p-1.5 rounded-lg',
            'bg-slate-800/80 hover:bg-slate-700/80',
            'border border-slate-700/50',
            'transition-all duration-200',
            'opacity-0 group-hover:opacity-100'
          )}
        >
          {showActions ? (
            <X className="w-4 h-4 text-slate-400" />
          ) : (
            <MoreVertical className="w-4 h-4 text-slate-400" />
          )}
        </button>
      )}

      {/* On My Team Indicator */}
      {player.isOnMyTeam && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-400 font-medium">
          My Team
        </div>
      )}
    </motion.div>
  )
}

