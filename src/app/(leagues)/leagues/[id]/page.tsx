/**
 * League Management Page - Complete implementation
 * Free platform with full features, no payment required
 */

'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Users, Calendar, Settings, Activity, MessageSquare,
  TrendingUp, Award, Shield, Zap, ChevronRight, MoreVertical,
  Home, ArrowUpRight, ArrowDownRight, Clock, Target, Star
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// Mock league data
const leagueInfo = {
  id: 'league-123',
  name: "D'Amato Dynasty League",
  season: 2025,
  week: 3,
  commissioner: "Nicholas D'Amato",
  teams: 10,
  scoringSystem: 'PPR',
  type: 'Dynasty',
  draftDate: '2025-08-28',
  tradeDeadline: '2025-11-15',
  playoffWeeks: [15, 16, 17],
};

const standings = [
  { rank: 1, team: "D'Amato Dynasty", owner: "Nicholas D'Amato", record: '3-0', pf: 412.3, pa: 367.8, streak: 'W3' },
  { rank: 2, team: "Hartley's Heroes", owner: "Nick Hartley", record: '2-1', pf: 389.2, pa: 378.5, streak: 'W1' },
  { rank: 3, team: "McCaigue Mayhem", owner: "Jack McCaigue", record: '2-1', pf: 401.1, pa: 392.3, streak: 'L1' },
  { rank: 4, team: "Larry Legends", owner: "Larry McCaigue", record: '2-1', pf: 395.7, pa: 388.9, streak: 'W2' },
  { rank: 5, team: "Renee's Reign", owner: "Renee McCaigue", record: '2-1', pf: 388.3, pa: 379.2, streak: 'W1' },
  { rank: 6, team: "Kornbeck Crushers", owner: "Jon Kornbeck", record: '1-2', pf: 372.5, pa: 385.6, streak: 'L2' },
  { rank: 7, team: "Jarvey's Juggernauts", owner: "David Jarvey", record: '1-2', pf: 369.8, pa: 381.4, streak: 'W1' },
  { rank: 8, team: "Lorbecki Lions", owner: "Kaity Lorbecki", record: '1-2', pf: 365.2, pa: 376.9, streak: 'L1' },
  { rank: 9, team: "Minor Miracles", owner: "Cason Minor", record: '0-3', pf: 342.7, pa: 398.5, streak: 'L3' },
  { rank: 10, team: "Bergum Blitz", owner: "Brittany Bergum", record: '0-3', pf: 338.9, pa: 402.1, streak: 'L3' },
];

const recentTransactions = [
  { id: 1, type: 'trade', teams: ["D'Amato Dynasty", "Kornbeck Crushers"], details: "Christian McCaffrey for 2 1st round picks", date: '2 hours ago' },
  { id: 2, type: 'waiver', team: "Hartley's Heroes", details: "Added Rachaad White, Dropped Zach Moss", date: '1 day ago' },
  { id: 3, type: 'trade', teams: ["McCaigue Mayhem", "Minor Miracles"], details: "Travis Kelce for Mark Andrews + 2nd", date: '2 days ago' },
  { id: 4, type: 'waiver', team: "Bergum Blitz", details: "Added Jerome Ford", date: '3 days ago' },
];

const powerRankings = [
  { team: "D'Amato Dynasty", rating: 95, trend: 'up' },
  { team: "McCaigue Mayhem", rating: 89, trend: 'up' },
  { team: "Hartley's Heroes", rating: 87, trend: 'down' },
  { team: "Larry Legends", rating: 85, trend: 'up' },
  { team: "Renee's Reign", rating: 82, trend: 'same' },
];

const weeklyScores = [
  { week: 1, high: 156.2, low: 98.3, average: 127.5 },
  { week: 2, high: 162.8, low: 102.7, average: 131.2 },
  { week: 3, high: 149.5, low: 95.4, average: 125.8 },
];

export default function LeaguePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'standings' | 'matchups' | 'transactions' | 'chat' | 'settings'>('standings');
  const [selectedWeek, setSelectedWeek] = useState(3);

  // Fetch league data
  const { data: league, isLoading } = useQuery({
    queryKey: ['league', params.id],
    queryFn: async () => {
      const response = await fetch(`/api/leagues/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch league');
      return response.json();
    },
  });

  // Calculate playoff picture
  const playoffTeams = useMemo(() => {
    const sorted = [...standings].sort((a, b) => {
      const aWins = parseInt(a.record.split('-')[0]);
      const bWins = parseInt(b.record.split('-')[0]);
      if (bWins !== aWins) return bWins - aWins;
      return b.pf - a.pf;
    });
    return sorted.slice(0, 6);
  }, []);

  const getStreakColor = (streak: string) => {
    if (streak.startsWith('W')) return 'text-green-600 dark:text-green-400';
    if (streak.startsWith('L')) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'trade': return TrendingUp;
      case 'waiver': return Users;
      case 'draft': return Trophy;
      default: return Activity;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* League Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/leagues')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <Home className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {leagueInfo.name}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{leagueInfo.season} Season</span>
                  <span>•</span>
                  <span>Week {leagueInfo.week}</span>
                  <span>•</span>
                  <span>{leagueInfo.teams} Teams</span>
                  <span>•</span>
                  <span>{leagueInfo.scoringSystem}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                My Team
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 mt-6 border-b border-gray-200 dark:border-gray-800">
            {['standings', 'matchups', 'transactions', 'chat', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  'px-4 py-2 font-medium capitalize transition border-b-2 -mb-[1px]',
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <AnimatePresence mode="wait">
          {/* Standings Tab */}
          {activeTab === 'standings' && (
            <motion.div
              key="standings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {standings[0].team}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">League Leader</p>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      156.2
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Highest Score (Week 2)</p>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      127.5
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">League Average</p>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.ceil((new Date(leagueInfo.tradeDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Days to Trade Deadline</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Standings Table */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Standings</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left">Rank</th>
                          <th className="px-6 py-3 text-left">Team</th>
                          <th className="px-6 py-3 text-center">Record</th>
                          <th className="px-6 py-3 text-center">PF</th>
                          <th className="px-6 py-3 text-center">PA</th>
                          <th className="px-6 py-3 text-center">Streak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {standings.map((team) => (
                          <motion.tr
                            key={team.rank}
                            whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                            className="cursor-pointer"
                            onClick={() => router.push(`/teams/${team.team}`)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                {team.rank <= 6 && (
                                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                                )}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {team.rank}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {team.team}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {team.owner}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {team.record}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-gray-900 dark:text-white">
                                {team.pf}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-gray-900 dark:text-white">
                                {team.pa}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={cn("text-sm font-medium", getStreakColor(team.streak))}>
                                {team.streak}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Power Rankings */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Power Rankings
                  </h2>
                  <div className="space-y-3">
                    {powerRankings.map((team, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-gray-400 w-6">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {team.team}
                            </p>
                            <div className="flex items-center space-x-1 mt-1">
                              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-20">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                  style={{ width: `${team.rating}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {team.rating}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          {team.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                          {team.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                          {team.trend === 'same' && <ChevronRight className="h-4 w-4 text-gray-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scoring Trends */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Weekly Scoring Trends
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyScores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis 
                      dataKey="week" 
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `Week ${value}`}
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Bar dataKey="high" fill="#10B981" name="High Score" />
                    <Bar dataKey="average" fill="#3B82F6" name="Average" />
                    <Bar dataKey="low" fill="#EF4444" name="Low Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Matchups Tab */}
          {activeTab === 'matchups' && (
            <motion.div
              key="matchups"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Week Selector */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Week {selectedWeek} Matchups
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                      ←
                    </button>
                    <select 
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(Number(e.target.value))}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      {[...Array(17)].map((_, i) => (
                        <option key={i} value={i + 1}>Week {i + 1}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setSelectedWeek(Math.min(17, selectedWeek + 1))}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

              {/* Matchup Cards */}
              <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">T{i*2+1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {standings[i * 2]?.team || 'Team ' + (i * 2 + 1)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {standings[i * 2]?.record || '0-0'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center px-8">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {selectedWeek < 3 ? (Math.random() * 50 + 100).toFixed(1) : '--'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">vs</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {selectedWeek < 3 ? (Math.random() * 50 + 100).toFixed(1) : '--'}
                        </p>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-end space-x-3">
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {standings[i * 2 + 1]?.team || 'Team ' + (i * 2 + 2)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {standings[i * 2 + 1]?.record || '0-0'}
                            </p>
                          </div>
                          <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">T{i*2+2}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Transactions
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {recentTransactions.map((transaction) => {
                    const Icon = getTransactionIcon(transaction.type);
                    return (
                      <div key={transaction.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <div className="flex items-start space-x-4">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            transaction.type === 'trade' ? "bg-blue-100 dark:bg-blue-900/30" :
                            transaction.type === 'waiver' ? "bg-green-100 dark:bg-green-900/30" :
                            "bg-gray-100 dark:bg-gray-800"
                          )}>
                            <Icon className={cn(
                              "h-5 w-5",
                              transaction.type === 'trade' ? "text-blue-600 dark:text-blue-400" :
                              transaction.type === 'waiver' ? "text-green-600 dark:text-green-400" :
                              "text-gray-600 dark:text-gray-400"
                            )} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {transaction.type === 'trade' ? (
                                <span>Trade: {transaction.teams?.join(' ↔ ')}</span>
                              ) : (
                                <span>Waiver: {transaction.team}</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {transaction.details}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              {transaction.date}
                            </p>
                          </div>
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                            <MoreVertical className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 h-[600px] flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">League Chat</h2>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Start the conversation!
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                League Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    League Name
                  </label>
                  <input
                    type="text"
                    value={leagueInfo.name}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Commissioner
                  </label>
                  <input
                    type="text"
                    value={leagueInfo.commissioner}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    disabled
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Scoring System
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                      <option>PPR</option>
                      <option>Half PPR</option>
                      <option>Standard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      League Type
                    </label>
                    <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                      <option>Dynasty</option>
                      <option>Keeper</option>
                      <option>Redraft</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Only the commissioner can modify league settings
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}