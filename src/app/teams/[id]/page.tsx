'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Team, RosterSlot } from '@/types/fantasy';
import RosterView from '@/components/team/RosterView';
import LineupSetter from '@/components/team/LineupSetter';

export default function TeamPage() {
  const params = useParams();
  const teamId = params.id as string;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'lineup' | 'stats'>('roster');

  useEffect(() => {
    fetchTeam();
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${teamId}`);
      const data = await response.json();
      
      if (data.success) {
        setTeam(data.data);
      } else {
        setError(data.message || 'Failed to load team');
      }
    } catch (error) {
      setError('Error loading team');
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLineupChange = async (changes: any[]) => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'lineup_change',
          changes
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTeam(data.data);
      } else {
        setError(data.message || 'Failed to update lineup');
      }
    } catch (error) {
      setError('Error updating lineup');
      console.error('Error updating lineup:', error);
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

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="h-24 w-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Team Not Found</h3>
          <p className="text-gray-600 mb-6">{error || 'The team you are looking for does not exist.'}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Go Back
          </button>
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
              <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
              <div className="mt-2 flex items-center gap-4 text-gray-600">
                <span>
                  {team.record.wins}-{team.record.losses}
                  {team.record.ties > 0 && `-${team.record.ties}`}
                </span>
                <span>•</span>
                <span>{team.pointsFor.toFixed(1)} PF</span>
                <span>•</span>
                <span>{team.pointsAgainst.toFixed(1)} PA</span>
                <span>•</span>
                <span>#{team.standings?.rank || 'N/A'} in league</span>
              </div>
            </div>

            {(team as any).isOwner && (
              <div className="mt-4 lg:mt-0">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
                  Manage Team
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'roster', label: 'Roster', count: team.roster?.length || 0 },
                  { key: 'lineup', label: 'Set Lineup' },
                  { key: 'stats', label: 'Statistics' }
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
                    {tab.count !== undefined && (
                      <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
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

        {activeTab === 'roster' && (
          <RosterView
            team={team}
            isOwner={(team as any).isOwner || false}
            currentWeek={(team as any).league?.currentWeek || 1}
          />
        )}

        {activeTab === 'lineup' && (team as any).isOwner && (
          <LineupSetter
            team={team}
            isOwner={(team as any).isOwner}
            currentWeek={(team as any).league?.currentWeek || 1}
            onLineupChange={handleLineupChange}
          />
        )}

        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Season Statistics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Record</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {team.record.wins}-{team.record.losses}
                  {team.record.ties > 0 && `-${team.record.ties}`}
                </p>
                <p className="text-sm text-blue-700">
                  {(team.record.percentage * 100).toFixed(1)}% win rate
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Points For</h4>
                <p className="text-2xl font-bold text-green-600">
                  {team.pointsFor.toFixed(1)}
                </p>
                <p className="text-sm text-green-700">
                  Avg: {(team.pointsFor / Math.max(team.record.wins + team.record.losses + team.record.ties, 1)).toFixed(1)}/game
                </p>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-900 mb-2">Points Against</h4>
                <p className="text-2xl font-bold text-red-600">
                  {team.pointsAgainst.toFixed(1)}
                </p>
                <p className="text-sm text-red-700">
                  Avg: {(team.pointsAgainst / Math.max(team.record.wins + team.record.losses + team.record.ties, 1)).toFixed(1)}/game
                </p>
              </div>
            </div>

            {/* Recent Matchups */}
            {(team as any).recentMatchups && (team as any).recentMatchups.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Matchups</h4>
                <div className="space-y-3">
                  {(team as any).recentMatchups.map((matchup: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">
                          Week {matchup.week} vs {matchup.opponent.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {matchup.isHome ? 'Home' : 'Away'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {matchup.isHome ? matchup.homeScore : matchup.awayScore} - {matchup.isHome ? matchup.awayScore : matchup.homeScore}
                        </p>
                        <p className={`text-sm font-medium ${
                          (matchup.isHome ? matchup.homeScore > matchup.awayScore : matchup.awayScore > matchup.homeScore)
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(matchup.isHome ? matchup.homeScore > matchup.awayScore : matchup.awayScore > matchup.homeScore) ? 'W' : 'L'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}