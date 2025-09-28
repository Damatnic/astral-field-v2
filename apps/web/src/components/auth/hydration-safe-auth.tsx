'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface HydrationSafeAuthProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
}

// Sentinel: Hydration-safe authentication wrapper
export function HydrationSafeAuth({ 
  children, 
  fallback = <AuthLoadingFallback />,
  requireAuth = true 
}: HydrationSafeAuthProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Handle authentication redirects after hydration
  useEffect(() => {
    if (!isHydrated || status === 'loading') return

    if (requireAuth && status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [isHydrated, status, requireAuth, router])

  // Show fallback during SSR and initial hydration
  if (!isHydrated) {
    return <>{fallback}</>
  }

  // Show loading during auth check
  if (status === 'loading') {
    return <>{fallback}</>
  }

  // Show fallback if auth required but not authenticated
  if (requireAuth && status === 'unauthenticated') {
    return <AuthRequiredFallback />
  }

  return <>{children}</>
}

// Default loading fallback
function AuthLoadingFallback() {
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

// Authentication required fallback
function AuthRequiredFallback() {
  return (
    <div className="flex h-screen bg-slate-950">
      <div className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-400 mb-2">Authentication Required</h2>
            <p className="text-gray-300">Redirecting to sign in...</p>
            <div className="mt-4">
              <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// HOC for protecting pages
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  options: { requireAuth?: boolean; fallback?: React.ReactNode } = {}
) {
  const { requireAuth = true, fallback } = options

  const AuthenticatedComponent = (props: T) => {
    return (
      <HydrationSafeAuth requireAuth={requireAuth} fallback={fallback}>
        <Component {...props} />
      </HydrationSafeAuth>
    )
  }

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  return AuthenticatedComponent
}

// Hook for getting session safely with hydration protection
export function useHydrationSafeSession() {
  const { data: session, status } = useSession()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return {
    session: isHydrated ? session : null,
    status: isHydrated ? status : 'loading',
    isHydrated
  }
}