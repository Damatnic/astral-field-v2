'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import AdvancedChart from './AdvancedChart'

interface TrendPoint {
  week: number
  value: number
  projection?: number
  confidence?: number
  factors?: string[]
}

interface TrendAnalysisChartProps {
  data: TrendPoint[]
  title: string
  metric: string
  playerName?: string
  showProjections?: boolean
  showConfidence?: boolean
  onTrendClick?: (trend: 'up' | 'down' | 'stable') => void
}

export default function TrendAnalysisChart({
  data,
  title,
  metric,
  playerName,
  showProjections = true,
  showConfidence = false,
  onTrendClick
}: TrendAnalysisChartProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  const { chartData, projectionData, trendDirection, trendStrength } = useMemo(() => {
    const chartData = data.map(point => ({
      x: point.week,
      y: point.value,
      label: `Week ${point.week}`,
      metadata: point
    }))

    const projectionData = showProjections && data.some(p => p.projection !== undefined)
      ? data
          .filter(p => p.projection !== undefined)
          .map(point => ({
            x: point.week,
            y: point.projection!,
            label: `Week ${point.week} (Projection)`,
            color: '#10b981',
            metadata: point
          }))
      : []

    const values = data.map(d => d.value)
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    const trendDirection: 'up' | 'down' | 'stable' = secondAvg > firstAvg * 1.1 ? 'up' : 
                          secondAvg < firstAvg * 0.9 ? 'down' : 'stable'
    
    const trendStrength = Math.abs((secondAvg - firstAvg) / firstAvg) * 100

    return { chartData, projectionData, trendDirection, trendStrength }
  }, [data, showProjections])

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
        return (
          <div className="flex items-center text-green-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
            <span className="text-xs">Trending Up</span>
          </div>
        )
      case 'down':
        return (
          <div className="flex items-center text-red-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7L7.8 16.2M7 7v10h10" />
            </svg>
            <span className="text-xs">Trending Down</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center text-yellow-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            <span className="text-xs">Stable</span>
          </div>
        )
    }
  }

  const getConfidenceBand = () => {
    if (!showConfidence) return null

    return data.map((point, index) => {
      if (!point.confidence) return null

      const margin = point.value * (point.confidence / 100)
      const upperBound = point.value + margin
      const lowerBound = Math.max(0, point.value - margin)

      return (
        <motion.rect
          key={`confidence-${index}`}
          x={((point.week - data[0].week) / (data[data.length - 1].week - data[0].week)) * 520}
          y={300 - ((upperBound / Math.max(...data.map(d => d.value))) * 250)}
          width={520 / data.length}
          height={((upperBound - lowerBound) / Math.max(...data.map(d => d.value))) * 250}
          fill="#3b82f6"
          opacity={0.1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ delay: index * 0.1 }}
        />
      )
    })
  }

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {playerName && (
            <p className="text-sm text-gray-400">{playerName} - {metric}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onTrendClick?.(trendDirection)}
            className="flex items-center hover:bg-gray-700 px-2 py-1 rounded transition-colors"
          >
            {getTrendIcon()}
          </button>
          <div className="text-right">
            <div className="text-sm text-gray-400">Trend Strength</div>
            <div className="text-lg font-semibold text-white">
              {trendStrength.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <AdvancedChart
          data={chartData}
          width={600}
          height={300}
          type="line"
          theme="dark"
          showGrid={true}
          showTooltip={true}
          xLabel="Week"
          yLabel={metric}
          onPointClick={(point, index) => {
            setSelectedWeek(point.x as number)
          }}
        />

        {projectionData.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <AdvancedChart
              data={projectionData}
              width={600}
              height={300}
              type="line"
              theme="dark"
              showGrid={false}
              showTooltip={false}
            />
          </div>
        )}

        <svg className="absolute inset-0 pointer-events-none" width={600} height={300}>
          <g transform="translate(60, 40)">
            {getConfidenceBand()}
          </g>
        </svg>
      </div>

      {selectedWeek && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-gray-700 rounded-lg"
        >
          <h4 className="text-sm font-medium text-white mb-2">
            Week {selectedWeek} Details
          </h4>
          {(() => {
            const weekData = data.find(d => d.week === selectedWeek)
            if (!weekData) return null

            return (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Actual:</span>
                  <span className="text-white">{weekData.value.toFixed(2)}</span>
                </div>
                {weekData.projection && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Projected:</span>
                    <span className="text-green-400">{weekData.projection.toFixed(2)}</span>
                  </div>
                )}
                {weekData.confidence && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Confidence:</span>
                    <span className="text-blue-400">{weekData.confidence}%</span>
                  </div>
                )}
                {weekData.factors && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-1">Key Factors:</div>
                    <div className="flex flex-wrap gap-1">
                      {weekData.factors.map((factor, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </motion.div>
      )}

      <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-0.5 bg-blue-500 mr-2"></div>
            <span>Actual Performance</span>
          </div>
          {projectionData.length > 0 && (
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-green-500 mr-2"></div>
              <span>Projections</span>
            </div>
          )}
          {showConfidence && (
            <div className="flex items-center">
              <div className="w-3 h-2 bg-blue-500 bg-opacity-20 mr-2"></div>
              <span>Confidence Band</span>
            </div>
          )}
        </div>
        <div>
          Last {data.length} weeks
        </div>
      </div>
    </div>
  )
}