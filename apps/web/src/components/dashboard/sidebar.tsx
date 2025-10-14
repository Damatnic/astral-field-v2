'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Home,
  Users,
  BarChart3,
  Sparkles,
  Cog,
  ArrowRightEndOnRectangle,
  Bars3,
  X,
  Trophy,
  MessageSquare,
  ClipboardList,
  Tv,
  Clock,
  Building2,
  Calendar,
  RotateCcw,
  FileText,
  TrendingUp,
  Gamepad2
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Team', href: '/team', icon: Users },
  { name: 'Team Overview', href: '/team-overview', icon: BarChart3 },
  { name: 'Matchups', href: '/matchups', icon: Trophy },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Playoffs', href: '/playoffs', icon: Trophy },
  { name: 'Trading Center', href: '/trades', icon: RotateCcw },
  { name: 'Waiver Wire', href: '/waivers', icon: FileText },
  { name: 'Players', href: '/players', icon: ClipboardList },
  { name: 'League Stats', href: '/league-stats', icon: TrendingUp },
  { name: 'Mock Draft', href: '/mock-draft', icon: Gamepad2 },
  { name: 'Live Scoring', href: '/live', icon: Tv },
  { name: 'Draft Room', href: '/draft', icon: Clock },
  { name: 'AI Coach', href: '/ai-coach', icon: Sparkles },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Cog },
]

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    teamName?: string | null
  }
}

export function Sidebar({ user }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:static lg:inset-0`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AstralField
          </h1>
          <button
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col h-full">
          {/* User info */}
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user.teamName || 'No Team'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const IconComponent = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border-l-4 border-blue-400 shadow-lg'
                      : 'text-gray-300 hover:bg-slate-800/50 hover:text-white border-l-4 border-transparent hover:border-slate-700'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <IconComponent 
                    className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'
                    }`} 
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-slate-800/50"
              onClick={() => signOut()}
            >
              <ArrowRightEndOnRectangle className="mr-3 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-gray-400 hover:text-white hover:bg-slate-800 transition-all"
          onClick={() => setSidebarOpen(true)}
        >
          <Bars3 className="h-6 w-6" />
        </button>
      </div>
    </>
  )
}