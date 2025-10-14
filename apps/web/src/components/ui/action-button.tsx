/**
 * ActionButton - Enhanced buttons with micro-interactions
 * Part of the new AstralField design system
 */

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"
import { Loader2, type LucideIcon } from "lucide-react"

export interface ActionButtonProps extends Omit<HTMLMotionProps<"button">, 'onAnimationStart'> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  children?: React.ReactNode
}

const variantStyles = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30",
  secondary: "bg-slate-700 hover:bg-slate-600 text-white border-slate-700",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/20",
  danger: "bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-lg shadow-red-600/20",
  ghost: "bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border-transparent",
  outline: "bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border-slate-600",
}

const sizeStyles = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon: Icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        transition={{ duration: 0.15 }}
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg border font-medium",
          "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          isDisabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-inherit rounded-lg"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
          </motion.div>
        )}

        {/* Content */}
        <div className={cn(
          "flex items-center justify-center gap-2",
          loading && "opacity-0"
        )}>
          {Icon && iconPosition === 'left' && (
            <Icon className={cn(
              size === 'sm' && "w-3.5 h-3.5",
              size === 'md' && "w-4 h-4",
              size === 'lg' && "w-5 h-5"
            )} />
          )}
          
          {children}
          
          {Icon && iconPosition === 'right' && (
            <Icon className={cn(
              size === 'sm' && "w-3.5 h-3.5",
              size === 'md' && "w-4 h-4",
              size === 'lg' && "w-5 h-5"
            )} />
          )}
        </div>

        {/* Shine effect */}
        {!isDisabled && variant === 'primary' && (
          <motion.div
            className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.button>
    )
  }
)

ActionButton.displayName = "ActionButton"

