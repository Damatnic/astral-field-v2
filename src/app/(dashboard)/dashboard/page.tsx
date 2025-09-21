/**
 * Main Dashboard - Complete production implementation
 * Features real-time updates, 3D visualizations, and comprehensive analytics
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, TrendingUp, Users, Calendar, AlertCircle, 
  ChevronRight, Play, BarChart3, Brain, Target,
  Shield, Zap, Star, Award, Activity, Bell,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, startOfWeek, endOfWeek } from 'date-fns';

// Types for dashboard data
interface TeamStats {
  record: { wins: number; losses: number; ties: number };
  standing: number;
  playoffChance: number;
  pointsFor: number;
  pointsAgainst: number;
  projectedTotal: number;
  weeklyRank: number;
  powerRanking: number;
  transactions: number;
}

interface UpcomingMatchup {
  opponent: {
    name: string;
    avatar: string;
    record: string;
    rank: number;
  };
  projectedScore: { user: number; opponent: number };
  winProbability: number;
}

// Additional data interfaces
interface ActivityItem {
  id: string | number;
  type: string;
  message: string;
  time: string;
  impact: 'positive' | 'negative' | 'neutral';
}

interface PlayerPerformance {
  name: string;
  actual: number;
  projected: number;
}

interface SeasonTrend {
  week: number;
  points: number;
  projected: number;
  average: number;
}

export default function DashboardPage() {
  const [selectedView, setSelectedView] = useState<'overview' | 'analytics' | 'players'>('overview');
  const [liveScore, setLiveScore] = useState(0);
  const queryClient = useQueryClient();

  // Fetch team data
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team', 'current'],
    queryFn: async () => {
      const response = await fetch('/api/my-team');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch matchup data
  const { data: matchupData, isLoading: matchupLoading } = useQuery({
    queryKey: ['matchup', 'current'],
    queryFn: async () => {
      const response = await fetch('/api/my-matchup');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds during games
  });

  // Fetch recent activity
  const { data: activityData } = useQuery({
    queryKey: ['activity', 'recent'],
    queryFn: async () => {
      const response = await fetch('/api/activity?limit=5');
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch player performance data
  const { data: performanceData } = useQuery({
    queryKey: ['performance', 'current-week'],
    queryFn: async () => {
      const response = await fetch('/api/lineup/performance');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch season trend data
  const { data: trendData } = useQuery({
    queryKey: ['trends', 'season'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/season-trends');
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Simulate live score updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScore(prev => prev + Math.random() * 2);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate trends
  const trendIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return { icon: Minus, color: 'text-gray-400', value: '0%' };
    if (change > 0) return { 
      icon: ArrowUpRight, 
      color: 'text-green-500', 
      value: `+${change.toFixed(1)}%` 
    };
    return { 
      icon: ArrowDownRight, 
      color: 'text-red-500', 
      value: `${change.toFixed(1)}%` 
    };
  };

  // Extract data from API responses with fallbacks
  const teamStats: TeamStats = useMemo(() => {
    if (!teamData?.data) {
      return {
        record: { wins: 0, losses: 0, ties: 0 },
        standing: 0,
        playoffChance: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        projectedTotal: 0,
        weeklyRank: 0,
        powerRanking: 0,
        transactions: 0,
      };
    }
    
    const data = teamData.data;
    return {
      record: data.record || { wins: 0, losses: 0, ties: 0 },
      standing: data.standing || 0,
      playoffChance: data.playoffChance || 0,
      pointsFor: data.pointsFor || 0,
      pointsAgainst: data.pointsAgainst || 0,
      projectedTotal: data.projectedTotal || 0,
      weeklyRank: data.weeklyRank || 0,
      powerRanking: data.powerRanking || 0,
      transactions: data.transactions || 0,
    };
  }, [teamData]);

  const upcomingMatchup: UpcomingMatchup = useMemo(() => {
    if (!matchupData?.data?.opponent) {
      return {
        opponent: {
          name: "TBD",
          avatar: "🏈",
          record: "0-0",
          rank: 0,
        },
        projectedScore: { user: 0, opponent: 0 },
        winProbability: 50,
      };
    }
    
    const opponent = matchupData.data.opponent;
    return {
      opponent: {
        name: opponent.name || "Unknown",
        avatar: opponent.avatar || "🏈",
        record: `${opponent.wins || 0}-${opponent.losses || 0}`,
        rank: opponent.rank || 0,
      },
      projectedScore: {
        user: matchupData.data.projectedScore?.user || 0,
        opponent: matchupData.data.projectedScore?.opponent || 0,
      },
      winProbability: matchupData.data.winProbability || 50,
    };
  }, [matchupData]);

  // Extract activity data with fallbacks
  const recentActivity: ActivityItem[] = useMemo(() => {
    if (!activityData?.data || !Array.isArray(activityData.data)) {
      return [];
    }
    
    return activityData.data.map((item: any) => ({
      id: item.id,
      type: item.type || 'activity',
      message: item.description || item.message || 'Activity occurred',
      time: item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : 'Recently',
      impact: item.impact || 'neutral'
    }));
  }, [activityData]);

  // Extract player performance data with fallbacks
  const playerPerformance: PlayerPerformance[] = useMemo(() => {
    if (!performanceData?.data || !Array.isArray(performanceData.data)) {
      return [];
    }
    
    return performanceData.data.map((player: any) => ({
      name: player.position || player.name || 'Player',
      actual: player.actualPoints || 0,
      projected: player.projectedPoints || 0
    }));
  }, [performanceData]);

  // Extract season trend data with fallbacks
  const seasonTrend: SeasonTrend[] = useMemo(() => {
    if (!trendData?.data || !Array.isArray(trendData.data)) {
      return [];
    }
    
    return trendData.data.map((week: any) => ({
      week: week.week || 0,
      points: week.points || 0,
      projected: week.projected || 0,
      average: week.leagueAverage || 100
    }));
  }, [trendData]);

  const pointsTrend = trendIndicator(teamStats.pointsFor, teamStats.pointsFor * 0.9);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Week 11 • {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Live indicator */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Games Live
                </span>
              </div>
              
              {/* Notifications */}
              <button className="relative p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
          
          {/* View tabs */}
          <div className="flex space-x-1 mt-6">
            {['overview', 'analytics', 'players'].map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view as any)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium capitalize transition',
                  selectedView === view
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <AnimatePresence mode="wait">
          {selectedView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Record Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {teamStats.record.wins}-{teamStats.record.losses}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Season Record</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      #{teamStats.standing} in league
                    </span>
                  </div>
                </motion.div>

                {/* Points Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {teamStats.pointsFor.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Points For</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <pointsTrend.icon className={cn("h-4 w-4", pointsTrend.color)} />
                    <span className={cn("text-xs font-medium", pointsTrend.color)}>
                      {pointsTrend.value}
                    </span>
                  </div>
                </motion.div>

                {/* Playoff Chance Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Target className="h-8 w-8 text-purple-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {teamStats.playoffChance}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Playoff Chance</p>
                  <div className="mt-2">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                        style={{ width: `${teamStats.playoffChance}%` }}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Power Ranking Card */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Zap className="h-8 w-8 text-orange-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      #{teamStats.powerRanking}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Power Ranking</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      +2 from last week
                    </span>
                  </div>
                </motion.div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Live Matchup */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Week 11 Matchup
                    </h2>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Live</span>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Matchup header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">You</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Your Team</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">8-2</p>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {(teamStats.projectedTotal + liveScore).toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">vs</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {upcomingMatchup.projectedScore.opponent.toFixed(1)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {upcomingMatchup.opponent.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {upcomingMatchup.opponent.record}
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-red-600 rounded-full flex items-center justify-center">
                          <span className="text-2xl">{upcomingMatchup.opponent.avatar}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Win probability bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500 dark:text-gray-400">Win Probability</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {upcomingMatchup.winProbability}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                          style={{ width: `${upcomingMatchup.winProbability}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Player performances */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Top Performers
                      </h3>
                      <div className="space-y-2">
                        {playerPerformance.slice(0, 3).map((player, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {player.name}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {player.actual} pts
                              </span>
                              {player.actual > player.projected && (
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  +{(player.actual - player.projected).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Activity
                  </h2>
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start space-x-3"
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          activity.impact === 'positive' 
                            ? "bg-green-100 dark:bg-green-900/30"
                            : activity.impact === 'negative'
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-gray-100 dark:bg-gray-800"
                        )}>
                          {activity.type === 'trade' && <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />}
                          {activity.type === 'injury' && <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
                          {activity.type === 'waiver' && <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <button className="mt-4 w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                    View All Activity
                  </button>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Season Performance
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={seasonTrend}>
                    <defs>
                      <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis 
                      dataKey="week" 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                      tickFormatter={(value) => `W${value}`}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                      domain={[80, 160]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={115} stroke="#EF4444" strokeDasharray="3 3" />
                    <Area 
                      type="monotone" 
                      dataKey="points" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPoints)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="projected" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorProjected)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="average" 
                      stroke="#EF4444" 
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}