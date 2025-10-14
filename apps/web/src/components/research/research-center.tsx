'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Download,
  Grid3x3,
  Table2,
  BarChart3,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  ArrowUpDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayerData {
  id: string
  name: string
  position: string
  team: string
  opponent?: string
  gameTime?: string
  fantasyPoints: number
  projectedPoints: number
  targetShare?: number
  snapCount?: number
  redZoneTargets?: number
  completions?: number
  attempts?: number
  yards?: number
  touchdowns?: number
  receptions?: number
  targets?: number
  carries?: number
}

interface ResearchCenterProps {
  players: PlayerData[]
  onPlayerClick?: (playerId: string) => void
}

type SortKey = keyof PlayerData
type ViewMode = 'table' | 'grid' | 'heatmap'

export function ResearchCenter({ players, onPlayerClick }: ResearchCenterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortKey, setSortKey] = useState<SortKey>('projectedPoints')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    minPoints: 0,
    maxPoints: 100,
    minOwnership: 0,
    minSnapCount: 0,
    minTargetShare: 0
  })

  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
  const teams = [...new Set(players.map(p => p.team))].sort()

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let filtered = players

    // Search
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.team.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Position filter
    if (selectedPositions.length > 0) {
      filtered = filtered.filter(p => selectedPositions.includes(p.position))
    }

    // Team filter
    if (selectedTeams.length > 0) {
      filtered = filtered.filter(p => selectedTeams.includes(p.team))
    }

    // Advanced filters
    filtered = filtered.filter(p => {
      if (p.fantasyPoints < filters.minPoints) return false
      if (p.fantasyPoints > filters.maxPoints) return false
      if ((p.snapCount || 0) < filters.minSnapCount) return false
      if ((p.targetShare || 0) < filters.minTargetShare) return false
      return true
    })

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortKey] || 0
      const bVal = b[sortKey] || 0
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
      }
      
      return sortDirection === 'desc' 
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal))
    })

    return filtered
  }, [players, searchQuery, selectedPositions, selectedTeams, filters, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const togglePosition = (position: string) => {
    setSelectedPositions(prev =>
      prev.includes(position)
        ? prev.filter(p => p !== position)
        : [...prev, position]
    )
  }

  const handleExport = () => {
    const headers = ['Name', 'Position', 'Team', 'Projected', 'Fantasy Points', 'Target Share', 'Snap %']
    const rows = filteredPlayers.map(p => [
      p.name,
      p.position,
      p.team,
      p.projectedPoints.toFixed(1),
      p.fantasyPoints.toFixed(1),
      (p.targetShare || 0).toFixed(1),
      (p.snapCount || 0).toFixed(1)
    ])

    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `player-research-${Date.now()}.csv`
    a.click()
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-4 h-4 text-slate-600" />
    return sortDirection === 'desc' 
      ? <ChevronDown className="w-4 h-4 text-blue-400" />
      : <ChevronUp className="w-4 h-4 text-blue-400" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search players, teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode */}
          <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 rounded transition-all',
                viewMode === 'table' && 'bg-blue-500 text-white'
              )}
            >
              <Table2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded transition-all',
                viewMode === 'grid' && 'bg-blue-500 text-white'
              )}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={cn(
                'p-2 rounded transition-all',
                viewMode === 'heatmap' && 'bg-blue-500 text-white'
              )}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Position Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {positions.map((position) => (
          <button
            key={position}
            onClick={() => togglePosition(position)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-all',
              selectedPositions.includes(position)
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}
          >
            {position}
          </button>
        ))}
        {selectedPositions.length > 0 && (
          <button
            onClick={() => setSelectedPositions([])}
            className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <SlidersHorizontal className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white">Advanced Filters</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Min Points</label>
                <input
                  type="number"
                  value={filters.minPoints}
                  onChange={(e) => setFilters({ ...filters, minPoints: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Min Snap %</label>
                <input
                  type="number"
                  value={filters.minSnapCount}
                  onChange={(e) => setFilters({ ...filters, minSnapCount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Min Target Share</label>
                <input
                  type="number"
                  value={filters.minTargetShare}
                  onChange={(e) => setFilters({ ...filters, minTargetShare: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <div className="text-sm text-slate-400">
        Showing {filteredPlayers.length} of {players.length} players
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Player
                    <SortIcon column="name" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('position')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Pos
                    <SortIcon column="position" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('team')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    Team
                    <SortIcon column="team" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('projectedPoints')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors ml-auto"
                  >
                    Proj
                    <SortIcon column="projectedPoints" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('fantasyPoints')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors ml-auto"
                  >
                    Pts
                    <SortIcon column="fantasyPoints" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('targetShare')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors ml-auto"
                  >
                    Tgt%
                    <SortIcon column="targetShare" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('snapCount')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors ml-auto"
                  >
                    Snap%
                    <SortIcon column="snapCount" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-slate-300">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player, idx) => (
                <motion.tr
                  key={player.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  className="border-b border-slate-800 hover:bg-slate-800/30 cursor-pointer transition-colors"
                  onClick={() => onPlayerClick?.(player.id)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">{player.name}</div>
                      {player.opponent && (
                        <div className="text-xs text-slate-400">vs {player.opponent}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-medium">
                      {player.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{player.team}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-blue-400 font-semibold tabular-nums">
                      {player.projectedPoints.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-white font-semibold tabular-nums">
                      {player.fantasyPoints.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-300 tabular-nums">
                    {player.targetShare ? `${player.targetShare.toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-300 tabular-nums">
                    {player.snapCount ? `${player.snapCount.toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onPlayerClick?.(player.id)
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                    >
                      View
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map((player, idx) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
            >
              <div
                onClick={() => onPlayerClick?.(player.id)}
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-white">{player.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {player.position}
                      </span>
                      <span className="text-xs text-slate-400">{player.team}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white tabular-nums">
                      {player.projectedPoints.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500">proj</div>
                  </div>
                </div>

                {player.opponent && (
                  <div className="text-xs text-slate-400 mb-2">
                    vs {player.opponent} {player.gameTime && `• ${player.gameTime}`}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 rounded bg-slate-900/50">
                    <div className="text-slate-400">Pts</div>
                    <div className="font-semibold text-white tabular-nums">{player.fantasyPoints.toFixed(1)}</div>
                  </div>
                  {player.targetShare !== undefined && (
                    <div className="text-center p-2 rounded bg-slate-900/50">
                      <div className="text-slate-400">Tgt%</div>
                      <div className="font-semibold text-white tabular-nums">{player.targetShare.toFixed(0)}%</div>
                    </div>
                  )}
                  {player.snapCount !== undefined && (
                    <div className="text-center p-2 rounded bg-slate-900/50">
                      <div className="text-slate-400">Snap%</div>
                      <div className="font-semibold text-white tabular-nums">{player.snapCount.toFixed(0)}%</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Heatmap View */}
      {viewMode === 'heatmap' && (
        <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="text-center text-slate-400">
            Heatmap view coming soon - Weekly performance by position
          </div>
        </div>
      )}
    </div>
  )
}

