'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  owner: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
  lastWeek: 'W' | 'L' | 'T';
}

const StandingsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated data for now
    const mockTeams: Team[] = [
      { id: '1', name: 'Team Dynasty', owner: 'John Smith', wins: 3, losses: 0, ties: 0, pointsFor: 387.5, pointsAgainst: 298.2, streak: 'W3', lastWeek: 'W' },
      { id: '2', name: 'Power Squad', owner: 'Jane Doe', wins: 2, losses: 1, ties: 0, pointsFor: 365.3, pointsAgainst: 312.4, streak: 'W1', lastWeek: 'W' },
      { id: '3', name: 'Elite Team', owner: 'Mike Johnson', wins: 2, losses: 1, ties: 0, pointsFor: 342.1, pointsAgainst: 329.8, streak: 'L1', lastWeek: 'L' },
      { id: '4', name: 'Champions FC', owner: 'Sarah Wilson', wins: 2, losses: 1, ties: 0, pointsFor: 338.9, pointsAgainst: 341.2, streak: 'W2', lastWeek: 'W' },
      { id: '5', name: 'Warriors', owner: 'Tom Brown', wins: 1, losses: 2, ties: 0, pointsFor: 321.7, pointsAgainst: 334.5, streak: 'L2', lastWeek: 'L' },
      { id: '6', name: 'Lightning', owner: 'Emma Davis', wins: 1, losses: 2, ties: 0, pointsFor: 318.4, pointsAgainst: 339.1, streak: 'W1', lastWeek: 'W' },
      { id: '7', name: 'Thunder', owner: 'Chris Miller', wins: 1, losses: 2, ties: 0, pointsFor: 309.2, pointsAgainst: 345.7, streak: 'L1', lastWeek: 'L' },
      { id: '8', name: 'Titans', owner: 'Lisa Garcia', wins: 0, losses: 3, ties: 0, pointsFor: 287.3, pointsAgainst: 362.1, streak: 'L3', lastWeek: 'L' },
    ];
    
    setTeams(mockTeams);
    setIsLoading(false);
  }, []);

  const getWinPercentage = (team: Team) => {
    const totalGames = team.wins + team.losses + team.ties;
    if (totalGames === 0) return '0.000';
    return ((team.wins + team.ties * 0.5) / totalGames).toFixed(3);
  };

  const getPointsDiff = (team: Team) => {
    const diff = team.pointsFor - team.pointsAgainst;
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Standings</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">League Standings</h1>
              <p className="text-gray-600 mt-1">2024 Season - Week 3</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">8 Teams</span>
            </div>
          </div>
        </div>
      </header>

      {/* Standings Table */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="text-center w-12">Rank</th>
                  <th>Team</th>
                  <th className="text-center">W-L-T</th>
                  <th className="text-center">Win %</th>
                  <th className="text-right">Points For</th>
                  <th className="text-right">Points Against</th>
                  <th className="text-right">Diff</th>
                  <th className="text-center">Streak</th>
                  <th className="text-center">Last</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => (
                  <tr key={team.id} className={index === 0 ? 'bg-gold-50' : ''}>
                    <td className="text-center font-bold">
                      <div className="flex items-center justify-center">
                        {index === 0 && <Trophy className="w-4 h-4 text-gold-600 mr-1" />}
                        {index + 1}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold text-gray-900">{team.name}</p>
                        <p className="text-xs text-gray-500">{team.owner}</p>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="font-medium">{team.wins}-{team.losses}-{team.ties}</span>
                    </td>
                    <td className="text-center">
                      <span className="text-sm">{getWinPercentage(team)}</span>
                    </td>
                    <td className="text-right">
                      <span className="font-medium">{team.pointsFor.toFixed(1)}</span>
                    </td>
                    <td className="text-right">
                      <span className="text-gray-600">{team.pointsAgainst.toFixed(1)}</span>
                    </td>
                    <td className="text-right">
                      <span className={`font-medium ${
                        team.pointsFor > team.pointsAgainst ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {getPointsDiff(team)}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        team.streak.startsWith('W') ? 'bg-green-100 text-green-800' :
                        team.streak.startsWith('L') ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {team.streak}
                      </span>
                    </td>
                    <td className="text-center">
                      {team.lastWeek === 'W' && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                          <ChevronUp className="w-4 h-4" />
                        </span>
                      )}
                      {team.lastWeek === 'L' && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600">
                          <ChevronDown className="w-4 h-4" />
                        </span>
                      )}
                      {team.lastWeek === 'T' && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600">
                          <Minus className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Playoff Picture */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Playoff Picture</h2>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-900">Currently In</span>
                  <span className="text-sm text-green-700">Top 6 Teams</span>
                </div>
                {teams.slice(0, 6).map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm font-bold ${index < 2 ? 'text-green-600' : 'text-gray-600'}`}>
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-900">{team.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{team.wins}-{team.losses}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Division Leaders</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Points Leader</p>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{teams[0].name}</p>
                      <p className="text-sm text-gray-600">{teams[0].pointsFor.toFixed(1)} PF</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Best Record</p>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{teams[0].name}</p>
                      <p className="text-sm text-gray-600">{teams[0].wins}-{teams[0].losses}</p>
                    </div>
                    <Trophy className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StandingsPage;