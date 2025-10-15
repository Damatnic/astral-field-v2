'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  TrendingUp,
  Flame,
  AlertCircle,
  Search,
  Filter,
  SortAsc,
  Plus,
  Target,
  Calendar,
  Activity,
  Shield,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnhancedPlayerCard } from '@/components/player/enhanced-player-card'

interface WaiverPlayer {
  id: string
  name: string
  position: string
  team: string
  fantasyPoints: number
  projectedPoints: number
  status?: string
  trending?: 'up' | 'down' | 'hot'
  ownership: number
  aiScore?: number
  breakoutProbability?: number
  opportunity?: {
    score: number
    reasons: string[]
  }
  upcomingSchedule?: {
    difficulty: 'easy' | 'medium' | 'hard'
    opponents: string[]
  }
}

interface SmartWaiverWireProps {
  players: WaiverPlayer[]
  myTeamNeeds?: string[] // ['RB', 'WR']
  onClaim: (playerId: string, dropPlayerId?: string) => Promise<void>
  waiverBudget?: number // FAAB budget
  onPlayerAction?: (action: string, playerId: string) => void
}

export function SmartWaiverWire({
  players,
  myTeamNeeds = [],
  onClaim,
  waiverBudget,
  onPlayerAction
}: SmartWaiverWireProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'aiScore' | 'projectedPoints' | 'ownership' | 'trending'>('aiScore')
  const [showFilters, setShowFilters] = useState(false)

  // AI-Powered Recommendations
  const topRecommendations = useMemo(() => {
    return players
      .filter(p => myTeamNeeds.length === 0 || myTeamNeeds.includes(p.position))
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
      .slice(0, 5)
  }, [players, myTeamNeeds])

  // Breakout Candidates
  const breakoutCandidates = useMemo(() => {
    return players
      .filter(p => (p.breakoutProbability || 0) > 60)
      .sort((a, b) => (b.breakoutProbability || 0) - (a.breakoutProbability || 0))
      .slice(0, 5)
  }, [players])

  // Filtered and sorted players
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
    if (selectedPosition !== 'ALL') {
      filtered = filtered.filter(p => p.position === selectedPosition)
    }

    // Sort
    switch (sortBy) {
      case 'aiScore':
        filtered.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
        break
      case 'projectedPoints':
        filtered.sort((a, b) => b.projectedPoints - a.projectedPoints)
        break
      case 'ownership':
        filtered.sort((a, b) => a.ownership - b.ownership)
        break
      case 'trending':
        const trendValue = (p: WaiverPlayer) => p.trending === 'hot' ? 3 : p.trending === 'up' ? 2 : 1
        filtered.sort((a, b) => trendValue(b) - trendValue(a))
        break
    }

    return filtered
  }, [players, searchQuery, selectedPosition, sortBy])

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST']

  return (
    <div className="space-y-6">
      {/* AI Recommendations Header */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border border-purple-500/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-purple-500/20">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">AI-Powered Recommendations</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Our AI analyzes your roster, upcoming matchups, and player trends to find the best waiver additions for YOUR team.
              {myTeamNeeds.length > 0 && (
                <span className="block mt-1 text-purple-400">
                  Priority positions: {myTeamNeeds.join(', ')}
                </span>
              )}
            </p>
          </div>
          {waiverBudget !== undefined && (
            <div className="text-right">
              <div className="text-sm text-slate-400">Budget</div>
              <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                ${waiverBudget}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Recommendations */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">Top Picks for You</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topRecommendations.map((player, idx) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="relative">
                {idx === 0 && (
                  <div className="absolute -top-2 -right-2 z-10 px-2 py-1 rounded-full bg-yellow-500 text-xs font-bold text-slate-900">
                    #1 Pick
                  </div>
                )}
                <EnhancedPlayerCard
                  player={{
                    ...player,
                    status: player.status as 'ACTIVE' | 'INJURED' | 'OUT' | 'QUESTIONABLE' | 'DOUBTFUL' | undefined,
                    trending: player.trending || (player.aiScore && player.aiScore > 80 ? 'hot' : undefined)
                  }}
                  variant="expanded"
                  onAction={onPlayerAction}
                />

                {/* AI Score Badge */}
                {player.aiScore && (
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-purple-500/90 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span className="text-xs font-bold text-white">
                        AI: {player.aiScore}/100
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Breakout Candidates */}
      {breakoutCandidates.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white">Breakout Candidates</h3>
            <span className="text-xs text-slate-400">(High upside, low ownership)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {breakoutCandidates.map((player) => (
              <div
                key={player.id}
                className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all cursor-pointer group"
                onClick={() => onPlayerAction?.('stats', player.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-400">
                    {player.breakoutProbability}% Breakout
                  </span>
                </div>
                <div className="font-semibold text-white text-sm truncate">{player.name}</div>
                <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                <div className="text-xs text-slate-500 mt-1">{player.ownership}% owned</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Position Filter */}
          <div className="flex items-center gap-2">
            {positions.map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPosition(pos)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium text-sm transition-all',
                  selectedPosition === pos
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                )}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="aiScore">AI Score</option>
            <option value="projectedPoints">Projected Points</option>
            <option value="ownership">Ownership</option>
            <option value="trending">Trending</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Filter className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Advanced Filters (Expandable) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Ownership</label>
                  <input type="range" min="0" max="100" className="w-full" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Min Projected</label>
                  <input type="number" placeholder="0" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Status</label>
                  <select className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white">
                    <option>All</option>
                    <option>Active</option>
                    <option>Questionable</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* All Available Players */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">All Available Players</h3>
            <span className="text-sm text-slate-400">({filteredPlayers.length} players)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.slice(0, 24).map((player, idx) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="relative"
            >
              <EnhancedPlayerCard
                player={{
                  ...player,
                  status: player.status as 'ACTIVE' | 'INJURED' | 'OUT' | 'QUESTIONABLE' | 'DOUBTFUL' | undefined,
                  ownership: player.ownership
                }}
                variant="compact"
                onAction={onPlayerAction}
              />

              {/* Opportunity Badge */}
              {player.opportunity && player.opportunity.score > 70 && (
                <div className="absolute -top-2 -right-2 px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg">
                  Hot!
                </div>
              )}

              {/* Schedule Indicator */}
              {player.upcomingSchedule && (
                <div className="absolute bottom-3 right-3">
                  <div className={cn(
                    'px-2 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm',
                    player.upcomingSchedule.difficulty === 'easy' && 'bg-emerald-500/90 text-white',
                    player.upcomingSchedule.difficulty === 'medium' && 'bg-yellow-500/90 text-white',
                    player.upcomingSchedule.difficulty === 'hard' && 'bg-red-500/90 text-white'
                  )}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{player.upcomingSchedule.difficulty.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        {filteredPlayers.length > 24 && (
          <div className="mt-6 text-center">
            <button className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium transition-all">
              Load More ({filteredPlayers.length - 24} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Waiver Assistant */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-500/20">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">Waiver Assistant</h3>
            <p className="text-sm text-slate-300 mb-4">
              Based on your roster and league trends, here's your optimal waiver strategy:
            </p>

            <div className="space-y-2">
              {topRecommendations.slice(0, 3).map((player, idx) => (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'px-2 py-1 rounded-full text-xs font-bold',
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      idx === 1 ? 'bg-slate-500/20 text-slate-400' :
                      'bg-orange-500/20 text-orange-400'
                    )}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white tabular-nums">
                        {player.projectedPoints.toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500">proj</div>
                    </div>
                    <button
                      onClick={() => onClaim(player.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                    >
                      Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Breakout Watch */}
      {breakoutCandidates.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white">Breakout Watch</h3>
            <span className="text-xs text-slate-400">Players with high breakout potential</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {breakoutCandidates.map((player) => (
              <div
                key={player.id}
                onClick={() => onPlayerAction?.('stats', player.id)}
                className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-2xl font-bold text-orange-400 tabular-nums">
                    {player.breakoutProbability}%
                  </span>
                </div>
                <div className="font-semibold text-white truncate">{player.name}</div>
                <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                <div className="text-xs text-slate-500 mt-2">{player.ownership}% owned</div>

                {player.opportunity && (
                  <div className="mt-3 space-y-1">
                    {player.opportunity.reasons.slice(0, 2).map((reason, idx) => (
                      <div key={idx} className="text-xs text-slate-300 flex items-start gap-1">
                        <span className="text-orange-400">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

