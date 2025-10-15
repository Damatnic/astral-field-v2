'use client'

import { motion } from 'framer-motion'
import { Trophy, TrendingUp, TrendingDown, Award, Target, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamRanking {
  rank: number
  previousRank: number
  teamName: string
  ownerName: string
  record: {
    wins: number
    losses: number
    ties: number
  }
  pointsFor: number
  pointsAgainst: number
  powerScore: number
  trend: 'up' | 'down' | 'same'
  strengthOfSchedule: number
}

interface PowerRankingsProps {
  rankings: TeamRanking[]
  currentUserTeamId?: string
}

export function PowerRankings({ rankings, currentUserTeamId }: PowerRankingsProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-500 to-orange-500'
    if (rank <= 3) return 'from-blue-500 to-purple-500'
    if (rank <= 6) return 'from-emerald-500 to-green-500'
    return 'from-slate-600 to-slate-700'
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="space-y-4">
      {rankings.map((team, idx) => {
        const rankChange = team.previousRank - team.rank
        const isMyTeam = false // TODO: Check against currentUserTeamId

        return (
          <motion.div
            key={team.teamName}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              'relative p-4 rounded-xl border-2 transition-all',
              'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
              isMyTeam
                ? 'border-blue-500/50 shadow-lg shadow-blue-500/20'
                : 'border-slate-700/50 hover:border-slate-600/50'
            )}
          >
            {/* Rank Badge */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                'bg-gradient-to-br', getRankColor(team.rank),
                'text-white font-bold text-lg',
                'shadow-xl border-2 border-slate-900'
              )}>
                {team.rank <= 3 ? getRankBadge(team.rank) : team.rank}
              </div>
            </div>

            <div className="ml-10 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Team Info */}
              <div className="col-span-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-lg">{team.teamName}</h3>
                  {isMyTeam && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-semibold">
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">{team.ownerName}</p>

                {/* Rank Change */}
                {rankChange !== 0 && (
                  <div className={cn(
                    'flex items-center gap-1 mt-1 text-xs font-medium',
                    rankChange > 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {rankChange > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(rankChange)} {rankChange > 0 ? 'up' : 'down'}</span>
                  </div>
                )}
              </div>

              {/* Record */}
              <div className="text-center">
                <div className="text-2xl font-bold text-white tabular-nums">
                  {team.record.wins}-{team.record.losses}
                  {team.record.ties > 0 && `-${team.record.ties}`}
                </div>
                <div className="text-xs text-slate-400">Record</div>
              </div>

              {/* Points For */}
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-400 tabular-nums">
                  {team.pointsFor.toFixed(1)}
                </div>
                <div className="text-xs text-slate-400">Points For</div>
              </div>

              {/* Power Score */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <div className="text-xl font-bold text-yellow-400 tabular-nums">
                    {team.powerScore.toFixed(1)}
                  </div>
                </div>
                <div className="text-xs text-slate-400">Power Score</div>

                {/* Strength of Schedule */}
                <div className="text-xs text-slate-500 mt-1">
                  SoS: {team.strengthOfSchedule.toFixed(2)}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

