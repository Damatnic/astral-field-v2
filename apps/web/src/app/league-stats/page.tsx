/**
 * League Stats Page - Rebuilt
 * League-wide statistics and standings
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart3, Trophy, Users, Target } from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getLeagueStats(userId: string) {
  try {
    const team = await prisma.team.findFirst({
      where: { userId },
      include: {
        league: {
          include: {
            teams: {
              orderBy: { points: 'desc' },
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    return { league: team?.league }
  } catch (error) {
    console.error('Error fetching league stats:', error)
    return { league: null }
  }
}

export default async function LeagueStatsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { league } = await getLeagueStats(session.user.id)

  if (!league) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          <EmptyState
            icon={Users}
            title="No league found"
            description="Join a league to view league statistics"
            action={{
              label: "Find a League",
              onClick: () => window.location.href = '/leagues',
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  const totalTeams = league.teams.length
  const avgPoints = league.teams.reduce((sum, t) => sum + (t.points || 0), 0) / totalTeams
  const highScore = Math.max(...league.teams.map(t => t.points || 0))

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="League Statistics"
          description={league.name}
          icon={BarChart3}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'League Stats' },
          ]}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Teams"
            value={totalTeams}
            icon={Users}
            variant="info"
          />
          <StatCard
            label="Average Points"
            value={avgPoints.toFixed(1)}
            icon={Target}
            variant="default"
          />
          <StatCard
            label="High Score"
            value={highScore.toFixed(1)}
            icon={Trophy}
            variant="success"
          />
          <StatCard
            label="Current Week"
            value={league.currentWeek || 1}
            icon={BarChart3}
            variant="info"
          />
        </div>

        {/* Standings */}
        <ModernCard variant="gradient">
          <ModernCardHeader>
            <ModernCardTitle>Standings</ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="space-y-2">
              {league.teams.map((team, index) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                      index === 1 ? 'bg-slate-400/20 border border-slate-400/30' :
                      index === 2 ? 'bg-amber-700/20 border border-amber-700/30' :
                      'bg-slate-800'
                    }`}>
                      <span className={`text-sm font-bold ${
                        index < 3 ? 'text-white' : 'text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{team.name}</h3>
                      <p className="text-sm text-slate-400">{team.user.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white tabular-nums">
                      {team.points?.toFixed(1) || '0.0'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {team.wins || 0}-{team.losses || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>
    </DashboardLayout>
  )
}
