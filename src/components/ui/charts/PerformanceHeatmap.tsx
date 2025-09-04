'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

interface HeatmapCell {
  x: string
  y: string
  value: number
  label?: string
  metadata?: any
}

interface PerformanceHeatmapProps {
  data: HeatmapCell[]
  title: string
  xAxisLabel?: string
  yAxisLabel?: string
  colorScheme?: 'blue' | 'green' | 'red' | 'purple'
  showValues?: boolean
  onCellClick?: (cell: HeatmapCell) => void
}

export default function PerformanceHeatmap({
  data,
  title,
  xAxisLabel = 'X Axis',
  yAxisLabel = 'Y Axis',
  colorScheme = 'blue',
  showValues = true,
  onCellClick
}: PerformanceHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null)

  const { processedData, xLabels, yLabels, minValue, maxValue } = useMemo(() => {
    const xLabels = [...new Set(data.map(d => d.x))].sort()
    const yLabels = [...new Set(data.map(d => d.y))].sort()
    const values = data.map(d => d.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)

    const processedData = xLabels.map(x => 
      yLabels.map(y => {
        const cell = data.find(d => d.x === x && d.y === y)
        return cell || { x, y, value: 0 }
      })
    )

    return { processedData, xLabels, yLabels, minValue, maxValue }
  }, [data])

  const getColorIntensity = (value: number) => {
    if (maxValue === minValue) return 0.5
    return (value - minValue) / (maxValue - minValue)
  }

  const getCellColor = (value: number) => {
    const intensity = getColorIntensity(value)
    
    const colorMaps = {
      blue: `rgba(59, 130, 246, ${0.1 + intensity * 0.8})`,
      green: `rgba(16, 185, 129, ${0.1 + intensity * 0.8})`,
      red: `rgba(239, 68, 68, ${0.1 + intensity * 0.8})`,
      purple: `rgba(139, 92, 246, ${0.1 + intensity * 0.8})`
    }
    
    return colorMaps[colorScheme]
  }

  const cellWidth = 60
  const cellHeight = 40
  const margin = { top: 60, right: 20, bottom: 40, left: 100 }

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Low</span>
          <div className="flex space-x-1">
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded"
                style={{ 
                  backgroundColor: colorScheme === 'blue' ? `rgba(59, 130, 246, ${intensity})` :
                                  colorScheme === 'green' ? `rgba(16, 185, 129, ${intensity})` :
                                  colorScheme === 'red' ? `rgba(239, 68, 68, ${intensity})` :
                                  `rgba(139, 92, 246, ${intensity})`
                }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">High</span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          width={margin.left + margin.right + xLabels.length * cellWidth}
          height={margin.top + margin.bottom + yLabels.length * cellHeight}
          className="font-mono"
        >
          {/* Y-axis labels */}
          {yLabels.map((label, i) => (
            <text
              key={`y-${i}`}
              x={margin.left - 10}
              y={margin.top + i * cellHeight + cellHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#9ca3af"
              fontSize="12"
              className="select-none"
            >
              {label}
            </text>
          ))}

          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <text
              key={`x-${i}`}
              x={margin.left + i * cellWidth + cellWidth / 2}
              y={margin.top - 15}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#9ca3af"
              fontSize="12"
              className="select-none"
              transform={`rotate(-45, ${margin.left + i * cellWidth + cellWidth / 2}, ${margin.top - 15})`}
            >
              {label}
            </text>
          ))}

          {/* Heatmap cells */}
          {processedData.map((row, i) =>
            row.map((cell, j) => (
              <motion.g key={`${i}-${j}`}>
                <motion.rect
                  x={margin.left + i * cellWidth}
                  y={margin.top + j * cellHeight}
                  width={cellWidth}
                  height={cellHeight}
                  fill={getCellColor(cell.value)}
                  stroke="#374151"
                  strokeWidth={0.5}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (i + j) * 0.02 }}
                  className="cursor-pointer hover:stroke-white transition-colors"
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => onCellClick?.(cell)}
                />
                
                {showValues && (
                  <motion.text
                    x={margin.left + i * cellWidth + cellWidth / 2}
                    y={margin.top + j * cellHeight + cellHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={getColorIntensity(cell.value) > 0.6 ? '#ffffff' : '#1f2937'}
                    fontSize="10"
                    fontWeight="medium"
                    className="select-none pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (i + j) * 0.02 + 0.3 }}
                  >
                    {cell.value.toFixed(1)}
                  </motion.text>
                )}
              </motion.g>
            ))
          )}

          {/* Axis labels */}
          <text
            x={margin.left + (xLabels.length * cellWidth) / 2}
            y={margin.top + yLabels.length * cellHeight + 30}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="14"
            fontWeight="medium"
          >
            {xAxisLabel}
          </text>
          
          <text
            x={20}
            y={margin.top + (yLabels.length * cellHeight) / 2}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="14"
            fontWeight="medium"
            transform={`rotate(-90, 20, ${margin.top + (yLabels.length * cellHeight) / 2})`}
          >
            {yAxisLabel}
          </text>
        </svg>
      </div>

      {hoveredCell && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-gray-700 rounded-lg"
        >
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400">{xAxisLabel}</div>
              <div className="text-white font-medium">{hoveredCell.x}</div>
            </div>
            <div>
              <div className="text-gray-400">{yAxisLabel}</div>
              <div className="text-white font-medium">{hoveredCell.y}</div>
            </div>
            <div>
              <div className="text-gray-400">Value</div>
              <div className="text-white font-medium">
                {hoveredCell.value.toFixed(2)}
              </div>
            </div>
          </div>
          
          {hoveredCell.label && (
            <div className="mt-2 text-xs text-gray-300">
              {hoveredCell.label}
            </div>
          )}
          
          {hoveredCell.metadata && (
            <div className="mt-3 space-y-1">
              {Object.entries(hoveredCell.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                  <span className="text-gray-300">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <span>Range: {minValue.toFixed(1)} - {maxValue.toFixed(1)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Click cells for details</span>
        </div>
      </div>
    </div>
  )
}