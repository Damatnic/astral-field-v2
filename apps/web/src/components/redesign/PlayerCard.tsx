'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { GradientCard } from './GradientCard'
import { StatusBadge } from './StatusBadge'

interface PlayerCardProps {
  name: string
  position: string
  team: string
  points?: number
  projected?: number
  status?: 'active' | 'injured' | 'bye' | 'out' | 'questionable'
  imageUrl?: string
  onClick?: () => void
  selected?: boolean
  className?: string
}

const statusVariants = {
  active: 'success',
  injured: 'error',
  bye: 'warning',
  out: 'error',
  questionable: 'warning',
} as const

const positionColors = {
  QB: 'text-fantasy-red-400',
  RB: 'text-fantasy-green-400',
  WR: 'text-fantasy-blue-400',
  TE: 'text-fantasy-yellow-400',
  K: 'text-fantasy-purple-400',
  DEF: 'text-orange-400',
}

export function PlayerCard({ 
  name, 
  position, 
  team, 
  points,
  projected,
  status = 'active',
  imageUrl,
  onClick,
  selected,
  className 
}: PlayerCardProps) {
  return (
    <GradientCard
      gradient={selected ? 'purple' : 'dark'}
      hover={!!onClick}
      onClick={onClick}
      className={cn(
        'p-3 sm:p-4 transition-all duration-200',
        selected && 'ring-2 ring-fantasy-purple-500',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Player Image/Avatar */}
        <div className="flex-shrink-0">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={name} 
              className="w-12 h-12 rounded-full object-cover border border-slate-600"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-400">{name.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-sm font-bold', positionColors[position as keyof typeof positionColors] || 'text-gray-400')}>
                  {position}
                </span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-sm text-gray-400">{team}</span>
              </div>
            </div>
            
            {status !== 'active' && (
              <StatusBadge 
                variant={statusVariants[status]} 
                size="sm"
              >
                {status.toUpperCase()}
              </StatusBadge>
            )}
          </div>

          {/* Points */}
          {(points !== undefined || projected !== undefined) && (
            <div className="flex items-center gap-4 mt-2 text-xs">
              {points !== undefined && (
                <div>
                  <span className="text-gray-500">Points: </span>
                  <span className="font-semibold text-white">{points}</span>
                </div>
              )}
              {projected !== undefined && (
                <div>
                  <span className="text-gray-500">Proj: </span>
                  <span className="font-semibold text-gray-300">{projected}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </GradientCard>
  )
}

