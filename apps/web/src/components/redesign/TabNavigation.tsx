'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  subtitle?: string
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline'
  className?: string
}

export function TabNavigation({ 
  tabs, 
  activeTab, 
  onTabChange,
  variant = 'default',
  className 
}: TabNavigationProps) {
  if (variant === 'pills') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
                isActive
                  ? 'bg-fantasy-purple-600 text-white shadow-lg shadow-fantasy-purple-500/30'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (variant === 'underline') {
    return (
      <div className={cn('flex gap-6 border-b border-slate-700', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-1 py-3 font-medium transition-all duration-200 border-b-2 -mb-px',
                isActive
                  ? 'border-fantasy-purple-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-slate-600'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // Default variant - card style
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200',
              isActive
                ? 'bg-fantasy-purple-600/20 border-fantasy-purple-500 text-white shadow-lg shadow-fantasy-purple-500/20'
                : 'bg-slate-800/50 border-slate-700 text-gray-400 hover:bg-slate-700 hover:text-white hover:border-slate-600'
            )}
          >
            {tab.icon && <div className="text-2xl">{tab.icon}</div>}
            <div className="text-center">
              <p className="text-sm font-semibold">{tab.label}</p>
              {tab.subtitle && (
                <p className="text-xs text-gray-500 mt-0.5">{tab.subtitle}</p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

