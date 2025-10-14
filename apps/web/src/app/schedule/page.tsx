'use client'

/**
 * Schedule Page - Rebuilt
 * Season schedule view
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Calendar, Loader2 } from 'lucide-react'

export default function SchedulePage() {
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
          <p className="ml-4 text-lg">Loading schedule...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Schedule"
          description="View your season schedule"
          icon={Calendar}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Schedule' },
          ]}
        />

        <EmptyState
          icon={Calendar}
          title="Season Schedule"
          description="Your league's weekly matchup schedule will appear here"
        />
      </div>
    </DashboardLayout>
  )
}