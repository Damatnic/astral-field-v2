'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Trophy, Target, Zap, Award } from 'lucide-react'

interface StatData {
  label: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period: string
  }
  icon?: React.ComponentType<{ className?: string }>
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'
}

interface StatsWidgetProps {
  title: string
  stats: StatData[]
  variant?: 'compact' | 'detailed'
  showTrends?: boolean
}

const colorClasses = {
  blue: 'text-blue-400 bg-blue-500/10',
  green: 'text-green-400 bg-green-500/10',
  red: 'text-red-400 bg-red-500/10',
  yellow: 'text-yellow-400 bg-yellow-500/10',
  purple: 'text-purple-400 bg-purple-500/10',
  orange: 'text-orange-400 bg-orange-500/10'
}

export const StatsWidget = React.memo(function StatsWidget({
  title,
  stats,
  variant = 'detailed',
  showTrends = true
}: StatsWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl border border-gray-700 p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
        {title}
      </h3>

      <div className={`grid gap-4 ${
        variant === 'compact' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
      }`}>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`${
              variant === 'compact' 
                ? 'p-3' 
                : 'p-4 bg-gray-900/50 rounded-lg border border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {stat.icon && (
                  <div className={`p-1.5 rounded-lg ${
                    stat.color ? colorClasses[stat.color] : 'text-gray-400 bg-gray-500/10'
                  }`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                )}
                <span className="text-sm text-gray-400">{stat.label}</span>
              </div>
              
              {showTrends && stat.change && (
                <div className={`flex items-center space-x-1 text-xs ${
                  stat.change.type === 'increase' 
                    ? 'text-green-400' 
                    : stat.change.type === 'decrease'
                    ? 'text-red-400'
                    : 'text-gray-400'
                }`}>
                  {stat.change.type === 'increase' && <TrendingUp className="h-3 w-3" />}
                  {stat.change.type === 'decrease' && <TrendingDown className="h-3 w-3" />}
                  <span>{Math.abs(stat.change.value)}%</span>
                </div>
              )}
            </div>

            <div className="flex items-end justify-between">
              <span className={`${
                variant === 'compact' ? 'text-lg' : 'text-2xl'
              } font-bold text-white`}>
                {stat.value}
              </span>
              
              {showTrends && stat.change && (
                <span className="text-xs text-gray-500">
                  vs {stat.change.period}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
})

// Predefined stat configurations for common fantasy football metrics
export const fantasyStatsConfigs = {
  player: (playerData: any) => ({
    title: 'Player Performance',
    stats: [
      {
        label: 'Fantasy Points',
        value: playerData.fantasyPoints || '0.0',
        icon: Target,
        color: 'blue' as const,
        change: {
          value: playerData.pointsChange || 0,
          type: (playerData.pointsChange || 0) >= 0 ? 'increase' : 'decrease',
          period: 'last week'
        }
      },
      {
        label: 'Targets/Carries',
        value: playerData.opportunities || 0,
        icon: Zap,
        color: 'green' as const
      },
      {
        label: 'Red Zone Touches',
        value: playerData.redZoneTouches || 0,
        icon: Trophy,
        color: 'red' as const
      },
      {
        label: 'Snap %',
        value: `${playerData.snapPercentage || 0}%`,
        icon: Award,
        color: 'purple' as const
      }
    ]
  }),

  team: (teamData: any) => ({
    title: 'Team Stats',
    stats: [
      {
        label: 'Total Points',
        value: teamData.totalPoints || 0,
        icon: Trophy,
        color: 'yellow' as const,
        change: {
          value: teamData.pointsChange || 0,
          type: (teamData.pointsChange || 0) >= 0 ? 'increase' : 'decrease',
          period: 'last week'
        }
      },
      {
        label: 'League Rank',
        value: `#${teamData.rank || '?'}`,
        icon: Award,
        color: 'blue' as const
      },
      {
        label: 'Record',
        value: `${teamData.wins || 0}-${teamData.losses || 0}`,
        icon: Target,
        color: 'green' as const
      }
    ]
  }),

  league: (leagueData: any) => ({
    title: 'League Overview',
    stats: [
      {
        label: 'Teams',
        value: leagueData.teamCount || 0,
        icon: Trophy,
        color: 'blue' as const
      },
      {
        label: 'Week',
        value: leagueData.currentWeek || 1,
        icon: Target,
        color: 'green' as const
      },
      {
        label: 'Avg Score',
        value: leagueData.averageScore || '0.0',
        icon: Zap,
        color: 'purple' as const
      }
    ]
  })
}