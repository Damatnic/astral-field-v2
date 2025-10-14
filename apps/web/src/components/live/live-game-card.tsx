/**
 * LiveGameCard - Real-time game score display
 * Part of the live scores system
 */

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Clock, TrendingUp, TrendingDown } from "lucide-react"

interface LiveGameCardProps {
  game: {
    gameId: string
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    quarter: string
    timeRemaining: string
    status: 'scheduled' | 'live' | 'final'
  }
  className?: string
}

export function LiveGameCard({ game, className }: LiveGameCardProps) {
  const isLive = game.status === 'live'
  const isFinal = game.status === 'final'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-slate-900/50 backdrop-blur-sm",
        isLive ? "border-emerald-500/30 ring-1 ring-emerald-500/20" : "border-slate-800",
        className
      )}
    >
      {/* Live indicator */}
      {isLive && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">LIVE</span>
          </div>
        </div>
      )}

      {/* Game Content */}
      <div className="p-5 space-y-4">
        {/* Teams & Scores */}
        <div className="space-y-3">
          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-white text-sm">
                {game.awayTeam}
              </div>
              <span className="font-medium text-white">{game.awayTeam}</span>
            </div>
            <div className={cn(
              "text-3xl font-bold tabular-nums",
              game.awayScore > game.homeScore ? "text-white" : "text-slate-500"
            )}>
              {game.awayScore}
            </div>
          </div>

          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-white text-sm">
                {game.homeTeam}
              </div>
              <span className="font-medium text-white">{game.homeTeam}</span>
            </div>
            <div className={cn(
              "text-3xl font-bold tabular-nums",
              game.homeScore > game.awayScore ? "text-white" : "text-slate-500"
            )}>
              {game.homeScore}
            </div>
          </div>
        </div>

        {/* Game Status */}
        <div className="pt-3 border-t border-slate-800/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              {!isFinal && <Clock className="w-4 h-4" />}
              <span className="font-medium">
                {isFinal ? 'FINAL' : `${game.quarter} - ${game.timeRemaining}`}
              </span>
            </div>
            {isLive && (
              <button className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                View Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Animated background for live games */}
      {isLive && (
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-transparent to-transparent animate-pulse" />
        </div>
      )}
    </motion.div>
  )
}

