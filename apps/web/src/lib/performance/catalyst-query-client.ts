/**
 * Catalyst Query Client Configuration
 * Ultra-optimized React Query setup for maximum performance
 */

import { QueryClient, QueryClientConfig } from '@tanstack/react-query'
import { leagueCache } from '@/lib/cache/catalyst-cache'

/**
 * Catalyst Query Configuration
 * Optimized for 60fps performance and minimal re-renders
 */
const catalystQueryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Catalyst: Aggressive caching with stale-while-revalidate
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 15 * 60 * 1000, // 15 minutes - garbage collection time
      retry: (failureCount, error: any) => {
        // Catalyst: Smart retry logic based on error type
        if (error?.status === 404 || error?.status === 403) {
          return false // Don't retry client errors
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: false, // Catalyst: Reduce unnecessary refetches
      notifyOnChangeProps: ['data', 'error', 'isLoading'], // Catalyst: Minimize re-renders
      structuralSharing: true, // Catalyst: Optimize object comparison
      // Catalyst: Enable experimental features for better performance
      experimental_prefetchInRender: true
    },
    mutations: {
      retry: 1, // Catalyst: Limited retries for mutations
      onError: (error: any) => {
        // Catalyst: Global error handling
        if (process.env.NODE_ENV === 'development') {

          console.error('Mutation error:', error);

        }
        // Could integrate with error tracking service here
      },
      onSettled: () => {
        // Catalyst: Cleanup after mutations
        // This ensures consistent state after mutations complete
      }
    }
  }
}

/**
 * Create optimized query client instance
 */
export function createCatalystQueryClient(): QueryClient {
  const queryClient = new QueryClient(catalystQueryConfig)

  // Catalyst: Custom cache integration
  queryClient.setQueryDefaults(['league'], {
    queryFn: async ({ queryKey }) => {
      const [, leagueId, action, ...params] = queryKey as string[]
      
      // Try cache first
      const cacheKey = queryKey.join(':')
      const cached = await leagueCache.get(cacheKey)
      if (cached) return cached

      // Fetch from API if not cached
      const response = await fetch(`/api/leagues/${leagueId}/${action}?${new URLSearchParams(params as any)}`)
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Cache the result
      await leagueCache.set(cacheKey, data, {
        ttl: 300, // 5 minutes
        tags: ['league', leagueId]
      })
      
      return data
    },
    staleTime: 2 * 60 * 1000 // 2 minutes for league data
  })

  // Catalyst: Player data cache configuration
  queryClient.setQueryDefaults(['players'], {
    staleTime: 10 * 60 * 1000, // 10 minutes for player data
    gcTime: 30 * 60 * 1000, // 30 minutes GC
    queryFn: async ({ queryKey }) => {
      const cacheKey = queryKey.join(':')
      const cached = await leagueCache.get(cacheKey)
      if (cached) return cached

      const [, ...params] = queryKey as string[]
      const response = await fetch(`/api/players?${new URLSearchParams(params as any)}`)
      if (!response.ok) {
        throw new Error(`Players API error: ${response.status}`)
      }
      
      const data = await response.json()
      await leagueCache.set(cacheKey, data, {
        ttl: 600, // 10 minutes
        tags: ['players']
      })
      
      return data
    }
  })

  // Catalyst: Dashboard data with ultra-fast caching
  queryClient.setQueryDefaults(['dashboard'], {
    staleTime: 30 * 1000, // 30 seconds for dashboard
    gcTime: 5 * 60 * 1000, // 5 minutes GC
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    queryFn: async ({ queryKey }) => {
      const cacheKey = queryKey.join(':')
      const cached = await leagueCache.get(cacheKey)
      if (cached) return cached

      const response = await fetch('/api/dashboard')
      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status}`)
      }
      
      const data = await response.json()
      await leagueCache.set(cacheKey, data, {
        ttl: 60, // 1 minute
        tags: ['dashboard']
      })
      
      return data
    }
  })

  return queryClient
}

/**
 * Catalyst: SSR-Safe Query Client
 * Prevents hydration mismatches in server-side rendering
 */
let browserQueryClient: QueryClient | undefined = undefined

export function getCatalystQueryClient() {
  if (typeof window === 'undefined') {
    // Server: Always create a new query client
    return createCatalystQueryClient()
  } else {
    // Browser: Create query client only once
    if (!browserQueryClient) {
      browserQueryClient = createCatalystQueryClient()
    }
    return browserQueryClient
  }
}

/**
 * Catalyst: Performance optimized query keys
 * Standardized query key factory for consistent caching
 */
export const catalystQueryKeys = {
  // League queries
  league: (id: string) => ['league', id] as const,
  leagueStandings: (id: string, week?: number) => 
    ['league', id, 'standings', week?.toString()] as const,
  leagueMatchups: (id: string, week?: number) => 
    ['league', id, 'matchups', week?.toString()] as const,
  leagueTeams: (id: string) => ['league', id, 'teams'] as const,

  // Player queries
  players: () => ['players'] as const,
  player: (id: string) => ['players', id] as const,
  playerStats: (id: string, weeks?: number[]) => 
    ['players', id, 'stats', weeks?.join(',')] as const,
  playerSearch: (query: string, position?: string) => 
    ['players', 'search', query, position] as const,

  // Team queries
  team: (id: string) => ['team', id] as const,
  teamRoster: (id: string) => ['team', id, 'roster'] as const,
  teamMatchups: (id: string, week?: number) => 
    ['team', id, 'matchups', week?.toString()] as const,

  // User queries
  user: (id: string) => ['user', id] as const,
  userTeams: (id: string) => ['user', id, 'teams'] as const,
  dashboard: (userId: string) => ['dashboard', userId] as const,

  // Real-time queries
  liveScoring: (week: number) => ['live-scoring', week.toString()] as const,
  liveMatchup: (matchupId: string) => ['live-matchup', matchupId] as const
} as const

/**
 * Catalyst: Query invalidation helpers
 * Efficient cache invalidation patterns
 */
export const catalystQueryInvalidation = {
  invalidateLeague: async (queryClient: QueryClient, leagueId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] }),
      leagueCache.invalidateByTags(['league', leagueId])
    ])
  },

  invalidatePlayer: async (queryClient: QueryClient, playerId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['players', playerId] }),
      leagueCache.invalidatePlayer(playerId)
    ])
  },

  invalidateTeam: async (queryClient: QueryClient, teamId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['team', teamId] }),
      leagueCache.invalidateByTags(['teams'])
    ])
  },

  invalidateUserData: async (queryClient: QueryClient, userId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user', userId] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
      leagueCache.invalidateByTags(['dashboard'])
    ])
  }
}

/**
 * Catalyst: Prefetch strategies
 * Intelligent data prefetching for instant navigation
 */
export const catalystPrefetch = {
  // Prefetch league data when user navigates to leagues page
  prefetchLeagueData: async (queryClient: QueryClient, leagueId: string) => {
    const prefetchPromises = [
      queryClient.prefetchQuery({
        queryKey: catalystQueryKeys.league(leagueId),
        staleTime: 2 * 60 * 1000 // 2 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: catalystQueryKeys.leagueStandings(leagueId),
        staleTime: 2 * 60 * 1000
      }),
      queryClient.prefetchQuery({
        queryKey: catalystQueryKeys.leagueTeams(leagueId),
        staleTime: 5 * 60 * 1000 // 5 minutes for teams
      })
    ]

    await Promise.allSettled(prefetchPromises)
  },

  // Prefetch player data when viewing roster
  prefetchPlayerData: async (queryClient: QueryClient, playerIds: string[]) => {
    const prefetchPromises = playerIds.slice(0, 10).map(playerId => // Limit to 10 players
      queryClient.prefetchQuery({
        queryKey: catalystQueryKeys.player(playerId),
        staleTime: 10 * 60 * 1000 // 10 minutes
      })
    )

    await Promise.allSettled(prefetchPromises)
  },

  // Prefetch dashboard data
  prefetchDashboard: async (queryClient: QueryClient, userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: catalystQueryKeys.dashboard(userId),
      staleTime: 30 * 1000 // 30 seconds
    })
  }
}

export default getCatalystQueryClient
