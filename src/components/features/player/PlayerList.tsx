'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter,
  TrendingUp,
  User,
  Activity,
  Heart,
  AlertTriangle
} from 'lucide-react'
import { usePlayerStore } from '@/stores/playerStore'
import playerService from '@/services/api/playerService'
import type { Database } from '@/types/database'

type Player = Database['public']['Tables']['players']['Row']

export default function PlayerList() {
  const {
    players,
    total,
    isLoading,
    error,
    filters,
    sortOptions,
    currentPage,
    pageSize,
    fetchPlayers,
    searchPlayers,
    setFilters,
    setSortOptions,
    setPage,
    clearError
  } = usePlayerStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      searchPlayers(searchTerm.trim())
    } else {
      fetchPlayers()
    }
  }

  const handlePositionFilter = (position: string) => {
    const newFilters = { ...filters }
    if (newFilters.position === position) {
      delete newFilters.position
    } else {
      newFilters.position = position
    }
    setFilters(newFilters)
  }

  const getInjuryStatusColor = (status: string | null) => {
    if (!status || status === 'Healthy') return 'text-green-400'
    if (status === 'Questionable') return 'text-yellow-400'
    if (status === 'Doubtful' || status === 'Out') return 'text-red-400'
    return 'text-gray-400'
  }

  const getInjuryStatusIcon = (status: string | null) => {
    if (!status || status === 'Healthy') return <Heart className="h-4 w-4" />
    if (status === 'Questionable') return <AlertTriangle className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  const formatProjectedPoints = (player: Player): string => {
    const projections = player.projections as any
    if (projections?.projectedPoints) {
      return projections.projectedPoints.toFixed(1)
    }
    return '0.0'
  }

  const formatCurrentPoints = (player: Player): string => {
    const stats = player.stats as any
    if (stats?.fantasyPoints) {
      return stats.fantasyPoints.toFixed(1)
    }
    return '0.0'
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-400">{error}</span>
        </div>
        <button
          onClick={clearError}
          className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
        >
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search players..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg border transition-colors flex items-center ${
            showFilters
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-800 border border-gray-700 rounded-lg p-4"
        >
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-400 mr-2">Position:</span>
            {['QB', 'RB', 'WR', 'TE', 'K', 'DST'].map((position) => (
              <button
                key={position}
                onClick={() => handlePositionFilter(position)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filters.position === position
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {position}
              </button>
            ))}
            <button
              onClick={() => setFilters({})}
              className="px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 ml-4"
            >
              Clear All
            </button>
          </div>
        </motion.div>
      )}

      {/* Results Header */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {isLoading ? 'Loading...' : `${total} players found`}
        </div>

        <select
          value={`${sortOptions.field}-${sortOptions.direction}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split('-')
            setSortOptions({ field: field as any, direction: direction as 'asc' | 'desc' })
          }}
          className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="position-asc">Position (A-Z)</option>
          <option value="team-asc">Team (A-Z)</option>
          <option value="projectedPoints-desc">Projected Points (High-Low)</option>
        </select>
      </div>

      {/* Players List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Player Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {player.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    {/* Player Info */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-white">{player.name}</h3>
                        {player.injury_status && (
                          <div className={`flex items-center ${getInjuryStatusColor(player.injury_status)}`}>
                            {getInjuryStatusIcon(player.injury_status)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className={`font-medium ${playerService.getPositionColor(player.position)}`}>
                          {player.position}
                        </span>
                        <span>{player.nfl_team}</span>
                        <span>Bye: {player.bye_week}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-6 text-right">
                    <div>
                      <div className="text-sm text-gray-400">Current</div>
                      <div className="font-semibold text-white">{formatCurrentPoints(player)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Projected</div>
                      <div className="font-semibold text-green-400">{formatProjectedPoints(player)}</div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-600 transition-colors">
                      <TrendingUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {players.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No players found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isLoading}
            className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {currentPage} of {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPage(Math.min(Math.ceil(total / pageSize), currentPage + 1))}
            disabled={currentPage >= Math.ceil(total / pageSize) || isLoading}
            className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}