'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useLiveScoring } from '@/hooks/use-websocket'
import { Button } from '@/components/ui/button'
import {
  TvIcon,
  BoltIcon,
  ClockIcon,
  TrophyIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface LiveScoringDashboardProps {
  leagueId: string
  week: number
}

interface Matchup {
  id: string
  homeTeam: {
    id: string
    name: string
    owner: { name: string }
    projectedScore: number
    liveScore: number
    players: Player[]
  }
  awayTeam: {
    id: string
    name: string
    owner: { name: string }
    projectedScore: number
    liveScore: number
    players: Player[]
  }
  status: 'upcoming' | 'live' | 'completed'
  gameInfo?: {
    quarter: number
    timeRemaining: string
    lastUpdate: Date
  }
}

interface Player {
  id: string
  name: string
  position: string
  nflTeam: string
  isStarting: boolean
  projectedPoints: number
  livePoints: number
  stats: {
    passingYards?: number
    rushingYards?: number
    receivingYards?: number
    touchdowns?: number
    fieldGoals?: number
  }
  gameStatus: 'not_started' | 'playing' | 'completed'
  lastUpdate: Date
}

// Utility function for game status colors
const getGameStatusColor = (status: string): string => {
  switch (status) {
    case 'playing':
      return 'bg-green-500 text-white'
    case 'completed':
      return 'bg-gray-500 text-white'
    default:
      return 'bg-blue-500 text-white'
  }
}

// Memoized MatchupCard component
const MatchupCard = memo(function MatchupCard({ 
  matchup, 
  viewMode, 
  selectedMatchup, 
  onToggleDetails 
}: {
  matchup: Matchup
  viewMode: 'overview' | 'detailed'
  selectedMatchup: string | null
  onToggleDetails: (id: string) => void
}) {
  const handleToggle = useCallback(() => {
    onToggleDetails(matchup.id)
  }, [matchup.id, onToggleDetails])

  return (
    <div className="bg-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">
          Q{matchup.gameInfo?.quarter} • {matchup.gameInfo?.timeRemaining} remaining
        </div>
        <div className="text-sm text-gray-400">
          Updated {matchup.gameInfo?.lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Home Team */}
        <div className="text-center">
          <h3 className="font-semibold text-white text-lg">{matchup.homeTeam.name}</h3>
          <p className="text-sm text-gray-400">{matchup.homeTeam.owner.name}</p>
          <div className="mt-2">
            <p className="text-3xl font-bold text-green-400">
              {matchup.homeTeam.liveScore.toFixed(1)}
            </p>
            <p className="text-sm text-gray-400">
              Projected: {matchup.homeTeam.projectedScore.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Away Team */}
        <div className="text-center">
          <h3 className="font-semibold text-white text-lg">{matchup.awayTeam.name}</h3>
          <p className="text-sm text-gray-400">{matchup.awayTeam.owner.name}</p>
          <div className="mt-2">
            <p className="text-3xl font-bold text-green-400">
              {matchup.awayTeam.liveScore.toFixed(1)}
            </p>
            <p className="text-sm text-gray-400">
              Projected: {matchup.awayTeam.projectedScore.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {viewMode === 'detailed' && (
        <div className="mt-6 pt-6 border-t border-slate-600">
          <div className="grid grid-cols-2 gap-6">
            {/* Home Team Players */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Starting Lineup</h4>
              <div className="space-y-2">
                {matchup.homeTeam.players.slice(0, 5).map(player => (
                  <PlayerRow key={player.id} player={player} />
                ))}
              </div>
            </div>

            {/* Away Team Players */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Starting Lineup</h4>
              <div className="space-y-2">
                {matchup.awayTeam.players.slice(0, 5).map(player => (
                  <PlayerRow key={player.id} player={player} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
        >
          <ChartBarIcon className="h-4 w-4 mr-2" />
          {selectedMatchup === matchup.id ? 'Hide Details' : 'View Details'}
        </Button>
      </div>
    </div>
  )
})

// Memoized PlayerRow component
const PlayerRow = memo(function PlayerRow({ player }: { player: Player }) {
  return (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center space-x-2">
      <span className={`w-8 h-4 rounded text-xs text-center ${getGameStatusColor(player.gameStatus)}`}>
        {player.gameStatus === 'playing' ? 'LIVE' : 
         player.gameStatus === 'completed' ? 'DONE' : 'WAIT'}
      </span>
      <span className="text-white">{player.name}</span>
      <span className="text-gray-400">({player.position})</span>
    </div>
    <span className="text-green-400 font-medium">
      {player.livePoints.toFixed(1)}
    </span>
  </div>
  )
})

// Memoized StatusCard component
const StatusCard = memo(function StatusCard({ 
  icon: Icon, 
  iconColor, 
  label, 
  value 
}: {
  icon: any
  iconColor: string
  label: string
  value: number
}) {
  return (
  <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
    <div className="flex items-center">
      <Icon className={`h-8 w-8 ${iconColor} mr-3`} />
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  </div>
  )
})

export const LiveScoringDashboard = memo(({ leagueId, week }: LiveScoringDashboardProps) => {
  const { state, scores, liveEvents } = useLiveScoring(leagueId, week)
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [selectedMatchup, setSelectedMatchup] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Mock data for demonstration
  useEffect(() => {
    // In real implementation, this would come from the WebSocket or API
    setMatchups([
      {
        id: '1',
        homeTeam: {
          id: 'team1',
          name: 'Fire Breathing Rubber Ducks',
          owner: { name: 'John Doe' },
          projectedScore: 124.5,
          liveScore: 89.7,
          players: generateMockPlayers('home')
        },
        awayTeam: {
          id: 'team2',
          name: 'Victorious Secret',
          owner: { name: 'Jane Smith' },
          projectedScore: 118.2,
          liveScore: 95.3,
          players: generateMockPlayers('away')
        },
        status: 'live',
        gameInfo: {
          quarter: 3,
          timeRemaining: '8:42',
          lastUpdate: new Date()
        }
      },
      {
        id: '2',
        homeTeam: {
          id: 'team3',
          name: 'The Replacements',
          owner: { name: 'Mike Johnson' },
          projectedScore: 108.9,
          liveScore: 76.4,
          players: generateMockPlayers('home')
        },
        awayTeam: {
          id: 'team4',
          name: 'Bench Warmers',
          owner: { name: 'Sarah Wilson' },
          projectedScore: 115.6,
          liveScore: 82.1,
          players: generateMockPlayers('away')
        },
        status: 'live',
        gameInfo: {
          quarter: 2,
          timeRemaining: '3:15',
          lastUpdate: new Date()
        }
      }
    ])
  }, [])

  // Memoized callbacks
  const handleToggleDetails = useCallback((matchupId: string) => {
    setSelectedMatchup(prev => prev === matchupId ? null : matchupId)
  }, [])

  const handleToggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev)
  }, [])

  const handleViewModeChange = useCallback((mode: 'overview' | 'detailed') => {
    setViewMode(mode)
  }, [])

  // Update scores based on live events
  useEffect(() => {
    liveEvents.forEach(event => {
      if (event.type === 'SCORE_UPDATE' && event.matchupId) {
        setMatchups(prev => prev.map(matchup => 
          matchup.id === event.matchupId
            ? {
                ...matchup,
                gameInfo: event.gameInfo ? {
                  ...matchup.gameInfo!,
                  ...event.gameInfo
                } : matchup.gameInfo
              }
            : matchup
        ))
      }
    })
  }, [liveEvents])

  // Memoized mock data generator
  const generateMockPlayers = useCallback((team: 'home' | 'away'): Player[] => {
    const positions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
    return positions.map((pos: any, index: number) => ({
      id: `${team}-player-${index}`,
      name: `Player ${index + 1}`,
      position: pos,
      nflTeam: ['BUF', 'MIA', 'NE', 'NYJ'][Math.floor(Math.random() * 4)],
      isStarting: true,
      projectedPoints: 8 + Math.random() * 15,
      livePoints: Math.random() * 20,
      stats: {
        passingYards: pos === 'QB' ? Math.floor(Math.random() * 300) : undefined,
        rushingYards: ['QB', 'RB'].includes(pos) ? Math.floor(Math.random() * 100) : undefined,
        receivingYards: ['WR', 'TE'].includes(pos) ? Math.floor(Math.random() * 120) : undefined,
        touchdowns: Math.floor(Math.random() * 3),
        fieldGoals: pos === 'K' ? Math.floor(Math.random() * 4) : undefined
      },
      gameStatus: ['not_started', 'playing', 'completed'][Math.floor(Math.random() * 3)] as any,
      lastUpdate: new Date()
    }))
  }, [])

  // Memoized filtered matchups
  const { liveMatchups, completedMatchups, upcomingMatchups } = useMemo(() => ({
    liveMatchups: matchups.filter(m => m.status === 'live'),
    completedMatchups: matchups.filter(m => m.status === 'completed'),
    upcomingMatchups: matchups.filter(m => m.status === 'upcoming')
  }), [matchups])

  // Memoized recent events
  const recentEvents = useMemo(() => 
    liveEvents.slice(-10).reverse(), 
    [liveEvents]
  )

  if (!state.connected) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-white">Connecting to live scoring...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Scoring - Week {week}</h1>
          <p className="text-gray-400">Real-time fantasy updates</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BoltIcon className={`h-5 w-5 ${autoRefresh ? 'text-green-400' : 'text-gray-400'}`} />
            <button
              onClick={handleToggleAutoRefresh}
              className={`text-sm font-medium ${
                autoRefresh ? 'text-green-400' : 'text-gray-400'
              }`}
            >
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex space-x-2">
            <Button
              variant={viewMode === 'overview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewModeChange('overview')}
            >
              Overview
            </Button>
            <Button
              variant={viewMode === 'detailed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewModeChange('detailed')}
            >
              Detailed
            </Button>
          </div>
        </div>
      </div>

      {/* Live Games Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard 
          icon={TvIcon}
          iconColor="text-red-400"
          label="Live Games"
          value={liveMatchups.length}
        />
        <StatusCard 
          icon={ClockIcon}
          iconColor="text-blue-400"
          label="Upcoming"
          value={upcomingMatchups.length}
        />
        <StatusCard 
          icon={TrophyIcon}
          iconColor="text-green-400"
          label="Completed"
          value={completedMatchups.length}
        />
      </div>

      {/* Live Matchups */}
      {liveMatchups.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-xl font-semibold text-white">Live Games</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {liveMatchups.map(matchup => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup}
                viewMode={viewMode}
                selectedMatchup={selectedMatchup}
                onToggleDetails={handleToggleDetails}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Score Updates */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Recent Updates</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentEvents.map((event: any, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                <BoltIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-white">
                    {event.type === 'SCORE_UPDATE' ? 'Score Update' :
                     event.type === 'PLAYER_STAT_UPDATE' ? 'Player Stat Update' :
                     event.type}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

LiveScoringDashboard.displayName = 'LiveScoringDashboard'


