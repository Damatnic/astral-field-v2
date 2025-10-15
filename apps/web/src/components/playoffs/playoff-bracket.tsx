'use client'

import { motion } from 'framer-motion'
import { Trophy, Crown, Flame, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayoffMatchup {
  id: string
  round: number
  matchupNumber: number
  team1?: {
    id: string
    name: string
    seed: number
    score?: number
    isWinner?: boolean
  }
  team2?: {
    id: string
    name: string
    seed: number
    score?: number
    isWinner?: boolean
  }
  winProbability?: number
  status: 'upcoming' | 'in_progress' | 'complete'
}

interface PlayoffBracketProps {
  matchups: PlayoffMatchup[]
  champion?: {
    teamName: string
    ownerName: string
    finalScore: number
  }
}

export function PlayoffBracket({ matchups, champion }: PlayoffBracketProps) {
  const getRoundName = (round: number) => {
    switch (round) {
      case 1: return 'Quarterfinals'
      case 2: return 'Semifinals'
      case 3: return 'Championship'
      default: return `Round ${round}`
    }
  }

  const rounds = [...new Set(matchups.map(m => m.round))].sort()

  return (
    <div className="space-y-8">
      {/* Champion Banner */}
      {champion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative p-8 rounded-2xl bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-yellow-500/20 border-2 border-yellow-500/50 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/confetti.svg')] opacity-10" />
          
          <div className="relative z-10 text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Crown className="w-12 h-12 text-yellow-400" />
              <h2 className="text-4xl font-bold text-white">League Champion</h2>
              <Crown className="w-12 h-12 text-yellow-400" />
            </div>

            <div>
              <div className="text-3xl font-bold text-yellow-400">{champion.teamName}</div>
              <div className="text-lg text-slate-300">{champion.ownerName}</div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-white tabular-nums">
                {champion.finalScore.toFixed(1)} pts
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bracket */}
      <div className="space-y-8">
        {rounds.map((round) => {
          const roundMatchups = matchups.filter(m => m.round === round)

          return (
            <div key={round} className="space-y-4">
              <div className="flex items-center gap-3">
                {round === 3 && <Crown className="w-6 h-6 text-yellow-400" />}
                {round === 2 && <Trophy className="w-6 h-6 text-blue-400" />}
                {round === 1 && <Flame className="w-6 h-6 text-orange-400" />}
                <h3 className="text-xl font-bold text-white">{getRoundName(round)}</h3>
              </div>

              <div className={cn(
                'grid gap-4',
                roundMatchups.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
                roundMatchups.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
              )}>
                {roundMatchups.map((matchup, idx) => (
                  <motion.div
                    key={matchup.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      'p-4 rounded-xl border-2',
                      'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
                      matchup.status === 'in_progress' && 'border-blue-500/50 shadow-lg shadow-blue-500/20',
                      matchup.status === 'complete' && 'border-slate-700/50',
                      matchup.status === 'upcoming' && 'border-slate-700/30'
                    )}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-400">Matchup {matchup.matchupNumber}</span>
                      {matchup.status === 'in_progress' && (
                        <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          LIVE
                        </span>
                      )}
                      {matchup.status === 'complete' && (
                        <span className="px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs font-semibold">
                          FINAL
                        </span>
                      )}
                    </div>

                    {/* Team 1 */}
                    {matchup.team1 ? (
                      <div className={cn(
                        'p-3 rounded-lg mb-2 transition-all',
                        matchup.team1.isWinner
                          ? 'bg-emerald-500/20 border-2 border-emerald-500/50'
                          : 'bg-slate-800/50 border border-slate-700/30'
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                              #{matchup.team1.seed}
                            </span>
                            <span className={cn(
                              'font-medium truncate',
                              matchup.team1.isWinner ? 'text-emerald-400' : 'text-white'
                            )}>
                              {matchup.team1.name}
                            </span>
                          </div>
                          {matchup.team1.score !== undefined && (
                            <span className={cn(
                              'text-xl font-bold tabular-nums',
                              matchup.team1.isWinner ? 'text-emerald-400' : 'text-white'
                            )}>
                              {matchup.team1.score.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg mb-2 bg-slate-800/30 border border-dashed border-slate-700">
                        <span className="text-sm text-slate-500">TBD</span>
                      </div>
                    )}

                    {/* VS Divider */}
                    <div className="text-center my-2">
                      <span className="text-xs text-slate-600 font-bold">VS</span>
                      {matchup.winProbability && (
                        <div className="text-xs text-blue-400 mt-1">
                          {matchup.winProbability}% / {100 - matchup.winProbability}%
                        </div>
                      )}
                    </div>

                    {/* Team 2 */}
                    {matchup.team2 ? (
                      <div className={cn(
                        'p-3 rounded-lg transition-all',
                        matchup.team2.isWinner
                          ? 'bg-emerald-500/20 border-2 border-emerald-500/50'
                          : 'bg-slate-800/50 border border-slate-700/30'
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                              #{matchup.team2.seed}
                            </span>
                            <span className={cn(
                              'font-medium truncate',
                              matchup.team2.isWinner ? 'text-emerald-400' : 'text-white'
                            )}>
                              {matchup.team2.name}
                            </span>
                          </div>
                          {matchup.team2.score !== undefined && (
                            <span className={cn(
                              'text-xl font-bold tabular-nums',
                              matchup.team2.isWinner ? 'text-emerald-400' : 'text-white'
                            )}>
                              {matchup.team2.score.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-800/30 border border-dashed border-slate-700">
                        <span className="text-sm text-slate-500">TBD</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

