'use client'

import { useState } from 'react'
import { GradientCard, StatusBadge, PlayerCard, StatCard, TabNavigation } from '@/components/redesign'
import type { Tab } from '@/components/redesign'
import { DollarSign, Clock, TrendingUp, Search } from 'lucide-react'

interface Player {
  id: string
  name: string
  position: string
  nflTeam: string
  adp: number | null
  rank: number | null
}

interface WaiverClaim {
  id: string
  priority: number
  faabBid: number | null
  status: string
  player: {
    id: string
    name: string
    position: string
    nflTeam: string
  }
  dropPlayer: {
    id: string
    name: string
    position: string
    nflTeam: string
  } | null
}

interface UserTeam {
  id: string
  name: string
  waiverPosition: number | null
  faabBudget: number | null
}

interface League {
  id: string
  name: string
  season: number
  currentWeek: number
  settings: any
}

interface WaiversViewProps {
  league: League | null
  availablePlayers: Player[]
  userTeam: UserTeam | null
  waiverClaims: WaiverClaim[]
}

const tabs: Tab[] = [
  { id: 'available', label: 'Available Players', icon: '👥' },
  { id: 'claims', label: 'My Claims', icon: '📋' },
  { id: 'recent', label: 'Recent Activity', icon: '🔄' },
]

export function WaiversView({ league, availablePlayers, userTeam, waiverClaims }: WaiversViewProps) {
  const [activeTab, setActiveTab] = useState('available')
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('ALL')

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GradientCard gradient="dark" className="p-12 text-center">
          <p className="text-xl text-gray-400">No active league found</p>
        </GradientCard>
      </div>
    )
  }

  const filteredPlayers = availablePlayers.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
    return matchesSearch && matchesPosition
  })

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']
  const waiverSettings = league.settings?.waiverSettings || {}
  const useFAAB = waiverSettings.type === 'FAAB'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Waiver Wire</h1>
          <p className="text-gray-400">{league.name} - Week {league.currentWeek}</p>
        </div>

        {/* Waiver Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {useFAAB ? (
            <>
              <StatCard
                icon={<DollarSign />}
                label="FAAB Remaining"
                value={`$${userTeam?.faabBudget || 0}`}
                color="green"
              />
              <StatCard
                icon={<Clock />}
                label="Waiver Period"
                value="WED 3:00 AM"
                subtitle="In 2 days"
                color="blue"
              />
            </>
          ) : (
            <>
              <StatCard
                icon={<TrendingUp />}
                label="Waiver Priority"
                value={userTeam?.waiverPosition || 'N/A'}
                color="purple"
              />
              <StatCard
                icon={<Clock />}
                label="Next Process"
                value="WED 3:00 AM"
                subtitle="In 2 days"
                color="blue"
              />
            </>
          )}
          <StatCard
            icon={<Search />}
            label="Available Players"
            value={availablePlayers.length}
            color="yellow"
          />
          <StatCard
            icon={<DollarSign />}
            label="Pending Claims"
            value={waiverClaims.length}
            color="red"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="pills"
          />
        </div>

        {/* Available Players Tab */}
        {activeTab === 'available' && (
          <>
            {/* Search and Filters */}
            <GradientCard gradient="dark" className="p-4 mb-6">
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

            {/* Players List */}
            <div className="space-y-3">
              {filteredPlayers.length === 0 ? (
                <GradientCard gradient="dark" className="p-8 text-center">
                  <p className="text-gray-400">No players found</p>
                </GradientCard>
              ) : (
                filteredPlayers.map((player) => (
                  <div key={player.id} className="flex items-center gap-3">
                    <PlayerCard
                      name={player.name}
                      position={player.position}
                      team={player.nflTeam}
                      className="flex-1"
                    />
                    <button className="px-4 py-2 bg-fantasy-purple-600 hover:bg-fantasy-purple-700 text-white rounded-lg font-medium transition-colors">
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* My Claims Tab */}
        {activeTab === 'claims' && (
          <div className="space-y-4">
            {waiverClaims.length === 0 ? (
              <GradientCard gradient="dark" className="p-12 text-center">
                <p className="text-xl text-gray-400">No pending waiver claims</p>
                <p className="text-sm text-gray-500 mt-2">Add players from the available players tab</p>
              </GradientCard>
            ) : (
              waiverClaims.map((claim, index) => (
                <GradientCard key={claim.id} gradient="purple-blue" className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <StatusBadge variant="pending" size="sm">
                      Priority #{claim.priority}
                    </StatusBadge>
                    {useFAAB && claim.faabBid && (
                      <StatusBadge variant="success" size="sm">
                        ${claim.faabBid} Bid
                      </StatusBadge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    {/* Adding */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Adding</p>
                      <PlayerCard
                        name={claim.player.name}
                        position={claim.player.position}
                        team={claim.player.nflTeam}
                      />
                    </div>
                    {/* Arrow */}
                    <div className="text-center text-2xl text-gray-600">→</div>
                    {/* Dropping */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Dropping</p>
                      {claim.dropPlayer ? (
                        <PlayerCard
                          name={claim.dropPlayer.name}
                          position={claim.dropPlayer.position}
                          team={claim.dropPlayer.nflTeam}
                        />
                      ) : (
                        <GradientCard gradient="dark" className="p-4">
                          <p className="text-sm text-gray-400">No drop selected</p>
                        </GradientCard>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700 flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors">
                      Edit
                    </button>
                    <button className="px-4 py-2 bg-fantasy-red-600 hover:bg-fantasy-red-700 text-white rounded-lg font-medium transition-colors">
                      Cancel
                    </button>
                  </div>
                </GradientCard>
              ))
            )}
          </div>
        )}

        {/* Recent Activity Tab */}
        {activeTab === 'recent' && (
          <GradientCard gradient="dark" className="p-12 text-center">
            <p className="text-xl text-gray-400">No recent activity</p>
            <p className="text-sm text-gray-500 mt-2">Waiver processing happens Wednesday at 3:00 AM</p>
          </GradientCard>
        )}
      </div>
    </div>
  )
}

