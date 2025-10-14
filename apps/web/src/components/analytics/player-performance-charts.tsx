'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart3, Target, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WeeklyStats {
  week: number
  points: number
  projected: number
  opponent: string
}

interface PlayerPerformanceChartsProps {
  playerName: string
  weeklyStats: WeeklyStats[]
  consistency?: number
  ceiling?: number
  floor?: number
  averagePoints?: number
}

export function PlayerPerformanceCharts({
  playerName,
  weeklyStats,
  consistency = 0,
  ceiling = 0,
  floor = 0,
  averagePoints = 0
}: PlayerPerformanceChartsProps) {
  const [selectedChart, setSelectedChart] = useState<'line' | 'bar' | 'scatter' | 'radar'>('line')

  const chartTypes = [
    { id: 'line', label: 'Trend', icon: TrendingUp },
    { id: 'bar', label: 'Weekly', icon: BarChart3 },
    { id: 'scatter', label: 'Consistency', icon: Target },
    { id: 'radar', label: 'Profile', icon: Activity }
  ]

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">Week {payload[0].payload.week}</p>
          <p className="text-blue-400 text-sm">Points: {payload[0].value.toFixed(1)}</p>
          {payload[0].payload.projected && (
            <p className="text-slate-400 text-sm">Proj: {payload[0].payload.projected.toFixed(1)}</p>
          )}
          {payload[0].payload.opponent && (
            <p className="text-slate-500 text-xs">vs {payload[0].payload.opponent}</p>
          )}
        </div>
      )
    }
    return null
  }

  // Radar chart data
  const radarData = [
    { metric: 'Ceiling', value: ceiling, fullMark: 30 },
    { metric: 'Floor', value: floor, fullMark: 30 },
    { metric: 'Average', value: averagePoints, fullMark: 30 },
    { metric: 'Consistency', value: consistency, fullMark: 100 },
    { metric: 'Trend', value: weeklyStats[weeklyStats.length - 1]?.points || 0, fullMark: 30 }
  ]

  // Scatter data for consistency
  const scatterData = weeklyStats.map((stat, idx) => ({
    week: stat.week,
    points: stat.points,
    consistency: Math.abs(stat.points - averagePoints)
  }))

  return (
    <div className="space-y-6">
      {/* Chart Type Selector */}
      <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50 w-fit">
        {chartTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedChart(type.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
              selectedChart === type.id
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            )}
          >
            <type.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{type.label}</span>
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <motion.div
        key={selectedChart}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
      >
        <h3 className="text-lg font-bold text-white mb-6">{playerName} Performance</h3>

        {selectedChart === 'line' && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="week" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                label={{ value: 'Week', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                label={{ value: 'Points', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line 
                type="monotone" 
                dataKey="points" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 8 }}
                name="Actual Points"
              />
              <Line 
                type="monotone" 
                dataKey="projected" 
                stroke="#94a3b8" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Projected"
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {selectedChart === 'bar' && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="week" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="points" name="Actual Points">
                {weeklyStats.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.points > entry.projected ? '#10b981' : entry.points > entry.projected * 0.8 ? '#3b82f6' : '#ef4444'} 
                  />
                ))}
              </Bar>
              <Bar dataKey="projected" fill="#94a3b8" opacity={0.3} name="Projected" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {selectedChart === 'scatter' && (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                type="number" 
                dataKey="week" 
                name="Week" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                label={{ value: 'Week', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis 
                type="number" 
                dataKey="points" 
                name="Points" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                label={{ value: 'Points', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Performance" data={scatterData} fill="#3b82f6">
                {scatterData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.consistency < 3 ? '#10b981' : entry.consistency < 6 ? '#3b82f6' : '#ef4444'} 
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {selectedChart === 'radar' && (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 'auto']}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Radar 
                name={playerName} 
                dataKey="value" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Ceiling</div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums">{ceiling.toFixed(1)}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Average</div>
          <div className="text-2xl font-bold text-blue-400 tabular-nums">{averagePoints.toFixed(1)}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Floor</div>
          <div className="text-2xl font-bold text-orange-400 tabular-nums">{floor.toFixed(1)}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Consistency</div>
          <div className="text-2xl font-bold text-purple-400 tabular-nums">{consistency}%</div>
        </div>
      </div>
    </div>
  )
}

