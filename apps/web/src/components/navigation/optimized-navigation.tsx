'use client'

import { memo, useCallback, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
// Emoji-based icons to replace heroicons
const HomeIcon = () => <span className="w-5 h-5 flex items-center justify-center">🏠</span>
const UserGroupIcon = () => <span className="w-5 h-5 flex items-center justify-center">👥</span>
const ChartBarIcon = () => <span className="w-5 h-5 flex items-center justify-center">📊</span>
const SparklesIcon = () => <span className="w-5 h-5 flex items-center justify-center">✨</span>
const CogIcon = () => <span className="w-5 h-5 flex items-center justify-center">⚙️</span>
const ArrowRightEndOnRectangleIcon = () => <span className="w-5 h-5 flex items-center justify-center">🚪</span>
const Bars3Icon = () => <span className="w-5 h-5 flex items-center justify-center">☰</span>
const XMarkIcon = () => <span className="w-5 h-5 flex items-center justify-center">✖️</span>
const TrophyIcon = () => <span className="w-5 h-5 flex items-center justify-center">🏆</span>
const ChatBubbleLeftRightIcon = () => <span className="w-5 h-5 flex items-center justify-center">💬</span>
const ClipboardDocumentListIcon = () => <span className="w-5 h-5 flex items-center justify-center">📋</span>
const TvIcon = () => <span className="w-5 h-5 flex items-center justify-center">📺</span>
const ClockIcon = () => <span className="w-5 h-5 flex items-center justify-center">⏰</span>
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, preload: true },
  { name: 'My Team', href: '/team', icon: UserGroupIcon, preload: true },
  { name: 'Players', href: '/players', icon: ClipboardDocumentListIcon, preload: true },
  { name: 'Live Scoring', href: '/live', icon: TvIcon, preload: false },
  { name: 'Draft Room', href: '/draft', icon: ClockIcon, preload: false },
  { name: 'AI Coach', href: '/ai-coach', icon: SparklesIcon, preload: true },
  { name: 'League Chat', href: '/live#chat', icon: ChatBubbleLeftRightIcon, preload: false },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, preload: false },
  { name: 'Settings', href: '/settings', icon: CogIcon, preload: false },
] as const

interface OptimizedNavigationProps {
  user: {
    name?: string | null
    email?: string | null
    teamName?: string | null
  }
}

// Catalyst: Optimized navigation with aggressive preloading and performance monitoring
export const OptimizedNavigation = memo(({ user }: OptimizedNavigationProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const pathname = usePathname()
  const router = useRouter()

  // Catalyst: Aggressive route preloading for instant navigation
  useEffect(() => {
    const preloadRoutes = async () => {
      // Preload critical routes immediately
      const criticalRoutes = navigation.filter(route => route.preload)
      
      for (const route of criticalRoutes) {
        try {
          await router.prefetch(route.href)
        } catch (error) {
          console.warn(`Failed to preload ${route.href}:`, error)
        }
      }
    }

    // Start preloading after a short delay to avoid blocking initial render
    const timer = setTimeout(preloadRoutes, 100)
    return () => clearTimeout(timer)
  }, [router])

  // Catalyst: Optimized navigation with loading states
  const handleNavigation = useCallback(async (href: string, name: string) => {
    if (pathname === href) return

    setLoadingStates(prev => ({ ...prev, [href]: true }))
    setSidebarOpen(false)

    try {
      // Catalyst: Track navigation performance
      const startTime = performance.now()
      
      await router.push(href)
      
      const endTime = performance.now()
      console.log(`[Catalyst] Navigation to ${name}: ${(endTime - startTime).toFixed(2)}ms`)
      
      // Send performance metric
      if (window.gtag) {
        window.gtag('event', 'page_navigation', {
          page_title: name,
          page_location: href,
          custom_parameter: endTime - startTime
        })
      }
    } catch (error) {
      console.error(`Navigation to ${href} failed:`, error)
    } finally {
      setLoadingStates(prev => ({ ...prev, [href]: false }))
    }
  }, [pathname, router])

  // Catalyst: Optimized sign out with performance tracking
  const handleSignOut = useCallback(async () => {
    try {
      const startTime = performance.now()
      await signOut({ callbackUrl: '/' })
      const endTime = performance.now()
      
      console.log(`[Catalyst] Sign out completed: ${(endTime - startTime).toFixed(2)}ms`)
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }, [])

  // Catalyst: Memoized active state calculation
  const getItemActiveState = useCallback((href: string) => {
    return pathname === href || (pathname?.startsWith(href + '/') ?? false)
  }, [pathname])

  // Catalyst: Memoized user initials
  const userInitials = useMemo(() => 
    user.name?.charAt(0)?.toUpperCase() || 'U'
  , [user.name])

  return (
    <>
      {/* Catalyst: Mobile sidebar overlay with optimized blur */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" />
        </div>
      )}

      {/* Catalyst: High-performance sidebar with hardware acceleration */}
      <nav className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl transform transition-transform duration-200 ease-out will-change-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:static lg:inset-0`}>
        
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/50">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AstralField
          </h1>
          <button
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col h-full">
          {/* Catalyst: User info with optimized avatar */}
          <div className="px-6 py-4 border-b border-slate-800/50">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center font-medium text-white will-change-transform">
                {userInitials}
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

          {/* Catalyst: Optimized navigation links with performance monitoring */}
          <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = getItemActiveState(item.href)
              const isLoading = loadingStates[item.href]
              
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href, item.name)}
                  disabled={isLoading}
                  className={`group w-full flex items-center px-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-800 text-white border-r-2 border-blue-500 shadow-lg'
                      : 'text-gray-300 hover:bg-slate-800/60 hover:text-white'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                >
                  <item.icon 
                    className={`mr-3 h-5 w-5 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'
                    } ${isLoading ? 'animate-pulse' : ''}`}
                  />
                  <span className="truncate">{item.name}</span>
                  {isLoading && (
                    <div className="ml-auto">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Catalyst: Optimized sign out button */}
          <div className="px-4 py-4 border-t border-slate-800/50">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-slate-800/60 transition-all duration-150"
              onClick={handleSignOut}
            >
              <ArrowRightEndOnRectangleIcon className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Catalyst: Optimized mobile trigger with performance enhancements */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-800/90 transition-all duration-150 will-change-transform hover:scale-105"
        >
          <Bars3Icon className="h-5 w-5" />
        </Button>
      </div>
    </>
  )
})

OptimizedNavigation.displayName = 'OptimizedNavigation'