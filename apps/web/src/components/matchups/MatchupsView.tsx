'use client'

import { useState } from 'react'
import { GradientCard, StatusBadge, TeamIcon, StatCard, TabNavigation, getTeamIcon } from '@/components/redesign'
import type { Tab } from '@/components/redesign'
import { ChevronLeft, ChevronRight, TrendingUp, Calendar, Trophy, Clock } from 'lucide-react'

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
    email: string
  } | null
}

interface Matchup {
  id: string
  week: number
  team1Score: number | null
  team2Score: number | null
  team1ProjectedScore: number | null
  team2ProjectedScore: number | null
  status: string
  team1: {
    id: string
    name: string
    User: {
      name: string | null
    } | null
  }
  team2: {
    id: string
    name: string
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

interface MatchupsViewProps {
  league: League | null
  matchups: Matchup[]
  teams: Team[]
}

const tabs: Tab[] = [
  { id: 'matchups', label: 'Matchups', icon: '⚔️' },
  { id: 'live', label: 'Live Scoring', icon: '📊' },
  { id: 'waiver', label: 'Waiver Wire', icon: '🔄' },
  { id: 'standings', label: 'Standings', icon: '🏆' },
]

export function MatchupsView({ league, matchups, teams }: MatchupsViewProps) {
  const [activeTab, setActiveTab] = useState('matchups')
  const [selectedWeek, setSelectedWeek] = useState(league?.currentWeek || 1)

  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GradientCard gradient="dark" className="p-12 text-center">
          <p className="text-xl text-gray-400">No active league found</p>
          <p className="text-sm text-gray-500 mt-2">Create or join a league to get started</p>
        </GradientCard>
      </div>
    )
  }

  const totalWeeks = league.settings?.regularSeasonWeeks || 14
  const playoffWeeks = league.settings?.playoffWeeks || 3

  const handlePreviousWeek = () => {
    if (selectedWeek > 1) {
      setSelectedWeek(selectedWeek - 1)
    }
  }

  const handleNextWeek = () => {
    if (selectedWeek < totalWeeks + playoffWeeks) {
      setSelectedWeek(selectedWeek + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{league.name}</h1>
          <p className="text-gray-400">Season {league.season}</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            icon={<Calendar />}
            label="Current Week"
            value={`Week ${league.currentWeek}`}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp />}
            label="Next Matchup"
            value="THU 8:15"
            subtitle="2 days away"
            color="purple"
          />
          <StatCard
            icon={<Clock />}
            label="Waivers Process"
            value="WED 3:00AM"
            subtitle="In 1 day"
            color="yellow"
          />
          <StatCard
            icon={<Trophy />}
            label="Playoff Weeks"
            value={`${totalWeeks + 1}-${totalWeeks + playoffWeeks}`}
            subtitle={`${totalWeeks + playoffWeeks - league.currentWeek} weeks away`}
            color="green"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Week Selector */}
        <GradientCard gradient="dark" className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousWeek}
              disabled={selectedWeek === 1}
              className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">Week {selectedWeek}</p>
              <p className="text-sm text-gray-400">
                {selectedWeek > totalWeeks ? 'Playoffs' : 'Regular Season'}
              </p>
            </div>

            <button
              onClick={handleNextWeek}
              disabled={selectedWeek >= totalWeeks + playoffWeeks}
              className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </GradientCard>

        {/* Matchups Grid */}
        {matchups.length === 0 ? (
          <GradientCard gradient="dark" className="p-8 text-center">
            <p className="text-gray-400">No matchups for Week {selectedWeek}</p>
          </GradientCard>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {matchups.map((matchup) => (
              <GradientCard
                key={matchup.id}
                gradient="purple-blue"
                hover
                className="p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <StatusBadge variant="live" pulse size="md">
                    LIVE
                  </StatusBadge>
                  <div className="text-sm text-gray-400">
                    Game Time: THU 8:15 PM
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Team 1 */}
                  <div className="flex items-center gap-3">
                    <TeamIcon icon={getTeamIcon(matchup.team1.name)} size="lg" />
                    <div className="flex-1">
                      <p className="font-semibold text-white text-lg">{matchup.team1.name}</p>
                      <p className="text-sm text-gray-400">{matchup.team1.User?.name || 'Unknown'}</p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-3xl sm:text-4xl font-bold text-white">
                          {matchup.team1Score?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Proj: {matchup.team1ProjectedScore?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="text-2xl text-gray-600">-</div>
                      <div className="text-center">
                        <p className="text-3xl sm:text-4xl font-bold text-white">
                          {matchup.team2Score?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Proj: {matchup.team2ProjectedScore?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Team 2 */}
                  <div className="flex items-center gap-3 sm:flex-row-reverse sm:text-right">
                    <TeamIcon icon={getTeamIcon(matchup.team2.name)} size="lg" />
                    <div className="flex-1">
                      <p className="font-semibold text-white text-lg">{matchup.team2.name}</p>
                      <p className="text-sm text-gray-400">{matchup.team2.User?.name || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-center">
                  <button className="text-fantasy-purple-400 hover:text-fantasy-purple-300 text-sm font-medium transition-colors">
                    View Details →
                  </button>
                </div>
              </GradientCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

