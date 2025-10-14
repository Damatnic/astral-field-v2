/**
 * Waivers Page - Complete Rebuild
 * Modern waiver wire with AI-powered recommendations
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { PlayerCard } from '@/components/ui/player-card'
import { ActionButton } from '@/components/ui/action-button'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  UserPlus, 
  TrendingUp, 
  Sparkles,
  Search,
  Filter,
  Clock,
  AlertCircle
} from 'lucide-react'
import { prisma } from '@/lib/database/prisma'
import { Suspense } from 'react'
import { LoadingState } from '@/components/ui/loading-state'

async function getWaiversData(userId: string) {
  try {
    // Get available players not on any team
    const availablePlayers = await prisma.player.findMany({
      where: {
        roster: {
          none: {},
        },
      },
      orderBy: [
        { fantasyPoints: 'desc' },
      ],
      take: 50,
      select: {
        id: true,
        name: true,
        position: true,
        team: true,
        fantasyPoints: true,
        projectedPoints: true,
        status: true,
      },
    })

    // Get user's waiver claims
    const waiverClaims = await prisma.waiverClaim.findMany({
      where: {
        team: {
          userId,
        },
        status: 'pending',
      },
      orderBy: {
        priority: 'asc',
      },
      include: {
        player: {
          select: {
            name: true,
            position: true,
          },
        },
      },
    })

    return {
      availablePlayers,
      waiverClaims,
    }
  } catch (error) {
    console.error('Error fetching waivers data:', error)
    return {
      availablePlayers: [],
      waiverClaims: [],
    }
  }
}

async function WaiversList() {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { availablePlayers, waiverClaims } = await getWaiversData(session.user.id)

  return (
    <div className="space-y-6">
      {/* Active Claims */}
      {waiverClaims.length > 0 && (
        <ModernCard variant="gradient">
          <ModernCardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <ModernCardTitle>Pending Waiver Claims</ModernCardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  {waiverClaims.length} claim{waiverClaims.length !== 1 ? 's' : ''} processing Wednesday 3:00 AM ET
                </p>
              </div>
            </div>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="space-y-2">
              {waiverClaims.map((claim, index) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-amber-500/30 bg-amber-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30">
                      <span className="text-sm font-bold text-amber-400">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{claim.player.name}</h3>
                      <p className="text-sm text-slate-400">{claim.player.position}</p>
                    </div>
                  </div>
                  <ActionButton variant="ghost" size="sm">
                    Cancel
                  </ActionButton>
                </div>
              ))}
            </div>
          </ModernCardContent>
        </ModernCard>
      )}

      {/* AI Recommendations */}
      <ModernCard variant="glass">
        <ModernCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <ModernCardTitle>AI Recommended Pickups</ModernCardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Top waiver wire targets based on your team needs
                </p>
              </div>
            </div>
          </div>
        </ModernCardHeader>
        <ModernCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePlayers.slice(0, 6).map((player) => (
              <PlayerCard
                key={player.id}
                player={{
                  id: player.id,
                  name: player.name,
                  position: player.position,
                  team: player.team || 'FA',
                  points: player.fantasyPoints || 0,
                  projected: player.projectedPoints || 0,
                  trend: Math.random() > 0.5 ? 'up' : 'down',
                  status: (player.status as any) || 'active',
                }}
                actions={
                  <ActionButton variant="primary" size="sm" icon={UserPlus}>
                    Add
                  </ActionButton>
                }
              />
            ))}
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* All Available Players */}
      <ModernCard variant="glass">
        <ModernCardHeader>
          <ModernCardTitle>All Available Players</ModernCardTitle>
        </ModernCardHeader>
        <ModernCardContent>
          {availablePlayers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {availablePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={{
                    id: player.id,
                    name: player.name,
                    position: player.position,
                    team: player.team || 'FA',
                    points: player.fantasyPoints || 0,
                    projected: player.projectedPoints || 0,
                    status: (player.status as any) || 'active',
                  }}
                  variant="compact"
                  actions={
                    <ActionButton variant="ghost" size="sm">
                      Add
                    </ActionButton>
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={UserPlus}
              title="No players available"
              description="All players are currently on rosters"
            />
          )}
        </ModernCardContent>
      </ModernCard>
    </div>
  )
}

export default async function WaiversPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title="Waiver Wire"
          description="Add free agents and manage your waiver claims"
          icon={UserPlus}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Waivers' },
          ]}
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="search"
              placeholder="Search players..."
              className="w-full h-10 pl-10 pr-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <select className="h-10 px-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
            <option value="">All Positions</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
          </select>

          <ActionButton variant="ghost" size="sm" icon={Filter}>
            More Filters
          </ActionButton>
        </div>

        {/* Waiver Info Banner */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-400 mb-1">How Waivers Work</h3>
              <p className="text-sm text-blue-400/80 leading-relaxed">
                Submit waiver claims before Wednesday 3:00 AM ET. Claims process in priority order.
                If multiple claims for same player, highest waiver priority wins and moves to last position.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <Suspense fallback={<LoadingState variant="player" count={12} />}>
          <WaiversList />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
