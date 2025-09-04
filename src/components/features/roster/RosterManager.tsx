'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  TrendingUp,
  RotateCcw,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  ArrowRight,
  Plus,
  Minus
} from 'lucide-react'
import { useRosterStore } from '@/stores/rosterStore'
import { useLeagueStore } from '@/stores/leagueStore'
import { useAuthStore } from '@/stores/authStore'
import type { PlayerWithDetails, LineupSlot } from '@/services/api/rosterService'

interface RosterManagerProps {
  leagueId: string
}

export default function RosterManager({ leagueId }: RosterManagerProps) {
  const { user } = useAuthStore()
  const { teams } = useLeagueStore()
  const { 
    roster, 
    optimalLineup, 
    currentWeek, 
    isLoading, 
    error, 
    fetchRoster, 
    setLineup,
    getOptimalLineup,
    addPlayer,
    dropPlayer,
    setCurrentWeek,
    clearError 
  } = useRosterStore()
  
  const [activeTab, setActiveTab] = useState<'lineup' | 'bench' | 'optimize'>('lineup')
  const [editingLineup, setEditingLineup] = useState(false)
  const [tempLineup, setTempLineup] = useState<Array<{position: string, playerId: string | null}>>([])

  const userTeam = teams.find(team => team.user_id === user?.id)

  useEffect(() => {
    if (userTeam) {
      fetchRoster(userTeam.id, currentWeek)
    }
  }, [userTeam, currentWeek, fetchRoster])

  const handleWeekChange = (week: number) => {
    setCurrentWeek(week)
    if (userTeam) {
      fetchRoster(userTeam.id, week)
    }
  }

  const startEditingLineup = () => {
    if (!roster) return
    setTempLineup(roster.starters.map(starter => ({
      position: starter.position,
      playerId: starter.player?.id || null
    })))
    setEditingLineup(true)
  }

  const cancelEditingLineup = () => {
    setEditingLineup(false)
    setTempLineup([])
  }

  const saveLineup = async () => {
    if (!userTeam) return
    
    clearError()
    const success = await setLineup(userTeam.id, currentWeek, tempLineup)
    if (success) {
      setEditingLineup(false)
      setTempLineup([])
    }
  }

  const swapPlayerInLineup = (position: string, playerId: string | null) => {
    setTempLineup(prev => prev.map(slot =>
      slot.position === position
        ? { ...slot, playerId }
        : slot
    ))
  }

  const handleOptimizeLineup = async () => {
    if (!userTeam) return
    await getOptimalLineup(userTeam.id, currentWeek)
    setActiveTab('optimize')
  }

  const applyOptimalLineup = async () => {
    if (!userTeam || !optimalLineup) return
    
    const lineup = optimalLineup.lineup.map(slot => ({
      position: slot.position,
      playerId: slot.player?.id || null
    }))
    
    clearError()
    const success = await setLineup(userTeam.id, currentWeek, lineup)
    if (success) {
      setActiveTab('lineup')
    }
  }

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      'QB': 'bg-red-600',
      'RB': 'bg-green-600', 
      'WR': 'bg-blue-600',
      'TE': 'bg-yellow-600',
      'FLEX': 'bg-purple-600',
      'D/ST': 'bg-gray-600',
      'K': 'bg-orange-600',
    }
    return colors[position] || 'bg-gray-600'
  }

  const getInjuryStatusIcon = (status: string | null) => {
    switch (status) {
      case 'OUT': return <div className="w-2 h-2 bg-red-500 rounded-full" />
      case 'DOUBTFUL': return <div className="w-2 h-2 bg-red-400 rounded-full" />
      case 'QUESTIONABLE': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />
      case 'PROBABLE': return <div className="w-2 h-2 bg-green-400 rounded-full" />
      default: return <div className="w-2 h-2 bg-green-500 rounded-full" />
    }
  }

  if (isLoading && !roster) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!userTeam) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Team Access</h2>
          <p className="text-gray-400">You need to be part of this league to manage a roster.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <Users className="h-8 w-8 text-green-500 mr-3" />
                Roster Manager
              </h1>
              <p className="text-gray-400 mt-1">Manage your team lineup and optimize your roster</p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Week Selector */}
              <select
                value={currentWeek}
                onChange={(e) => handleWeekChange(Number(e.target.value))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 18 }, (_, i) => i + 1).map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>

              {/* Optimize Button */}
              <button
                onClick={handleOptimizeLineup}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                <Zap className="h-4 w-4 mr-2" />
                Optimize
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab('lineup')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'lineup'
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Star className="h-4 w-4 mr-2" />
            Starting Lineup
          </button>
          <button
            onClick={() => setActiveTab('bench')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'bench'
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Bench ({roster?.bench.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('optimize')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'optimize'
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Optimize
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Starting Lineup Tab */}
        {activeTab === 'lineup' && roster && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Starting Lineup</h2>
                <p className="text-gray-400">
                  Projected Points: <span className="text-green-400 font-semibold">{roster.projectedPoints.toFixed(1)}</span>
                </p>
              </div>
              
              <div className="flex space-x-3">
                {editingLineup ? (
                  <>
                    <button
                      onClick={cancelEditingLineup}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveLineup}
                      disabled={isLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      Save Lineup
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startEditingLineup}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Edit Lineup
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              {roster.starters.map((starter, index) => (
                <LineupSlotCard
                  key={`${starter.position}-${index}`}
                  slot={starter}
                  isEditing={editingLineup}
                  availablePlayers={roster.bench}
                  onPlayerSwap={(playerId) => swapPlayerInLineup(starter.position, playerId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bench Tab */}
        {activeTab === 'bench' && roster && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Bench Players</h2>
              <p className="text-gray-400">
                Roster: {roster.rosterStatus.totalPlayers}/{roster.rosterStatus.maxRoster}
              </p>
            </div>

            <div className="grid gap-4">
              {roster.bench.length === 0 ? (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                  <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Bench Players</h3>
                  <p className="text-gray-400">Your bench is empty.</p>
                </div>
              ) : (
                roster.bench.map((player) => (
                  <PlayerCard key={player.id} player={player} showActions={false} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Optimize Tab */}
        {activeTab === 'optimize' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Lineup Optimization</h2>
                <p className="text-gray-400">AI-powered lineup recommendations</p>
              </div>
              
              {optimalLineup && optimalLineup.improvements.length > 0 && (
                <button
                  onClick={applyOptimalLineup}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Apply Optimal Lineup
                </button>
              )}
            </div>

            {!optimalLineup ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Lineup Optimization</h3>
                <p className="text-gray-400 mb-4">Click the Optimize button to get AI-powered lineup recommendations</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Optimization Summary */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Optimization Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {optimalLineup.totalProjectedPoints.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-400">Optimal Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {roster?.projectedPoints.toFixed(1) || '0.0'}
                      </p>
                      <p className="text-sm text-gray-400">Current Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">
                        +{(optimalLineup.totalProjectedPoints - (roster?.projectedPoints || 0)).toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-400">Potential Gain</p>
                    </div>
                  </div>
                </div>

                {/* Improvements */}
                {optimalLineup.improvements.length > 0 && (
                  <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recommended Changes</h3>
                    <div className="space-y-4">
                      {optimalLineup.improvements.map((improvement, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <p className="text-sm font-medium text-white">
                                {improvement.currentPlayer?.name || 'Empty'}
                              </p>
                              <p className="text-xs text-gray-400">
                                {improvement.currentPlayer?.projections?.fantasy_points.toFixed(1) || '0.0'} pts
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <div className="text-center">
                              <p className="text-sm font-medium text-white">
                                {improvement.suggestedPlayer.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {improvement.suggestedPlayer.projections?.fantasy_points.toFixed(1) || '0.0'} pts
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-400">
                              +{improvement.pointsGain.toFixed(1)} pts
                            </p>
                            <p className="text-xs text-gray-400">{improvement.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {optimalLineup.improvements.length === 0 && (
                  <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Lineup Already Optimized</h3>
                    <p className="text-gray-400">Your current lineup is already optimal for projected points.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Lineup Slot Card Component
interface LineupSlotCardProps {
  slot: LineupSlot
  isEditing: boolean
  availablePlayers: PlayerWithDetails[]
  onPlayerSwap: (playerId: string | null) => void
}

function LineupSlotCard({ slot, isEditing, availablePlayers, onPlayerSwap }: LineupSlotCardProps) {
  const [showPlayerSelect, setShowPlayerSelect] = useState(false)

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      'QB': 'bg-red-600',
      'RB': 'bg-green-600', 
      'WR': 'bg-blue-600',
      'TE': 'bg-yellow-600',
      'FLEX': 'bg-purple-600',
      'D/ST': 'bg-gray-600',
      'K': 'bg-orange-600',
    }
    return colors[position] || 'bg-gray-600'
  }

  const getInjuryStatusIcon = (status: string | null) => {
    switch (status) {
      case 'OUT': return <div className="w-2 h-2 bg-red-500 rounded-full" />
      case 'DOUBTFUL': return <div className="w-2 h-2 bg-red-400 rounded-full" />
      case 'QUESTIONABLE': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />
      case 'PROBABLE': return <div className="w-2 h-2 bg-green-400 rounded-full" />
      default: return <div className="w-2 h-2 bg-green-500 rounded-full" />
    }
  }

  // Filter eligible players for this position
  const eligiblePlayers = availablePlayers.filter(player => {
    if (slot.isFlexible) {
      return ['RB', 'WR', 'TE'].includes(player.position)
    }
    return player.position === slot.position
  })

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 ${getPositionColor(slot.position)} rounded-lg flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">{slot.position}</span>
          </div>
          
          {slot.player ? (
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="font-medium text-white">{slot.player.name}</p>
                {getInjuryStatusIcon(slot.player.injury_status)}
              </div>
              <p className="text-sm text-gray-400">
                {slot.player.nfl_team} • {slot.player.position}
                {slot.player.projections && (
                  <span className="ml-2 text-green-400">
                    {slot.player.projections.fantasy_points.toFixed(1)} pts
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="flex-1">
              <p className="font-medium text-gray-400">Empty Slot</p>
              <p className="text-sm text-gray-500">No player assigned</p>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="flex space-x-2">
            {slot.player && (
              <button
                onClick={() => onPlayerSwap(null)}
                className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowPlayerSelect(!showPlayerSelect)}
              className="p-2 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Player Selection Dropdown */}
      {showPlayerSelect && isEditing && (
        <div className="mt-4 max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {eligiblePlayers.map(player => (
              <button
                key={player.id}
                onClick={() => {
                  onPlayerSwap(player.id)
                  setShowPlayerSelect(false)
                }}
                className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{player.name}</p>
                    <p className="text-sm text-gray-400">{player.nfl_team} • {player.position}</p>
                  </div>
                  {player.projections && (
                    <span className="text-green-400 font-medium">
                      {player.projections.fantasy_points.toFixed(1)}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {eligiblePlayers.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                No eligible players available
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Player Card Component
interface PlayerCardProps {
  player: PlayerWithDetails
  showActions?: boolean
}

function PlayerCard({ player, showActions = true }: PlayerCardProps) {
  const getInjuryStatusIcon = (status: string | null) => {
    switch (status) {
      case 'OUT': return <div className="w-2 h-2 bg-red-500 rounded-full" />
      case 'DOUBTFUL': return <div className="w-2 h-2 bg-red-400 rounded-full" />
      case 'QUESTIONABLE': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />
      case 'PROBABLE': return <div className="w-2 h-2 bg-green-400 rounded-full" />
      default: return <div className="w-2 h-2 bg-green-500 rounded-full" />
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <p className="font-medium text-white">{player.name}</p>
            {getInjuryStatusIcon(player.injury_status)}
          </div>
          <span className="px-2 py-1 bg-gray-700 rounded text-xs font-medium text-gray-300">
            {player.position}
          </span>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-400">{player.nfl_team}</p>
          {player.projections && (
            <p className="text-sm text-green-400 font-medium">
              {player.projections.fantasy_points.toFixed(1)} pts
            </p>
          )}
        </div>
      </div>
    </div>
  )
}