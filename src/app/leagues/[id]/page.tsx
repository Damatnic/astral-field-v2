'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { League, Team } from '@/types/fantasy';

export default function LeaguePage() {
  const params = useParams();
  const leagueId = params.id as string;
  
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'scoreboard' | 'transactions'>('standings');

  useEffect(() => {
    fetchLeague();
  }, [leagueId]);

  const fetchLeague = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leagues/${leagueId}`);
      const data = await response.json();
      
      if (data.success) {
        setLeague(data.data);
      } else {
        setError(data.message || 'Failed to load league');
      }
    } catch (error) {
      setError('Error loading league');
      console.error('Error fetching league:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg h-96 shadow"></div>
              </div>
              <div>
                <div className="bg-white rounded-lg h-96 shadow"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="h-24 w-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">League Not Found</h3>
          <p className="text-gray-600 mb-6">{error || 'The league you are looking for does not exist.'}</p>
          <Link
            href="/leagues"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Back to Leagues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{league.name}</h1>
              <div className="mt-2 flex items-center gap-4 text-gray-600">
                <span>{league.season} Season</span>
                <span>•</span>
                <span>Week {league.currentWeek || 1}</span>
                <span>•</span>
                <span>{league.teamCount} Teams</span>
                {league.commissioner && (
                  <>
                    <span>•</span>
                    <span>Commissioner: {league.commissioner.name}</span>
                  </>
                )}
              </div>
              {league.description && (
                <p className="mt-2 text-gray-600">{league.description}</p>
              )}
            </div>

            <div className="mt-4 lg:mt-0 flex gap-3">
              <Link
                href={`/leagues/${league.id}/settings`}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
              >
                League Settings
              </Link>
              <Link
                href={`/leagues/${league.id}/draft`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Draft Room
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'standings', label: 'Standings' },
                  { key: 'scoreboard', label: 'Scoreboard' },
                  { key: 'transactions', label: 'Transactions' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Standings Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">League Standings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Record
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PF
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PA
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Streak
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {league.teams?.map((team, index) => (
                        <tr key={team.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-xs font-medium text-blue-800">
                                    {team.name[0].toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  <Link
                                    href={`/teams/${team.id}`}
                                    className="hover:text-blue-600"
                                  >
                                    {team.name}
                                  </Link>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {team.owner.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {team.wins}-{team.losses}
                            {team.ties > 0 && `-${team.ties}`}
                            <span className="text-gray-500 ml-1">
                              ({(team.record?.percentage * 100).toFixed(1)}%)
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {team.pointsFor.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {team.pointsAgainst.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              team.standings?.streak?.startsWith('W') 
                                ? 'bg-green-100 text-green-800'
                                : team.standings?.streak?.startsWith('L')
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {team.standings?.streak || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* League Info Sidebar */}
            <div className="space-y-6">
              {/* League Stats */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">League Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Points Scored</span>
                    <span className="text-sm font-medium text-gray-900">
                      {league.teams?.reduce((total, team) => total + team.pointsFor, 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average Score</span>
                    <span className="text-sm font-medium text-gray-900">
                      {league.teams && league.teams.length > 0 
                        ? (league.teams.reduce((total, team) => total + team.pointsFor, 0) / league.teams.length / Math.max(league.currentWeek || 1, 1)).toFixed(1)
                        : '0.0'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Highest Score</span>
                    <span className="text-sm font-medium text-gray-900">
                      {league.teams && league.teams.length > 0 
                        ? Math.max(...league.teams.map(team => team.pointsFor)).toFixed(1)
                        : '0.0'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Lowest Score</span>
                    <span className="text-sm font-medium text-gray-900">
                      {league.teams && league.teams.length > 0 
                        ? Math.min(...league.teams.map(team => team.pointsFor)).toFixed(1)
                        : '0.0'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* League Settings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">League Settings</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Roster Format</span>
                    <p className="text-sm text-gray-600">
                      {league.settings?.rosterSlots?.QB || 1}QB • {league.settings?.rosterSlots?.RB || 2}RB • {league.settings?.rosterSlots?.WR || 2}WR • {league.settings?.rosterSlots?.TE || 1}TE • {league.settings?.rosterSlots?.FLEX || 1}FLEX
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Scoring</span>
                    <p className="text-sm text-gray-600">
                      PPR ({league.settings?.scoringSystem?.receiving?.receptions || 0.5} pts/rec)
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Waiver System</span>
                    <p className="text-sm text-gray-600 capitalize">
                      {league.settings?.waiverMode?.toLowerCase().replace('_', ' ') || 'Rolling'}
                    </p>
                  </div>
                  {league.settings?.tradeDeadline && (
                    <div>
                      <span className="text-sm font-medium text-gray-900">Trade Deadline</span>
                      <p className="text-sm text-gray-600">
                        {new Date(league.settings.tradeDeadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scoreboard' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Week {league.currentWeek} Scoreboard</h3>
            {(league as any).matchups && (league as any).matchups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(league as any).matchups.map((matchup: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <p className="font-medium text-gray-900">{matchup.awayTeam.name}</p>
                        <p className="text-sm text-gray-600">{matchup.awayTeam.owner?.name}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          {matchup.awayScore.toFixed(1)}
                        </p>
                      </div>
                      <div className="px-4">
                        <span className="text-gray-400 font-medium">vs</span>
                      </div>
                      <div className="text-center flex-1">
                        <p className="font-medium text-gray-900">{matchup.homeTeam.name}</p>
                        <p className="text-sm text-gray-600">{matchup.homeTeam.owner?.name}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          {matchup.homeScore.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        matchup.isComplete 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {matchup.isComplete ? 'Final' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No matchups scheduled for this week.</p>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
            <div className="text-center py-8">
              <p className="text-gray-600">No recent transactions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}