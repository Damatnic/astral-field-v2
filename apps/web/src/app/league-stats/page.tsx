'use client'

/**
 * League Stats Page - Elite Standings & Analytics
 * Power rankings with AI-powered analysis
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { PowerRankings } from '@/components/league/power-rankings'
import { Trophy, Loader2, TrendingUp } from 'lucide-react'

export default function LeagueStatsPage() {
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
          <p className="ml-4 text-lg">Loading league stats...</p>
        </div>
      </DashboardLayout>
    )
  }

  // Mock power rankings data
  const mockRankings = [
    {
      rank: 1,
      previousRank: 2,
      teamName: "Dynasty Warriors",
      ownerName: "John Doe",
      record: { wins: 3, losses: 0, ties: 0 },
      pointsFor: 456.8,
      pointsAgainst: 342.1,
      powerScore: 94.5,
      trend: 'up' as const,
      strengthOfSchedule: 0.68
    },
    {
      rank: 2,
      previousRank: 1,
      teamName: "Championship Squad",
      ownerName: "Jane Smith",
      record: { wins: 2, losses: 1, ties: 0 },
      pointsFor: 442.3,
      pointsAgainst: 398.5,
      powerScore: 91.2,
      trend: 'down' as const,
      strengthOfSchedule: 0.72
    },
    {
      rank: 3,
      previousRank: 4,
      teamName: "Rising Stars",
      ownerName: "Mike Johnson",
      record: { wins: 2, losses: 1, ties: 0 },
      pointsFor: 428.9,
      pointsAgainst: 385.2,
      powerScore: 88.7,
      trend: 'up' as const,
      strengthOfSchedule: 0.65
    }
  ]

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="League Standings"
          description="Power rankings with advanced analytics"
          icon={Trophy}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'League Stats' },
          ]}
        />

        {/* League Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">Total Teams</div>
            <div className="text-3xl font-bold text-white">12</div>
          </div>
          <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">Avg Points/Week</div>
            <div className="text-3xl font-bold text-blue-400 tabular-nums">115.3</div>
          </div>
          <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">Highest Score</div>
            <div className="text-3xl font-bold text-emerald-400 tabular-nums">178.5</div>
          </div>
          <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-2">Most Trades</div>
            <div className="text-3xl font-bold text-purple-400">7</div>
          </div>
        </div>

        {/* Power Rankings */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Power Rankings</h2>
            <span className="text-sm text-slate-400">AI-powered team analysis</span>
          </div>

          <PowerRankings rankings={mockRankings} />
        </div>
      </div>
    </DashboardLayout>
  )
}