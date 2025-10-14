'use client'

import { useState } from 'react'
import { GradientCard, StatusBadge, TeamIcon, TabNavigation, StatCard, getTeamIcon } from '@/components/redesign'
import type { Tab } from '@/components/redesign'
import { Trophy, TrendingUp, Award, Target } from 'lucide-react'

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

interface WeeklyHighScore {
  week: number
  team: Team
  score: number
}

interface League {
  id: string
  name: string
  season: number
  currentWeek: number
  settings: any
}

interface LeagueStatsViewProps {
  league: League | null
  teams: Team[]
  weeklyHighScores: WeeklyHighScore[]
}

const tabs: Tab[] = [
  { id: 'standings', label: 'Standings', icon: '📊' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'playoffs', label: 'Playoff Picture', icon: '🏆' },
  { id: 'stats', label: 'League Stats', icon: '📈' },
]

export function LeagueStatsView({ league, teams, weeklyHighScores }: LeagueStatsViewProps) {
  const [activeTab, setActiveTab] = useState('stats')

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GradientCard gradient="dark" className="p-12 text-center">
          <p className="text-xl text-gray-400">No active league found</p>
        </GradientCard>
      </div>
    )
  }

  // Calculate league stats
  const highestScoringTeam = teams.reduce((prev, current) =>
    current.pointsFor > prev.pointsFor ? current : prev
  , teams[0])

  const bestRecordTeam = teams.reduce((prev, current) =>
    current.wins > prev.wins ? current : prev
  , teams[0])

  const totalPoints = teams.reduce((sum, team) => sum + team.pointsFor, 0)
  const leagueAverage = totalPoints / teams.length

  // Find unluckiest team (most points against)
  const unluckiestTeam = teams.reduce((prev, current) =>
    current.pointsAgainst > prev.pointsAgainst ? current : prev
  , teams[0])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">League Statistics</h1>
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

        {/* League Statistics Cards */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Season Leaders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Highest Scoring */}
            <GradientCard gradient="purple" className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <Trophy className="w-6 h-6 text-fantasy-yellow-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-400 mb-1">Highest Scoring</p>
                  <p className="font-bold text-white text-lg mb-1">{highestScoringTeam?.name}</p>
                  <p className="text-2xl font-bold text-fantasy-yellow-400">
                    {highestScoringTeam?.pointsFor.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Points For</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
                <TeamIcon icon={getTeamIcon(highestScoringTeam?.name || '')} size="sm" />
                <span className="text-sm text-gray-400">{highestScoringTeam?.User?.name}</span>
              </div>
            </GradientCard>

            {/* Best Record */}
            <GradientCard gradient="blue" className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <Award className="w-6 h-6 text-fantasy-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-400 mb-1">Best Record</p>
                  <p className="font-bold text-white text-lg mb-1">{bestRecordTeam?.name}</p>
                  <p className="text-2xl font-bold text-fantasy-green-400">
                    {bestRecordTeam?.wins}-{bestRecordTeam?.losses}
                    {bestRecordTeam?.ties > 0 && `-${bestRecordTeam?.ties}`}
                  </p>
                  <p className="text-xs text-gray-500">Win-Loss Record</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
                <TeamIcon icon={getTeamIcon(bestRecordTeam?.name || '')} size="sm" />
                <span className="text-sm text-gray-400">{bestRecordTeam?.User?.name}</span>
              </div>
            </GradientCard>

            {/* Unluckiest Team */}
            <GradientCard gradient="purple-blue" className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <Target className="w-6 h-6 text-fantasy-red-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-400 mb-1">Unluckiest Team</p>
                  <p className="font-bold text-white text-lg mb-1">{unluckiestTeam?.name}</p>
                  <p className="text-2xl font-bold text-fantasy-red-400">
                    {unluckiestTeam?.pointsAgainst.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Points Against</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
                <TeamIcon icon={getTeamIcon(unluckiestTeam?.name || '')} size="sm" />
                <span className="text-sm text-gray-400">{unluckiestTeam?.User?.name}</span>
              </div>
            </GradientCard>

            {/* League Average */}
            <GradientCard gradient="dark" className="p-6">
              <div className="flex items-start gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-fantasy-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-400 mb-1">League Average</p>
                  <p className="text-2xl font-bold text-fantasy-blue-400 mb-1">
                    {leagueAverage.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Points Per Team</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-700">
                <p className="text-sm text-gray-400">
                  Total: {totalPoints.toFixed(2)} pts
                </p>
              </div>
            </GradientCard>
          </div>
        </section>

        {/* Weekly High Scores */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Weekly High Scores</h2>
          <GradientCard gradient="dark" className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {weeklyHighScores.map((weekScore) => (
                <div
                  key={weekScore.week}
                  className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-fantasy-purple-500 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge variant="info" size="sm">
                      Week {weekScore.week}
                    </StatusBadge>
                    <TeamIcon icon={getTeamIcon(weekScore.team.name)} size="sm" />
                  </div>
                  <p className="font-semibold text-white mb-1 truncate">{weekScore.team.name}</p>
                  <p className="text-2xl font-bold text-fantasy-purple-400">
                    {weekScore.score.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{weekScore.team.User?.name}</p>
                </div>
              ))}
            </div>
          </GradientCard>
        </section>

        {/* Additional Stats Section */}
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">All Teams</h2>
          <GradientCard gradient="dark" className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left">
                    <th className="pb-3 pr-4 font-semibold text-gray-400">Team</th>
                    <th className="pb-3 px-4 font-semibold text-gray-400">Record</th>
                    <th className="pb-3 px-4 font-semibold text-gray-400">PF</th>
                    <th className="pb-3 px-4 font-semibold text-gray-400">PA</th>
                    <th className="pb-3 pl-4 font-semibold text-gray-400">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, index) => (
                    <tr key={team.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-6">{index + 1}</span>
                          <TeamIcon icon={getTeamIcon(team.name)} size="sm" />
                          <div>
                            <p className="font-medium text-white">{team.name}</p>
                            <p className="text-xs text-gray-500">{team.User?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        {team.wins}-{team.losses}
                        {team.ties > 0 && `-${team.ties}`}
                      </td>
                      <td className="py-3 px-4 text-fantasy-green-400 font-medium">
                        {team.pointsFor.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-fantasy-red-400 font-medium">
                        {team.pointsAgainst.toFixed(2)}
                      </td>
                      <td className="py-3 pl-4 text-gray-300 font-medium">
                        {(team.pointsFor - team.pointsAgainst).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GradientCard>
        </section>
      </div>
    </div>
  )
}

