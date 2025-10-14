'use client'

/**
 * Team Management Page - Elite Edition
 * Professional drag-and-drop lineup management with real-time updates
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { DragDropLineupEditor } from '@/components/lineup/drag-drop-lineup-editor'
import { EnhancedPlayerCard } from '@/components/player/enhanced-player-card'
import { PlayerComparisonTool } from '@/components/player/player-comparison-tool'
import { 
  Users, 
  Target,
  TrendingUp,
  Loader2,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

interface TeamData {
  id: string
  name: string
  roster: Array<{
    id: string
    isStarter: boolean
    player: {
      id: string
      name: string
      position: string
      team: string
      fantasyPoints: number
      projectedPoints: number
      status: string
    }
  }>
  league: {
    name: string
    currentWeek: number
  }
}

export default function TeamPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonPlayers, setComparisonPlayers] = useState<any[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user?.id) {
      loadTeamData()
    }
  }, [status, session, router])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/teams?userId=${session?.user?.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch team data')
      }
      
      const data = await response.json()
      setTeamData(data)
    } catch (err) {
      console.error('Error loading team data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLineup = async (roster: any[]) => {
    try {
      const response = await fetch('/api/teams/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: teamData?.id,
          roster: roster.map(p => ({
            playerId: p.id,
            isStarter: p.isStarter
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to save lineup')
      
      // Reload team data
      await loadTeamData()
    } catch (error) {
      throw error
    }
  }

  const handlePlayerAction = (action: string, playerId: string) => {
    switch (action) {
      case 'stats':
        router.push(`/players/${playerId}`)
        break
      case 'trade':
        router.push(`/trades?player=${playerId}`)
        break
      case 'add':
        toast.info('Add player functionality')
        break
      case 'drop':
        toast.info('Drop player functionality')
        break
      case 'news':
        toast.info('Player news coming soon')
        break
      case 'ai':
        toast.info('AI analysis coming soon')
        break
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading your team...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !teamData) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          <EmptyState
            icon={Users}
            title="No team found"
            description="Join a league to start managing your team"
            action={{
              label: "Find a League",
              onClick: () => router.push('/leagues'),
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  // Calculate roster stats
  const totalPoints = teamData.roster.reduce((sum, r) => sum + (r.player.fantasyPoints || 0), 0)
  const projectedPoints = teamData.roster.reduce((sum, r) => sum + (r.player.projectedPoints || 0), 0)
  const activeStarters = teamData.roster.filter(r => r.isStarter).length
  const benchPlayers = teamData.roster.filter(r => !r.isStarter).length

  // Transform roster data for drag-drop component
  const rosterForEditor = teamData.roster.map(r => ({
    id: r.player.id,
    name: r.player.name,
    position: r.player.position,
    team: r.player.team,
    fantasyPoints: r.player.fantasyPoints,
    projectedPoints: r.player.projectedPoints,
    status: r.player.status,
    isStarter: r.isStarter
  }))

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title={teamData.name}
          description={`${teamData.league.name} • Week ${teamData.league.currentWeek}`}
          icon={Users}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'My Team' },
          ]}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Points"
            value={totalPoints.toFixed(1)}
            icon={Target}
            trend="up"
            description="season total"
            variant="success"
          />

          <StatCard
            label="Projected"
            value={projectedPoints.toFixed(1)}
            icon={TrendingUp}
            description={`Week ${teamData.league.currentWeek}`}
            variant="info"
          />

          <StatCard
            label="Active Starters"
            value={activeStarters}
            icon={Users}
            description="players set"
            variant="success"
          />

          <StatCard
            label="Bench"
            value={benchPlayers}
            icon={Users}
            description="players"
            variant="default"
          />
        </div>

        {/* Elite Drag-Drop Lineup Editor */}
        <DragDropLineupEditor
          roster={rosterForEditor}
          onSave={handleSaveLineup}
          rosterSettings={{
            positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
            benchSize: 6
          }}
        />

        {/* Player Comparison Modal */}
        {showComparison && (
          <PlayerComparisonTool
            players={comparisonPlayers}
            onClose={() => setShowComparison(false)}
            onAddPlayer={() => toast.info('Add player to comparison')}
          />
        )}
      </div>
    </DashboardLayout>
  )
}