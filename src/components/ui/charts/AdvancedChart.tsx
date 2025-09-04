'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DataPoint {
  x: number | string
  y: number
  label?: string
  color?: string
  metadata?: any
}

interface ChartProps {
  data: DataPoint[]
  width?: number
  height?: number
  type: 'line' | 'bar' | 'scatter' | 'area' | 'heatmap'
  title?: string
  xLabel?: string
  yLabel?: string
  interactive?: boolean
  showGrid?: boolean
  showTooltip?: boolean
  theme?: 'dark' | 'light'
  onPointClick?: (point: DataPoint, index: number) => void
}

export default function AdvancedChart({
  data,
  width = 600,
  height = 400,
  type,
  title,
  xLabel,
  yLabel,
  interactive = true,
  showGrid = true,
  showTooltip = true,
  theme = 'dark',
  onPointClick
}: ChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ point: DataPoint; index: number; position: { x: number; y: number } } | null>(null)
  const [selectedPoints, setSelectedPoints] = useState<number[]>([])

  const margin = { top: 40, right: 40, bottom: 60, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  const { xScale, yScale, processedData } = useMemo(() => {
    if (!data.length) return { xScale: () => 0, yScale: () => 0, processedData: [] }

    const xValues = data.map(d => typeof d.x === 'string' ? d.x : d.x)
    const yValues = data.map(d => d.y)
    
    const xMin = typeof xValues[0] === 'number' ? Math.min(...xValues as number[]) : 0
    const xMax = typeof xValues[0] === 'number' ? Math.max(...xValues as number[]) : xValues.length - 1
    const yMin = Math.min(...yValues, 0)
    const yMax = Math.max(...yValues)

    const xScale = typeof xValues[0] === 'number' 
      ? (x: number) => ((x - xMin) / (xMax - xMin)) * chartWidth
      : (x: string | number) => {
          const index = typeof x === 'string' ? xValues.indexOf(x) : x
          return (index / (xValues.length - 1)) * chartWidth
        }

    const yScale = (y: number) => chartHeight - ((y - yMin) / (yMax - yMin)) * chartHeight

    const processedData = data.map((d, i) => ({
      ...d,
      scaledX: typeof d.x === 'number' ? xScale(d.x) : xScale(i),
      scaledY: yScale(d.y),
      originalIndex: i
    }))

    return { xScale, yScale, processedData }
  }, [data, chartWidth, chartHeight])

  const renderGrid = () => {
    if (!showGrid) return null

    const gridLines = []
    const numXLines = 5
    const numYLines = 5

    for (let i = 0; i <= numXLines; i++) {
      const x = (i / numXLines) * chartWidth
      gridLines.push(
        <line
          key={`x-grid-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={chartHeight}
          stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
          strokeWidth={0.5}
          opacity={0.5}
        />
      )
    }

    for (let i = 0; i <= numYLines; i++) {
      const y = (i / numYLines) * chartHeight
      gridLines.push(
        <line
          key={`y-grid-${i}`}
          x1={0}
          y1={y}
          x2={chartWidth}
          y2={y}
          stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
          strokeWidth={0.5}
          opacity={0.5}
        />
      )
    }

    return <g>{gridLines}</g>
  }

  const renderLineChart = () => {
    if (processedData.length < 2) return null

    const pathD = processedData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.scaledX} ${d.scaledY}`)
      .join(' ')

    return (
      <g>
        <motion.path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        {processedData.map((d, i) => (
          <motion.circle
            key={i}
            cx={d.scaledX}
            cy={d.scaledY}
            r={selectedPoints.includes(i) ? 6 : 4}
            fill={d.color || "#3b82f6"}
            stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onMouseEnter={(e) => {
              if (interactive && showTooltip) {
                const rect = e.currentTarget.getBoundingClientRect()
                setHoveredPoint({
                  point: d,
                  index: i,
                  position: { x: rect.left + rect.width / 2, y: rect.top }
                })
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
            onClick={() => {
              if (interactive) {
                onPointClick?.(d, i)
                setSelectedPoints(prev => 
                  prev.includes(i) 
                    ? prev.filter(idx => idx !== i)
                    : [...prev, i]
                )
              }
            }}
          />
        ))}
      </g>
    )
  }

  const renderBarChart = () => {
    const barWidth = chartWidth / data.length * 0.8
    const barSpacing = chartWidth / data.length * 0.2

    return (
      <g>
        {processedData.map((d, i) => {
          const barHeight = Math.max(0, chartHeight - d.scaledY)
          const x = d.scaledX - barWidth / 2

          return (
            <motion.rect
              key={i}
              x={x}
              y={d.scaledY}
              width={barWidth}
              height={barHeight}
              fill={d.color || "#3b82f6"}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.1 }}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onMouseEnter={(e) => {
                if (interactive && showTooltip) {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setHoveredPoint({
                    point: d,
                    index: i,
                    position: { x: rect.left + rect.width / 2, y: rect.top }
                  })
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={() => {
                if (interactive) {
                  onPointClick?.(d, i)
                  setSelectedPoints(prev => 
                    prev.includes(i) 
                      ? prev.filter(idx => idx !== i)
                      : [...prev, i]
                  )
                }
              }}
            />
          )
        })}
      </g>
    )
  }

  const renderAreaChart = () => {
    if (processedData.length < 2) return null

    const pathD = processedData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.scaledX} ${d.scaledY}`)
      .join(' ')
    
    const areaPathD = pathD + ` L ${processedData[processedData.length - 1].scaledX} ${chartHeight} L ${processedData[0].scaledX} ${chartHeight} Z`

    return (
      <g>
        <motion.path
          d={areaPathD}
          fill="url(#areaGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1 }}
        />
        <motion.path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
      </g>
    )
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return renderLineChart()
      case 'bar':
        return renderBarChart()
      case 'area':
        return renderAreaChart()
      case 'scatter':
        return processedData.map((d, i) => (
          <motion.circle
            key={i}
            cx={d.scaledX}
            cy={d.scaledY}
            r={selectedPoints.includes(i) ? 6 : 4}
            fill={d.color || "#3b82f6"}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onMouseEnter={(e) => {
              if (interactive && showTooltip) {
                const rect = e.currentTarget.getBoundingClientRect()
                setHoveredPoint({
                  point: d,
                  index: i,
                  position: { x: rect.left + rect.width / 2, y: rect.top }
                })
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
            onClick={() => {
              if (interactive) {
                onPointClick?.(d, i)
                setSelectedPoints(prev => 
                  prev.includes(i) 
                    ? prev.filter(idx => idx !== i)
                    : [...prev, i]
                )
              }
            }}
          />
        ))
      default:
        return null
    }
  }

  return (
    <div className="relative">
      {title && (
        <h3 className={`text-lg font-semibold mb-4 text-center ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h3>
      )}
      
      <svg width={width} height={height} className="overflow-visible">
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {renderGrid()}
          {renderChart()}
          
          {/* X-axis */}
          <g transform={`translate(0, ${chartHeight})`}>
            <line
              x1={0}
              y1={0}
              x2={chartWidth}
              y2={0}
              stroke={theme === 'dark' ? '#6b7280' : '#374151'}
              strokeWidth={1}
            />
            {xLabel && (
              <text
                x={chartWidth / 2}
                y={40}
                textAnchor="middle"
                fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize="12"
              >
                {xLabel}
              </text>
            )}
          </g>
          
          {/* Y-axis */}
          <g>
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={chartHeight}
              stroke={theme === 'dark' ? '#6b7280' : '#374151'}
              strokeWidth={1}
            />
            {yLabel && (
              <text
                x={-35}
                y={chartHeight / 2}
                textAnchor="middle"
                fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize="12"
                transform={`rotate(-90, -35, ${chartHeight / 2})`}
              >
                {yLabel}
              </text>
            )}
          </g>
        </g>
      </svg>

      <AnimatePresence>
        {hoveredPoint && showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`fixed z-50 px-3 py-2 rounded-lg shadow-lg pointer-events-none ${
              theme === 'dark' 
                ? 'bg-gray-800 border border-gray-700 text-white' 
                : 'bg-white border border-gray-200 text-gray-900'
            }`}
            style={{
              left: hoveredPoint.position.x,
              top: hoveredPoint.position.y - 60,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-sm">
              <div className="font-medium">
                {hoveredPoint.point.label || `Point ${hoveredPoint.index + 1}`}
              </div>
              <div className="text-xs opacity-75">
                X: {hoveredPoint.point.x}
              </div>
              <div className="text-xs opacity-75">
                Y: {hoveredPoint.point.y.toFixed(2)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}