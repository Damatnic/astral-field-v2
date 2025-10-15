'use client'

import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { NotificationCenter } from '@/components/notifications/notification-center'

interface TopNavProps {
  currentWeek?: number
  leagueName?: string
}

export function TopNav({ currentWeek = 1, leagueName = 'My League' }: TopNavProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: session } = useSession()

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-slate-900 border-b border-slate-800 z-30">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search players, teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Right: Info & Actions */}
        <div className="flex items-center gap-4">
          {/* League Info */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
            <span className="text-sm text-slate-400">Week</span>
            <span className="text-sm font-bold text-white">{currentWeek}</span>
          </div>

          {/* Notifications */}
          <NotificationCenter />

          {/* User Menu */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-sm font-medium text-white">
              {session?.user?.name || 'User'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  )
}

