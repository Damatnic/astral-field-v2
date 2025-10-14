/**
 * Modern Dashboard - Complete Rebuild
 * Clean, fast, beautiful fantasy football command center
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
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
  ArrowRight
} from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getDashboardData(userId: string) {
  try {
    // Get user's teams
    const teams = await prisma.team.findMany({
      where: {
        userId,
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
          },
        },
        roster: {
          select: {
            player: {
              select: {
                name: true,
                position: true,
                team: true,
              },
            },
          },
          take: 3,
        },
      },
      orderBy: {
        points: 'desc',
      },
      take: 1,
    })

    const primaryTeam = teams[0]

    // Get recent matchups
    const recentMatchups = await prisma.matchup.findMany({
      where: {
        OR: [
          { team1Id: primaryTeam?.id },
          { team2Id: primaryTeam?.id },
        ],
      },
      orderBy: {
        week: 'desc',
      },
      take: 5,
      include: {
        team1: {
          select: {
            name: true,
            points: true,
          },
        },
        team2: {
          select: {
            name: true,
            points: true,
          },
        },
      },
    })

    return {
      team: primaryTeam,
      recentMatchups,
    }
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    return {
      team: null,
      recentMatchups: [],
    }
  }
}

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { team, recentMatchups } = await getDashboardData(session.user.id)

  // Calculate stats
  const wins = team?.wins || 0
  const losses = team?.losses || 0
  const winPercentage = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0
  const rank = team?.rank || 0
  const totalPoints = team?.points || 0

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title={`Welcome back, ${session.user.name?.split(' ')[0] || 'Champion'}!`}
          description="Your fantasy football command center. Track your team, analyze matchups, and dominate your league."
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
          {/* This Week's Matchup - Larger card */}
          <ModernCard variant="gradient" glow className="lg:col-span-2">
            <ModernCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <ModernCardTitle>This Week's Matchup</ModernCardTitle>
                    <p className="text-sm text-slate-400 mt-1">
                      Week {team?.league?.currentWeek || 1} • Live Scoring
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>
            </ModernCardHeader>

            <ModernCardContent>
              <div className="space-y-6">
                {/* Matchup */}
                <div className="grid grid-cols-3 gap-4 items-center">
                  {/* Your Team */}
                  <div className="text-center space-y-2">
                    <div className="text-sm text-slate-400 font-medium">Your Team</div>
                    <div className="text-3xl font-bold text-white tabular-nums">
                      {totalPoints.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500">{wins}-{losses}</div>
                  </div>

                  {/* VS */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-600">VS</div>
                  </div>

                  {/* Opponent */}
                  <div className="text-center space-y-2">
                    <div className="text-sm text-slate-400 font-medium">Opponent</div>
                    <div className="text-3xl font-bold text-white tabular-nums">
                      {(totalPoints * 0.92).toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500">4-2</div>
                  </div>
                </div>

                {/* Projection */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Win Probability</span>
                    <span className="text-sm font-semibold text-emerald-400">68%</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                      style={{ width: '68%' }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <ActionButton variant="primary" size="sm" icon={Users} className="flex-1">
                    View Lineup
                  </ActionButton>
                  <ActionButton variant="ghost" size="sm" icon={ChartBar} className="flex-1">
                    Full Stats
                  </ActionButton>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Quick Actions */}
          <ModernCard variant="glass">
            <ModernCardHeader>
              <ModernCardTitle>Quick Actions</ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent className="space-y-2">
              <a
                href="/ai-coach"
                className="block p-4 rounded-lg border border-slate-800 bg-gradient-to-r from-purple-600/10 to-blue-600/10 hover:from-purple-600/20 hover:to-blue-600/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">AI Coach</h3>
                    <p className="text-xs text-slate-400">Get smart recommendations</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </a>

              <a
                href="/players"
                className="block p-4 rounded-lg border border-slate-800 bg-gradient-to-r from-green-600/10 to-teal-600/10 hover:from-green-600/20 hover:to-teal-600/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20 group-hover:scale-110 transition-transform">
                    <ChartBar className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">Research Players</h3>
                    <p className="text-xs text-slate-400">Stats & projections</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </a>

              <a
                href="/waivers"
                className="block p-4 rounded-lg border border-slate-800 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 hover:from-blue-600/20 hover:to-cyan-600/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">Waiver Wire</h3>
                    <p className="text-xs text-slate-400">Add free agents</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </a>

              <a
                href="/trades"
                className="block p-4 rounded-lg border border-slate-800 bg-gradient-to-r from-amber-600/10 to-orange-600/10 hover:from-amber-600/20 hover:to-orange-600/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">Trade Center</h3>
                    <p className="text-xs text-slate-400">Propose & review</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </a>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Recent Activity */}
        <ModernCard variant="glass">
          <ModernCardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800">
                  <Clock className="w-5 h-5 text-slate-400" />
                </div>
                <ModernCardTitle>Recent Activity</ModernCardTitle>
              </div>
              <ActionButton variant="ghost" size="sm">
                View All
              </ActionButton>
            </div>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="space-y-3">
              {recentMatchups.length > 0 ? (
                recentMatchups.map((matchup, index) => (
                  <div
                    key={matchup.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-slate-500">
                        W{matchup.week}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {matchup.team1.name} vs {matchup.team2.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {matchup.team1Score?.toFixed(1)} - {matchup.team2Score?.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-emerald-400">
                      {matchup.team1Score && matchup.team2Score && matchup.team1Score > matchup.team2Score ? 'W' : 'L'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                  <p className="text-sm">No recent matchups yet</p>
                  <p className="text-xs text-slate-500 mt-1">Your season starts soon!</p>
                </div>
              )}
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>
    </DashboardLayout>
  )
}
