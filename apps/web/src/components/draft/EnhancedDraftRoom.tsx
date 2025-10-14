'use client'

import { useState } from 'react'
import { GradientCard, StatusBadge, PlayerCard, TabNavigation, TeamIcon, getTeamIcon } from '@/components/redesign'
import type { Tab } from '@/components/redesign'
import { AIDraftCoach } from './AIDraftCoach'
import { Clock, Search, Users, List, Trophy } from 'lucide-react'

interface Player {
  id: string
  name: string
  position: string
  nflTeam: string
  adp?: number | null
  rank?: number | null
}

interface DraftPick {
  id: string
  pickNumber: number
  round: number
  teamId: string
  playerId?: string | null
  player?: Player | null
  team: {
    id: string
    name: string
  }
}

interface Team {
  id: string
  name: string
  User?: {
    name: string | null
  } | null
}

interface EnhancedDraftRoomProps {
  leagueId: string
  currentUserId: string
  teams: Team[]
  availablePlayers: Player[]
  draftPicks: DraftPick[]
  userTeam: Team
  currentPick: DraftPick | null
  isUserTurn: boolean
}

const tabs: Tab[] = [
  { id: 'available', label: 'Available', icon: '👥' },
  { id: 'rankings', label: 'Rankings', icon: '📊' },
  { id: 'myteam', label: 'My Team', icon: '⭐' },
  { id: 'log', label: 'Draft Log', icon: '📜' },
]

export function EnhancedDraftRoom({
  leagueId,
  currentUserId,
  teams,
  availablePlayers,
  draftPicks,
  userTeam,
  currentPick,
  isUserTurn
}: EnhancedDraftRoomProps) {
  const [activeTab, setActiveTab] = useState('available')
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('ALL')
  const [timeRemaining, setTimeRemaining] = useState(90) // seconds

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

  // Get user's drafted players
  const myPicks = draftPicks.filter(p => p.teamId === userTeam.id && p.player)
  
  // Get needed positions
  const draftedPositions = myPicks.map(p => p.player?.position || '').filter(Boolean)
  const needPositions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
    .filter((pos, idx) => !draftedPositions[idx])
    .filter((v, i, a) => a.indexOf(v) === i)

  // Filter available players
  const filteredPlayers = availablePlayers.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
    return matchesSearch && matchesPosition
  })

  // Calculate round and pick
  const roundNum = currentPick ? Math.ceil(currentPick.pickNumber / teams.length) : 1
  const pickInRound = currentPick ? ((currentPick.pickNumber - 1) % teams.length) + 1 : 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Draft Room</h1>
          <p className="text-gray-400">Team: {userTeam.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Draft Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Pick Status */}
            <GradientCard gradient="purple-blue" className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Current Pick</p>
                  <p className="text-3xl font-bold text-white">
                    {currentPick?.pickNumber || 1}
                  </p>
                  <p className="text-xs text-gray-500">Overall</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Round {roundNum}</p>
                  <p className="text-3xl font-bold text-fantasy-purple-400">
                    Pick {pickInRound}
                  </p>
                  <p className="text-xs text-gray-500">of {teams.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Time Left</p>
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5 text-fantasy-red-400" />
                    <p className="text-3xl font-bold text-fantasy-red-400">
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>

              {isUserTurn && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <StatusBadge variant="success" size="lg" pulse className="w-full justify-center">
                    IT'S YOUR TURN TO PICK!
                  </StatusBadge>
                </div>
              )}

              {!isUserTurn && currentPick && (
                <div className="mt-4 pt-4 border-t border-slate-700 text-center">
                  <p className="text-sm text-gray-400">Currently Picking:</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <TeamIcon icon={getTeamIcon(currentPick.team.name)} size="sm" />
                    <p className="font-semibold text-white">{currentPick.team.name}</p>
                  </div>
                </div>
              )}
            </GradientCard>

            {/* Search and Filters */}
            <GradientCard gradient="dark" className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fantasy-purple-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {positions.map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPositionFilter(pos)}
                      className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
                        positionFilter === pos
                          ? 'bg-fantasy-purple-600 text-white'
                          : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </GradientCard>

            {/* Tab Navigation */}
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="pills"
            />

            {/* Available Players Tab */}
            {activeTab === 'available' && (
              <div className="space-y-2">
                {filteredPlayers.slice(0, 20).map((player) => (
                  <div key={player.id} className="flex items-center gap-3">
                    <PlayerCard
                      name={player.name}
                      position={player.position}
                      team={player.nflTeam}
                      className="flex-1"
                    />
                    <button
                      disabled={!isUserTurn}
                      className="px-4 py-2 bg-fantasy-green-600 hover:bg-fantasy-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      Draft
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Rankings Tab */}
            {activeTab === 'rankings' && (
              <GradientCard gradient="dark" className="p-6">
                <h3 className="font-semibold text-white mb-4">Expert Rankings</h3>
                <div className="space-y-2">
                  {availablePlayers.slice(0, 15).map((player, idx) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-fantasy-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{player.name}</p>
                        <p className="text-sm text-gray-400">{player.position} - {player.nflTeam}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">ADP</p>
                        <p className="font-semibold text-white">{player.adp?.toFixed(1) || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GradientCard>
            )}

            {/* My Team Tab */}
            {activeTab === 'myteam' && (
              <div className="space-y-2">
                {myPicks.length === 0 ? (
                  <GradientCard gradient="dark" className="p-12 text-center">
                    <Trophy className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <p className="text-xl text-gray-400">No picks yet</p>
                    <p className="text-sm text-gray-500 mt-2">Your drafted players will appear here</p>
                  </GradientCard>
                ) : (
                  myPicks.map((pick) => pick.player && (
                    <PlayerCard
                      key={pick.id}
                      name={pick.player.name}
                      position={pick.player.position}
                      team={pick.player.nflTeam}
                    />
                  ))
                )}
              </div>
            )}

            {/* Draft Log Tab */}
            {activeTab === 'log' && (
              <GradientCard gradient="dark" className="p-6">
                <h3 className="font-semibold text-white mb-4">Recent Picks</h3>
                <div className="space-y-3">
                  {draftPicks
                    .filter(p => p.player)
                    .slice(-10)
                    .reverse()
                    .map((pick) => (
                      <div key={pick.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-fantasy-purple-900 flex items-center justify-center text-white font-bold">
                            {pick.pickNumber}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{pick.player?.name}</p>
                            <p className="text-sm text-gray-400">
                              {pick.player?.position} - {pick.player?.nflTeam}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <TeamIcon icon={getTeamIcon(pick.team.name)} size="sm" />
                          <p className="text-xs text-gray-500 mt-1">{pick.team.name}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </GradientCard>
            )}

            {/* Draft Board */}
            <GradientCard gradient="dark" className="p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Draft Board
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map((team) => {
                  const teamPicks = draftPicks.filter(p => p.teamId === team.id && p.player)
                  const picksByPosition = teamPicks.reduce((acc, pick) => {
                    const pos = pick.player?.position || 'UNKNOWN'
                    acc[pos] = (acc[pos] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)

                  return (
                    <div key={team.id} className="p-4 bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TeamIcon icon={getTeamIcon(team.name)} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{team.name}</p>
                          <p className="text-xs text-gray-500">{team.User?.name || 'Unknown'}</p>
                        </div>
                        <StatusBadge variant="info" size="sm">
                          {teamPicks.length}
                        </StatusBadge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(picksByPosition).map(([pos, count]) => (
                          <span key={pos} className="text-xs px-2 py-1 bg-slate-700 rounded text-gray-300">
                            {pos}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </GradientCard>
          </div>

          {/* Right Column - AI Coach */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <AIDraftCoach
                currentPick={currentPick?.pickNumber || 1}
                userTeam={userTeam}
                availablePlayers={availablePlayers}
                draftedPlayers={myPicks.map(p => p.player!).filter(Boolean)}
                needPositions={needPositions}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

