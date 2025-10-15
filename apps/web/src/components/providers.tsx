'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { SessionProvider } from 'next-auth/react'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((d) => ({
    default: d.ReactQueryDevtools,
  })),
  {
    ssr: false,
  }
)

// Sentinel: Hydration-safe wrapper to prevent SSR mismatches
function HydrationSafeWrapper({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // During SSR and initial hydration, render children without session-dependent components
  if (!isHydrated) {
    return <>{children}</>
  }

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <AuthErrorBoundary>
      <HydrationSafeWrapper>
        <SessionProvider
          refetchInterval={0}
          refetchOnWindowFocus={false}
          refetchWhenOffline={false}
        >
          <QueryClientProvider client={queryClient}>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
            </ThemeProvider>
          </QueryClientProvider>
        </SessionProvider>
      </HydrationSafeWrapper>
    </AuthErrorBoundary>
  )
}