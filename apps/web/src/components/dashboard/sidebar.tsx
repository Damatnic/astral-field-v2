'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  HomeIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  SparklesIcon,
  CogIcon,
  ArrowRightEndOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  TrophyIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  TvIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'My Team', href: '/team', icon: UserGroupIcon },
  { name: 'Players', href: '/players', icon: ClipboardDocumentListIcon },
  { name: 'Live Scoring', href: '/live', icon: TvIcon },
  { name: 'Draft Room', href: '/draft', icon: ClockIcon },
  { name: 'AI Coach', href: '/ai-coach', icon: SparklesIcon },
  { name: 'League Chat', href: '/live#chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
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
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
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
                  {user.teamName || user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item: any) => {
              const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white border-r-2 border-blue-500'
                      : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon 
                    className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'}`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Sign out */}
          <div className="px-4 py-4 border-t border-slate-800">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-slate-800"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <ArrowRightEndOnRectangleIcon className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="bg-slate-800/50 backdrop-blur-sm border border-slate-700"
        >
          <Bars3Icon className="h-5 w-5" />
        </Button>
      </div>
    </>
  )
}