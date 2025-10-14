'use client'

/**
 * Players Page - Elite Research Center
 * Advanced player analysis with AI-powered insights
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { ResearchCenter } from '@/components/research/research-center'
import { Users, Loader2, BarChart3 } from 'lucide-react'

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
          title="Player Research Center"
          description="Advanced analytics and AI-powered insights for every NFL player"
          icon={BarChart3}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Players' },
          ]}
        />

        {/* Research Center */}
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
          <ResearchCenter
            players={playersData.players.map(p => ({
              ...p,
              // Add mock advanced stats for now
              targetShare: p.position === 'WR' || p.position === 'TE' ? Math.random() * 30 : undefined,
              snapCount: Math.random() * 100,
              redZoneTargets: Math.floor(Math.random() * 10)
            }))}
            onPlayerClick={(playerId) => router.push(`/players/${playerId}`)}
          />
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