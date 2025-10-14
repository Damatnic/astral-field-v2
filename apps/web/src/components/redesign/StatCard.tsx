'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { GradientCard } from './GradientCard'

interface StatCardProps {
  icon?: React.ReactNode
  label: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'purple' | 'blue' | 'green' | 'yellow' | 'red' | 'white'
  className?: string
}

const colorStyles = {
  purple: 'text-fantasy-purple-400',
  blue: 'text-fantasy-blue-400',
  green: 'text-fantasy-green-400',
  yellow: 'text-fantasy-yellow-400',
  red: 'text-fantasy-red-400',
  white: 'text-white',
}

export function StatCard({ 
  icon, 
  label, 
  value, 
  subtitle, 
  trend,
  trendValue,
  color = 'white',
  className 
}: StatCardProps) {
  return (
    <GradientCard gradient="dark" className={cn('p-4 sm:p-6', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-400 mb-1">{label}</p>
          <p className={cn('text-2xl sm:text-3xl font-bold mb-1', colorStyles[color])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-fantasy-green-400',
                trend === 'down' && 'text-fantasy-red-400',
                trend === 'neutral' && 'text-gray-400'
              )}>
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trend === 'neutral' && '→'}
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('text-2xl', colorStyles[color])}>
            {icon}
          </div>
        )}
      </div>
    </GradientCard>
  )
}

