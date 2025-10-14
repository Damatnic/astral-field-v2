/**
 * ModernCard - Glassmorphism cards with gradients and animations
 * Part of the new AstralField design system
 */

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

export interface ModernCardProps extends HTMLMotionProps<"div"> {
  variant?: 'glass' | 'solid' | 'gradient' | 'bordered'
  hover?: boolean
  glow?: boolean
  children: React.ReactNode
}

const variantStyles = {
  glass: "bg-slate-900/50 backdrop-blur-xl border border-slate-800/50",
  solid: "bg-slate-900 border border-slate-800",
  gradient: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50",
  bordered: "bg-slate-950 border-2 border-slate-700",
}

export const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  ({ className, variant = 'glass', hover = true, glow = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
        className={cn(
          "relative rounded-xl overflow-hidden transition-all duration-300",
          variantStyles[variant],
          hover && "hover:border-slate-700/70 hover:shadow-lg hover:shadow-slate-900/20",
          glow && "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-blue-500/10 before:via-purple-500/10 before:to-pink-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

ModernCard.displayName = "ModernCard"

export const ModernCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-5 space-y-1.5", className)}
    {...props}
  />
))
ModernCardHeader.displayName = "ModernCardHeader"

export const ModernCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-white",
      className
    )}
    {...props}
  />
))
ModernCardTitle.displayName = "ModernCardTitle"

export const ModernCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-400", className)}
    {...props}
  />
))
ModernCardDescription.displayName = "ModernCardDescription"

export const ModernCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 pb-6", className)} {...props} />
))
ModernCardContent.displayName = "ModernCardContent"

export const ModernCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-6 py-4 border-t border-slate-800/50 bg-slate-900/30",
      className
    )}
    {...props}
  />
))
ModernCardFooter.displayName = "ModernCardFooter"

