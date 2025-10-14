'use client'

import { useState } from 'react'
import { GradientCard, StatusBadge, TeamIcon, TabNavigation, getTeamIcon } from '@/components/redesign'
import type { Tab } from '@/components/redesign'
import { Trophy, Medal, Award } from 'lucide-react'

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
}

interface Matchup {
  id: string
  week: number
  team1Score: number | null
  team2Score: number | null
  status: string
  team1: {
    id: string
    name: string
    wins: number
    losses: number
    User: {
      name: string | null
    } | null
  }
  team2: {
    id: string
    name: string
    wins: number
    losses: number
    User: {
      name: string | null
    } | null
  }
}

interface League {
  id: string
  name: string
  season: number
  currentWeek: number
  settings: any
}

interface PlayoffsViewProps {
  league: League | null
  teams: Team[]
  playoffMatchups: Matchup[]
}

const tabs: Tab[] = [
  { id: 'standings', label: 'Standings', icon: '📊' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'playoffs', label: 'Playoff Picture', icon: '🏆' },
  { id: 'stats', label: 'League Stats', icon: '📈' },
]

export function PlayoffsView({ league, teams, playoffMatchups }: PlayoffsViewProps) {
  const [activeTab, setActiveTab] = useState('playoffs')

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GradientCard gradient="dark" className="p-12 text-center">
          <p className="text-xl text-gray-400">No active league found</p>
        </GradientCard>
      </div>
    )
  }

  const playoffTeams = league.settings?.playoffTeams || 6
  const byeTeams = 2
  const wildCardTeams = playoffTeams - byeTeams

  // Split teams into playoff seeds
  const firstRoundBye = teams.slice(0, byeTeams)
  const wildCard = teams.slice(byeTeams, playoffTeams)

  const regularSeasonWeeks = league.settings?.regularSeasonWeeks || 14
  const playoffWeeks = [
    { week: regularSeasonWeeks + 1, name: 'Wild Card' },
    { week: regularSeasonWeeks + 2, name: 'Semifinals' },
    { week: regularSeasonWeeks + 3, name: 'Championship' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Playoff Picture</h1>
          <p className="text-gray-400">{league.name} - Season {league.season}</p>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Current Playoff Seeding */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-fantasy-yellow-500" />
            Current Playoff Seeding
          </h2>

          {/* First Round Bye */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-fantasy-purple-400 mb-3 flex items-center gap-2">
              <Medal className="w-5 h-5" />
              First Round Bye (Seeds 1-2)
            </h3>
            <div className="grid gap-3">
              {firstRoundBye.map((team, index) => (
                <GradientCard key={team.id} gradient="purple" className="p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fantasy-yellow-500 to-fantasy-yellow-700 flex items-center justify-center text-white font-bold text-xl border-2 border-fantasy-yellow-400">
                        {index + 1}
                      </div>
                    </div>
                    <TeamIcon icon={getTeamIcon(team.name)} size="lg" />
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">{team.name}</p>
                      <p className="text-sm text-gray-400">{team.User?.name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {team.wins}-{team.losses}
                        {team.ties > 0 && `-${team.ties}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {team.pointsFor.toFixed(2)} PF
                      </p>
                    </div>
                  </div>
                </GradientCard>
              ))}
            </div>
          </div>

          {/* Wild Card Round */}
          <div>
            <h3 className="text-lg font-semibold text-fantasy-blue-400 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Wild Card Round (Seeds 3-{playoffTeams})
            </h3>
            <div className="grid gap-3">
              {wildCard.map((team, index) => (
                <GradientCard key={team.id} gradient="blue" className="p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fantasy-blue-500 to-fantasy-blue-700 flex items-center justify-center text-white font-bold text-xl border-2 border-fantasy-blue-400">
                        {index + byeTeams + 1}
                      </div>
                    </div>
                    <TeamIcon icon={getTeamIcon(team.name)} size="lg" />
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">{team.name}</p>
                      <p className="text-sm text-gray-400">{team.User?.name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {team.wins}-{team.losses}
                        {team.ties > 0 && `-${team.ties}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {team.pointsFor.toFixed(2)} PF
                      </p>
                    </div>
                  </div>
                </GradientCard>
              ))}
            </div>
          </div>
        </section>

        {/* Playoff Schedule */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-fantasy-green-500" />
            Playoff Schedule
          </h2>
          <div className="space-y-6">
            {playoffWeeks.map((round) => {
              const roundMatchups = playoffMatchups.filter((m) => m.week === round.week)

              return (
                <div key={round.week}>
                  <h3 className="text-lg font-semibold text-fantasy-purple-400 mb-3">
                    Week {round.week} - {round.name}
                  </h3>
                  {roundMatchups.length === 0 ? (
                    <GradientCard gradient="dark" className="p-6 text-center">
                      <p className="text-gray-400">Matchups TBD</p>
                    </GradientCard>
                  ) : (
                    <div className="grid gap-4">
                      {roundMatchups.map((matchup) => (
                        <GradientCard key={matchup.id} gradient="purple-blue" className="p-4 sm:p-6">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                            {/* Team 1 */}
                            <div className="flex items-center gap-3">
                              <TeamIcon icon={getTeamIcon(matchup.team1.name)} size="md" />
                              <div>
                                <p className="font-semibold text-white">{matchup.team1.name}</p>
                                <p className="text-xs text-gray-400">
                                  {matchup.team1.wins}-{matchup.team1.losses}
                                </p>
                              </div>
                            </div>

                            {/* Score */}
                            <div className="text-center">
                              {matchup.team1Score !== null && matchup.team2Score !== null ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-2xl font-bold text-white">
                                    {matchup.team1Score.toFixed(2)}
                                  </span>
                                  <span className="text-gray-600">-</span>
                                  <span className="text-2xl font-bold text-white">
                                    {matchup.team2Score.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <StatusBadge variant="pending">TBD</StatusBadge>
                              )}
                            </div>

                            {/* Team 2 */}
                            <div className="flex items-center gap-3 sm:flex-row-reverse sm:text-right">
                              <TeamIcon icon={getTeamIcon(matchup.team2.name)} size="md" />
                              <div>
                                <p className="font-semibold text-white">{matchup.team2.name}</p>
                                <p className="text-xs text-gray-400">
                                  {matchup.team2.wins}-{matchup.team2.losses}
                                </p>
                              </div>
                            </div>
                          </div>
                        </GradientCard>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

