/**
 * Vortex Analytics Dashboard - Comprehensive Fantasy Football Analytics
 * Real-time data visualization with advanced insights and AI recommendations
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  ScatterChart,
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  Treemap
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  Target, 
  Zap,
  AlertTriangle,
  Star,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Filter,
  Download,
  Refresh,
  Settings,
  Eye,
  Brain
} from 'lucide-react';

// Types for analytics data
interface PlayerAnalytics {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  week: number;
  fantasyPoints: number;
  projectedPoints: number;
  consistency: number;
  trendScore: number;
  volumeScore: number;
  efficiencyScore: number;
  ownership: number;
}

interface TeamAnalytics {
  teamId: string;
  teamName: string;
  owner: string;
  week: number;
  totalPoints: number;
  projectedPoints: number;
  rank: number;
  movingAverage: number;
  optimalPoints: number;
  efficiency: number;
}

interface MatchupAnalytics {
  matchupId: string;
  homeTeam: string;
  awayTeam: string;
  homeProjection: number;
  awayProjection: number;
  winProbability: number;
  volatility: number;
  confidenceLevel: number;
}

interface WaiverRecommendation {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  priorityLevel: number;
  addPercentage: number;
  emergingPlayer: boolean;
  breakoutCandidate: boolean;
  faabRecommendation: number;
  reasonsToAdd: string[];
}

interface LiveEvent {
  id: string;
  type: string;
  timestamp: Date;
  playerId?: string;
  teamId?: string;
  data: any;
  priority: string;
}

const VortexAnalyticsDashboard: React.FC = () => {
  // State management
  const [selectedWeek, setSelectedWeek] = useState(3);
  const [selectedView, setSelectedView] = useState('overview');
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [filters, setFilters] = useState({
    position: 'ALL',
    team: 'ALL',
    week: 3
  });

  // Sample data (would come from API in real implementation)
  const playerAnalytics: PlayerAnalytics[] = [
    {
      playerId: '1',
      playerName: 'Josh Allen',
      position: 'QB',
      team: 'BUF',
      week: 3,
      fantasyPoints: 28.5,
      projectedPoints: 24.2,
      consistency: 0.85,
      trendScore: 0.12,
      volumeScore: 0.92,
      efficiencyScore: 0.78,
      ownership: 98.5
    },
    {
      playerId: '2',
      playerName: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF',
      week: 3,
      fantasyPoints: 22.8,
      projectedPoints: 20.1,
      consistency: 0.92,
      trendScore: 0.08,
      volumeScore: 0.95,
      efficiencyScore: 0.82,
      ownership: 99.2
    },
    {
      playerId: '3',
      playerName: 'Tyreek Hill',
      position: 'WR',
      team: 'MIA',
      week: 3,
      fantasyPoints: 19.4,
      projectedPoints: 17.8,
      consistency: 0.73,
      trendScore: 0.15,
      volumeScore: 0.88,
      efficiencyScore: 0.75,
      ownership: 96.8
    }
  ];

  const teamAnalytics: TeamAnalytics[] = [
    {
      teamId: '1',
      teamName: 'Thunder Bolts',
      owner: 'John Smith',
      week: 3,
      totalPoints: 142.8,
      projectedPoints: 138.2,
      rank: 1,
      movingAverage: 139.4,
      optimalPoints: 158.9,
      efficiency: 0.898
    },
    {
      teamId: '2',
      teamName: 'Gridiron Warriors',
      owner: 'Sarah Johnson',
      week: 3,
      totalPoints: 134.5,
      projectedPoints: 132.7,
      rank: 2,
      movingAverage: 131.8,
      optimalPoints: 149.2,
      efficiency: 0.901
    }
  ];

  const matchupAnalytics: MatchupAnalytics[] = [
    {
      matchupId: '1',
      homeTeam: 'Thunder Bolts',
      awayTeam: 'Gridiron Warriors',
      homeProjection: 128.5,
      awayProjection: 124.2,
      winProbability: 0.62,
      volatility: 0.23,
      confidenceLevel: 0.87
    }
  ];

  const waiverRecommendations: WaiverRecommendation[] = [
    {
      playerId: '101',
      playerName: 'Puka Nacua',
      position: 'WR',
      team: 'LAR',
      priorityLevel: 5,
      addPercentage: 23.5,
      emergingPlayer: true,
      breakoutCandidate: true,
      faabRecommendation: 45,
      reasonsToAdd: ['Breakout candidate', 'High target share', 'Favorable schedule']
    }
  ];

  // WebSocket connection for live updates
  useEffect(() => {
    let ws: WebSocket;
    
    if (isLive) {
      ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {

      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'LIVE_EVENT') {
          setLiveEvents(prev => [data.event, ...prev.slice(0, 49)]); // Keep last 50 events
        }
      };
      
      ws.onclose = () => {

      };
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isLive]);

  // Chart data preparation
  const weeklyTrendData = useMemo(() => {
    return [1, 2, 3].map(week => ({
      week: `Week ${week}`,
      points: teamAnalytics[0]?.totalPoints + (Math.random() - 0.5) * 20,
      projection: teamAnalytics[0]?.projectedPoints + (Math.random() - 0.5) * 15,
      optimal: teamAnalytics[0]?.optimalPoints + (Math.random() - 0.5) * 10
    }));
  }, [teamAnalytics]);

  const positionBreakdown = useMemo(() => {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
    return positions.map(pos => ({
      position: pos,
      averagePoints: Math.random() * 20 + 5,
      count: Math.floor(Math.random() * 5) + 1
    }));
  }, []);

  const consistencyData = useMemo(() => {
    return playerAnalytics.map(player => ({
      name: player.playerName,
      consistency: player.consistency * 100,
      points: player.fantasyPoints,
      position: player.position
    }));
  }, [playerAnalytics]);

  const efficiencyScatterData = useMemo(() => {
    return playerAnalytics.map(player => ({
      x: player.volumeScore * 100,
      y: player.efficiencyScore * 100,
      z: player.fantasyPoints,
      name: player.playerName,
      position: player.position
    }));
  }, [playerAnalytics]);

  // Color schemes
  const colors = {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4'
  };

  const positionColors: Record<string, string> = {
    QB: '#3B82F6',
    RB: '#10B981',
    WR: '#F59E0B',
    TE: '#8B5CF6',
    K: '#6B7280',
    DST: '#374151'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              ⚡ Vortex Analytics Command Center
            </h1>
            <p className="text-slate-300">
              Real-time fantasy football intelligence • Week {selectedWeek} • Season 2025
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setIsLive(!isLive)}
              variant={isLive ? "destructive" : "default"}
              className="flex items-center space-x-2"
            >
              <Activity className="w-4 h-4" />
              <span>{isLive ? 'Stop Live' : 'Go Live'}</span>
            </Button>
            
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
            
            <Button variant="outline" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Button>
          </div>
        </div>

        {/* Live Events Bar */}
        {isLive && liveEvents.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span>Live Events</span>
                <Badge variant="secondary">{liveEvents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {liveEvents.slice(0, 5).map((event, index) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      {event.type} - {event.playerId || event.teamId}
                    </span>
                    <Badge 
                      variant={event.priority === 'HIGH' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {event.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Analytics Tabs */}
        <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
              Overview
            </TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-slate-700">
              Players
            </TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-slate-700">
              Teams
            </TabsTrigger>
            <TabsTrigger value="matchups" className="data-[state=active]:bg-slate-700">
              Matchups
            </TabsTrigger>
            <TabsTrigger value="waivers" className="data-[state=active]:bg-slate-700">
              Waivers
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-slate-700">
              AI Insights
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">League Average</p>
                      <p className="text-white text-2xl font-bold">126.4 pts</p>
                      <p className="text-blue-200 text-xs flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +4.2% from last week
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Top Scorer</p>
                      <p className="text-white text-2xl font-bold">142.8 pts</p>
                      <p className="text-green-200 text-xs">Thunder Bolts</p>
                    </div>
                    <Award className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Waiver Claims</p>
                      <p className="text-white text-2xl font-bold">47</p>
                      <p className="text-purple-200 text-xs">This week</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Trade Volume</p>
                      <p className="text-white text-2xl font-bold">12</p>
                      <p className="text-orange-200 text-xs">Active proposals</p>
                    </div>
                    <Target className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Trends */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <LineChartIcon className="w-5 h-5" />
                    <span>Weekly Scoring Trends</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="points" 
                        stroke={colors.primary} 
                        strokeWidth={3}
                        name="Actual Points"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="projection" 
                        stroke={colors.warning} 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Projected"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="optimal" 
                        stroke={colors.success} 
                        strokeWidth={2}
                        strokeDasharray="2 2"
                        name="Optimal"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Position Breakdown */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <PieChartIcon className="w-5 h-5" />
                    <span>Position Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={positionBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="position" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="averagePoints" 
                        fill={colors.secondary}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Player Consistency Chart */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Player Consistency vs Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart data={consistencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="consistency" 
                        stroke="#9CA3AF"
                        name="Consistency %"
                      />
                      <YAxis 
                        dataKey="points" 
                        stroke="#9CA3AF"
                        name="Fantasy Points"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        formatter={(value, name) => [value, name]}
                      />
                      <Scatter 
                        dataKey="points" 
                        fill={colors.primary}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Volume vs Efficiency */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Volume vs Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart data={efficiencyScatterData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="x" 
                        stroke="#9CA3AF"
                        name="Volume Score"
                      />
                      <YAxis 
                        dataKey="y" 
                        stroke="#9CA3AF"
                        name="Efficiency Score"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        formatter={(value, name) => [value, name]}
                      />
                      <Scatter 
                        dataKey="y" 
                        fill={colors.success}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Players Table */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Top Performers - Week {selectedWeek}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-left py-3 px-4 text-slate-300">Player</th>
                        <th className="text-left py-3 px-4 text-slate-300">Position</th>
                        <th className="text-right py-3 px-4 text-slate-300">Points</th>
                        <th className="text-right py-3 px-4 text-slate-300">Projected</th>
                        <th className="text-right py-3 px-4 text-slate-300">Consistency</th>
                        <th className="text-right py-3 px-4 text-slate-300">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerAnalytics.map((player, index) => (
                        <tr key={player.playerId} className="border-b border-slate-700 hover:bg-slate-700/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-white font-medium">{player.playerName}</div>
                                <div className="text-slate-400 text-xs">{player.team}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              style={{ backgroundColor: positionColors[player.position] }}
                              className="text-white"
                            >
                              {player.position}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-white font-bold">
                            {player.fantasyPoints.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            {player.projectedPoints.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-16 h-2 bg-slate-600 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${player.consistency * 100}%` }}
                                />
                              </div>
                              <span className="text-slate-300 text-xs">
                                {(player.consistency * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {player.trendScore > 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-500 ml-auto" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500 ml-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Rankings */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Team Power Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamAnalytics.map((team, index) => (
                      <div key={team.teamId} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                            {team.rank}
                          </div>
                          <div>
                            <div className="text-white font-medium">{team.teamName}</div>
                            <div className="text-slate-400 text-sm">{team.owner}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">{team.totalPoints.toFixed(1)} pts</div>
                          <div className="text-slate-400 text-sm">
                            {team.efficiency.toFixed(1)}% efficiency
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Team Efficiency Radar */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Team Efficiency Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={[
                      { metric: 'Scoring', value: 85 },
                      { metric: 'Consistency', value: 78 },
                      { metric: 'Efficiency', value: 90 },
                      { metric: 'Waiver Activity', value: 65 },
                      { metric: 'Trade Activity', value: 45 },
                      { metric: 'Lineup Optimization', value: 88 }
                    ]}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      />
                      <Radar 
                        dataKey="value" 
                        stroke={colors.primary} 
                        fill={colors.primary} 
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Matchups Tab */}
          <TabsContent value="matchups" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {matchupAnalytics.map((matchup) => (
                <Card key={matchup.matchupId} className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>{matchup.homeTeam} vs {matchup.awayTeam}</span>
                      <Badge 
                        variant={matchup.confidenceLevel > 0.8 ? "default" : "secondary"}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{(matchup.confidenceLevel * 100).toFixed(0)}% confidence</span>
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Matchup Projections */}
                      <div className="lg:col-span-2">
                        <h4 className="text-white font-medium mb-4">Projections</h4>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-slate-300">{matchup.homeTeam}</span>
                              <span className="text-white font-bold">{matchup.homeProjection.toFixed(1)} pts</span>
                            </div>
                            <div className="w-full h-3 bg-slate-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(matchup.homeProjection / (matchup.homeProjection + matchup.awayProjection)) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-slate-300">{matchup.awayTeam}</span>
                              <span className="text-white font-bold">{matchup.awayProjection.toFixed(1)} pts</span>
                            </div>
                            <div className="w-full h-3 bg-slate-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${(matchup.awayProjection / (matchup.homeProjection + matchup.awayProjection)) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Win Probability */}
                      <div>
                        <h4 className="text-white font-medium mb-4">Win Probability</h4>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white mb-2">
                            {(matchup.winProbability * 100).toFixed(0)}%
                          </div>
                          <div className="text-slate-300 text-sm mb-4">{matchup.homeTeam}</div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Volatility</span>
                              <span className="text-white">{(matchup.volatility * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Waivers Tab */}
          <TabsContent value="waivers" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Top Waiver Wire Targets</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {waiverRecommendations.map((rec) => (
                    <div key={rec.playerId} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={rec.priorityLevel >= 4 ? "destructive" : "secondary"}
                              className="flex items-center space-x-1"
                            >
                              <Star className="w-3 h-3" />
                              <span>Priority {rec.priorityLevel}</span>
                            </Badge>
                            {rec.emergingPlayer && (
                              <Badge variant="outline" className="text-green-400 border-green-400">
                                Emerging
                              </Badge>
                            )}
                            {rec.breakoutCandidate && (
                              <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                                Breakout
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">FAAB: ${rec.faabRecommendation}</div>
                          <div className="text-slate-400 text-sm">{rec.addPercentage.toFixed(1)}% adds</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">{rec.playerName}</div>
                          <div className="text-slate-400 text-sm">{rec.position} - {rec.team}</div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-slate-300 text-sm">Reasons to add:</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {rec.reasonsToAdd.map((reason, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="bg-gradient-to-br from-purple-800/30 to-blue-800/30 border-purple-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>AI-Powered Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-white font-medium">Week 4 Recommendations</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                          <div>
                            <div className="text-white text-sm font-medium">Start Decision Alert</div>
                            <div className="text-slate-300 text-sm">
                              Consider benching Tyreek Hill due to weather concerns and strong CB matchup
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <Star className="w-5 h-5 text-green-400 mt-0.5" />
                          <div>
                            <div className="text-white text-sm font-medium">Sleeper Pick</div>
                            <div className="text-slate-300 text-sm">
                              Puka Nacua showing 85% breakout probability based on target trends
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                          <div>
                            <div className="text-white text-sm font-medium">Trade Opportunity</div>
                            <div className="text-slate-300 text-sm">
                              Consider packaging Najee Harris + DJ Moore for CMC upgrade
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-white font-medium">Market Trends</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-slate-300">TE Position Scarcity</span>
                        <Badge variant="destructive">High</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-slate-300">RB Injury Risk</span>
                        <Badge variant="secondary">Elevated</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-slate-300">WR Breakout Window</span>
                        <Badge variant="default">Open</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VortexAnalyticsDashboard;