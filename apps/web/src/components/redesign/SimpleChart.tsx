'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface BarChartProps {
  data: Array<{
    label: string
    value: number
    color?: string
  }>
  maxValue?: number
  height?: number
  className?: string
}

export function BarChart({ data, maxValue, height = 200, className }: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value))
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end justify-between gap-2" style={{ height: `${height}px` }}>
        {data.map((item, idx) => {
          const barHeight = (item.value / max) * 100
          const colorClass = item.color || 'bg-fantasy-purple-600'
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div className="relative w-full flex items-end" style={{ height: `${height - 40}px` }}>
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
                  <span className="text-xs font-semibold text-white mb-1">{item.value}</span>
                  <div
                    className={cn('w-full rounded-t transition-all duration-500', colorClass)}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-400 text-center truncate w-full">{item.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface LineChartProps {
  data: number[]
  labels: string[]
  color?: string
  height?: number
  className?: string
}

export function LineChart({ data, labels, color = 'rgb(139, 92, 246)', height = 150, className }: LineChartProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, idx) => {
    const x = (idx / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 80 // 80% for padding
    return `${x},${y}`
  }).join(' ')

  return (
    <div className={cn('w-full', className)}>
      <svg viewBox="0 0 100 100" className="w-full" style={{ height: `${height}px` }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="0.5"
          />
        ))}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {data.map((value, idx) => {
          const x = (idx / (data.length - 1)) * 100
          const y = 100 - ((value - min) / range) * 80
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="2"
              fill={color}
            />
          )
        })}
      </svg>
      
      {/* Labels */}
      <div className="flex justify-between mt-2">
        {labels.map((label, idx) => (
          <span key={idx} className="text-xs text-gray-500">{label}</span>
        ))}
      </div>
    </div>
  )
}

