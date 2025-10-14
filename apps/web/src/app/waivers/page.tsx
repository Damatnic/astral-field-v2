'use client'

/**
 * Waivers Page - Complete Rebuild
 * Modern waiver wire with AI-powered recommendations
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { PlayerCard } from '@/components/ui/player-card'
import { ActionButton } from '@/components/ui/action-button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { 
  UserPlus, 
  TrendingUp, 
  Sparkles,
  Search,
  Filter,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface WaiverPlayer {
  id: string
  name: string
  position: string
  team: string
  fantasyPoints: number
  projectedPoints: number
  status: string
}

interface WaiversData {
  availablePlayers: WaiverPlayer[]
  recommendations: WaiverPlayer[]
  waiverOrder: number
}

export default function WaiversPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [waiversData, setWaiversData] = useState<WaiversData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user?.id) {
      loadWaiversData()
    }
  }, [status, session, router])

  const loadWaiversData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/waivers?userId=${session?.user?.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch waivers data')
      }
      
      const data = await response.json()
      setWaiversData(data)
    } catch (err) {
      console.error('Error loading waivers data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load waivers data')
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = waiversData?.availablePlayers.filter(player => {
    const matchesSearch = !searchTerm || player.name.toLowerCase().includes(searchTerm.toLowerCase()) || player.team.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPosition = !positionFilter || player.position === positionFilter
    return matchesSearch && matchesPosition
  }) || []

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading waiver wire...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !waiversData) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
          <PageHeader
            title="Waiver Wire"
            description="Find available players to add to your team"
            icon={UserPlus}
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Waiver Wire' },
            ]}
          />

          <EmptyState
            icon={AlertCircle}
            title="Error Loading Waivers"
            description={error || 'Unable to load waiver wire data'}
            action={{
              label: "Try Again",
              onClick: loadWaiversData,
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title="Waiver Wire"
          description="Find available players to add to your team"
          icon={UserPlus}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Waiver Wire' },
          ]}
        />

        {/* Waiver Info */}
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-400" />
              Waiver Information
            </ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{waiversData.waiverOrder}</div>
                <div className="text-sm text-slate-400">Your Waiver Priority</div>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-green-400">Wednesday</div>
                <div className="text-sm text-slate-400">Waiver Deadline</div>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">{waiversData.availablePlayers.length}</div>
                <div className="text-sm text-slate-400">Available Players</div>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search players..."
              className="w-full h-10 pl-10 pr-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
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
        </div>

        {/* AI Recommendations */}
        {waiversData.recommendations.length > 0 && (
          <ModernCard variant="gradient" glow>
            <ModernCardHeader>
              <ModernCardTitle className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
                AI Recommendations
              </ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {waiversData.recommendations.slice(0, 6).map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={{
                      id: player.id,
                      name: player.name,
                      position: player.position,
                      team: player.team,
                      points: player.fantasyPoints || 0,
                      projected: player.projectedPoints || 0,
                      status: (player.status as any) || 'active',
                    }}
                    variant="gradient"
                    showProjections
                  />
                ))}
              </div>
            </ModernCardContent>
          </ModernCard>
        )}

        {/* Available Players */}
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                Available Players
              </div>
              <span className="text-sm text-slate-400">
                {filteredPlayers.length} players
              </span>
            </ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            {filteredPlayers.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No players found"
                description="Try adjusting your search or filters"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={{
                      id: player.id,
                      name: player.name,
                      position: player.position,
                      team: player.team,
                      points: player.fantasyPoints || 0,
                      projected: player.projectedPoints || 0,
                      status: (player.status as any) || 'active',
                    }}
                    variant="default"
                    showProjections
                    onClick={() => {
                      // Handle add player action
                      console.log('Add player:', player.id)
                    }}
                  />
                ))}
              </div>
            )}
          </ModernCardContent>
        </ModernCard>
      </div>
    </DashboardLayout>
  )
}