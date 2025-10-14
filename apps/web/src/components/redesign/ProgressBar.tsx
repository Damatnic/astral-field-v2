'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  label: string
  value: number
  max?: number
  color?: 'purple' | 'blue' | 'green' | 'yellow' | 'red'
  showValue?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const colorStyles = {
  purple: 'bg-fantasy-purple-600',
  blue: 'bg-fantasy-blue-600',
  green: 'bg-fantasy-green-600',
  yellow: 'bg-fantasy-yellow-600',
  red: 'bg-fantasy-red-600',
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
}

export function ProgressBar({ 
  label, 
  value, 
  max = 100,
  color = 'purple',
  showValue = true,
  size = 'md',
  className 
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-300">{label}</span>
        {showValue && (
          <span className="text-gray-400">{value}/{max}</span>
        )}
      </div>
      <div className={cn('w-full bg-slate-800 rounded-full overflow-hidden', sizeStyles[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorStyles[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

