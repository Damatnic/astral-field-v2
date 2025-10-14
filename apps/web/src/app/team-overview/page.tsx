'use client'

/**
 * Team Overview Page - Rebuilt
 * Detailed team statistics and analysis
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart3, Loader2 } from 'lucide-react'

export default function TeamOverviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      setLoading(false)
    }
  }, [status, router])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading team overview...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Team Overview"
          description="Detailed statistics and analysis for your team"
          icon={BarChart3}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Team Overview' },
          ]}
        />

        <EmptyState
          icon={BarChart3}
          title="Team Statistics"
          description="Detailed team analytics and performance metrics will appear here"
        />
      </div>
    </DashboardLayout>
  )
}