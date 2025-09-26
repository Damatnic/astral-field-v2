'use client'

import { useState, useEffect } from 'react'
import { useDraftRoom } from '@/hooks/use-websocket'
import { Button } from '@/components/ui/button'
import {
  ClockIcon,
  UserIcon,
  TrophyIcon,
  MagnifyingGlassIcon
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

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

  const isMyTurn = currentTeamId === getCurrentUserTeamId()
  const currentTeam = draftState?.league?.teams?.find((t: Team) => t.id === currentTeamId)
  const currentPick = draftState?.currentPick || 1
  const currentRound = Math.ceil(currentPick / (draftState?.league?.teams?.length || 12))

  function getCurrentUserTeamId() {
    return draftState?.league?.teams?.find((t: Team) => 
      t.owner.name === 'Current User' // This would come from session
    )?.id
  }

  const filteredPlayers = draftState?.availablePlayers?.filter((player: Player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
    return matchesSearch && matchesPosition
  }) || []

  const handleDraftPlayer = () => {
    if (!selectedPlayer || !isMyTurn || !currentTeamId) return

    draftPlayer({
      playerId: selectedPlayer.id,
      teamId: currentTeamId,
      pick: currentPick,
      round: currentRound
    })

    setSelectedPlayer(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!state.connected) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-white">Connecting to draft room...</p>
          {state.error && (
            <p className="text-red-400 mt-2">Error: {state.error}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Draft Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{draftState?.league?.name} Draft</h1>
              <p className="text-gray-400">Round {currentRound} • Pick {currentPick}</p>
            </div>

            {/* Draft Timer */}
            <div className="text-center">
              <div className={`text-3xl font-mono font-bold ${
                timeRemaining <= 30 ? 'text-red-400' : 'text-green-400'
              }`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-gray-400">
                {currentTeam ? `${currentTeam.name}'s turn` : 'Waiting...'}
              </div>
            </div>

            {/* Draft Status */}
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-blue-400" />
                <span className={`font-medium ${
                  isMyTurn ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {isMyTurn ? 'YOUR TURN' : 'Waiting for pick'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
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