'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { OptimizedNavigation } from '@/components/navigation/optimized-navigation'
import { CatalystPerformanceMonitor } from '@/components/performance/catalyst-performance-monitor'
import { AuthDebugPanel } from '@/components/debug/auth-debug'
import { MobileBottomNavigation } from '@/components/mobile/mobile-navigation'
import { Suspense, useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Sentinel: Hydration-safe error boundary component
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen bg-slate-950">
          <div className="flex-1 overflow-auto">
            <div className="p-6 lg:p-8 pt-16 lg:pt-8">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-400 mb-2">Something went wrong</h2>
                <p className="text-gray-300">We're having trouble loading the dashboard. Please try refreshing the page.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Loading component for dashboard
function DashboardLoading() {
  return (
    <div className="flex h-screen bg-slate-950">
      <div className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-700 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-64 bg-slate-700 rounded"></div>
              <div className="h-64 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Sentinel: Use direct imports to avoid dynamic loading issues
// These components are already client-side optimized

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Catalyst: Memoize router to prevent unnecessary re-renders
  const memoizedRouter = useMemo(() => router, [router])

  // Sentinel: Handle authentication state changes with proper dependencies
  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (status === 'unauthenticated') {
      memoizedRouter.push('/auth/signin')
      return
    }
  }, [status, memoizedRouter])

  // Show loading state during auth check or before hydration
  if (!isHydrated || status === 'loading') {
    return <DashboardLoading />
  }

  // Show error if session failed to load
  if (status === 'unauthenticated' || !session) {
    return (
      <div className="flex h-screen bg-slate-950">
        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 pt-16 lg:pt-8">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-yellow-400 mb-2">Authentication Required</h2>
              <p className="text-gray-300">Redirecting to sign in...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardErrorBoundary>
      <div className="flex h-screen bg-slate-950 relative safe-area-inset" suppressHydrationWarning>
        {/* Sentinel: Desktop navigation - hidden on mobile */}
        <div className="mobile:hidden">
          <OptimizedNavigation user={session.user} />
        </div>
        
        {/* Catalyst: Main content area with hardware acceleration and mobile optimization */}
        <main className="flex-1 lg:ml-64 mobile:ml-0 overflow-auto will-change-scroll scroll-smooth-mobile">
          <div className="min-h-full pb-20 mobile:pb-24 safe-area-bottom">
            <Suspense fallback={<DashboardLoading />}>
              {children}
            </Suspense>
          </div>
        </main>
        
        {/* Sigma: Mobile bottom navigation */}
        <div className="mobile:block hidden">
          <MobileBottomNavigation />
        </div>
        
        {/* Catalyst: Performance monitoring overlay */}
        <CatalystPerformanceMonitor />
        
        {/* Sentinel: Authentication debugging panel for development */}
        {process.env.NODE_ENV === 'development' && <AuthDebugPanel />}
      </div>
    </DashboardErrorBoundary>
  )
}