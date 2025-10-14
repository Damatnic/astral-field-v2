'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  children: React.ReactNode
  variant?: 'live' | 'pending' | 'win' | 'loss' | 'tie' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  pulse?: boolean
}

const variantStyles = {
  live: 'bg-fantasy-red-500/20 text-fantasy-red-400 border-fantasy-red-500/50',
  pending: 'bg-fantasy-yellow-500/20 text-fantasy-yellow-400 border-fantasy-yellow-500/50',
  win: 'bg-fantasy-green-500/20 text-fantasy-green-400 border-fantasy-green-500/50',
  loss: 'bg-fantasy-red-500/20 text-fantasy-red-400 border-fantasy-red-500/50',
  tie: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
  success: 'bg-fantasy-green-500/20 text-fantasy-green-400 border-fantasy-green-500/50',
  warning: 'bg-fantasy-yellow-500/20 text-fantasy-yellow-400 border-fantasy-yellow-500/50',
  error: 'bg-fantasy-red-500/20 text-fantasy-red-400 border-fantasy-red-500/50',
  info: 'bg-fantasy-blue-500/20 text-fantasy-blue-400 border-fantasy-blue-500/50',
}

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export function StatusBadge({ 
  children, 
  variant = 'info', 
  size = 'md',
  className,
  pulse = false 
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        variantStyles[variant],
        sizeStyles[size],
        pulse && 'animate-pulse',
        className
      )}
    >
      {pulse && variant === 'live' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fantasy-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-fantasy-red-500"></span>
        </span>
      )}
      {children}
    </span>
  )
}

