/**
 * Draft Page - Rebuilt
 * Modern draft interface
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Clock, Trophy } from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getDraftData(userId: string) {
  try {
    const team = await prisma.team.findFirst({
      where: { userId },
      include: {
        league: {
          include: {
            draft: true,
          },
        },
      },
    })

    return { team }
  } catch (error) {
    console.error('Error fetching draft data:', error)
    return { team: null }
  }
}

export default async function DraftPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { team } = await getDraftData(session.user.id)

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Draft Room"
          description="Live draft interface for your fantasy league"
          icon={Trophy}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Draft' },
          ]}
        />

        {team?.league?.draft ? (
          <ModernCard variant="gradient" glow>
            <ModernCardHeader>
              <ModernCardTitle>Draft in Progress</ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                <p className="text-slate-300">Draft room is currently active</p>
              </div>
            </ModernCardContent>
          </ModernCard>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No active draft"
            description="Your league draft hasn't started yet. Check back when your commissioner schedules the draft."
            action={{
              label: "View League Info",
              onClick: () => window.location.href = '/leagues',
              icon: Users,
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
