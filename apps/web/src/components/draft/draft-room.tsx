'use client'

import { useState, useEffect } from 'react'
import { useDraftRoom } from '@/hooks/use-websocket'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ClockIcon,
  UserIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  PauseIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface DraftRoomProps {
  leagueId: string
  currentUserId: string
}

interface Player {
  id: string
  name: string
  position: string
  nflTeam: string | null
  adp: number | null
  projectedPoints?: number
}

interface Team {
  id: string
  name: string
  owner: {
    name: string
  }
  draftPicks: Array<{
    round: number
    pick: number
    player: Player
  }>
}

export function DraftRoom({ leagueId, currentUserId }: DraftRoomProps) {
  const { 
    state, 
    draftState, 
    draftEvents, 
    timeRemaining, 
    currentTeamId, 
    draftPlayer 
  } = useDraftRoom(leagueId)

  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('ALL')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [draftStatus, setDraftStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [autoPickEnabled, setAutoPickEnabled] = useState(false)
  const [viewMode, setViewMode] = useState<'players' | 'board' | 'history'>('players')

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

  // Fetch draft data
  useEffect(() => {
    const fetchDraftData = async () => {
      try {
        // Get draft status
        const statusResponse = await fetch(`/api/draft?leagueId=${leagueId}&action=status`)
        const statusData = await statusResponse.json()
        
        if (statusData.success) {
          setDraftStatus(statusData.data)
        }

        // Get available players
        const playersResponse = await fetch(`/api/draft?leagueId=${leagueId}&action=available-players&limit=200`)
        const playersData = await playersResponse.json()
        
        if (playersData.success) {
          setAvailablePlayers(playersData.data)
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch draft data:', error);
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDraftData()
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchDraftData, 10000)
    return () => clearInterval(interval)
  }, [leagueId])

  const isMyTurn = draftStatus?.currentPick?.team?.owner?.id === currentUserId
  const currentTeam = draftStatus?.currentPick?.team
  const currentPick = draftStatus?.currentPick?.pick || 1
  const currentRound = draftStatus?.currentPick?.round || 1

  const filteredPlayers = availablePlayers.filter((player: Player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.nflTeam?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
    return matchesSearch && matchesPosition
  })

  const handleDraftPlayer = async () => {
    if (!selectedPlayer || !isMyTurn || !currentTeam?.id) return

    try {
      const response = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft-player',
          leagueId,
          playerId: selectedPlayer.id,
          teamId: currentTeam.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSelectedPlayer(null)
        // Remove player from available list
        setAvailablePlayers(prev => prev.filter(p => p.id !== selectedPlayer.id))
        // Refresh draft status
        const statusResponse = await fetch(`/api/draft?leagueId=${leagueId}&action=status`)
        const statusData = await statusResponse.json()
        if (statusData.success) {
          setDraftStatus(statusData.data)
        }
      } else {
        alert(result.error || 'Failed to draft player')
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Draft error:', error);
      }
      alert('Failed to draft player')
    }
  }

  const handleToggleAutoPick = async () => {
    if (!currentTeam?.id) return

    try {
      const response = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-pick',
          leagueId,
          teamId: currentTeam.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setAutoPickEnabled(!autoPickEnabled)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Auto-pick error:', error);
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-white">Loading draft room...</p>
          {state.error && (
            <p className="text-red-400 mt-2">Error: {state.error}</p>
          )}
        </div>
      </div>
    )
  }

  if (!draftStatus?.draft) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Draft Not Found</h2>
          <p className="text-gray-400 mb-6">This league doesn't have a draft set up yet.</p>
          <a
            href={`/leagues/${leagueId}`}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          >
            Back to League
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Draft Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{draftStatus.draft.league.name} Draft</h1>
              <p className="text-gray-400">Round {currentRound} • Pick {currentPick} of {draftStatus.totalPicks}</p>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant={draftStatus.draft.status === 'IN_PROGRESS' ? 'success' : 'secondary'}>
                  {draftStatus.draft.status}
                </Badge>
                <span className="text-sm text-gray-400">
                  {draftStatus.picksCompleted} / {draftStatus.totalPicks} picks completed
                </span>
              </div>
            </div>

            {/* Draft Timer */}
            <div className="text-center">
              <div className={`text-3xl font-mono font-bold ${
                draftStatus.currentPick.timeRemaining <= 30 ? 'text-red-400' : 'text-green-400'
              }`}>
                {formatTime(draftStatus.currentPick.timeRemaining)}
              </div>
              <div className="text-sm text-gray-400">
                {currentTeam ? `${currentTeam.name}'s turn` : 'Waiting...'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {draftStatus.currentPick.timePerPick}s per pick
              </div>
            </div>

            {/* Draft Status */}
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                {draftStatus.draft.status === 'IN_PROGRESS' ? (
                  <PlayIcon className="h-5 w-5 text-green-400" />
                ) : (
                  <PauseIcon className="h-5 w-5 text-yellow-400" />
                )}
                <span className={`font-medium ${
                  isMyTurn ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {isMyTurn ? 'YOUR TURN' : 'Waiting for pick'}
                </span>
              </div>
              {isMyTurn && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAutoPick}
                    className="text-xs"
                  >
                    {autoPickEnabled ? 'Disable Auto' : 'Enable Auto'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg">
            {(['players', 'board', 'history'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-slate-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {viewMode === 'players' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Available Players */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800 rounded-lg border border-slate-700">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Available Players</h2>
                  <div className="flex space-x-2">
                    {positions.map(pos => (
                      <button
                        key={pos}
                        onClick={() => setPositionFilter(pos)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          positionFilter === pos
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredPlayers.map((player: Player) => (
                    <div
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPlayer?.id === player.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              getPositionColor(player.position)
                            }`}>
                              {player.position}
                            </span>
                            <span className="font-medium">{player.name}</span>
                            <span className="text-sm text-gray-400">{player.nflTeam}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">ADP: {player.adp || 'N/A'}</div>
                          {player.projectedPoints && (
                            <div className="text-sm text-green-400">
                              Proj: {player.projectedPoints} pts
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Draft Action */}
            {selectedPlayer && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Selected Player</h3>
                    <p className="text-gray-400">
                      {selectedPlayer.name} • {selectedPlayer.position} • {selectedPlayer.nflTeam}
                    </p>
                  </div>
                  <Button
                    onClick={handleDraftPlayer}
                    disabled={!isMyTurn}
                    size="lg"
                    className={isMyTurn ? '' : 'opacity-50 cursor-not-allowed'}
                  >
                    {isMyTurn ? 'Draft Player' : 'Not Your Turn'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Draft Board & Recent Picks */}
          <div className="space-y-6">
            {/* Recent Picks */}
            <div className="bg-slate-800 rounded-lg border border-slate-700">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl font-semibold">Recent Picks</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {draftEvents.slice(-10).reverse().map((event: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                      <div className="flex-shrink-0">
                        <TrophyIcon className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">
                          R{event.round} P{event.pick}
                        </div>
                        <div className="text-xs text-gray-400">
                          Player drafted by Team
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Draft Order */}
            <div className="bg-slate-800 rounded-lg border border-slate-700">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl font-semibold">Draft Order</h2>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {draftState?.league?.teams?.map((team: Team, index: number) => (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        team.id === currentTeamId ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <UserIcon className="h-4 w-4" />
                        <span className="text-sm">{team.name}</span>
                      </div>
                      {team.id === currentTeamId && (
                        <span className="text-xs bg-blue-500 px-2 py-1 rounded">
                          ON CLOCK
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {viewMode === 'board' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Draft Board</h2>
            <div className="text-gray-400">Draft board view coming soon...</div>
          </div>
        )}

        {viewMode === 'history' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Draft History</h2>
            <div className="space-y-3">
              {draftEvents.slice().reverse().map((event: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                  <div className="flex-shrink-0">
                    <TrophyIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">
                      R{event.round} P{event.pick}
                    </div>
                    <div className="text-xs text-gray-400">
                      Player drafted by Team
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getPositionColor(position: string): string {
  const colors: Record<string, string> = {
    QB: 'bg-red-500 text-red-100',
    RB: 'bg-green-500 text-green-100',
    WR: 'bg-blue-500 text-blue-100',
    TE: 'bg-yellow-500 text-yellow-100',
    K: 'bg-purple-500 text-purple-100',
    DEF: 'bg-orange-500 text-orange-100'
  }
  return colors[position] || 'bg-gray-500 text-gray-100'
}