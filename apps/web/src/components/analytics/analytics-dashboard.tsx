'use client'

import { useState, useMemo } from 'react'
import { 
  ChartBarIcon, 
  TrophyIcon, 
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  StarIcon
} from '@heroicons/react/outline'

interface AnalyticsData {
  teams: Array<{
    teamId: string
    teamName: string
    leagueName: string
    record: { wins: number; losses: number; ties: number }
    pointsFor: number
    pointsAgainst: number
    projectedPoints: number
    winPercentage: number
    averagePointsFor: number
    roster: Array<{
      player: {
        id: string
        name: string
        position: string
        nflTeam: string | null
        totalPoints: number
        averagePoints: number
        projection: number
      }
      isStarter: boolean
    }>
  }>
  summary: {
    totalTeams: number
    totalWins: number
    totalLosses: number
    totalPointsFor: number
    averageWinPercentage: number
  }
}

interface AnalyticsDashboardProps {
  data: AnalyticsData
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(
    data.teams.length > 0 ? data.teams[0].teamId : null
  )
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'players' | 'trends'>('overview')

  const selectedTeamData = useMemo(() => 
    data.teams.find(team => team.teamId === selectedTeam),
    [data.teams, selectedTeam]
  )

  const topPerformers = useMemo(() => {
    const allPlayers = data.teams.flatMap(team => 
      team.roster.map(rp => ({
        ...rp.player,
        teamName: team.teamName,
        isStarter: rp.isStarter
      }))
    )
    return allPlayers
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10)
  }, [data.teams])

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: 'bg-red-500/20 text-red-400 border-red-500/30',
      RB: 'bg-green-500/20 text-green-400 border-green-500/30',
      WR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      TE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      K: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      DEF: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    }
    return colors[position] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'teams', name: 'Teams', icon: UserGroupIcon },
    { id: 'players', name: 'Players', icon: StarIcon },
    { id: 'trends', name: 'Trends', icon: ArrowTrendingUpIcon },
  ]

  if (data.teams.length === 0) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Analytics Data</h3>
        <p className="text-gray-400">
          Join a league and start playing to see your analytics here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Active Teams</p>
              <p className="text-2xl font-bold text-white">{data.summary.totalTeams}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <TrophyIcon className="h-8 w-8 text-green-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Total Wins</p>
              <p className="text-2xl font-bold text-white">{data.summary.totalWins}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <FireIcon className="h-8 w-8 text-orange-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-white">{data.summary.averageWinPercentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-purple-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Total Points</p>
              <p className="text-2xl font-bold text-white">{data.summary.totalPointsFor.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team Performance Chart */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Team Performance</h3>
            <div className="space-y-4">
              {data.teams.map(team => (
                <div key={team.teamId} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">{team.teamName}</h4>
                    <p className="text-sm text-gray-400">{team.leagueName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">
                      {team.record.wins}-{team.record.losses}-{team.record.ties}
                    </p>
                    <p className="text-sm text-gray-400">{team.pointsFor.toFixed(1)} PF</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Top Performers</h3>
            <div className="space-y-3">
              {topPerformers.slice(0, 5).map((player, index) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-400 w-6">#{index + 1}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getPositionColor(player.position)}`}>
                      {player.position}
                    </span>
                    <div>
                      <p className="font-medium text-white">{player.name}</p>
                      <p className="text-xs text-gray-400">{player.teamName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">{player.totalPoints.toFixed(1)}</p>
                    <p className="text-xs text-gray-400">{player.averagePoints.toFixed(1)} avg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-6">
          {/* Team Selector */}
          {data.teams.length > 1 && (
            <div className="flex space-x-2">
              {data.teams.map(team => (
                <button
                  key={team.teamId}
                  onClick={() => setSelectedTeam(team.teamId)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedTeam === team.teamId
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {team.teamName}
                </button>
              ))}
            </div>
          )}

          {/* Selected Team Details */}
          {selectedTeamData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Stats */}
              <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Team Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Record:</span>
                    <span className="text-white font-medium">
                      {selectedTeamData.record.wins}-{selectedTeamData.record.losses}-{selectedTeamData.record.ties}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win %:</span>
                    <span className="text-white font-medium">{selectedTeamData.winPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Points For:</span>
                    <span className="text-white font-medium">{selectedTeamData.pointsFor.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Points Against:</span>
                    <span className="text-white font-medium">{selectedTeamData.pointsAgainst.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Points:</span>
                    <span className="text-white font-medium">{selectedTeamData.averagePointsFor.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Starting Lineup */}
              <div className="lg:col-span-2 bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Roster Performance</h3>
                <div className="space-y-2">
                  {selectedTeamData.roster
                    .sort((a, b) => b.player.totalPoints - a.player.totalPoints)
                    .map(rosterPlayer => (
                    <div key={rosterPlayer.player.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getPositionColor(rosterPlayer.player.position)}`}>
                          {rosterPlayer.player.position}
                        </span>
                        <div>
                          <p className="font-medium text-white">{rosterPlayer.player.name}</p>
                          <p className="text-xs text-gray-400">
                            {rosterPlayer.player.nflTeam} • {rosterPlayer.isStarter ? 'Starter' : 'Bench'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">{rosterPlayer.player.totalPoints.toFixed(1)}</p>
                        <p className="text-xs text-gray-400">{rosterPlayer.player.averagePoints.toFixed(1)} avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'players' && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">All Players Performance</h3>
          <div className="space-y-3">
            {topPerformers.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-bold text-gray-400 w-8">#{index + 1}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPositionColor(player.position)}`}>
                    {player.position}
                  </span>
                  <div>
                    <p className="font-medium text-white">{player.name}</p>
                    <p className="text-sm text-gray-400">{player.nflTeam} • {player.teamName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-400">{player.totalPoints.toFixed(1)}</p>
                  <p className="text-sm text-gray-400">{player.averagePoints.toFixed(1)} per game</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Performance Trends</h3>
          <div className="text-center py-12">
            <ArrowTrendingUpIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">Trends Coming Soon</h4>
            <p className="text-gray-400">
              Advanced trend analysis and projections will be available here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}