'use client';

import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  Users, 
  Target, 
  Activity,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TeamStats {
  id: string;
  name: string;
  owner: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  avgScore: number;
  powerRanking: number;
  playoffChance: number;
  championshipOdds: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface LeagueStats {
  totalPoints: number;
  avgWeeklyScore: number;
  highestWeeklyScore: { score: number; team: string; week: number };
  lowestWeeklyScore: { score: number; team: string; week: number };
  mostConsistent: string;
  mostVolatile: string;
  tradeCount: number;
  waiversClaimed: number;
}

const mockTeamStats: TeamStats[] = [
  {
    id: '1',
    name: "Team Alpha",
    owner: 'John Smith',
    wins: 7,
    losses: 6,
    pointsFor: 1365.2,
    pointsAgainst: 1298.7,
    avgScore: 104.9,
    powerRanking: 4,
    playoffChance: 85,
    championshipOdds: 15,
    trend: 'up',
    color: 'bg-green-500'
  },
  {
    id: '2',
    name: 'Thunder Bolts',
    owner: 'Jane Doe',
    wins: 3,
    losses: 10,
    pointsFor: 1462.1,
    pointsAgainst: 1589.3,
    avgScore: 112.5,
    powerRanking: 8,
    playoffChance: 12,
    championshipOdds: 2,
    trend: 'down',
    color: 'bg-nfl-blue-600'
  },
  {
    id: '3',
    name: "Elite Squad",
    owner: 'Mike Johnson',
    wins: 11,
    losses: 3,
    pointsFor: 1627.8,
    pointsAgainst: 1234.9,
    avgScore: 125.2,
    powerRanking: 1,
    playoffChance: 99,
    championshipOdds: 35,
    trend: 'up',
    color: 'bg-orange-600'
  },
  {
    id: '4',
    name: "Victory Squad",
    owner: 'Sarah Wilson',
    wins: 12,
    losses: 5,
    pointsFor: 1298.4,
    pointsAgainst: 1156.2,
    avgScore: 99.9,
    powerRanking: 2,
    playoffChance: 98,
    championshipOdds: 28,
    trend: 'stable',
    color: 'bg-purple-600'
  }
];

const mockLeagueStats: LeagueStats = {
  totalPoints: 14585.3,
  avgWeeklyScore: 109.7,
  highestWeeklyScore: { score: 167.3, team: "Elite Squad", week: 14 },
  lowestWeeklyScore: { score: 67.2, team: 'Thunder Bolts', week: 8 },
  mostConsistent: "Victory Squad",
  mostVolatile: 'Thunder Bolts',
  tradeCount: 24,
  waiversClaimed: 186
};

export default function AnalyticsPage() {
  const [selectedView, setSelectedView] = useState<'overview' | 'power' | 'trends'>('overview');

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPlayoffColor = (chance: number) => {
    if (chance >= 90) return 'text-green-600 bg-green-50';
    if (chance >= 70) return 'text-blue-600 bg-blue-50';
    if (chance >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">League insights and statistics</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'power', label: 'Power Rankings' },
                { id: 'trends', label: 'Trends' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedView(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedView === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {selectedView === 'overview' && (
          <>
            {/* League Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <Calculator className="w-5 h-5 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{mockLeagueStats.totalPoints.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">League Points</p>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-5 h-5 text-nfl-blue-600" />
                    <span className="text-xs text-nfl-blue-600 font-medium">Average</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{mockLeagueStats.avgWeeklyScore}</p>
                  <p className="text-sm text-gray-600">Weekly Score</p>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <span className="text-xs text-orange-600 font-medium">Activity</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{mockLeagueStats.tradeCount}</p>
                  <p className="text-sm text-gray-600">Total Trades</p>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="text-xs text-purple-600 font-medium">Waivers</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{mockLeagueStats.waiversClaimed}</p>
                  <p className="text-sm text-gray-600">Claims</p>
                </div>
              </div>
            </div>

            {/* Notable Achievements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card border-orange-200 bg-orange-50">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-orange-600" />
                    <h3 className="font-medium text-orange-800">Highest Weekly Score</h3>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{mockLeagueStats.highestWeeklyScore.score}</p>
                  <p className="text-sm text-orange-700">{mockLeagueStats.highestWeeklyScore.team} • Week {mockLeagueStats.highestWeeklyScore.week}</p>
                </div>
              </div>

              <div className="card border-green-200 bg-green-50">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <h3 className="font-medium text-green-800">Most Consistent</h3>
                  </div>
                  <p className="text-lg font-bold text-green-900">{mockLeagueStats.mostConsistent}</p>
                  <p className="text-sm text-green-700">Lowest score variance</p>
                </div>
              </div>

              <div className="card border-red-200 bg-red-50">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-red-600" />
                    <h3 className="font-medium text-red-800">Most Volatile</h3>
                  </div>
                  <p className="text-lg font-bold text-red-900">{mockLeagueStats.mostVolatile}</p>
                  <p className="text-sm text-red-700">Highest score variance</p>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedView === 'power' && (
          <div className="card">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-medium text-gray-900">Power Rankings</h2>
              </div>
              <div className="space-y-4">
                {mockTeamStats
                  .sort((a, b) => a.powerRanking - b.powerRanking)
                  .map((team, index) => (
                    <div key={team.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{team.name}</p>
                          <p className="text-sm text-gray-600">{team.owner}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Record</p>
                          <p className="font-medium">{team.wins}-{team.losses}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Points</p>
                          <p className="font-medium">{team.pointsFor.toFixed(0)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Avg</p>
                          <p className="font-medium">{team.avgScore.toFixed(1)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Playoffs</p>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getPlayoffColor(team.playoffChance)}`}>
                            {team.playoffChance}%
                          </span>
                        </div>
                        {getTrendIcon(team.trend)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {selectedView === 'trends' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-gray-900">Top Scorers (Season)</h3>
                </div>
                <div className="space-y-3">
                  {mockTeamStats
                    .sort((a, b) => b.pointsFor - a.pointsFor)
                    .map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 ${
                            index === 0 ? 'bg-orange-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-yellow-600' : 'bg-gray-300'
                          } rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{team.name}</span>
                        </div>
                        <span className="text-sm font-bold">{team.pointsFor.toFixed(1)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-nfl-blue-600" />
                  <h3 className="font-medium text-gray-900">Best Defense (Fewest PA)</h3>
                </div>
                <div className="space-y-3">
                  {mockTeamStats
                    .sort((a, b) => a.pointsAgainst - b.pointsAgainst)
                    .map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 ${
                            index === 0 ? 'bg-orange-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-yellow-600' : 'bg-gray-300'
                          } rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{team.name}</span>
                        </div>
                        <span className="text-sm font-bold">{team.pointsAgainst.toFixed(1)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}