'use client'

import { useState } from 'react'
import { GradientCard, StatusBadge, TeamIcon, TabNavigation, PlayerCard, getTeamIcon } from '@/components/redesign'
import type { Tab } from '@/components/redesign'
import { ArrowLeftRight, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Player {
  id: string
  name: string
  position: string
  nflTeam: string
}

interface RosterPlayer {
  id: string
  playerId: string
  player: Player
}

interface Team {
  id: string
  name: string
  wins: number
  losses: number
  User: {
    name: string | null
  } | null
  roster: RosterPlayer[]
}

interface TradeProposal {
  id: string
  status: string
  createdAt: Date
  updatedAt: Date
  proposingTeam: {
    id: string
    name: string
    User: {
      name: string | null
    } | null
  }
  receivingTeam: {
    id: string
    name: string
    User: {
      name: string | null
    } | null
  }
  offeredPlayers: {
    player: Player
  }[]
  requestedPlayers: {
    player: Player
  }[]
}

interface League {
  id: string
  name: string
  season: number
  currentWeek: number
  settings: any
}

interface TradesViewProps {
  league: League | null
  teams: Team[]
  userTeam: Team | null
  pendingTrades: TradeProposal[]
  tradeHistory: TradeProposal[]
}

const tabs: Tab[] = [
  { id: 'propose', label: 'Propose Trade', icon: '💼' },
  { id: 'pending', label: 'Pending Trades', icon: '⏳' },
  { id: 'history', label: 'Trade History', icon: '📜' },
  { id: 'block', label: 'Trade Block', icon: '🔨' },
]

export function TradesView({ league, teams, userTeam, pendingTrades, tradeHistory }: TradesViewProps) {
  const [activeTab, setActiveTab] = useState('propose')
  const [selectedPartner, setSelectedPartner] = useState<Team | null>(null)
  const [offeringPlayers, setOfferingPlayers] = useState<Player[]>([])
  const [wantingPlayers, setWantingPlayers] = useState<Player[]>([])

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GradientCard gradient="dark" className="p-12 text-center">
          <p className="text-xl text-gray-400">No active league found</p>
        </GradientCard>
      </div>
    )
  }

  const otherTeams = teams.filter((t) => t.id !== userTeam?.id)

  const calculateTradeGrade = () => {
    // Mock trade analyzer
    const offeredValue = offeringPlayers.length * 50
    const wantedValue = wantingPlayers.length * 50
    const fairness = Math.min((offeredValue / (wantedValue || 1)) * 100, 100)
    
    if (fairness >= 90) return { grade: 'A+', color: 'text-fantasy-green-400' }
    if (fairness >= 80) return { grade: 'A', color: 'text-fantasy-green-400' }
    if (fairness >= 70) return { grade: 'B+', color: 'text-fantasy-blue-400' }
    if (fairness >= 60) return { grade: 'B', color: 'text-fantasy-yellow-400' }
    return { grade: 'C', color: 'text-fantasy-red-400' }
  }

  const tradeAnalysis = calculateTradeGrade()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Trading Center</h1>
          <p className="text-gray-400">{league.name} - Week {league.currentWeek}</p>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Propose Trade Tab */}
        {activeTab === 'propose' && (
          <div className="space-y-6">
            {/* Select Trading Partner */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Select Trading Partner</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {otherTeams.map((team) => (
                  <GradientCard
                    key={team.id}
                    gradient={selectedPartner?.id === team.id ? 'purple' : 'dark'}
                    hover
                    onClick={() => setSelectedPartner(team)}
                    className={`p-4 cursor-pointer ${
                      selectedPartner?.id === team.id ? 'ring-2 ring-fantasy-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TeamIcon icon={getTeamIcon(team.name)} size="md" />
                      <div className="flex-1">
                        <p className="font-semibold text-white">{team.name}</p>
                        <p className="text-sm text-gray-400">
                          {team.User?.name || 'Unknown'} • {team.wins}-{team.losses}
                        </p>
                      </div>
                    </div>
                  </GradientCard>
                ))}
              </div>
            </section>

            {selectedPartner && (
              <>
                {/* Trade Builder */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Your Players (Offering) */}
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">You're Offering</h2>
                    <GradientCard gradient="dark" className="p-4 min-h-[200px]">
                      {offeringPlayers.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          Select players from your roster
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {offeringPlayers.map((player) => (
                            <PlayerCard
                              key={player.id}
                              name={player.name}
                              position={player.position}
                              team={player.nflTeam}
                              onClick={() => setOfferingPlayers(offeringPlayers.filter((p) => p.id !== player.id))}
                            />
                          ))}
                        </div>
                      )}
                    </GradientCard>
                    <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                      <p className="text-sm font-medium text-gray-400 mb-2">Your Roster</p>
                      {userTeam?.roster.map((rosterPlayer) => (
                        <PlayerCard
                          key={rosterPlayer.id}
                          name={rosterPlayer.player.name}
                          position={rosterPlayer.player.position}
                          team={rosterPlayer.player.nflTeam}
                          selected={offeringPlayers.some((p) => p.id === rosterPlayer.player.id)}
                          onClick={() => {
                            if (offeringPlayers.some((p) => p.id === rosterPlayer.player.id)) {
                              setOfferingPlayers(offeringPlayers.filter((p) => p.id !== rosterPlayer.player.id))
                            } else {
                              setOfferingPlayers([...offeringPlayers, rosterPlayer.player])
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Their Players (Wanting) */}
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">You're Requesting</h2>
                    <GradientCard gradient="dark" className="p-4 min-h-[200px]">
                      {wantingPlayers.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          Select players from their roster
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {wantingPlayers.map((player) => (
                            <PlayerCard
                              key={player.id}
                              name={player.name}
                              position={player.position}
                              team={player.nflTeam}
                              onClick={() => setWantingPlayers(wantingPlayers.filter((p) => p.id !== player.id))}
                            />
                          ))}
                        </div>
                      )}
                    </GradientCard>
                    <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                      <p className="text-sm font-medium text-gray-400 mb-2">Their Roster</p>
                      {selectedPartner.roster.map((rosterPlayer) => (
                        <PlayerCard
                          key={rosterPlayer.id}
                          name={rosterPlayer.player.name}
                          position={rosterPlayer.player.position}
                          team={rosterPlayer.player.nflTeam}
                          selected={wantingPlayers.some((p) => p.id === rosterPlayer.player.id)}
                          onClick={() => {
                            if (wantingPlayers.some((p) => p.id === rosterPlayer.player.id)) {
                              setWantingPlayers(wantingPlayers.filter((p) => p.id !== rosterPlayer.player.id))
                            } else {
                              setWantingPlayers([...wantingPlayers, rosterPlayer.player])
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trade Analyzer */}
                <GradientCard gradient="purple-blue" className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Trade Analysis</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Trade Grade</p>
                      <p className={`text-4xl font-bold ${tradeAnalysis.color}`}>{tradeAnalysis.grade}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Fairness</p>
                      <p className="text-4xl font-bold text-white">85%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Your Team Impact</p>
                      <p className="text-4xl font-bold text-fantasy-green-400">+3.5</p>
                    </div>
                  </div>
                  <button
                    disabled={offeringPlayers.length === 0 || wantingPlayers.length === 0}
                    className="w-full mt-6 px-6 py-3 bg-fantasy-purple-600 hover:bg-fantasy-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                  >
                    Send Trade Proposal
                  </button>
                </GradientCard>
              </>
            )}
          </div>
        )}

        {/* Pending Trades Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingTrades.length === 0 ? (
              <GradientCard gradient="dark" className="p-12 text-center">
                <Clock className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-xl text-gray-400">No pending trades</p>
                <p className="text-sm text-gray-500 mt-2">Propose a trade to get started</p>
              </GradientCard>
            ) : (
              pendingTrades.map((trade) => {
                const isReceiver = trade.receivingTeam.id === userTeam?.id

                return (
                  <GradientCard key={trade.id} gradient="purple-blue" className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <StatusBadge variant="pending" pulse>
                          PENDING
                        </StatusBadge>
                        <p className="text-sm text-gray-400 mt-2">
                          Proposed {new Date(trade.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Expires in</p>
                        <p className="text-lg font-bold text-fantasy-yellow-400">2 days</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      {/* Offered Players */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <TeamIcon icon={getTeamIcon(trade.proposingTeam.name)} size="sm" />
                          <p className="font-semibold text-white">{trade.proposingTeam.name}</p>
                        </div>
                        <div className="space-y-2">
                          {trade.offeredPlayers.map((op) => (
                            <PlayerCard
                              key={op.player.id}
                              name={op.player.name}
                              position={op.player.position}
                              team={op.player.nflTeam}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center justify-center">
                        <ArrowLeftRight className="w-8 h-8 text-gray-600" />
                      </div>

                      {/* Requested Players */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <TeamIcon icon={getTeamIcon(trade.receivingTeam.name)} size="sm" />
                          <p className="font-semibold text-white">{trade.receivingTeam.name}</p>
                        </div>
                        <div className="space-y-2">
                          {trade.requestedPlayers.map((rp) => (
                            <PlayerCard
                              key={rp.player.id}
                              name={rp.player.name}
                              position={rp.player.position}
                              team={rp.player.nflTeam}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {isReceiver && (
                      <div className="grid grid-cols-3 gap-3">
                        <button className="px-4 py-2 bg-fantasy-green-600 hover:bg-fantasy-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </button>
                        <button className="px-4 py-2 bg-fantasy-blue-600 hover:bg-fantasy-blue-700 text-white rounded-lg font-medium transition-colors">
                          Counter
                        </button>
                        <button className="px-4 py-2 bg-fantasy-red-600 hover:bg-fantasy-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </GradientCard>
                )
              })
            )}
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {tradeHistory.length === 0 ? (
              <GradientCard gradient="dark" className="p-12 text-center">
                <p className="text-xl text-gray-400">No trade history</p>
              </GradientCard>
            ) : (
              tradeHistory.map((trade) => (
                <GradientCard key={trade.id} gradient="dark" className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <TeamIcon icon={getTeamIcon(trade.proposingTeam.name)} size="sm" />
                      <span className="text-white font-medium">{trade.proposingTeam.name}</span>
                      <ArrowLeftRight className="w-4 h-4 text-gray-600" />
                      <TeamIcon icon={getTeamIcon(trade.receivingTeam.name)} size="sm" />
                      <span className="text-white font-medium">{trade.receivingTeam.name}</span>
                    </div>
                    <StatusBadge
                      variant={
                        trade.status === 'ACCEPTED'
                          ? 'success'
                          : trade.status === 'REJECTED'
                          ? 'error'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {trade.status}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-gray-400">
                    {new Date(trade.updatedAt).toLocaleDateString()}
                  </p>
                </GradientCard>
              ))
            )}
          </div>
        )}

        {/* Trade Block Tab */}
        {activeTab === 'block' && (
          <GradientCard gradient="dark" className="p-12 text-center">
            <p className="text-xl text-gray-400">Trade Block Feature Coming Soon</p>
            <p className="text-sm text-gray-500 mt-2">Mark players as available for trade</p>
          </GradientCard>
        )}

        {/* Trade Rules */}
        <GradientCard gradient="dark" className="p-6 mt-8">
          <h3 className="text-lg font-bold text-white mb-4">Trade Rules & Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-fantasy-purple-400 mb-2">Processing Time</h4>
              <p className="text-gray-400">Trades are processed within 24-48 hours of acceptance</p>
            </div>
            <div>
              <h4 className="font-semibold text-fantasy-blue-400 mb-2">Trade Deadline</h4>
              <p className="text-gray-400">No trades allowed after Week {league.settings?.tradeDeadline || 11}</p>
            </div>
            <div>
              <h4 className="font-semibold text-fantasy-green-400 mb-2">Fair Play</h4>
              <p className="text-gray-400">League commissioner may veto unfair trades</p>
            </div>
          </div>
        </GradientCard>
      </div>
    </div>
  )
}

