/**
 * Team Management Page - Complete Rebuild
 * Manage your roster and set your lineup
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { StatCard } from '@/components/ui/stat-card'
import { PlayerCard } from '@/components/ui/player-card'
import { ActionButton } from '@/components/ui/action-button'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  Users, 
  Target,
  TrendingUp,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getTeamData(userId: string) {
  try {
    const team = await prisma.team.findFirst({
      where: { userId },
      include: {
        roster: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                team: true,
                fantasyPoints: true,
                projectedPoints: true,
                status: true,
              },
            },
          },
        },
        league: {
          select: {
            name: true,
            currentWeek: true,
          },
        },
      },
    })

    return { team }
  } catch (error) {
    console.error('Error fetching team data:', error)
    return { team: null }
  }
}

export default async function TeamPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { team } = await getTeamData(session.user.id)

  if (!team) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          <EmptyState
            icon={Users}
            title="No team found"
            description="Join a league to start managing your team"
            action={{
              label: "Find a League",
              onClick: () => window.location.href = '/leagues',
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  // Group players by position
  const rosterByPosition = {
    QB: team.roster.filter(r => r.player.position === 'QB'),
    RB: team.roster.filter(r => r.player.position === 'RB'),
    WR: team.roster.filter(r => r.player.position === 'WR'),
    TE: team.roster.filter(r => r.player.position === 'TE'),
    K: team.roster.filter(r => r.player.position === 'K'),
    DEF: team.roster.filter(r => r.player.position === 'DEF'),
  }

  // Calculate roster stats
  const totalPoints = team.roster.reduce((sum, r) => sum + (r.player.fantasyPoints || 0), 0)
  const projectedPoints = team.roster.reduce((sum, r) => sum + (r.player.projectedPoints || 0), 0)
  const activeStarters = team.roster.filter(r => r.isStarter).length
  const benchPlayers = team.roster.filter(r => !r.isStarter).length

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title={team.name}
          description={`${team.league.name} • Week ${team.league.currentWeek}`}
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
            description={`Week ${team.league.currentWeek}`}
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
                {team.roster
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
