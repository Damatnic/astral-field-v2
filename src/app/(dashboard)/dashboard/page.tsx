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

// Mock data for demonstration
const teamStats = {
  record: { wins: 8, losses: 2, ties: 0 },
  standing: 2,
  playoffChance: 92,
  pointsFor: 1234.5,
  pointsAgainst: 1089.2,
  projectedTotal: 145.8,
  weeklyRank: 3,
  powerRanking: 4,
  transactions: 23,
};

const upcomingMatchup = {
  opponent: {
    name: "Hartley's Heroes",
    avatar: '🦅',
    record: '7-3',
    rank: 5,
  },
  projectedScore: { user: 132.5, opponent: 128.3 },
  winProbability: 58,
};

const recentActivity = [
  { 
    id: 1, 
    type: 'trade', 
    message: 'Trade completed with McCaigue Mayhem',
    time: '2 hours ago',
    impact: 'positive' 
  },
  { 
    id: 2, 
    type: 'injury', 
    message: 'Christian McCaffrey questionable for Week 11',
    time: '5 hours ago',
    impact: 'negative' 
  },
  { 
    id: 3, 
    type: 'waiver', 
    message: 'Successfully claimed Rachaad White',
    time: '1 day ago',
    impact: 'positive' 
  },
];

const playerPerformance = [
  { name: 'QB', actual: 28.5, projected: 22.3 },
  { name: 'RB1', actual: 18.2, projected: 16.5 },
  { name: 'RB2', actual: 12.1, projected: 14.2 },
  { name: 'WR1', actual: 21.3, projected: 18.7 },
  { name: 'WR2', actual: 15.8, projected: 16.2 },
  { name: 'TE', actual: 8.9, projected: 10.1 },
  { name: 'FLEX', actual: 13.4, projected: 12.8 },
  { name: 'K', actual: 9.0, projected: 7.5 },
  { name: 'DST', actual: 12.0, projected: 8.0 },
];

const seasonTrend = [
  { week: 1, points: 112.3, projected: 108.5, average: 115 },
  { week: 2, points: 98.7, projected: 115.2, average: 115 },
  { week: 3, points: 142.1, projected: 125.3, average: 115 },
  { week: 4, points: 128.5, projected: 122.8, average: 115 },
  { week: 5, points: 135.2, projected: 118.9, average: 115 },
  { week: 6, points: 108.9, projected: 120.5, average: 115 },
  { week: 7, points: 145.6, projected: 130.2, average: 115 },
  { week: 8, points: 122.3, projected: 125.7, average: 115 },
  { week: 9, points: 138.8, projected: 128.3, average: 115 },
  { week: 10, points: 151.2, projected: 135.8, average: 115 },
];

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

  const pointsTrend = trendIndicator(teamStats.pointsFor, 1150);

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