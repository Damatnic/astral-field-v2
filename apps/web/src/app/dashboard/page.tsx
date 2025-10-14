/**
 * Modern Dashboard - Client Component Version
 * Clean, fast, beautiful fantasy football command center
 */

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { ActionButton } from '@/components/ui/action-button'
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  Target,
  Sparkles,
  ChartBar,
  UserPlus,
  Calendar,
  Clock,
  ArrowRight,
  Loader2
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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title={`Welcome back, ${session.user.name?.split(' ')[0] || 'Champion'}!`}
          description="Your fantasy football command center"
          icon={Trophy}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Points"
            value={totalPoints.toFixed(1)}
            icon={Target}
            trend="up"
            trendValue="+12.5%"
            description="vs last week"
            variant="success"
          />

          <StatCard
            label="League Rank"
            value={`#${rank || '—'}`}
            icon={Trophy}
            trend={rank <= 3 ? 'up' : 'neutral'}
            description={`Top ${Math.round((rank / 12) * 100)}%`}
            variant="info"
          />

          <StatCard
            label="Win Rate"
            value={`${winPercentage.toFixed(0)}%`}
            icon={TrendingUp}
            trend={winPercentage >= 50 ? 'up' : 'down'}
            trendValue={`${wins}-${losses}`}
            description="this season"
            variant={winPercentage >= 50 ? 'success' : 'warning'}
          />

          <StatCard
            label="Roster"
            value={team?.roster?.length || 0}
            icon={Users}
            description="active players"
            variant="default"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Team Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Quick Actions</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ActionButton
                    icon={Users}
                    label="Players"
                    href="/players"
                    variant="primary"
                  />
                  <ActionButton
                    icon={ChartBar}
                    label="Live Scores"
                    href="/live-scores"
                    variant="success"
                  />
                  <ActionButton
                    icon={Sparkles}
                    label="Trades"
                    href="/trades"
                    variant="info"
                  />
                  <ActionButton
                    icon={UserPlus}
                    label="Waivers"
                    href="/waivers"
                    variant="warning"
                  />
                </div>
              </ModernCardContent>
            </ModernCard>

            {/* Recent Matchups */}
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Recent Matchups</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                {recentMatchups && recentMatchups.length > 0 ? (
                  <div className="space-y-3">
                    {recentMatchups.slice(0, 5).map((matchup: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-slate-500">
                            W{matchup.week}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {matchup.homeTeam.name} vs {matchup.awayTeam.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {matchup.homeScore?.toFixed(1)} - {matchup.awayScore?.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-emerald-400">
                          {matchup.homeScore && matchup.awayScore && matchup.homeScore > matchup.awayScore ? 'W' : 'L'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm">No recent matchups yet</p>
                    <p className="text-xs text-slate-500 mt-1">Your season starts soon!</p>
                  </div>
                )}
              </ModernCardContent>
            </ModernCard>
          </div>

          {/* Right Column - Roster Preview */}
          <div className="space-y-6">
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Your Top Players</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                {team?.roster && team.roster.length > 0 ? (
                  <div className="space-y-3">
                    {team.roster.slice(0, 5).map((rosterPlayer: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {rosterPlayer.player.position}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {rosterPlayer.player.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {rosterPlayer.player.position} - {rosterPlayer.player.nflTeam}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-sm">No players yet</p>
                    <p className="text-xs text-slate-500 mt-1">Build your roster!</p>
                  </div>
                )}
              </ModernCardContent>
            </ModernCard>

            {/* Upcoming Events */}
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Upcoming</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-white font-medium">Week 4 Matchup</div>
                      <div className="text-xs text-slate-400">Starting Sunday</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-white font-medium">Waiver Deadline</div>
                      <div className="text-xs text-slate-400">Wednesday 12:00 PM</div>
                    </div>
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
