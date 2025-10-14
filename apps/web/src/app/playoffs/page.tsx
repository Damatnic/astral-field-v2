/**
 * Playoffs Page - Rebuilt
 * League playoff bracket and standings
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Trophy } from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getPlayoffsData(userId: string) {
  try {
    const team = await prisma.team.findFirst({
      where: { userId },
      include: {
        league: {
          select: {
            playoffs: true,
            currentWeek: true,
          },
        },
      },
    })

    return { team }
  } catch (error) {
    console.error('Error fetching playoffs data:', error)
    return { team: null }
  }
}

export default async function PlayoffsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { team } = await getPlayoffsData(session.user.id)

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Playoffs"
          description="League championship bracket and results"
          icon={Trophy}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Playoffs' },
          ]}
        />

        {team?.league?.playoffs ? (
          <ModernCard variant="gradient" glow>
            <ModernCardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white mb-2">Playoffs Active!</h2>
              <p className="text-slate-400">The championship bracket is underway.</p>
            </ModernCardContent>
          </ModernCard>
        ) : (
          <EmptyState
            icon={Trophy}
            title="Playoffs haven't started"
            description="The playoff bracket will appear here once the regular season concludes."
            action={{
              label: "View Standings",
              onClick: () => window.location.href = '/league-stats',
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
