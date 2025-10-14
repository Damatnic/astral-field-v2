/**
 * Schedule Page - Rebuilt
 * League schedule and upcoming matchups
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Calendar } from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getScheduleData(userId: string) {
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
      orderBy: { week: 'asc' },
    })

    return { matchups }
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return { matchups: [] }
  }
}

export default async function SchedulePage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { matchups } = await getScheduleData(session.user.id)

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Schedule"
          description="Your season schedule and matchups"
          icon={Calendar}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Schedule' },
          ]}
        />

        {matchups.length > 0 ? (
          <div className="space-y-3">
            {matchups.map((matchup) => (
              <ModernCard key={matchup.id} variant="glass" hover>
                <ModernCardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 rounded bg-slate-800 border border-slate-700">
                        <span className="text-sm font-bold text-slate-300">Week {matchup.week}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {matchup.team1.name} vs {matchup.team2.name}
                        </p>
                      </div>
                    </div>
                    {matchup.team1Score !== null && matchup.team2Score !== null && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {matchup.team1Score.toFixed(1)} - {matchup.team2Score.toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No schedule yet"
            description="Your season schedule will appear here once matchups are generated."
          />
        )}
      </div>
    </DashboardLayout>
  )
}
