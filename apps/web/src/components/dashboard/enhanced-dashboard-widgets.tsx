'use client'

import { motion } from 'framer-motion'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Zap,
  Calendar,
  AlertCircle,
  Flame,
  Activity,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface QuickStat {
  label: string
  value: string | number
  change?: number
  trend?: 'up' | 'down'
  icon: any
  color: string
}

interface UpcomingMatchup {
  opponent: string
  week: number
  projectedMyScore: number
  projectedOppScore: number
  winProbability: number
}

interface TopPerformer {
  playerId: string
  name: string
  position: string
  team: string
  points: number
  trend: 'hot' | 'up' | 'down'
}

interface EnhancedDashboardWidgetsProps {
  stats: QuickStat[]
  upcomingMatchup?: UpcomingMatchup
  topPerformers: TopPerformer[]
  recentActivity?: any[]
}

export function EnhancedDashboardWidgets({
  stats,
  upcomingMatchup,
  topPerformers,
  recentActivity = []
}: EnhancedDashboardWidgetsProps) {
  
  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              'p-6 rounded-xl border',
              'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
              'border-slate-700/50',
              'hover:border-slate-600/50 hover:shadow-xl hover:shadow-blue-500/10',
              'transition-all duration-300 group cursor-pointer'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-slate-400 mb-2">{stat.label}</div>
                <div className="text-3xl font-bold text-white tabular-nums">
                  {stat.value}
                </div>
                {stat.change !== undefined && (
                  <div className={cn(
                    'flex items-center gap-1 mt-2 text-sm font-medium',
                    stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(stat.change)}%</span>
                  </div>
                )}
              </div>
              <div className={cn(
                'p-3 rounded-lg',
                stat.color,
                'group-hover:scale-110 transition-transform'
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Upcoming Matchup Card */}
      {upcomingMatchup && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-blue-500/10"
        >
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">Next Matchup - Week {upcomingMatchup.week}</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Your Team */}
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-2">You</div>
              <div className="text-4xl font-bold text-white tabular-nums">
                {upcomingMatchup.projectedMyScore.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500 mt-1">projected</div>
            </div>

            {/* VS + Win Probability */}
            <div className="text-center">
              <div className="text-xs text-slate-600 font-bold mb-2">VS</div>
              
              {/* Win Probability Circle */}
              <div className="relative w-24 h-24 mx-auto">
                <svg className="transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgb(71, 85, 105)"
                    strokeWidth="10"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={upcomingMatchup.winProbability > 50 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                    animate={{ 
                      strokeDashoffset: 2 * Math.PI * 45 * (1 - upcomingMatchup.winProbability / 100)
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={cn(
                      'text-2xl font-bold tabular-nums',
                      upcomingMatchup.winProbability > 50 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {upcomingMatchup.winProbability}%
                    </div>
                    <div className="text-xs text-slate-500">to win</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Opponent */}
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-2">{upcomingMatchup.opponent}</div>
              <div className="text-4xl font-bold text-white tabular-nums">
                {upcomingMatchup.projectedOppScore.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500 mt-1">projected</div>
            </div>
          </div>

          <Link
            href="/matchups"
            className="mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
          >
            <span>View Full Matchup</span>
          </Link>
        </motion.div>
      )}

      {/* Top Performers This Week */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-yellow-400" />
            <h3 className="text-xl font-bold text-white">Top Performers</h3>
          </div>
          <Link
            href="/team"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View Full Roster →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers.slice(0, 3).map((player, idx) => (
            <motion.div
              key={player.playerId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="relative p-4 rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-yellow-500/50 transition-all group cursor-pointer overflow-hidden"
            >
              {/* Rank Badge */}
              {idx === 0 && (
                <div className="absolute -top-1 -right-1 px-2 py-1 rounded-full bg-yellow-500 text-xs font-bold text-slate-900">
                  #1
                </div>
              )}

              {/* Trending Icon */}
              <div className="absolute top-3 left-3">
                {player.trend === 'hot' ? (
                  <Flame className="w-5 h-5 text-orange-400" />
                ) : player.trend === 'up' ? (
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-white truncate">{player.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {player.position}
                  </span>
                  <span className="text-xs text-slate-400">{player.team}</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white tabular-nums">
                      {player.points.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500">fantasy pts</div>
                  </div>
                  <div className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold',
                    idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    idx === 1 ? 'bg-slate-500/20 text-slate-400' :
                    'bg-orange-500/20 text-orange-400'
                  )}>
                    #{idx + 1} This Week
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Set Lineup', href: '/team', icon: Users, color: 'from-blue-500 to-blue-600' },
          { label: 'Claim Players', href: '/waivers', icon: Zap, color: 'from-purple-500 to-purple-600' },
          { label: 'Propose Trade', href: '/trades', icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Research Players', href: '/players', icon: Target, color: 'from-orange-500 to-orange-600' }
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={cn(
              'flex flex-col items-center gap-3 p-6 rounded-xl',
              'bg-gradient-to-br', action.color,
              'text-white font-semibold',
              'hover:scale-105 hover:shadow-xl',
              'transition-all duration-300',
              'group'
            )}
          >
            <action.icon className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-center">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

