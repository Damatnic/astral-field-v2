/**
 * Elite Dashboard - AI-Powered Command Center
 * Your complete fantasy football headquarters
 */

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EnhancedDashboardWidgets } from '@/components/dashboard/enhanced-dashboard-widgets'
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget'
import { LeagueActivityFeed } from '@/components/league/activity-feed'
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  Target,
  Loader2,
  Sparkles,
  Activity
} from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      // Load dashboard data
      loadDashboardData()
    }
  }, [status, router])

  const loadDashboardData = async () => {
    try {
      // For now, use mock data until API is ready
      setDashboardData({
        team: {
          name: session?.user?.teamName || 'Your Team',
          wins: 2,
          losses: 1,
          ties: 0,
          pointsFor: 350.5,
          rank: 3,
          roster: [
            { player: { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF' } },
            { player: { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF' } },
            { player: { name: 'CeeDee Lamb', position: 'WR', nflTeam: 'DAL' } },
          ]
        },
        recentMatchups: [
          { week: 3, homeTeam: { name: 'Your Team' }, awayTeam: { name: 'Opponent' }, homeScore: 145.2, awayScore: 132.1 },
          { week: 2, homeTeam: { name: 'Your Team' }, awayTeam: { name: 'Opponent' }, homeScore: 128.3, awayScore: 135.7 },
          { week: 1, homeTeam: { name: 'Your Team' }, awayTeam: { name: 'Opponent' }, homeScore: 156.8, awayScore: 142.3 },
        ]
      })
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
            <p className="text-slate-400">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session?.user || !dashboardData) {
    return null
  }

  const { team, recentMatchups } = dashboardData
  const wins = team?.wins || 0
  const losses = team?.losses || 0
  const winPercentage = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0
  const rank = team?.rank || 0
  const totalPoints = team?.pointsFor || 0

  // Mock data for top performers
  const topPerformers = team?.roster?.slice(0, 3).map((r: any) => ({
    playerId: r.player.id || '1',
    name: r.player.name,
    position: r.player.position,
    team: r.player.nflTeam || 'FA',
    points: Math.random() * 20 + 10,
    trend: Math.random() > 0.7 ? 'hot' : Math.random() > 0.5 ? 'up' : 'down'
  })) || []

  // Mock activity data
  const mockActivity = [
    {
      id: '1',
      type: 'trade',
      user: 'John Doe',
      action: 'proposed a trade',
      details: 'Offered DeAndre Hopkins for Travis Kelce',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      reactions: []
    },
    {
      id: '2',
      type: 'add',
      user: 'Jane Smith',
      action: 'added',
      details: 'Josh Jacobs from waivers',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      reactions: [{ type: 'like', count: 3, users: ['user1', 'user2', 'user3'] }]
    },
    {
      id: '3',
      type: 'lineup',
      user: 'Mike Johnson',
      action: 'updated lineup',
      details: 'Set starting roster for Week 4',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      reactions: []
    }
  ]

  const quickStats = [
    {
      label: 'Total Points',
      value: totalPoints.toFixed(1),
      change: 12.5,
      trend: 'up' as const,
      icon: Target,
      color: 'bg-emerald-500/10'
    },
    {
      label: 'League Rank',
      value: `#${rank || '—'}`,
      change: rank <= 3 ? 5 : -5,
      trend: rank <= 3 ? 'up' as const : 'down' as const,
      icon: Trophy,
      color: 'bg-yellow-500/10'
    },
    {
      label: 'Win Rate',
      value: `${winPercentage.toFixed(0)}%`,
      change: winPercentage >= 50 ? 10 : -10,
      trend: winPercentage >= 50 ? 'up' as const : 'down' as const,
      icon: TrendingUp,
      color: 'bg-blue-500/10'
    },
    {
      label: 'Roster',
      value: team?.roster?.length || 0,
      icon: Users,
      color: 'bg-purple-500/10'
    }
  ]

  const upcomingMatchup = {
    opponent: 'Rival Squad',
    week: 4,
    projectedMyScore: 118.5,
    projectedOppScore: 112.3,
    winProbability: 62
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title={`Welcome back, ${session.user.name?.split(' ')[0] || 'Champion'}!`}
          description="Your elite fantasy football command center"
          icon={Trophy}
        />

        {/* Enhanced Widgets */}
        <EnhancedDashboardWidgets
          stats={quickStats}
          upcomingMatchup={upcomingMatchup}
          topPerformers={topPerformers}
        />

        {/* Quick Actions */}
        <QuickActionsWidget />

        {/* League Activity */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">League Activity</h2>
          </div>
          
          <LeagueActivityFeed
            activities={mockActivity as any}
            currentUserId={session.user.id}
            onReact={(activityId, reaction) => {
              console.log('React:', activityId, reaction)
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
