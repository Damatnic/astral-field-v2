'use client'

import { GradientCard, StatusBadge, TeamIcon, getTeamIcon } from '@/components/redesign'
import { Trophy, TrendingUp, Target } from 'lucide-react'

interface Team {
  id: string
  name: string
  wins: number
  losses: number
  ties: number
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
  team1: Team
  team2: Team
}

interface League {
  id: string
  name: string
  season: number
  currentWeek: number
  settings: any
}

interface UserTeam {
  id: string
  name: string
  wins: number
  losses: number
  ties: number
}

interface ScheduleViewProps {
  league: League | null
  allMatchups: Matchup[]
  userTeam: UserTeam | null
}

export function ScheduleView({ league, allMatchups, userTeam }: ScheduleViewProps) {
  if (!league) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GradientCard gradient="dark" className="p-12 text-center">
          <p className="text-xl text-gray-400">No active league found</p>
        </GradientCard>
      </div>
    )
  }

  const regularSeasonWeeks = league.settings?.regularSeasonWeeks || 14
  const playoffWeeks = league.settings?.playoffWeeks || 3
  const totalWeeks = regularSeasonWeeks + playoffWeeks

  // Get user's matchups
  const userMatchups = userTeam
    ? allMatchups.filter(
        (m) => m.team1.id === userTeam.id || m.team2.id === userTeam.id
      )
    : []

  // Get upcoming matchups (next 3 weeks)
  const upcomingMatchups = userMatchups
    .filter((m) => m.week >= league.currentWeek && m.week <= league.currentWeek + 2)
    .slice(0, 3)

  // Calculate win probability (mock for now)
  const getWinProbability = (matchup: Matchup) => {
    if (!userTeam) return 50
    const isTeam1 = matchup.team1.id === userTeam.id
    const opponent = isTeam1 ? matchup.team2 : matchup.team1
    const userWinPct = userTeam.wins / (userTeam.wins + userTeam.losses + userTeam.ties || 1)
    const oppWinPct = opponent.wins / (opponent.wins + opponent.losses + opponent.ties || 1)
    return Math.round((userWinPct / (userWinPct + oppWinPct || 1)) * 100)
  }

  // Calculate playoff status
  const playoffTeams = league.settings?.playoffTeams || 6
  const teamsInPlayoffs = userTeam && userTeam.wins >= 7 // Mock calculation

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Schedule</h1>
          <p className="text-gray-400">{league.name} - Season {league.season}</p>
        </div>

        {/* Upcoming Matchups */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-fantasy-purple-500" />
            Upcoming Matchups
          </h2>
          <div className="grid gap-4">
            {upcomingMatchups.length === 0 ? (
              <GradientCard gradient="dark" className="p-6 text-center">
                <p className="text-gray-400">No upcoming matchups</p>
              </GradientCard>
            ) : (
              upcomingMatchups.map((matchup) => {
                const isTeam1 = matchup.team1.id === userTeam?.id
                const opponent = isTeam1 ? matchup.team2 : matchup.team1
                const winProb = getWinProbability(matchup)

                return (
                  <GradientCard key={matchup.id} gradient="purple-blue" className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <StatusBadge variant="info" size="sm">
                          Week {matchup.week}
                        </StatusBadge>
                        <div className="flex items-center gap-2">
                          <TeamIcon icon={getTeamIcon(opponent.name)} size="md" />
                          <div>
                            <p className="font-semibold text-white">{opponent.name}</p>
                            <p className="text-sm text-gray-400">
                              {opponent.wins}-{opponent.losses}
                              {opponent.ties > 0 && `-${opponent.ties}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Win Probability</p>
                          <p className="text-2xl font-bold text-fantasy-green-400">{winProb}%</p>
                        </div>
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-fantasy-green-500 to-fantasy-blue-500 transition-all duration-500"
                            style={{ width: `${winProb}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </GradientCard>
                )
              })
            )}
          </div>
        </section>

        {/* Full Season Schedule */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-fantasy-blue-500" />
            Full Season Schedule
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
              const matchup = userMatchups.find((m) => m.week === week)
              const isPlayed = week < league.currentWeek
              const isCurrent = week === league.currentWeek
              const isPlayoffs = week > regularSeasonWeeks

              if (!matchup) {
                return (
                  <GradientCard key={week} gradient="dark" className="p-4">
                    <p className="text-sm font-semibold text-gray-400">Week {week}</p>
                    <p className="text-xs text-gray-600 mt-1">BYE WEEK</p>
                  </GradientCard>
                )
              }

              const isTeam1 = matchup.team1.id === userTeam?.id
              const opponent = isTeam1 ? matchup.team2 : matchup.team1
              const userScore = isTeam1 ? matchup.team1Score : matchup.team2Score
              const oppScore = isTeam1 ? matchup.team2Score : matchup.team1Score
              const isWin = isPlayed && userScore !== null && oppScore !== null && userScore > oppScore
              const isLoss = isPlayed && userScore !== null && oppScore !== null && userScore < oppScore
              const isTie = isPlayed && userScore !== null && oppScore !== null && userScore === oppScore

              return (
                <GradientCard
                  key={matchup.id}
                  gradient={isCurrent ? 'purple-blue' : 'dark'}
                  className="p-4 relative"
                >
                  {isPlayoffs && (
                    <div className="absolute top-2 right-2">
                      <Trophy className="w-4 h-4 text-fantasy-yellow-500" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-300">Week {week}</p>
                    {isWin && <StatusBadge variant="win" size="sm">W</StatusBadge>}
                    {isLoss && <StatusBadge variant="loss" size="sm">L</StatusBadge>}
                    {isTie && <StatusBadge variant="tie" size="sm">T</StatusBadge>}
                    {isCurrent && <StatusBadge variant="live" size="sm">Live</StatusBadge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamIcon icon={getTeamIcon(opponent.name)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{opponent.name}</p>
                      {isPlayed && userScore !== null && oppScore !== null && (
                        <p className="text-xs text-gray-400">
                          {userScore.toFixed(2)} - {oppScore.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </GradientCard>
              )
            })}
          </div>
        </section>

        {/* Playoff Status */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-fantasy-yellow-500" />
            Playoff Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GradientCard gradient="dark" className="p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Current Standing</h3>
              {userTeam ? (
                <>
                  <p className="text-3xl font-bold text-fantasy-purple-400 mb-2">
                    {userTeam.wins}-{userTeam.losses}
                    {userTeam.ties > 0 && `-${userTeam.ties}`}
                  </p>
                  <p className="text-sm text-gray-400">
                    {teamsInPlayoffs ? 'Clinched Playoff Spot' : 'Fighting for Playoffs'}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">No team data</p>
              )}
            </GradientCard>
            <GradientCard gradient="dark" className="p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Magic Number</h3>
              <p className="text-3xl font-bold text-fantasy-green-400 mb-2">2</p>
              <p className="text-sm text-gray-400">Wins needed to clinch playoffs</p>
            </GradientCard>
          </div>
        </section>
      </div>
    </div>
  )
}

