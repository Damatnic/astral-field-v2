'use client'

/**
 * Analytics Page - Rebuilt
 * Advanced analytics and insights
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart3, Loader2 } from 'lucide-react'

export default function AnalyticsPage() {
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
          <p className="ml-4 text-lg">Loading analytics...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Analytics"
          description="Advanced team and league analytics"
          icon={BarChart3}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Analytics' },
          ]}
        />

        <EmptyState
          icon={BarChart3}
          title="Advanced Analytics"
          description="Deep statistical analysis and performance insights will appear here"
        />
      </div>
    </DashboardLayout>
  )
}