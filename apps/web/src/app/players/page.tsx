'use client'

/**
 * Players Page - Complete Rebuild
 * Fast, searchable player database with advanced filtering
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { PlayerCard } from '@/components/ui/player-card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { Users, Search, Filter, Loader2 } from 'lucide-react'

interface Player {
  id: string
  name: string
  position: string
  team: string
  jerseyNumber: number
  fantasyPoints: number
  projectedPoints: number
  status: string
}

interface PlayersData {
  players: Player[]
  total: number
  pages: number
}

function PlayersPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [playersData, setPlayersData] = useState<PlayersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [team, setTeam] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadPlayers()
    }
  }, [status, search, position, team, page, router])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(position && { position }),
        ...(team && { team }),
        page: page.toString(),
      })
      
      const response = await fetch(`/api/players?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch players')
      }
      
      const data = await response.json()
      setPlayersData(data)
    } catch (err) {
      console.error('Error loading players:', err)
      setError(err instanceof Error ? err.message : 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadPlayers()
  }

  const handleFilterChange = (filter: string, value: string) => {
    setPage(1)
    switch (filter) {
      case 'position':
        setPosition(value)
        break
      case 'team':
        setTeam(value)
        break
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  if (loading && !playersData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading players...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title="Player Research"
          description="Analyze stats, projections, and trends for every NFL player"
          icon={Users}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Players' },
          ]}
        />

        {/* Filters */}
        <div className="sticky top-16 z-10 bg-slate-950/95 backdrop-blur-sm -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 border-b border-slate-800">
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players..."
                className="w-full h-10 pl-10 pr-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Position Filter */}
            <select
              value={position}
              onChange={(e) => handleFilterChange('position', e.target.value)}
              className="h-10 px-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">All Positions</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="K">K</option>
              <option value="DEF">DEF</option>
            </select>

            {/* Team Filter */}
            <select
              value={team}
              onChange={(e) => handleFilterChange('team', e.target.value)}
              className="h-10 px-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">All Teams</option>
              <option value="KC">Kansas City</option>
              <option value="SF">San Francisco</option>
              <option value="BUF">Buffalo</option>
              <option value="DAL">Dallas</option>
              <option value="PHI">Philadelphia</option>
              {/* Add more teams as needed */}
            </select>

            <button
              type="button"
              className="h-10 px-4 flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 transition-all"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">More Filters</span>
            </button>
          </form>
        </div>

        {/* Players List */}
        {loading ? (
          <LoadingState variant="player" count={12} />
        ) : error ? (
          <EmptyState
            icon={Users}
            title="Error Loading Players"
            description={error}
            action={{
              label: "Try Again",
              onClick: loadPlayers,
            }}
          />
        ) : !playersData?.players.length ? (
          <EmptyState
            icon={Users}
            title="No players found"
            description="Try adjusting your search or filters to find what you're looking for."
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearch('')
                setPosition('')
                setTeam('')
                setPage(1)
              },
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Results count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Showing {playersData.players.length} of {playersData.total} players
              </span>
              {playersData.pages > 1 && (
                <span className="text-slate-500">
                  Page {page} of {playersData.pages}
                </span>
              )}
            </div>

            {/* Player Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {playersData.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={{
                    id: player.id,
                    name: player.name,
                    position: player.position,
                    team: player.team || 'FA',
                    points: player.fantasyPoints || 0,
                    projected: player.projectedPoints || 0,
                    trend: player.fantasyPoints && player.projectedPoints && player.fantasyPoints > player.projectedPoints ? 'up' : 'down',
                    status: (player.status as any) || 'active',
                  }}
                  variant="default"
                  onClick={() => {
                    // Navigate to player detail
                    router.push(`/players/${player.id}`)
                  }}
                />
              ))}
            </div>

            {/* Pagination */}
            {playersData.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                {Array.from({ length: Math.min(playersData.pages, 5) }).map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`h-10 w-10 flex items-center justify-center rounded-lg border font-medium transition-all ${
                        page === pageNum
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <PlayersPageContent />
    </Suspense>
  )
}