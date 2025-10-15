'use client'

/**
 * Analytics Page - Elite Analytics Hub
 * Advanced performance visualization and insights
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { PlayerPerformanceCharts } from '@/components/analytics/player-performance-charts'
import { BarChart3, Loader2, TrendingUp } from 'lucide-react'

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

  // Mock weekly stats data
  const mockWeeklyStats = Array.from({ length: 10 }, (_, i) => ({
    week: i + 1,
    points: Math.random() * 15 + 10,
    projected: Math.random() * 15 + 10,
    opponent: ['KC', 'SF', 'DAL', 'PHI', 'BUF', 'MIA', 'NYJ', 'NE', 'BAL', 'CIN'][i]
  }))

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Analytics Hub"
          description="Advanced performance visualization and insights"
          icon={BarChart3}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Analytics' },
          ]}
        />

        {/* Team Performance Overview */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Team Performance Trends</h2>
          </div>

          <PlayerPerformanceCharts
            playerName="Team Total"
            weeklyStats={mockWeeklyStats}
            consistency={75}
            ceiling={32.4}
            floor={12.8}
            averagePoints={21.3}
          />
        </div>

        {/* More analytics sections can be added here */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">Avg Points Per Week</div>
            <div className="text-3xl font-bold text-white tabular-nums">21.3</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +5.2% vs league avg
            </div>
          </div>

          <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">Consistency Score</div>
            <div className="text-3xl font-bold text-blue-400 tabular-nums">75%</div>
            <div className="text-xs text-slate-500 mt-1">Above average</div>
          </div>

          <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">Playoff Odds</div>
            <div className="text-3xl font-bold text-purple-400 tabular-nums">82%</div>
            <div className="text-xs text-purple-400 mt-1">Strong position</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}