/**
 * PlayerCard - Compact player info cards with hover states
 * Part of the new AstralField design system
 */

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Star, Plus, Check } from "lucide-react"
import Image from "next/image"

export interface PlayerCardProps {
  player: {
    id: string
    name: string
    position: string
    team: string
    photoUrl?: string
    points?: number
    projected?: number
    trend?: 'up' | 'down'
    owned?: number
    status?: 'active' | 'injured' | 'bye' | 'questionable'
  }
  selected?: boolean
  onSelect?: (playerId: string) => void
  onClick?: () => void
  actions?: React.ReactNode
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

const statusColors = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  injured: "bg-red-500/20 text-red-400 border-red-500/30",
  bye: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  questionable: "bg-amber-500/20 text-amber-400 border-amber-500/30",
}

const positionColors = {
  QB: "bg-red-500/10 text-red-400 border-red-500/30",
  RB: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  WR: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  TE: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  K: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  DEF: "bg-slate-500/10 text-slate-400 border-slate-500/30",
}

export const PlayerCard = React.forwardRef<HTMLDivElement, PlayerCardProps>(
  ({ player, selected, onSelect, onClick, actions, variant = 'default', className }, ref) => {
    const handleClick = () => {
      if (onClick) {
        onClick()
      } else if (onSelect) {
        onSelect(player.id)
      }
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        className={cn(
          "relative rounded-xl border bg-slate-900/50 backdrop-blur-sm overflow-hidden",
          "transition-all duration-200 cursor-pointer group",
          selected
            ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20"
            : "border-slate-800 hover:border-slate-700",
          className
        )}
      >
        {/* Selection indicator */}
        {selected && (
          <div className="absolute top-2 right-2 z-10">
            <div className="rounded-full bg-blue-500 p-1">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>
        )}

        {/* Card content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Player photo */}
            <div className="relative">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 group-hover:border-slate-600 transition-colors">
                {player.photoUrl ? (
                  <Image
                    src={player.photoUrl}
                    alt={player.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-500 text-xl font-bold">
                    {player.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Position badge */}
              <div className={cn(
                "absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold border",
                positionColors[player.position as keyof typeof positionColors] || positionColors.QB
              )}>
                {player.position}
              </div>
            </div>

            {/* Player info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {player.name}
                  </h3>
                  <p className="text-sm text-slate-400">{player.team}</p>
                </div>

                {/* Quick action button */}
                {!selected && onSelect && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(player.id)
                    }}
                    className="p-1 rounded-md hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Stats */}
              {variant !== 'compact' && (
                <div className="mt-3 flex items-center gap-4">
                  {player.points !== undefined && (
                    <div>
                      <p className="text-xs text-slate-500">Points</p>
                      <p className="text-lg font-bold text-white tabular-nums">
                        {player.points.toFixed(1)}
                      </p>
                    </div>
                  )}

                  {player.projected !== undefined && (
                    <div>
                      <p className="text-xs text-slate-500">Proj</p>
                      <p className="text-sm font-semibold text-slate-300 tabular-nums">
                        {player.projected.toFixed(1)}
                      </p>
                    </div>
                  )}

                  {player.trend && (
                    <div className="flex items-center gap-1">
                      {player.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {(player.owned !== undefined || player.status || actions) && (
            <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {player.status && player.status !== 'active' && (
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium border",
                    statusColors[player.status]
                  )}>
                    {player.status.toUpperCase()}
                  </span>
                )}

                {player.owned !== undefined && (
                  <span className="text-xs text-slate-500">
                    {player.owned}% owned
                  </span>
                )}
              </div>

              {actions}
            </div>
          )}
        </div>

        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent" />
        </div>
      </motion.div>
    )
  }
)

PlayerCard.displayName = "PlayerCard"

