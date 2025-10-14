'use client'

/**
 * Team Management Page - Complete Rebuild
 * Manage your roster and set your lineup
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { StatCard } from '@/components/ui/stat-card'
import { PlayerCard } from '@/components/ui/player-card'
import { ActionButton } from '@/components/ui/action-button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { 
  Users, 
  Target,
  TrendingUp,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react'

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

  // Group players by position
  const rosterByPosition = {
    QB: teamData.roster.filter(r => r.player.position === 'QB'),
    RB: teamData.roster.filter(r => r.player.position === 'RB'),
    WR: teamData.roster.filter(r => r.player.position === 'WR'),
    TE: teamData.roster.filter(r => r.player.position === 'TE'),
    K: teamData.roster.filter(r => r.player.position === 'K'),
    DEF: teamData.roster.filter(r => r.player.position === 'DEF'),
  }

  // Calculate roster stats
  const totalPoints = teamData.roster.reduce((sum, r) => sum + (r.player.fantasyPoints || 0), 0)
  const projectedPoints = teamData.roster.reduce((sum, r) => sum + (r.player.projectedPoints || 0), 0)
  const activeStarters = teamData.roster.filter(r => r.isStarter).length
  const benchPlayers = teamData.roster.filter(r => !r.isStarter).length

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
          actions={
            <div className="flex items-center gap-2">
              <ActionButton variant="outline" size="sm" icon={Zap}>
                Auto-Optimize
              </ActionButton>
              <ActionButton variant="primary" size="sm" icon={CheckCircle2}>
                Save Lineup
              </ActionButton>
            </div>
          }
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
            label="Active"
            value={activeStarters}
            icon={CheckCircle2}
            description="starters set"
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

        {/* Lineup Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Starting Lineup */}
          <ModernCard variant="gradient" glow className="lg:col-span-2">
            <ModernCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <ModernCardTitle>Starting Lineup</ModernCardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">
                    Locks Sunday 1:00 PM ET
                  </span>
                </div>
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-4">
                {/* Position Slots */}
                {(['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const).map((position) => {
                  const positionPlayers = rosterByPosition[position]
                  const starter = positionPlayers.find(r => r.isStarter)
                  
                  return (
                    <div key={position} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                          <span className="text-xs font-bold text-slate-300">{position}</span>
                        </div>
                      </div>
                      
                      {starter ? (
                        <PlayerCard
                          player={{
                            id: starter.player.id,
                            name: starter.player.name,
                            position: starter.player.position,
                            team: starter.player.team || '',
                            points: starter.player.fantasyPoints || 0,
                            projected: starter.player.projectedPoints || 0,
                            status: (starter.player.status as any) || 'active',
                          }}
                          selected
                        />
                      ) : (
                        <div className="p-6 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 text-center">
                          <p className="text-sm text-slate-500">Empty slot - Select a player</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Bench */}
          <ModernCard variant="glass">
            <ModernCardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800">
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <ModernCardTitle>Bench</ModernCardTitle>
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-2">
                {teamData.roster
                  .filter(r => !r.isStarter)
                  .map((roster) => (
                    <div
                      key={roster.id}
                      className="p-3 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white text-sm">{roster.player.name}</h3>
                          <p className="text-xs text-slate-400">{roster.player.position} • {roster.player.team}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white tabular-nums">
                            {roster.player.fantasyPoints?.toFixed(1) || '0.0'}
                          </p>
                          <p className="text-xs text-slate-500">pts</p>
                        </div>
                      </div>
                    </div>
                  ))}

                {benchPlayers === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm">No bench players</p>
                  </div>
                )}
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Quick Tips */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-400 mb-1">Lineup Tips</h3>
              <ul className="text-sm text-blue-400/80 space-y-1">
                <li>• Click players to swap between starting lineup and bench</li>
                <li>• Use Auto-Optimize to let AI set your best lineup</li>
                <li>• Check injury reports before games lock</li>
                <li>• Make sure all starting slots are filled</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}