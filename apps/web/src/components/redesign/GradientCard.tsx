'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface GradientCardProps {
  children: React.ReactNode
  className?: string
  gradient?: 'purple' | 'blue' | 'purple-blue' | 'dark' | 'none'
  hover?: boolean
  onClick?: () => void
}

const gradientVariants = {
  purple: 'bg-gradient-to-br from-fantasy-purple-600/20 to-fantasy-purple-900/20 border-fantasy-purple-500/30',
  blue: 'bg-gradient-to-br from-fantasy-blue-600/20 to-fantasy-blue-900/20 border-fantasy-blue-500/30',
  'purple-blue': 'bg-gradient-to-br from-fantasy-purple-600/20 via-fantasy-blue-600/20 to-fantasy-purple-900/20 border-fantasy-purple-500/30',
  dark: 'bg-slate-900/50 border-slate-700',
  none: 'bg-slate-800/50 border-slate-700',
}

export function GradientCard({ 
  children, 
  className, 
  gradient = 'dark',
  hover = false,
  onClick 
}: GradientCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-sm transition-all duration-200',
        gradientVariants[gradient],
        hover && 'hover:scale-[1.02] hover:shadow-lg hover:shadow-fantasy-purple-500/20 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

