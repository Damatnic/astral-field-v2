/**
 * Team Overview Page - Rebuilt
 * Comprehensive team statistics and insights
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Users, Trophy, Target, TrendingUp } from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getTeamOverview(userId: string) {
  try {
    const team = await prisma.team.findFirst({
      where: { userId },
      include: {
        league: { select: { name: true, currentWeek: true } },
        roster: {
          include: {
            player: { select: { name: true, position: true, fantasyPoints: true } },
          },
        },
      },
    })

    return { team }
  } catch (error) {
    console.error('Error fetching team overview:', error)
    return { team: null }
  }
}

export default async function TeamOverviewPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { team } = await getTeamOverview(session.user.id)

  if (!team) {
    redirect('/leagues')
  }

  const totalPoints = team.roster.reduce((sum, r) => sum + (r.player.fantasyPoints || 0), 0)
  const avgPoints = team.roster.length > 0 ? totalPoints / team.roster.length : 0

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title={team.name}
          description={`${team.league.name} • Week ${team.league.currentWeek}`}
          icon={Users}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Team Overview' },
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Points"
            value={totalPoints.toFixed(1)}
            icon={Target}
            trend="up"
            variant="success"
          />
          <StatCard
            label="Rank"
            value={`#${team.rank || '—'}`}
            icon={Trophy}
            variant="info"
          />
          <StatCard
            label="Record"
            value={`${team.wins || 0}-${team.losses || 0}`}
            icon={TrendingUp}
            variant="default"
          />
          <StatCard
            label="Roster"
            value={team.roster.length}
            icon={Users}
            variant="default"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
