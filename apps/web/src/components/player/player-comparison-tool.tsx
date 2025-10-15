'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Activity,
  Trophy,
  Download,
  Share2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Player {
  id: string
  name: string
  position: string
  team: string
  fantasyPoints: number
  projectedPoints: number
  stats?: {
    targets?: number
    receptions?: number
    yards?: number
    touchdowns?: number
    carries?: number
    snapCount?: number
    targetShare?: number
  }
  lastFiveGames?: number[]
  consistency?: number // 0-100 score
  ceiling?: number
  floor?: number
}

interface PlayerComparisonToolProps {
  players: Player[]
  onClose?: () => void
  onAddPlayer?: () => void
}

export function PlayerComparisonTool({
  players: initialPlayers,
  onClose,
  onAddPlayer
}: PlayerComparisonToolProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers.slice(0, 4))

  // Keyboard support - ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleRemovePlayer = (playerId: string) => {
    setPlayers(players.filter(p => p.id !== playerId))
  }

  const getComparisonColor = (value: number, allValues: number[], higherIsBetter = true) => {
    const max = Math.max(...allValues)
    const min = Math.min(...allValues)
    
    if (higherIsBetter) {
      if (value === max) return 'text-emerald-400 font-bold'
      if (value === min) return 'text-red-400'
    } else {
      if (value === min) return 'text-emerald-400 font-bold'
      if (value === max) return 'text-red-400'
    }
    
    return 'text-slate-300'
  }

  const stats = [
    { label: 'Fantasy Points', key: 'fantasyPoints', higherIsBetter: true },
    { label: 'Projected', key: 'projectedPoints', higherIsBetter: true },
    { label: 'Ceiling', key: 'ceiling', higherIsBetter: true },
    { label: 'Floor', key: 'floor', higherIsBetter: true },
    { label: 'Consistency', key: 'consistency', higherIsBetter: true, suffix: '%' },
  ]

  const advancedStats = [
    { label: 'Targets', key: 'stats.targets', higherIsBetter: true },
    { label: 'Receptions', key: 'stats.receptions', higherIsBetter: true },
    { label: 'Yards', key: 'stats.yards', higherIsBetter: true },
    { label: 'TDs', key: 'stats.touchdowns', higherIsBetter: true },
    { label: 'Carries', key: 'stats.carries', higherIsBetter: true },
    { label: 'Snap %', key: 'stats.snapCount', higherIsBetter: true, suffix: '%' },
    { label: 'Target Share', key: 'stats.targetShare', higherIsBetter: true, suffix: '%' },
  ]

  const getValue = (player: Player, key: string) => {
    const keys = key.split('.')
    let value: any = player
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    return value ?? 0
  }

  const handleExport = () => {
    // Export as CSV
    const headers = ['Player', ...stats.map(s => s.label), ...advancedStats.map(s => s.label)]
    const rows = players.map(player => [
      player.name,
      ...stats.map(s => getValue(player, s.key)),
      ...advancedStats.map(s => getValue(player, s.key))
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `player-comparison-${Date.now()}.csv`
    a.click()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Player Comparison Tool"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[90vh] overflow-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Player Comparison</h2>
              <p className="text-sm text-slate-400">Compare up to 4 players side-by-side</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Player Headers */}
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">
                    Metric
                  </th>
                  {players.map((player) => (
                    <th key={player.id} className="px-4 py-3">
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative group">
                          <button
                            onClick={() => handleRemovePlayer(player.id)}
                            className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {player.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-white">{player.name}</div>
                          <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                        </div>
                      </div>
                    </th>
                  ))}
                  {players.length < 4 && (
                    <th className="px-4 py-3">
                      <button
                        onClick={onAddPlayer}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
                      >
                        <Plus className="w-6 h-6 text-slate-500" />
                        <span className="text-sm text-slate-500">Add Player</span>
                      </button>
                    </th>
                  )}
                </tr>
              </thead>

              {/* Basic Stats */}
              <tbody>
                <tr>
                  <td colSpan={players.length + 1} className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
                      <Trophy className="w-4 h-4" />
                      <span>Core Stats</span>
                    </div>
                  </td>
                </tr>
                {stats.map((stat) => {
                  const values = players.map(p => getValue(p, stat.key))
                  
                  return (
                    <tr key={stat.key} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {stat.label}
                      </td>
                      {players.map((player, idx) => {
                        const value = values[idx]
                        
                        return (
                          <td
                            key={player.id}
                            className={cn(
                              'px-4 py-3 text-center text-lg',
                              getComparisonColor(value, values, stat.higherIsBetter)
                            )}
                          >
                            {value.toFixed(1)}{stat.suffix || ''}
                          </td>
                        )
                      })}
                      {players.length < 4 && <td />}
                    </tr>
                  )
                })}

                {/* Advanced Stats */}
                <tr>
                  <td colSpan={players.length + 1} className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-400 mt-4">
                      <Activity className="w-4 h-4" />
                      <span>Advanced Metrics</span>
                    </div>
                  </td>
                </tr>
                {advancedStats.map((stat) => {
                  const values = players.map(p => getValue(p, stat.key))
                  
                  if (values.every(v => v === 0)) return null // Skip if no data
                  
                  return (
                    <tr key={stat.key} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {stat.label}
                      </td>
                      {players.map((player, idx) => {
                        const value = values[idx]
                        
                        return (
                          <td
                            key={player.id}
                            className={cn(
                              'px-4 py-3 text-center text-lg',
                              getComparisonColor(value, values, stat.higherIsBetter)
                            )}
                          >
                            {value > 0 ? `${value.toFixed(stat.key.includes('Share') || stat.key.includes('snap') ? 1 : 0)}${stat.suffix || ''}` : '-'}
                          </td>
                        )
                      })}
                      {players.length < 4 && <td />}
                    </tr>
                  )
                })}

                {/* Last 5 Games Trend */}
                <tr>
                  <td colSpan={players.length + 1} className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mt-4">
                      <TrendingUp className="w-4 h-4" />
                      <span>Recent Performance</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-t border-slate-800">
                  <td className="px-4 py-3 text-sm text-slate-400">
                    Last 5 Games
                  </td>
                  {players.map((player) => (
                    <td key={player.id} className="px-4 py-3">
                      {player.lastFiveGames ? (
                        <div className="flex items-end gap-0.5 h-12 justify-center">
                          {player.lastFiveGames.map((points, idx) => {
                            const maxPoints = Math.max(...player.lastFiveGames!)
                            const height = (points / maxPoints) * 100
                            
                            return (
                              <div
                                key={idx}
                                className="relative group/bar flex-1"
                              >
                                <div
                                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all"
                                  style={{ height: `${height}%` }}
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  {points.toFixed(1)} pts
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-slate-600 text-sm">No data</div>
                      )}
                    </td>
                  ))}
                  {players.length < 4 && <td />}
                </tr>
              </tbody>
            </table>
          </div>

          {/* AI Insights */}
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-400 mb-2">AI Analysis</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {players.length > 0 && (
                    <>
                      Based on recent performance and projected points, <span className="font-semibold text-white">{players[0].name}</span> appears to be the strongest option with a projection of {players[0].projectedPoints.toFixed(1)} points. 
                      {players.length > 1 && (
                        <> However, consider <span className="font-semibold text-white">{players[1].name}</span> for a safer floor with more consistent weekly production.</>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

