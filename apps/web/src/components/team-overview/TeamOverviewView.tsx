'use client'

import { useState } from 'react'
import { GradientCard, StatusBadge, TabNavigation, StatCard, ProgressBar, PlayerCard, TeamIcon, getTeamIcon } from '@/components/redesign'
import { BarChart } from '@/components/redesign/SimpleChart'
import type { Tab } from '@/components/redesign'
import { Trophy, TrendingUp, Target, Calendar, Zap, LineChart as LineChartIcon } from 'lucide-react'
import Link from 'next/link'

interface Player {
  id: string
  name: string
  position: string
  nflTeam: string
}

interface RosterPlayer {
  id: string
  playerId: string
  position: string
  isStarter: boolean
  player: Player
}

interface Team {
  id: string
  name: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  User: {
    name: string | null
  } | null
  roster: RosterPlayer[]
}

interface WeeklyScore {
  week: number
  score: number
  opponentScore: number
}

interface Matchup {
  id: string
  week: number
  team1: {
    id: string
    name: string
    wins: number
    losses: number
  }
  team2: {
    id: string
    name: string
    wins: number
    losses: number
  }
}

interface League {
  id: string
  name: string
  currentWeek: number
}

interface TeamOverviewViewProps {
  league: League | null
  userTeam: Team | null
  weeklyScores: WeeklyScore[]
  upcomingMatchups: Matchup[]
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'roster', label: 'Roster', icon: '👥' },
  { id: 'lineup', label: 'Lineup', icon: '⚡' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
]

export function TeamOverviewView({ league, userTeam, weeklyScores, upcomingMatchups }: TeamOverviewViewProps) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!league || !userTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <GradientCard gradient="dark" className="p-12 text-center">
          <p className="text-xl text-gray-400">No team data available</p>
        </GradientCard>
      </div>
    )
  }

  const winPercentage = ((userTeam.wins / (userTeam.wins + userTeam.losses + userTeam.ties || 1)) * 100).toFixed(1)
  const avgPointsFor = (userTeam.pointsFor / (userTeam.wins + userTeam.losses + userTeam.ties || 1)).toFixed(2)
  const avgPointsAgainst = (userTeam.pointsAgainst / (userTeam.wins + userTeam.losses + userTeam.ties || 1)).toFixed(2)

  const starters = userTeam.roster.filter(r => r.isStarter)
  const bench = userTeam.roster.filter(r => !r.isStarter)

  // Position strength analysis
  const positionCounts = userTeam.roster.reduce((acc, r) => {
    acc[r.player.position] = (acc[r.player.position] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <TeamIcon icon={getTeamIcon(userTeam.name)} size="lg" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{userTeam.name}</h1>
              <p className="text-gray-400">{userTeam.User?.name || 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Team Performance */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Team Performance</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<Trophy />}
                  label="Season Record"
                  value={`${userTeam.wins}-${userTeam.losses}${userTeam.ties > 0 ? `-${userTeam.ties}` : ''}`}
                  subtitle={`${winPercentage}% Win Rate`}
                  color="purple"
                />
                <StatCard
                  icon={<TrendingUp />}
                  label="Points For"
                  value={avgPointsFor}
                  subtitle="Per Game Average"
                  color="green"
                />
                <StatCard
                  icon={<Target />}
                  label="Points Against"
                  value={avgPointsAgainst}
                  subtitle="Per Game Average"
                  color="red"
                />
                <StatCard
                  icon={<LineChartIcon />}
                  label="Power Ranking"
                  value="#3"
                  subtitle="In League"
                  color="blue"
                />
              </div>
            </section>

            {/* Win Probability Trend */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Scoring Trend</h2>
              <GradientCard gradient="dark" className="p-6">
                <BarChart
                  data={weeklyScores.slice(-5).map(ws => ({
                    label: `Wk ${ws.week}`,
                    value: ws.score,
                    color: ws.score > ws.opponentScore ? 'bg-fantasy-green-600' : 'bg-fantasy-red-600'
                  }))}
                  height={200}
                />
              </GradientCard>
            </section>

            {/* Quick Actions */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/ai-coach">
                  <GradientCard gradient="purple" hover className="p-6 text-center cursor-pointer">
                    <Zap className="w-8 h-8 mx-auto text-fantasy-purple-400 mb-2" />
                    <p className="font-semibold text-white">Optimize Lineup</p>
                  </GradientCard>
                </Link>
                <Link href="/trades-redesign">
                  <GradientCard gradient="blue" hover className="p-6 text-center cursor-pointer">
                    <Trophy className="w-8 h-8 mx-auto text-fantasy-blue-400 mb-2" />
                    <p className="font-semibold text-white">Trade Center</p>
                  </GradientCard>
                </Link>
                <Link href="/waivers">
                  <GradientCard gradient="purple-blue" hover className="p-6 text-center cursor-pointer">
                    <Target className="w-8 h-8 mx-auto text-fantasy-green-400 mb-2" />
                    <p className="font-semibold text-white">Waiver Wire</p>
                  </GradientCard>
                </Link>
                <Link href="/analytics">
                  <GradientCard gradient="dark" hover className="p-6 text-center cursor-pointer">
                    <LineChartIcon className="w-8 h-8 mx-auto text-fantasy-yellow-400 mb-2" />
                    <p className="font-semibold text-white">View Analytics</p>
                  </GradientCard>
                </Link>
              </div>
            </section>

            {/* Position Strength */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Position Strength</h2>
              <GradientCard gradient="dark" className="p-6 space-y-4">
                {Object.entries(positionCounts).map(([position, count]) => (
                  <ProgressBar
                    key={position}
                    label={position}
                    value={count}
                    max={5}
                    color={count >= 3 ? 'green' : count >= 2 ? 'yellow' : 'red'}
                  />
                ))}
              </GradientCard>
            </section>
          </div>
        )}

        {/* Roster Tab */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Full Roster</h2>
              <div className="space-y-2">
                {userTeam.roster.map((rosterPlayer) => (
                  <div key={rosterPlayer.id} className="flex items-center gap-3">
                    <PlayerCard
                      name={rosterPlayer.player.name}
                      position={rosterPlayer.player.position}
                      team={rosterPlayer.player.nflTeam}
                      className="flex-1"
                    />
                    {rosterPlayer.isStarter && (
                      <StatusBadge variant="success" size="sm">
                        STARTER
                      </StatusBadge>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Lineup Tab */}
        {activeTab === 'lineup' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Starting Lineup</h2>
              <div className="space-y-2">
                {starters.map((rosterPlayer) => (
                  <PlayerCard
                    key={rosterPlayer.id}
                    name={rosterPlayer.player.name}
                    position={rosterPlayer.player.position}
                    team={rosterPlayer.player.nflTeam}
                  />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Bench</h2>
              <div className="space-y-2">
                {bench.map((rosterPlayer) => (
                  <PlayerCard
                    key={rosterPlayer.id}
                    name={rosterPlayer.player.name}
                    position={rosterPlayer.player.position}
                    team={rosterPlayer.player.nflTeam}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Advanced Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Points Per Game"
                  value={avgPointsFor}
                  color="purple"
                />
                <StatCard
                  label="Optimal Lineup %"
                  value="87.5%"
                  color="green"
                />
                <StatCard
                  label="Trade Value"
                  value="$425"
                  color="blue"
                />
                <StatCard
                  label="Roster Consistency"
                  value="8.2/10"
                  color="yellow"
                />
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Team Strengths</h2>
              <GradientCard gradient="dark" className="p-6 space-y-4">
                <ProgressBar label="Offense" value={85} max={100} color="green" />
                <ProgressBar label="Defense" value={72} max={100} color="blue" />
                <ProgressBar label="Depth" value={68} max={100} color="yellow" />
                <ProgressBar label="Upside" value={91} max={100} color="purple" />
              </GradientCard>
            </section>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Upcoming Matchups</h2>
              {upcomingMatchups.length === 0 ? (
                <GradientCard gradient="dark" className="p-8 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">No upcoming matchups</p>
                </GradientCard>
              ) : (
                <div className="space-y-4">
                  {upcomingMatchups.map((matchup) => {
                    const isTeam1 = matchup.team1.id === userTeam.id
                    const opponent = isTeam1 ? matchup.team2 : matchup.team1

                    return (
                      <GradientCard key={matchup.id} gradient="purple-blue" className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <StatusBadge variant="info" size="sm" className="mb-2">
                              Week {matchup.week}
                            </StatusBadge>
                            <div className="flex items-center gap-3">
                              <TeamIcon icon={getTeamIcon(opponent.name)} size="md" />
                              <div>
                                <p className="font-bold text-white text-lg">{opponent.name}</p>
                                <p className="text-sm text-gray-400">
                                  {opponent.wins}-{opponent.losses} Record
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Win Probability</p>
                            <p className="text-3xl font-bold text-fantasy-green-400">65%</p>
                          </div>
                        </div>
                      </GradientCard>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

