/**
 * StatCard - Animated stat displays with trend indicators
 * Part of the new AstralField design system
 */

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"

export interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  description?: string
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

const variantStyles = {
  default: {
    bg: "from-slate-900 to-slate-800",
    icon: "text-blue-400",
    border: "border-slate-700/50",
  },
  success: {
    bg: "from-emerald-950/50 to-slate-900",
    icon: "text-emerald-400",
    border: "border-emerald-700/30",
  },
  warning: {
    bg: "from-amber-950/50 to-slate-900",
    icon: "text-amber-400",
    border: "border-amber-700/30",
  },
  danger: {
    bg: "from-red-950/50 to-slate-900",
    icon: "text-red-400",
    border: "border-red-700/30",
  },
  info: {
    bg: "from-blue-950/50 to-slate-900",
    icon: "text-blue-400",
    border: "border-blue-700/30",
  },
}

const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'neutral' }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-400" />
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />
  return <Minus className="w-4 h-4 text-slate-400" />
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, icon: Icon, trend, trendValue, description, className, variant = 'default' }, ref) => {
    const styles = variantStyles[variant]

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -4, scale: 1.02 }}
        className={cn(
          "relative overflow-hidden rounded-xl border p-6 transition-all duration-300",
          `bg-gradient-to-br ${styles.bg}`,
          styles.border,
          "hover:border-slate-600/70 hover:shadow-lg hover:shadow-slate-900/30",
          className
        )}
      >
        {/* Background glow */}
        <div className={cn(
          "absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500",
          "bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent"
        )} />

        {/* Content */}
        <div className="relative space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <p className="text-sm font-medium text-slate-400">{label}</p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="text-3xl font-bold text-white tabular-nums"
              >
                {value}
              </motion.p>
            </div>
            
            {Icon && (
              <div className={cn(
                "rounded-lg p-3",
                "bg-slate-800/50 backdrop-blur-sm",
                styles.icon
              )}>
                <Icon className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Trend & Description */}
          {(trend || trendValue || description) && (
            <div className="flex items-center justify-between text-sm">
              {(trend || trendValue) && (
                <div className="flex items-center gap-1.5">
                  <TrendIcon trend={trend} />
                  {trendValue && (
                    <span className={cn(
                      "font-medium",
                      trend === 'up' && "text-emerald-400",
                      trend === 'down' && "text-red-400",
                      !trend && "text-slate-400"
                    )}>
                      {trendValue}
                    </span>
                  )}
                </div>
              )}
              
              {description && (
                <span className="text-slate-500 text-xs">{description}</span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    )
  }
)

StatCard.displayName = "StatCard"

