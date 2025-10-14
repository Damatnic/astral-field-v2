/**
 * Mock Draft Page - Rebuilt
 * Practice draft interface
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Trophy, PlayCircle } from 'lucide-react'

export default async function MockDraftPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Mock Draft"
          description="Practice your draft strategy"
          icon={Trophy}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mock Draft' },
          ]}
        />

        <EmptyState
          icon={PlayCircle}
          title="Mock Draft Coming Soon"
          description="Practice drafts will be available soon. Master your draft strategy before the real thing!"
          action={{
            label: "View Players",
            onClick: () => window.location.href = '/players',
          }}
        />
      </div>
    </DashboardLayout>
  )
}
