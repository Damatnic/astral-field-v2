/**
 * EmptyState - Beautiful empty states with CTAs
 * Part of the new AstralField design system
 */

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { type LucideIcon } from "lucide-react"
import { ActionButton } from "./action-button"

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, secondaryAction, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "flex flex-col items-center justify-center text-center py-16 px-4",
          className
        )}
      >
        {/* Icon */}
        {Icon && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="relative mb-6"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 blur-2xl bg-blue-500/20 rounded-full" />
            
            <div className="relative rounded-2xl p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
              <Icon className="w-12 h-12 text-slate-400" />
            </div>
          </motion.div>
        )}

        {/* Content */}
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-semibold text-white">
            {title}
          </h3>
          {description && (
            <p className="text-slate-400 text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex items-center gap-3 mt-8">
            {action && (
              <ActionButton
                variant="primary"
                icon={action.icon}
                onClick={action.onClick}
              >
                {action.label}
              </ActionButton>
            )}
            
            {secondaryAction && (
              <ActionButton
                variant="ghost"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </ActionButton>
            )}
          </div>
        )}
      </motion.div>
    )
  }
)

EmptyState.displayName = "EmptyState"

