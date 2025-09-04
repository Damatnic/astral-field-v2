'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Play,
  Pause,
  Clock,
  TrendingUp,
  Trophy,
  Zap,
  Target,
  Users,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Bell,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useLiveStore } from '@/stores/liveStore'
import { useLeagueStore } from '@/stores/leagueStore'
import { useAuthStore } from '@/stores/authStore'
import { CompactActivityFeed } from '../activity/ActivityFeed'
import type { TeamLiveScore, PlayerLiveStats } from '@/services/api/liveScoreService'

interface LiveDashboardProps {
  leagueId: string
  week?: number
}

export default function LiveDashboard({ leagueId, week = 1 }: LiveDashboardProps) {
  const { user } = useAuthStore()
  const { teams } = useLeagueStore()
  const { 
    liveScoring, 
    isLiveScoringActive, 
    lastUpdate,
    isConnected,
    connectionStatus,
    startLiveScoring,
    stopLiveScoring,
    refreshLiveScoring,
    connect,
    disconnect
  } = useLiveStore()

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [selectedMatchup, setSelectedMatchup] = useState<number>(0)
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false)

  const userTeam = teams.find(team => team.user_id === user?.id)

  useEffect(() => {
    if (leagueId) {
      connect()
    }
    
    return () => {
      // Cleanup if needed
    }
  }, [leagueId, connect])

  const handleToggleLiveScoring = async () => {
    if (isLiveScoringActive) {
      await stopLiveScoring(leagueId)
    } else {
      await startLiveScoring(leagueId, week)
    }
  }

  const handleRefresh = async () => {
    await refreshLiveScoring(leagueId, week)
  }

  const getScoreColor = (points: number) => {
    if (points >= 150) return 'text-green-400'
    if (points >= 120) return 'text-blue-400'
    if (points >= 100) return 'text-yellow-400'
    return 'text-gray-400'
  }

  const getConnectionIcon = () => {
    if (connectionStatus === 'connecting') return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
    if (isConnected) return <Wifi className="h-4 w-4 text-green-500" />
    return <WifiOff className="h-4 w-4 text-red-500" />
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    return `${diffHours}h ago`
  }

  if (!liveScoring && isLiveScoringActive) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading live scoring...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header Controls */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Play className="h-6 w-6 text-blue-500 mr-2" />
                <h1 className="text-2xl font-bold text-white">Live Dashboard</h1>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                {getConnectionIcon()}
                <span className="capitalize">{connectionStatus}</span>
              </div>

              {lastUpdate && (
                <div className="flex items-center space-x-1 text-sm text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Updated {getTimeAgo(lastUpdate)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled ? 'text-green-400 bg-green-900/30' : 'text-gray-400 bg-gray-700'
                }`}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                onClick={handleRefresh}
                className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                onClick={handleToggleLiveScoring}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isLiveScoringActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isLiveScoringActive ? (
                  <>
                    <Pause className="h-4 w-4 mr-2 inline" />
                    Stop Live
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2 inline" />
                    Start Live
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!isLiveScoringActive ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Play className="h-16 w-16 text-blue-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Live Scoring Inactive</h2>
            <p className="text-gray-400 mb-8">
              Start live scoring to track real-time player performance, game updates, and league activity.
            </p>
            <button
              onClick={handleToggleLiveScoring}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center mx-auto"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Live Scoring
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Leaderboard */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Live Leaderboard</h2>
                  <button
                    onClick={() => setShowFullLeaderboard(!showFullLeaderboard)}
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    {showFullLeaderboard ? 'Show Top 5' : 'Show All'}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(liveScoring?.teams.slice(0, showFullLeaderboard ? undefined : 5) || []).map((team, index) => (
                    <motion.div
                      key={team.teamId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`bg-gray-800 rounded-lg border border-gray-700 p-4 ${
                        team.teamId === userTeam?.id ? 'border-blue-500 bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500 text-yellow-900' :
                            index === 1 ? 'bg-gray-300 text-gray-900' :
                            index === 2 ? 'bg-amber-600 text-amber-900' :
                            'bg-gray-600 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          
                          <div>
                            <h3 className="font-medium text-white flex items-center">
                              {team.teamName}
                              {team.teamId === userTeam?.id && (
                                <span className="ml-2 text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                                  You
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {team.playersActive} active • {team.playersCompleted} completed
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`text-2xl font-bold ${getScoreColor(team.totalPoints)}`}>
                            {team.totalPoints.toFixed(1)}
                          </p>
                          <p className="text-sm text-gray-400">
                            Proj: {team.projectedPoints.toFixed(1)}
                          </p>
                        </div>
                      </div>

                      {/* Top Performers */}
                      <div className="mt-3 flex space-x-4 overflow-x-auto">
                        {team.starters.slice(0, 3).map((player) => (
                          <div key={player.playerId} className="flex-shrink-0 text-center">
                            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mb-1">
                              <span className="text-xs font-medium text-white">
                                {player.position}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 truncate w-12">{player.name}</p>
                            <p className="text-xs font-medium text-green-400">
                              {player.fantasyPoints.toFixed(1)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Close Matchups */}
              {liveScoring?.closeMatchups && liveScoring.closeMatchups.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Close Matchups</h2>
                  <div className="space-y-4">
                    {liveScoring.closeMatchups.map((matchup, index) => (
                      <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                        <div className="flex justify-between items-center">
                          <div className="text-center">
                            <p className="font-medium text-white">{matchup.team1.teamName}</p>
                            <p className="text-2xl font-bold text-blue-400">
                              {matchup.team1.totalPoints.toFixed(1)}
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm text-gray-400">vs</p>
                            <p className="text-lg font-bold text-yellow-400">
                              {matchup.pointDifferential.toFixed(1)}
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <p className="font-medium text-white">{matchup.team2.teamName}</p>
                            <p className="text-2xl font-bold text-purple-400">
                              {matchup.team2.totalPoints.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Top Performers */}
              {liveScoring?.topPerformers && (
                <section>
                  <h2 className="text-xl font-semibold text-white mb-4">Top Performers</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveScoring.topPerformers.slice(0, 6).map((player, index) => (
                      <div key={player.playerId} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-white">{player.name}</h3>
                            <p className="text-sm text-gray-400">
                              {player.position} • {player.nflTeam}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-400">
                              {player.fantasyPoints.toFixed(1)}
                            </p>
                            <div className={`inline-block px-2 py-1 rounded text-xs ${
                              player.gameStatus === 'live' ? 'bg-red-900/30 text-red-400' :
                              player.gameStatus === 'final' ? 'bg-green-900/30 text-green-400' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {player.gameStatus}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Live Games */}
              {liveScoring?.games && (
                <section className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Live Games</h3>
                  <div className="space-y-3">
                    {liveScoring.games.filter(game => game.status === 'live').map((game) => (
                      <div key={game.id} className="border border-gray-600 rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-medium">
                            {game.awayTeam} @ {game.homeTeam}
                          </span>
                          <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                            LIVE
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">
                            Q{game.quarter} {game.timeRemaining}
                          </span>
                          <span className="text-white">
                            {game.awayScore} - {game.homeScore}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {liveScoring.games.filter(game => game.status === 'live').length === 0 && (
                      <p className="text-gray-400 text-sm text-center">No live games</p>
                    )}
                  </div>
                </section>
              )}

              {/* Activity Feed */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <CompactActivityFeed leagueId={leagueId} teamId={userTeam?.id} />
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}