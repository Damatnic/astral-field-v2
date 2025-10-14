'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tv,
  TrendingUp,
  TrendingDown,
  Zap,
  Trophy,
  AlertCircle,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveGame {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  quarter: string
  timeRemaining: string
  status: 'pregame' | 'in_progress' | 'final' | 'halftime'
  possession?: 'home' | 'away'
}

interface LivePlayer {
  id: string
  name: string
  position: string
  team: string
  currentPoints: number
  projectedPoints: number
  gameStatus: 'active' | 'inactive' | 'complete'
  lastUpdate?: string
  recentPlays?: string[]
}

interface LiveScoringDashboardProps {
  games: LiveGame[]
  myPlayers: LivePlayer[]
  opponentScore?: number
  onPlayerClick?: (playerId: string) => void
}

export function LiveScoringDashboard({
  games,
  myPlayers,
  opponentScore = 0,
  onPlayerClick
}: LiveScoringDashboardProps) {
  const [liveUpdates, setLiveUpdates] = useState<Map<string, number>>(new Map())
  const [lastScoreUpdate, setLastScoreUpdate] = useState<{playerId: string, points: number} | null>(null)

  const myTotalScore = myPlayers.reduce((sum, p) => sum + p.currentPoints, 0)
  const myProjected = myPlayers.reduce((sum, p) => sum + p.projectedPoints, 0)
  const activePlayers = myPlayers.filter(p => p.gameStatus === 'active').length
  const completePlayers = myPlayers.filter(p => p.gameStatus === 'complete').length

  const isWinning = myTotalScore > opponentScore
  const scoreDiff = Math.abs(myTotalScore - opponentScore)

  useEffect(() => {
    // Simulate live updates (replace with real SSE)
    const interval = setInterval(() => {
      const activePlayers = myPlayers.filter(p => p.gameStatus === 'active')
      if (activePlayers.length > 0) {
        const randomPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)]
        const pointsGained = Math.random() * 5
        
        setLiveUpdates(prev => {
          const newMap = new Map(prev)
          newMap.set(randomPlayer.id, pointsGained)
          return newMap
        })
        
        setLastScoreUpdate({ playerId: randomPlayer.id, points: pointsGained })
        
        // Clear after animation
        setTimeout(() => {
          setLiveUpdates(prev => {
            const newMap = new Map(prev)
            newMap.delete(randomPlayer.id)
            return newMap
          })
        }, 2000)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [myPlayers])

  const getGameStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-red-500'
      case 'halftime': return 'bg-yellow-500'
      case 'final': return 'bg-slate-500'
      default: return 'bg-slate-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* My Score */}
        <motion.div
          animate={isWinning ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5 }}
          className={cn(
            'p-6 rounded-xl border-2',
            'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
            isWinning 
              ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/20' 
              : 'border-slate-700/50'
          )}
        >
          <div className="text-sm text-slate-400 mb-2">My Team</div>
          <div className="flex items-baseline gap-3">
            <div className={cn(
              'text-5xl font-bold tabular-nums',
              isWinning ? 'text-emerald-400' : 'text-white'
            )}>
              {myTotalScore.toFixed(1)}
            </div>
            {isWinning && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-emerald-400"
              >
                <TrendingUp className="w-6 h-6" />
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-slate-400">Projected:</span>
            <span className="text-sm font-semibold text-blue-400 tabular-nums">
              {myProjected.toFixed(1)}
            </span>
          </div>
        </motion.div>

        {/* Score Difference */}
        <div className="p-6 rounded-xl border-2 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
          <div className="text-sm text-slate-400 mb-2">
            {isWinning ? 'Leading By' : 'Trailing By'}
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              'text-4xl font-bold tabular-nums',
              isWinning ? 'text-emerald-400' : 'text-red-400'
            )}>
              {scoreDiff.toFixed(1)}
            </div>
            {isWinning ? (
              <Trophy className="w-6 h-6 text-emerald-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400" />
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {activePlayers} active • {completePlayers} final
          </div>
        </div>

        {/* Opponent Score */}
        <div className={cn(
          'p-6 rounded-xl border-2',
          'bg-gradient-to-br from-slate-800/50 to-slate-900/50',
          !isWinning 
            ? 'border-red-500/50 shadow-lg shadow-red-500/20' 
            : 'border-slate-700/50'
        )}>
          <div className="text-sm text-slate-400 mb-2">Opponent</div>
          <div className="flex items-baseline gap-3">
            <div className={cn(
              'text-5xl font-bold tabular-nums',
              !isWinning ? 'text-red-400' : 'text-white'
            )}>
              {opponentScore.toFixed(1)}
            </div>
            {!isWinning && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-red-400"
              >
                <TrendingUp className="w-6 h-6" />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Live Games Ticker */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <Tv className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Live Games</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-slate-400">LIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {games.map((game) => (
            <motion.div
              key={game.id}
              whileHover={{ scale: 1.02 }}
              className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-blue-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'px-2 py-0.5 rounded text-xs font-semibold uppercase',
                  getGameStatusColor(game.status)
                )}>
                  {game.status === 'in_progress' ? game.quarter : game.status}
                </span>
                {game.timeRemaining && (
                  <span className="text-xs text-slate-400">{game.timeRemaining}</span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-medium text-sm',
                      game.awayScore > game.homeScore ? 'text-white' : 'text-slate-400'
                    )}>
                      {game.awayTeam}
                    </span>
                    {game.possession === 'away' && (
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    )}
                  </div>
                  <span className={cn(
                    'font-bold tabular-nums',
                    game.awayScore > game.homeScore ? 'text-white' : 'text-slate-400'
                  )}>
                    {game.awayScore}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-medium text-sm',
                      game.homeScore > game.awayScore ? 'text-white' : 'text-slate-400'
                    )}>
                      {game.homeTeam}
                    </span>
                    {game.possession === 'home' && (
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    )}
                  </div>
                  <span className={cn(
                    'font-bold tabular-nums',
                    game.homeScore > game.awayScore ? 'text-white' : 'text-slate-400'
                  )}>
                    {game.homeScore}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Active Players */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Active Players</h3>
            <span className="text-xs text-slate-400">({activePlayers} playing)</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Updates every 5sec</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {myPlayers.filter(p => p.gameStatus !== 'inactive').map((player) => {
            const hasUpdate = liveUpdates.has(player.id)
            const updatePoints = liveUpdates.get(player.id) || 0

            return (
              <motion.div
                key={player.id}
                layout
                onClick={() => onPlayerClick?.(player.id)}
                className="relative p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden"
              >
                {/* Score Update Animation */}
                <AnimatePresence>
                  {hasUpdate && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold shadow-lg"
                    >
                      +{updatePoints.toFixed(1)}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pulse effect on update */}
                {hasUpdate && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.5, 0] }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 bg-emerald-500/20 rounded-lg"
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{player.name}</h4>
                      <p className="text-xs text-slate-400">{player.position} • {player.team}</p>
                    </div>

                    <div className="ml-2">
                      {player.gameStatus === 'active' ? (
                        <Play className="w-4 h-4 text-emerald-400" />
                      ) : player.gameStatus === 'complete' ? (
                        <CheckCircle2 className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Pause className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white tabular-nums">
                        {player.currentPoints.toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500">
                        proj: {player.projectedPoints.toFixed(1)}
                      </div>
                    </div>

                    {player.currentPoints > player.projectedPoints ? (
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    ) : player.currentPoints < player.projectedPoints * 0.5 ? (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    ) : null}
                  </div>

                  {/* Recent Play */}
                  {player.lastUpdate && (
                    <div className="mt-2 text-xs text-blue-400 truncate">
                      {player.lastUpdate}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Bench Points Tracker */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="font-semibold text-white">Bench Watch</h3>
          <span className="text-xs text-slate-400">(points left on bench)</span>
        </div>

        <div className="space-y-2">
          {myPlayers
            .filter(p => !p.gameStatus)
            .slice(0, 3)
            .map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/30"
              >
                <div>
                  <span className="text-sm text-white">{player.name}</span>
                  <span className="text-xs text-slate-400 ml-2">({player.position})</span>
                </div>
                <span className="text-sm font-semibold text-yellow-400 tabular-nums">
                  {player.currentPoints.toFixed(1)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
