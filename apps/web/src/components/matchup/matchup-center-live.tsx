'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  TrendingUp,
  Flame,
  Target,
  Activity,
  Percent,
  Zap,
  MessageSquare,
  ThumbsUp,
  Heart,
  Laugh,
  Frown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayerBattle {
  position: string
  myPlayer: {
    id: string
    name: string
    team: string
    points: number
    projected: number
  } | null
  oppPlayer: {
    id: string
    name: string
    team: string
    points: number
    projected: number
  } | null
}

interface MatchupCenterProps {
  myTeam: {
    name: string
    score: number
    projected: number
  }
  opponent: {
    name: string
    score: number
    projected: number
  }
  battles: PlayerBattle[]
  winProbability: number
  momentum: number // -100 to 100
}

export function MatchupCenterLive({
  myTeam,
  opponent,
  battles,
  winProbability,
  momentum
}: MatchupCenterProps) {
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null)

  const isWinning = myTeam.score > opponent.score
  const scoreDiff = Math.abs(myTeam.score - opponent.score)

  const reactions = [
    { icon: ThumbsUp, label: 'Nice!', color: 'text-blue-400' },
    { icon: Flame, label: 'Fire', color: 'text-orange-400' },
    { icon: Heart, label: 'Love', color: 'text-red-400' },
    { icon: Laugh, label: 'LOL', color: 'text-yellow-400' },
    { icon: Frown, label: 'Oof', color: 'text-slate-400' }
  ]

  return (
    <div className="space-y-6">
      {/* Matchup Header */}
      <div className="grid grid-cols-3 gap-4">
        {/* My Team */}
        <motion.div
          animate={isWinning ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          className={cn(
            'p-6 rounded-xl border-2',
            'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
            isWinning
              ? 'border-emerald-500/50 shadow-xl shadow-emerald-500/20'
              : 'border-slate-700/50'
          )}
        >
          <div className="text-sm text-slate-400 mb-2 truncate">{myTeam.name}</div>
          <div className={cn(
            'text-5xl font-bold tabular-nums mb-2',
            isWinning ? 'text-emerald-400' : 'text-white'
          )}>
            {myTeam.score.toFixed(1)}
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400 tabular-nums">
              {myTeam.projected.toFixed(1)}
            </span>
          </div>
        </motion.div>

        {/* Center Stats */}
        <div className="p-6 rounded-xl border-2 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
          <div className="space-y-4">
            {/* Win Probability */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-400">Win Probability</span>
              </div>
              <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '50%' }}
                  animate={{ width: `${winProbability}%` }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    'absolute inset-y-0 left-0',
                    'bg-gradient-to-r',
                    winProbability > 50
                      ? 'from-emerald-500 to-emerald-400'
                      : 'from-red-500 to-red-400'
                  )}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className={cn(
                  'text-lg font-bold tabular-nums',
                  winProbability > 50 ? 'text-emerald-400' : 'text-slate-500'
                )}>
                  {winProbability}%
                </span>
                <span className={cn(
                  'text-lg font-bold tabular-nums',
                  winProbability < 50 ? 'text-red-400' : 'text-slate-500'
                )}>
                  {(100 - winProbability)}%
                </span>
              </div>
            </div>

            {/* Momentum */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-slate-400">Momentum</span>
              </div>
              <div className="relative h-2 bg-slate-700 rounded-full">
                <motion.div
                  animate={{ left: `${50 + (momentum / 2)}%` }}
                  transition={{ type: 'spring', damping: 20 }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-yellow-500 shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Opponent */}
        <motion.div
          animate={!isWinning ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          className={cn(
            'p-6 rounded-xl border-2',
            'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
            !isWinning
              ? 'border-red-500/50 shadow-xl shadow-red-500/20'
              : 'border-slate-700/50'
          )}
        >
          <div className="text-sm text-slate-400 mb-2 truncate">{opponent.name}</div>
          <div className={cn(
            'text-5xl font-bold tabular-nums mb-2',
            !isWinning ? 'text-red-400' : 'text-white'
          )}>
            {opponent.score.toFixed(1)}
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400 tabular-nums">
              {opponent.projected.toFixed(1)}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Player Battles */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Player Battles</h3>
        </div>

        <div className="space-y-3">
          {battles.map((battle, idx) => {
            const myPoints = battle.myPlayer?.points || 0
            const oppPoints = battle.oppPlayer?.points || 0
            const isLeading = myPoints > oppPoints

            return (
              <div
                key={idx}
                className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/30"
              >
                <div className="text-xs text-slate-400 mb-3 text-center">{battle.position}</div>

                <div className="grid grid-cols-3 gap-3 items-center">
                  {/* My Player */}
                  <div className={cn(
                    'p-3 rounded-lg border transition-all',
                    isLeading
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-800/30 border-slate-700/30'
                  )}>
                    <div className="text-sm font-medium text-white truncate">
                      {battle.myPlayer?.name || 'Empty'}
                    </div>
                    {battle.myPlayer && (
                      <>
                        <div className="text-xs text-slate-400">{battle.myPlayer.team}</div>
                        <div className={cn(
                          'text-2xl font-bold tabular-nums mt-1',
                          isLeading ? 'text-emerald-400' : 'text-white'
                        )}>
                          {myPoints.toFixed(1)}
                        </div>
                      </>
                    )}
                  </div>

                  {/* VS Indicator */}
                  <div className="text-center">
                    <div className="text-xs text-slate-600 font-bold">VS</div>
                    {battle.myPlayer && battle.oppPlayer && (
                      <div className={cn(
                        'text-sm font-bold tabular-nums',
                        isLeading ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {isLeading ? '+' : ''}{(myPoints - oppPoints).toFixed(1)}
                      </div>
                    )}
                  </div>

                  {/* Opponent Player */}
                  <div className={cn(
                    'p-3 rounded-lg border transition-all',
                    !isLeading && oppPoints > 0
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-slate-800/30 border-slate-700/30'
                  )}>
                    <div className="text-sm font-medium text-white truncate">
                      {battle.oppPlayer?.name || 'Empty'}
                    </div>
                    {battle.oppPlayer && (
                      <>
                        <div className="text-xs text-slate-400">{battle.oppPlayer.team}</div>
                        <div className={cn(
                          'text-2xl font-bold tabular-nums mt-1',
                          !isLeading && oppPoints > 0 ? 'text-red-400' : 'text-white'
                        )}>
                          {oppPoints.toFixed(1)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trash Talk / Reactions */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-3">
          <MessageSquare className="w-5 h-5 text-pink-400" />
          <h3 className="font-semibold text-white">Quick Reactions</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {reactions.map((reaction) => (
            <button
              key={reaction.label}
              onClick={() => setSelectedReaction(reaction.label)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'border transition-all',
                selectedReaction === reaction.label
                  ? 'bg-blue-500/20 border-blue-500/50 scale-110'
                  : 'bg-slate-900/30 border-slate-700/30 hover:border-slate-600'
              )}
            >
              <reaction.icon className={cn('w-5 h-5', reaction.color)} />
              <span className="text-sm text-slate-300">{reaction.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

