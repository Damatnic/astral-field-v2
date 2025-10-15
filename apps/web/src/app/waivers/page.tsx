'use client'

/**
 * Waivers Page - Elite Waiver Wire
 * AI-powered waiver recommendations with breakout detection
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { SmartWaiverWire } from '@/components/waivers/smart-waiver-wire'
import { enhancePlayerWithAnalytics } from '@/lib/utils/player-analytics'
import { 
  UserPlus, 
  Sparkles,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

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

  // Calculate team needs based on roster
  const calculateTeamNeeds = (roster: any[]): string[] => {
    const positionCounts: Record<string, number> = {}
    roster.forEach(r => {
      positionCounts[r.position] = (positionCounts[r.position] || 0) + 1
    })

    const needs: string[] = []
    const minCounts = { QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DST: 1 }

    Object.entries(minCounts).forEach(([position, min]) => {
      if ((positionCounts[position] || 0) < min) {
        needs.push(position)
      }
    })

    return needs
  }

  const handleClaimPlayer = async (playerId: string, dropPlayerId?: string) => {
    try {
      const response = await fetch('/api/waivers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, dropPlayerId, userId: session?.user?.id })
      })

      if (!response.ok) throw new Error('Failed to claim player')
      
      toast.success('Waiver claim submitted!')
      await loadWaiversData()
    } catch (error) {
      toast.error('Failed to submit waiver claim')
    }
  }

  const handlePlayerAction = (action: string, playerId: string) => {
    switch (action) {
      case 'stats':
        router.push(`/players/${playerId}`)
        break
      case 'add':
        handleClaimPlayer(playerId)
        break
      default:
        toast.info(`${action} action coming soon`)
    }
  }

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
          description="AI-powered recommendations and breakout candidate detection"
          icon={Sparkles}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Waiver Wire' },
          ]}
        />

        {/* Smart Waiver Wire */}
        <SmartWaiverWire
          players={waiversData.availablePlayers.map(p => enhancePlayerWithAnalytics(p))}
          myTeamNeeds={waiversData.myRoster ? calculateTeamNeeds(waiversData.myRoster) : []}
          onClaim={handleClaimPlayer}
          waiverBudget={waiversData.waiverBudget || 100}
          onPlayerAction={handlePlayerAction}
        />
      </div>
    </DashboardLayout>
  )
}