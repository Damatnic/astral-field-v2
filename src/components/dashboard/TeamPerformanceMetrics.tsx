'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Users,
  Activity,
  BarChart3,
  PieChartIcon,
  Info
} from 'lucide-react';

interface PerformanceData {
  week: string;
  score: number;
  projected: number;
  leagueAverage: number;
}

interface PositionData {
  position: string;
  points: number;
  percentage: number;
}

interface RadarData {
  category: string;
  value: number;
  fullMark: 100;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function TeamPerformanceMetrics() {
  const [selectedMetric, setSelectedMetric] = useState<'weekly' | 'position' | 'comparison'>('weekly');
  const [timeRange, setTimeRange] = useState<'season' | 'last4' | 'last8'>('last4');

  // Mock data - replace with actual data from API
  const weeklyPerformance: PerformanceData[] = [
    { week: 'W1', score: 112, projected: 105, leagueAverage: 100 },
    { week: 'W2', score: 128, projected: 110, leagueAverage: 103 },
    { week: 'W3', score: 95, projected: 108, leagueAverage: 98 },
    { week: 'W4', score: 134, projected: 115, leagueAverage: 102 },
    { week: 'W5', score: 121, projected: 112, leagueAverage: 104 },
    { week: 'W6', score: 118, projected: 109, leagueAverage: 101 },
    { week: 'W7', score: 142, projected: 120, leagueAverage: 106 },
    { week: 'W8', score: 125, projected: 113, leagueAverage: 105 }
  ];

  const positionBreakdown: PositionData[] = [
    { position: 'QB', points: 245, percentage: 22 },
    { position: 'RB', points: 312, percentage: 28 },
    { position: 'WR', points: 378, percentage: 34 },
    { position: 'TE', points: 123, percentage: 11 },
    { position: 'K', points: 56, percentage: 5 }
  ];

  const radarData: RadarData[] = [
    { category: 'Scoring', value: 85, fullMark: 100 },
    { category: 'Consistency', value: 72, fullMark: 100 },
    { category: 'Trades', value: 90, fullMark: 100 },
    { category: 'Waiver', value: 68, fullMark: 100 },
    { category: 'Lineup', value: 94, fullMark: 100 },
    { category: 'Research', value: 78, fullMark: 100 }
  ];

  const stats = {
    rank: 2,
    totalRanks: 10,
    avgScore: 121.9,
    winRate: 75,
    streak: 'W3',
    bestWeek: 142,
    worstWeek: 95,
    projectedFinish: 1
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {entry.name}:
              </span>
              <span className="font-semibold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    trend, 
    icon: Icon 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    trend?: 'up' | 'down' | 'neutral';
    icon: any;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${
          trend === 'up' ? 'bg-green-100 dark:bg-green-900/30' :
          trend === 'down' ? 'bg-red-100 dark:bg-red-900/30' :
          'bg-gray-100 dark:bg-gray-700'
        }`}>
          <Icon className={`h-5 w-5 ${
            trend === 'up' ? 'text-green-600 dark:text-green-400' :
            trend === 'down' ? 'text-red-600 dark:text-red-400' :
            'text-gray-600 dark:text-gray-400'
          }`} />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="League Rank"
          value={`#${stats.rank}`}
          subtitle={`of ${stats.totalRanks} teams`}
          trend="up"
          icon={Trophy}
        />
        <StatCard
          title="Avg Score"
          value={stats.avgScore.toFixed(1)}
          subtitle="points per week"
          trend="up"
          icon={TrendingUp}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate}%`}
          subtitle={`Streak: ${stats.streak}`}
          trend="up"
          icon={Target}
        />
        <StatCard
          title="Projected Finish"
          value={`#${stats.projectedFinish}`}
          subtitle="Championship odds: 42%"
          trend="neutral"
          icon={Award}
        />
      </div>

      {/* Chart Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMetric('weekly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedMetric === 'weekly'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Weekly Trends
              </button>
              <button
                onClick={() => setSelectedMetric('position')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedMetric === 'position'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Position Breakdown
              </button>
              <button
                onClick={() => setSelectedMetric('comparison')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedMetric === 'comparison'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Team Analysis
              </button>
            </div>
            
            {selectedMetric === 'weekly' && (
              <div className="flex gap-1">
                {(['last4', 'last8', 'season'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      timeRange === range
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    {range === 'last4' ? 'Last 4' : range === 'last8' ? 'Last 8' : 'Season'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {selectedMetric === 'weekly' && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={weeklyPerformance.slice(
                    timeRange === 'last4' ? -4 : timeRange === 'last8' ? -8 : 0
                  )}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    strokeWidth={2}
                    name="Actual Score"
                  />
                  <Line
                    type="monotone"
                    dataKey="projected"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Projected"
                  />
                  <Line
                    type="monotone"
                    dataKey="leagueAverage"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    name="League Avg"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {selectedMetric === 'position' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={positionBreakdown as any}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ position, percentage }) => `${position} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="points"
                    >
                      {positionBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={positionBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="position" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="points" fill="#3B82F6" radius={[8, 8, 0, 0]}>
                      {positionBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedMetric === 'comparison' && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Team Performance"
                    dataKey="value"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}