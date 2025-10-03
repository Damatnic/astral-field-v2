'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { leagueCache } from '@/lib/cache/catalyst-cache'
import { CatalystVirtualList } from '@/components/ui/virtual-list'
import { OptimizedImage } from '@/components/ui/optimized-image'

// Catalyst: Lazy load heavy components for faster initial render
const LeagueStandings = dynamic(() => import('./league-standings').then(mod => ({ default: mod.LeagueStandings })), {
  loading: () => <StandingsLoader />,
  ssr: false
})

const WeeklyMatchups = dynamic(() => import('./weekly-matchups').then(mod => ({ default: mod.WeeklyMatchups })), {
  loading: () => <MatchupsLoader />,
  ssr: false
})

const PlayerStats = dynamic(() => import('./player-stats-grid').then(mod => ({ default: mod.PlayerStatsGrid })), {
  loading: () => <PlayerStatsLoader />,
  ssr: false
})

interface LeagueData {
  id: string
  name: string
  description?: string
  currentWeek: number
  standings: any[]
  matchups: any[]
  rosters: Record<string, any>
  topPlayers: any[]
}

interface OptimizedLeagueDashboardProps {
  leagueId: string
  initialData?: LeagueData
  currentWeek?: number
}

export function OptimizedLeagueDashboard({ 
  leagueId, 
  initialData,
  currentWeek = 4 
}: OptimizedLeagueDashboardProps) {
  const [leagueData, setLeagueData] = useState<LeagueData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('standings')
  const [refreshing, setRefreshing] = useState(false)

  // Catalyst: Memoized data transformations
  const { standingsData, matchupsData, topPlayersData } = useMemo(() => {
    if (!leagueData) return { standingsData: [], matchupsData: [], topPlayersData: [] }

    return {
      standingsData: leagueData.standings || [],
      matchupsData: leagueData.matchups?.filter(m => m.week === currentWeek) || [],
      topPlayersData: leagueData.topPlayers?.slice(0, 10) || []
    }
  }, [leagueData, currentWeek])

  // Catalyst: Optimized data fetching with cache
  const fetchLeagueData = async (useCache = true) => {
    try {
      setError(null)
      
      // Try cache first if allowed
      if (useCache) {
        const cached = await leagueCache.getLeagueStandings(leagueId, currentWeek)
        if (cached) {
          setLeagueData(cached)
          setLoading(false)
          return
        }
      }

      // Fetch from API
      const response = await fetch(`/api/leagues/${leagueId}/data?week=${currentWeek}&projections=true`, {
        headers: {
          'Cache-Control': 'max-age=300',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch league data: ${response.status}`)
      }

      const result = await response.json()
      
      // Cache the result
      await leagueCache.setLeagueStandings(leagueId, currentWeek, result.data)
      
      setLeagueData(result.data)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('League data fetch error:', err);
      }
      setError(err instanceof Error ? err.message : 'Failed to load league data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial data load
  useEffect(() => {
    if (!initialData) {
      fetchLeagueData()
    }
  }, [leagueId, currentWeek])

  // Catalyst: Background refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        setRefreshing(true)
        fetchLeagueData(false) // Force fresh data
      }
    }, 120000) // 2 minutes

    return () => clearInterval(interval)
  }, [loading, refreshing])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLeagueData(false)
  }

  if (loading && !leagueData) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-red-400 font-semibold mb-2">Failed to Load League</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchLeagueData(false)
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{leagueData?.name}</h1>
              <p className="text-slate-400 text-sm">
                Week {currentWeek} • {standingsData.length} Teams
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {refreshing && (
                <div className="flex items-center text-blue-400 text-sm">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full mr-2" />
                  Updating...
                </div>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-4 flex space-x-1 bg-slate-800 rounded-lg p-1">
            {[
              { id: 'standings', label: 'Standings', count: standingsData.length },
              { id: 'matchups', label: 'Matchups', count: matchupsData.length },
              { id: 'players', label: 'Top Players', count: topPlayersData.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all
                  ${activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }
                `}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 text-xs bg-slate-600 px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'standings' && (
              <LeagueStandings 
                standings={standingsData}
                currentWeek={currentWeek}
              />
            )}
            
            {activeTab === 'matchups' && (
              <WeeklyMatchups 
                matchups={matchupsData}
                week={currentWeek}
              />
            )}
            
            {activeTab === 'players' && (
              <PlayerStats 
                players={topPlayersData}
                weeks={[1, 2, 3, currentWeek]}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// Catalyst: Optimized loading skeletons
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 animate-pulse">
      <div className="p-6">
        <div className="h-8 bg-slate-700 rounded-md w-64 mb-2" />
        <div className="h-4 bg-slate-800 rounded-md w-32 mb-6" />
        
        <div className="flex space-x-1 bg-slate-800 rounded-lg p-1 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-10 bg-slate-700 rounded-md" />
          ))}
        </div>
        
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

function StandingsLoader() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function MatchupsLoader() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-32 bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function PlayerStatsLoader() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-20 bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}