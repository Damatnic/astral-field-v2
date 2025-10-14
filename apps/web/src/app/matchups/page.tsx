/**
 * Matchups Page - Rebuilt
 * Weekly matchup display
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Trophy } from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getMatchupsData(userId: string) {
  try {
    const team = await prisma.team.findFirst({
      where: { userId },
    })

    if (!team) return { matchups: [] }

    const matchups = await prisma.matchup.findMany({
      where: {
        OR: [
          { team1Id: team.id },
          { team2Id: team.id },
        ],
      },
      include: {
        team1: { select: { name: true } },
        team2: { select: { name: true } },
      },
      orderBy: { week: 'desc' },
      take: 10,
    })

    return { matchups }
  } catch (error) {
    console.error('Error fetching matchups:', error)
    return { matchups: [] }
  }
}

export default async function MatchupsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { matchups } = await getMatchupsData(session.user.id)

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Matchups"
          description="View your weekly head-to-head matchups"
          icon={Users}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Matchups' },
          ]}
        />

        {matchups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchups.map((matchup) => (
              <ModernCard key={matchup.id} variant="glass" hover>
                <ModernCardHeader>
                  <ModernCardTitle className="text-base">
                    Week {matchup.week}
                  </ModernCardTitle>
                </ModernCardHeader>
                <ModernCardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white">{matchup.team1.name}</span>
                      <span className="text-2xl font-bold text-white tabular-nums">
                        {matchup.team1Score?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">{matchup.team2.name}</span>
                      <span className="text-2xl font-bold text-white tabular-nums">
                        {matchup.team2Score?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No matchups yet"
            description="Your matchup history will appear here once the season starts."
          />
        )}
      </div>
    </DashboardLayout>
  )
}
