/**
 * LoadingState - Skeleton loaders matching content
 * Part of the new AstralField design system
 */

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export interface LoadingStateProps {
  variant?: 'card' | 'table' | 'list' | 'stats' | 'player'
  count?: number
  className?: string
}

const shimmer = {
  hidden: { x: '-100%' },
  visible: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: "easeInOut"
    }
  }
}

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("relative overflow-hidden bg-slate-800/50 rounded", className)}>
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/20 to-transparent"
      variants={shimmer}
      initial="hidden"
      animate="visible"
    />
  </div>
)

const CardSkeleton = () => (
  <div className="space-y-4 p-6 rounded-xl border border-slate-800 bg-slate-900/50">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-3 w-full" />
  </div>
)

const StatSkeleton = () => (
  <div className="space-y-3 p-6 rounded-xl border border-slate-800 bg-slate-900/50">
    <Skeleton className="h-3 w-20" />
    <Skeleton className="h-9 w-24" />
    <div className="flex items-center gap-2">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
)

const TableSkeleton = () => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4 px-4 py-3 border-b border-slate-800">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
      <div key={row} className="flex gap-4 px-4 py-3 border-b border-slate-800/30">
        {[1, 2, 3, 4, 5].map((col) => (
          <Skeleton key={col} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
)

const ListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-slate-800 bg-slate-900/30">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    ))}
  </div>
)

const PlayerSkeleton = () => (
  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </div>
  </div>
)

export const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ variant = 'card', count = 1, className }, ref) => {
    const renderSkeleton = () => {
      switch (variant) {
        case 'stats':
          return Array.from({ length: count }).map((_, i) => (
            <StatSkeleton key={i} />
          ))
        case 'table':
          return <TableSkeleton />
        case 'list':
          return <ListSkeleton />
        case 'player':
          return Array.from({ length: count }).map((_, i) => (
            <PlayerSkeleton key={i} />
          ))
        case 'card':
        default:
          return Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
          ))
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "animate-in fade-in duration-300",
          variant === 'stats' && "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
          variant === 'card' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
          variant === 'player' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
          className
        )}
      >
        {renderSkeleton()}
      </div>
    )
  }
)

LoadingState.displayName = "LoadingState"

