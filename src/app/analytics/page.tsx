'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  Users, 
  Target, 
  Activity,
  Crown,
  Flame,
  Shield,
  Zap,
  Star,
  Award,
  DollarSign,
  Calculator,
  Calendar
} from 'lucide-react';

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

export default function AnalyticsPage() {
  const [selectedView, setSelectedView] = useState<'overview' | 'power' | 'trends' | 'trades'>('overview');
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [leagueStats, setLeagueStats] = useState<LeagueStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics');
      const data = await response.json();
      
      if (data.success) {
        setTeamStats(data.data.teamStats);
        setLeagueStats(data.data.leagueStats);
      } else {
        setError(data.error || 'Failed to load analytics');
        // Use mock data as fallback
        setTeamStats(mockTeamStats);
        setLeagueStats(mockLeagueStats);
      }
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics fetch error:', err);
      // Use mock data as fallback
      setTeamStats(mockTeamStats);
      setLeagueStats(mockLeagueStats);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real data on mount
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Mock data for D'Amato Dynasty League (fallback)
  const mockTeamStats: TeamStats[] = [
    {
      id: '1',
      name: "D'Amato Dynasty",
      owner: 'Nicholas D\'Amato',
      wins: 7,
      losses: 6,
      pointsFor: 1365.2,
      pointsAgainst: 1298.7,
      avgScore: 104.9,
      powerRanking: 4,
      playoffChance: 85,
      championshipOdds: 15,
      trend: 'up',
      color: 'bg-purple-600'
    },
    {
      id: '2',
      name: 'McCaigue Mayhem',
      owner: 'Jack McCaigue',
      wins: 3,
      losses: 10,
      pointsFor: 1462.1,
      pointsAgainst: 1589.3,
      avgScore: 112.5,
      powerRanking: 8,
      playoffChance: 12,
      championshipOdds: 2,
      trend: 'down',
      color: 'bg-green-500'
    },
    {
      id: '3',
      name: "Larry's Legends",
      owner: 'Larry McCaigue',
      wins: 11,
      losses: 3,
      pointsFor: 1627.8,
      pointsAgainst: 1234.9,
      avgScore: 125.2,
      powerRanking: 1,
      playoffChance: 99,
      championshipOdds: 35,
      trend: 'up',
      color: 'bg-red-500'
    },
    {
      id: '4',
      name: "Renee's Reign",
      owner: 'Renee McCaigue',
      wins: 12,
      losses: 5,
      pointsFor: 1298.4,
      pointsAgainst: 1156.2,
      avgScore: 99.9,
      powerRanking: 2,
      playoffChance: 98,
      championshipOdds: 28,
      trend: 'stable',
      color: 'bg-pink-500'
    },
    {
      id: '5',
      name: 'Hartley Heroes',
      owner: 'Nick Hartley',
      wins: 3,
      losses: 4,
      pointsFor: 1223.6,
      pointsAgainst: 1187.9,
      avgScore: 94.1,
      powerRanking: 9,
      playoffChance: 8,
      championshipOdds: 1,
      trend: 'down',
      color: 'bg-blue-500'
    },
    {
      id: '6',
      name: 'Kornbeck Crushers',
      owner: 'Jon Kornbeck',
      wins: 6,
      losses: 6,
      pointsFor: 1401.7,
      pointsAgainst: 1356.4,
      avgScore: 107.8,
      powerRanking: 5,
      playoffChance: 72,
      championshipOdds: 12,
      trend: 'up',
      color: 'bg-indigo-500'
    },
    {
      id: '7',
      name: "Jarvey's Juggernauts",
      owner: 'David Jarvey',
      wins: 3,
      losses: 4,
      pointsFor: 1358.2,
      pointsAgainst: 1445.1,
      avgScore: 104.5,
      powerRanking: 7,
      playoffChance: 15,
      championshipOdds: 3,
      trend: 'stable',
      color: 'bg-yellow-500'
    },
    {
      id: '8',
      name: 'Lorbecki Lions',
      owner: 'Kaity Lorbecki',
      wins: 9,
      losses: 6,
      pointsFor: 1213.8,
      pointsAgainst: 1289.6,
      avgScore: 93.4,
      powerRanking: 6,
      playoffChance: 68,
      championshipOdds: 8,
      trend: 'stable',
      color: 'bg-orange-500'
    },
    {
      id: '9',
      name: 'Minor Miracles',
      owner: 'Cason Minor',
      wins: 12,
      losses: 5,
      pointsFor: 1621.3,
      pointsAgainst: 1398.7,
      avgScore: 124.7,
      powerRanking: 3,
      playoffChance: 96,
      championshipOdds: 22,
      trend: 'up',
      color: 'bg-teal-500'
    },
    {
      id: '10',
      name: 'Bergum Blitz',
      owner: 'Brittany Bergum',
      wins: 8,
      losses: 9,
      pointsFor: 1613.2,
      pointsAgainst: 1587.4,
      avgScore: 124.1,
      powerRanking: 10,
      playoffChance: 25,
      championshipOdds: 4,
      trend: 'down',
      color: 'bg-cyan-500'
    }
  ];

  const mockLeagueStats: LeagueStats = {
    totalPoints: 14585.3,
    avgWeeklyScore: 109.7,
    highestWeeklyScore: { score: 167.3, team: "Larry's Legends", week: 14 },
    lowestWeeklyScore: { score: 67.2, team: 'Hartley Heroes', week: 8 },
    mostConsistent: "Renee's Reign",
    mostVolatile: 'McCaigue Mayhem',
    tradeCount: 24,
    waiversClaimed: 186
  };

  // Use real data or fallback to mock
  const displayTeamStats = teamStats.length > 0 ? teamStats : mockTeamStats;
  const displayLeagueStats = leagueStats || mockLeagueStats;

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
    if (chance >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-4xl font-bold text-slate-900">League Analytics</h1>
          </div>
          <p className="text-xl text-slate-600">
            Advanced insights for the D'Amato Dynasty League • Week 15 Playoffs
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-lg shadow-sm border p-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'power', label: 'Power Rankings', icon: Trophy },
              { id: 'trends', label: 'Trends', icon: TrendingUp },
              { id: 'trades', label: 'Trade Analysis', icon: DollarSign }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={selectedView === tab.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView(tab.id as any)}
                className="flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {selectedView === 'overview' && (
          <>
            {/* League Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Points</p>
                      <p className="text-2xl font-bold">{displayLeagueStats.totalPoints.toLocaleString()}</p>
                    </div>
                    <Calculator className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Weekly Score</p>
                      <p className="text-2xl font-bold">{displayLeagueStats.avgWeeklyScore}</p>
                    </div>
                    <Target className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Trades</p>
                      <p className="text-2xl font-bold">{displayLeagueStats.tradeCount}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Waiver Claims</p>
                      <p className="text-2xl font-bold">{displayLeagueStats.waiversClaimed}</p>
                    </div>
                    <Users className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notable Achievements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Flame className="h-6 w-6 text-yellow-600" />
                    <h3 className="font-bold text-yellow-800">Highest Weekly Score</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">{leagueStats?.highestWeeklyScore.score}</p>
                  <p className="text-sm text-yellow-700">{leagueStats?.highestWeeklyScore.team} • Week {leagueStats?.highestWeeklyScore.week}</p>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-6 w-6 text-green-600" />
                    <h3 className="font-bold text-green-800">Most Consistent</h3>
                  </div>
                  <p className="text-lg font-bold text-green-900">{leagueStats?.mostConsistent}</p>
                  <p className="text-sm text-green-700">Lowest score variance</p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="h-6 w-6 text-red-600" />
                    <h3 className="font-bold text-red-800">Most Volatile</h3>
                  </div>
                  <p className="text-lg font-bold text-red-900">{leagueStats?.mostVolatile}</p>
                  <p className="text-sm text-red-700">Highest score variance</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {selectedView === 'power' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Power Rankings & Playoff Probabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayTeamStats
                  .sort((a, b) => a.powerRanking - b.powerRanking)
                  .map((team, index) => (
                    <div key={team.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className={`w-12 h-12 ${team.color} rounded-full flex items-center justify-center text-white font-bold`}>
                            {team.name.substring(0, 2)}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{team.name}</p>
                          <p className="text-sm text-gray-600">{team.owner}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Record</p>
                          <p className="font-bold">{team.wins}-{team.losses}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Avg Score</p>
                          <p className="font-bold">{team.avgScore.toFixed(1)}</p>
                        </div>
                        <div className="text-center min-w-[120px]">
                          <p className="text-sm text-gray-600 mb-1">Playoff Chance</p>
                          <div className="flex items-center gap-2">
                            <Progress value={team.playoffChance} className="h-2 w-16" />
                            <span className={`text-sm font-bold px-2 py-1 rounded ${getPlayoffColor(team.playoffChance)}`}>
                              {team.playoffChance}%
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Championship</p>
                          <p className="font-bold">{team.championshipOdds}%</p>
                        </div>
                        {getTrendIcon(team.trend)}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedView === 'trends' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top Scorers (Season)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {displayTeamStats
                    .sort((a, b) => b.pointsFor - a.pointsFor)
                    .slice(0, 5)
                    .map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                          } rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <span className="font-bold">{team.pointsFor.toFixed(1)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Best Defense (Fewest PA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {displayTeamStats
                    .sort((a, b) => a.pointsAgainst - b.pointsAgainst)
                    .slice(0, 5)
                    .map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                          } rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <span className="font-bold">{team.pointsAgainst.toFixed(1)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedView === 'trades' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Trade Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">{leagueStats?.tradeCount}</div>
                  <p className="text-gray-600">Total Trades This Season</p>
                  <div className="mt-4 text-sm text-gray-500">
                    <p>League Average: 2.4 trades per team</p>
                    <p>Most Active: Larry's Legends (5 trades)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Waiver Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{leagueStats?.waiversClaimed}</div>
                  <p className="text-gray-600">Waiver Claims</p>
                  <div className="mt-4 text-sm text-gray-500">
                    <p>Average: 18.6 per team</p>
                    <p>Most Active: McCaigue Mayhem (28 claims)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  League Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Competitive Balance</span>
                    <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trade Fairness</span>
                    <Badge className="bg-blue-100 text-blue-800">Good</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Activity Level</span>
                    <Badge className="bg-green-100 text-green-800">Very High</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Parity Score</span>
                    <span className="font-bold">8.2/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}