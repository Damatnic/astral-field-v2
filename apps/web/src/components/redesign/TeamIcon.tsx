'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface TeamIconProps {
  icon: 'crown' | 'rocket' | 'flame' | 'lightning' | 'duck' | 'spiral' | 'star' | 'diamond' | 'trophy' | 'gamepad' | 'target' | 'bicep'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const iconMap = {
  crown: '👑',
  rocket: '🚀',
  flame: '🔥',
  lightning: '⚡',
  duck: '🦆',
  spiral: '🌀',
  star: '⭐',
  diamond: '💎',
  trophy: '🏆',
  gamepad: '🎮',
  target: '🎯',
  bicep: '💪',
}

const sizeStyles = {
  sm: 'text-lg w-8 h-8',
  md: 'text-2xl w-10 h-10',
  lg: 'text-3xl w-12 h-12',
  xl: 'text-4xl w-16 h-16',
}

export function TeamIcon({ icon, size = 'md', className }: TeamIconProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600',
        sizeStyles[size],
        className
      )}
    >
      <span className="select-none">{iconMap[icon]}</span>
    </div>
  )
}

// Helper function to get team icon based on team name
export function getTeamIcon(teamName: string): TeamIconProps['icon'] {
  const name = teamName.toLowerCase()
  
  if (name.includes('dynasty') || name.includes('damato')) return 'crown'
  if (name.includes('juggernaut')) return 'rocket'
  if (name.includes('mauler') || name.includes('minor')) return 'flame'
  if (name.includes('crusher') || name.includes('kornbeck')) return 'lightning'
  if (name.includes('blitz') || name.includes('bergrum')) return 'bicep'
  if (name.includes('raider') || name.includes('renee')) return 'target'
  if (name.includes('legend') || name.includes('larry')) return 'star'
  if (name.includes('lion') || name.includes('lorbiecki')) return 'diamond'
  if (name.includes('giant') || name.includes('jarvey')) return 'trophy'
  if (name.includes('hero') || name.includes('hartley')) return 'gamepad'
  
  return 'star' // default
}

