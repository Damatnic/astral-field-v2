/**
 * PageHeader - Consistent page titles with breadcrumbs
 * Part of the new AstralField design system
 */

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"

export interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  breadcrumbs?: Array<{ label: string; href?: string }>
  actions?: React.ReactNode
  className?: string
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, icon: Icon, breadcrumbs, actions, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn("space-y-4 pb-6 border-b border-slate-800/50", className)}
      >
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-500">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title & Actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {Icon && (
              <div className="rounded-xl p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                <Icon className="w-6 h-6 text-blue-400" />
              </div>
            )}
            
            <div className="space-y-1 flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="text-slate-400 text-base max-w-3xl">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </motion.div>
    )
  }
)

PageHeader.displayName = "PageHeader"

