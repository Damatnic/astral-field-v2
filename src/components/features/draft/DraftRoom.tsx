'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Clock,
  Play,
  Pause,
  Users,
  Star,
  Timer,
  Zap,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'
import { useDraftStore } from '@/stores/draftStore'
import { useAuthStore } from '@/stores/authStore'
import { useLeagueStore } from '@/stores/leagueStore'

interface DraftRoomProps {
  leagueId: string
}

export default function DraftRoom({ leagueId }: DraftRoomProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { currentLeague } = useLeagueStore()
  const {
    draftState,
    draftPicks,
    availablePlayers,
    recommendations,
    selectedPlayer,
    isLoading,
    error,
    activeTab,
    searchTerm,
    positionFilter,
    loadDraftState,
    startDraft,
    pauseDraft,
    resumeDraft,
    makePick,
    loadRecommendations,
    selectPlayer,
    setActiveTab,
    setSearchTerm,
    setPositionFilter,
    clearError,
    connect,
    disconnect
  } = useDraftStore()

  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [userTeam, setUserTeam] = useState<any>(null)

  useEffect(() => {
    if (leagueId) {
      loadDraftState(leagueId)
      connect(leagueId)
      
      return () => disconnect()
    }
  }, [leagueId, loadDraftState, connect, disconnect])

  useEffect(() => {
    // Find user's team
    if (currentLeague && user && draftPicks.length > 0) {
      const teamPick = draftPicks.find(pick => pick.team.user_id === user.id)
      if (teamPick) {
        setUserTeam(teamPick.team)
      }
    }
  }, [currentLeague, user, draftPicks])

  useEffect(() => {
    // Timer countdown
    let interval: NodeJS.Timeout | null = null
    
    if (draftState?.status === 'active' && draftState.pickDeadline) {
      interval = setInterval(() => {
        const deadline = new Date(draftState.pickDeadline!).getTime()
        const now = new Date().getTime()
        const remaining = Math.max(0, Math.floor((deadline - now) / 1000))
        
        setTimeLeft(remaining)
        
        if (remaining === 0) {
          // Auto pick logic would go here
          // TODO: Implement auto-pick functionality
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [draftState])

  useEffect(() => {
    // Load recommendations when it's user's turn
    if (draftState?.currentTeamId === userTeam?.id && userTeam) {
      loadRecommendations(leagueId, userTeam.id)
    }
  }, [draftState?.currentTeamId, userTeam, leagueId, loadRecommendations])

  const handleStartDraft = async () => {
    const success = await startDraft(leagueId)
    if (!success && error) {
      console.error('Failed to start draft:', error)
    }
  }

  const handlePauseDraft = async () => {
    const success = await pauseDraft(leagueId)
    if (!success && error) {
      console.error('Failed to pause draft:', error)
    }
  }

  const handleResumeDraft = async () => {
    const success = await resumeDraft(leagueId)
    if (!success && error) {
      console.error('Failed to resume draft:', error)
    }
  }

  const handleMakePick = async (playerId: string) => {
    if (!userTeam || !draftState) return
    
    const success = await makePick(leagueId, userTeam.id, playerId)
    if (!success && error) {
      console.error('Failed to make pick:', error)
    }
  }

  const filteredPlayers = availablePlayers.filter(player => {
    const matchesSearch = !searchTerm || 
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.nfl_team.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPosition = !positionFilter || player.position === positionFilter
    
    return player.isAvailable && matchesSearch && matchesPosition
  })

  const isUserTurn = draftState?.currentTeamId === userTeam?.id
  const canControlDraft = currentLeague?.commissioner_id === user?.id

  if (!draftState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Draft not found</h2>
          <p className="text-gray-400 mb-4">This draft may not exist or hasn&apos;t been created yet.</p>
          <button
            onClick={() => router.push(`/leagues/${leagueId}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to League
          </button>
        </div>
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Draft Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Zap className="h-6 w-6 text-yellow-500 mr-2" />
                  Draft Room
                </h1>
                <p className="text-gray-400">
                  Round {draftState.currentRound} • Pick {draftState.currentPick}
                </p>
              </div>

              {/* Draft Status */}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                draftState.status === 'active' 
                  ? 'bg-green-500/20 text-green-400'
                  : draftState.status === 'paused'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : draftState.status === 'completed'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {draftState.status.charAt(0).toUpperCase() + draftState.status.slice(1)}
              </div>

              {/* Pick Timer */}
              {draftState.status === 'active' && (
                <div className="flex items-center space-x-2">
                  <Timer className={`h-5 w-5 ${timeLeft < 30 ? 'text-red-500' : 'text-blue-500'}`} />
                  <span className={`font-mono text-lg font-bold ${timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>

            {/* Draft Controls */}
            {canControlDraft && (
              <div className="flex items-center space-x-3">
                {draftState.status === 'scheduled' && (
                  <button
                    onClick={handleStartDraft}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Draft
                  </button>
                )}

                {draftState.status === 'active' && (
                  <button
                    onClick={handlePauseDraft}
                    disabled={isLoading}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </button>
                )}

                {draftState.status === 'paused' && (
                  <button
                    onClick={handleResumeDraft}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Current Pick Indicator */}
          {draftState.status === 'active' && (
            <div className="mt-4 p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg">
              <p className="text-blue-300">
                {isUserTurn ? (
                  <span className="font-semibold">🎯 It&apos;s your turn to pick!</span>
                ) : (
                  <span>Waiting for pick from Team {draftState.currentPick}</span>
                )}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-400">{error}</span>
              <button onClick={clearError} className="ml-auto text-red-300 hover:text-red-200">
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Draft Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Draft Board - Main Content */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6">
              {[
                { key: 'board', label: 'Draft Board', icon: Users },
                { key: 'recommendations', label: 'AI Assistant', icon: Star },
                { key: 'picks', label: 'Draft History', icon: CheckCircle }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                    activeTab === key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </button>
              ))}
            </div>

            {/* Draft Board Tab */}
            {activeTab === 'board' && (
              <div>
                {/* Search and Filters */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search players..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={positionFilter || ''}
                    onChange={(e) => setPositionFilter(e.target.value || null)}
                    className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Positions</option>
                    <option value="QB">QB</option>
                    <option value="RB">RB</option>
                    <option value="WR">WR</option>
                    <option value="TE">TE</option>
                    <option value="K">K</option>
                    <option value="DST">DST</option>
                  </select>
                </div>

                {/* Available Players */}
                <div className="space-y-2">
                  {filteredPlayers.map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedPlayer?.id === player.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
                      }`}
                      onClick={() => selectPlayer(selectedPlayer?.id === player.id ? null : player)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {player.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{player.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-400">
                              <span className="font-medium text-blue-400">{player.position}</span>
                              <span>{player.nfl_team}</span>
                              <span>ADP: {player.adp}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-white font-semibold">
                              {((player.projections as any)?.projectedPoints || 0).toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400">Proj</div>
                          </div>

                          {isUserTurn && draftState.status === 'active' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMakePick(player.id)
                              }}
                              disabled={isLoading}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                            >
                              Draft
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {filteredPlayers.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No players found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations Tab */}
            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-semibold text-white">AI Draft Assistant</h3>
                </div>

                {recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map((rec, index) => (
                      <motion.div
                        key={rec.playerId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 bg-gray-800 border border-gray-600 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-white">{rec.player.name}</h4>
                            <p className="text-sm text-blue-400">{rec.player.position} - {rec.player.nfl_team}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            rec.priority === 'high' 
                              ? 'bg-red-500/20 text-red-400'
                              : rec.priority === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {rec.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-3">{rec.reason}</p>
                        {isUserTurn && draftState.status === 'active' && (
                          <button
                            onClick={() => handleMakePick(rec.playerId)}
                            disabled={isLoading}
                            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            Draft Player
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {isUserTurn ? 'Loading recommendations...' : 'Recommendations available on your turn'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Draft History Tab */}
            {activeTab === 'picks' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Draft History
                </h3>
                
                <div className="space-y-2">
                  {draftPicks.map((pick, index) => (
                    <motion.div
                      key={pick.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {pick.overall_pick}
                        </div>
                        <div>
                          <p className="text-white font-medium">{pick.player.name}</p>
                          <p className="text-sm text-gray-400">
                            {pick.player.position} - {pick.player.nfl_team} • Round {pick.round}, Pick {pick.pick}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{pick.team.users.username}</p>
                        <p className="text-xs text-gray-400">{pick.team.team_name}</p>
                      </div>
                    </motion.div>
                  ))}

                  {draftPicks.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No picks made yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Draft Sidebar */}
          <div className="space-y-6">
            {/* Team Status */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Your Team</h3>
              {userTeam ? (
                <div>
                  <p className="text-gray-300">{userTeam.team_name}</p>
                  <p className="text-sm text-gray-400">
                    Pick #{draftState.settings.draftOrder.indexOf(userTeam.id) + 1} in Round {draftState.currentRound}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400">Team not found</p>
              )}
            </div>

            {/* Draft Info */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Draft Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white">{draftState.settings.type.charAt(0).toUpperCase() + draftState.settings.type.slice(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rounds:</span>
                  <span className="text-white">{draftState.settings.rounds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pick Time:</span>
                  <span className="text-white">{draftState.settings.pickTimeLimit}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Teams:</span>
                  <span className="text-white">{draftState.settings.draftOrder.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Draft Progress</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Picks:</span>
                  <span className="text-white">{draftPicks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Available:</span>
                  <span className="text-white">{availablePlayers.filter(p => p.isAvailable).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">QBs Left:</span>
                  <span className="text-white">{availablePlayers.filter(p => p.isAvailable && p.position === 'QB').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">RBs Left:</span>
                  <span className="text-white">{availablePlayers.filter(p => p.isAvailable && p.position === 'RB').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">WRs Left:</span>
                  <span className="text-white">{availablePlayers.filter(p => p.isAvailable && p.position === 'WR').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}