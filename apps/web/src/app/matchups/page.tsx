'use client'

/**
 * Matchups Page - Rebuilt
 * Weekly matchup display
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Trophy, Loader2 } from 'lucide-react'

export default function MatchupsPage() {
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
          <p className="ml-4 text-lg">Loading matchups...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Matchups"
          description="View your weekly matchup history"
          icon={Trophy}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Matchups' },
          ]}
        />

        <EmptyState
          icon={Trophy}
          title="Matchup History"
          description="View your past and upcoming matchups here"
        />
      </div>
    </DashboardLayout>
  )
}