'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernLayout } from '@/components/layout/modern-layout'
import {
  Trophy,
  TrendingUp,
  Users,
  Edit3,
  Search,
  Repeat,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadDashboardData()
    }
  }, [status, router])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      // Fetch dashboard data
      const res = await fetch(`/api/teams?userId=${session?.user?.id}`)
      const teamData = await res.json()
      setData(teamData)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </ModernLayout>
    )
  }

  const currentWeek = data.league?.currentWeek || 1
  const team = data
  const record = `${team.wins || 0}-${team.losses || 0}-${team.ties || 0}`

  // Mock data for demo
  const nextOpponent = {
    name: 'Team Opponent',
    record: '3-1-0',
    points: 145.2,
    rank: 3
  }

  const winProbability = 62
  const starters = team.roster?.filter((r: any) => r.isStarter).slice(0, 9) || []
  const topPerformers = team.roster?.slice(0, 3) || []

  return (
    <ModernLayout currentWeek={currentWeek} leagueName={data.league?.name}>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 lg:p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-2">{team.name}</h1>
              <div className="flex items-center gap-4 text-white/90">
                <span className="text-lg font-semibold">{record}</span>
                <span>•</span>
                <span className="text-lg">Week {currentWeek}</span>
                <span>•</span>
                <span className="text-lg">{team.totalPoints?.toFixed(1) || 0} pts</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <span className="text-white/80 text-sm">Win Probability</span>
              <div className="flex items-center gap-2">
                <div className="text-4xl font-bold">{winProbability}%</div>
                <TrendingUp className="w-8 h-8" />
              </div>
              <span className="text-white/80 text-sm">vs {nextOpponent.name}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Points */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Points</p>
                <p className="text-3xl font-bold text-white">{team.totalPoints?.toFixed(1) || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Trophy className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium">12.5</span>
              <span className="text-slate-400">vs last week</span>
            </div>
          </div>

          {/* League Rank */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">League Rank</p>
                <p className="text-3xl font-bold text-white">#{team.rank || 1}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Minus className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">No change</span>
            </div>
          </div>

          {/* Win Streak */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Current Streak</p>
                <p className="text-3xl font-bold text-white">W2</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-green-400 font-medium">2 game win streak</span>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Lineup & Matchup */}
          <div className="lg:col-span-2 space-y-6">
            {/* Starting Lineup */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Starting Lineup</h2>
                <Link
                  href="/team"
                  className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Edit Lineup →
                </Link>
              </div>

              <div className="space-y-3">
                {starters.map((player: any, idx: number) => (
                  <div
                    key={player.player.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => router.push(`/players/${player.player.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-slate-400">
                          {player.player.position}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{player.player.name}</p>
                        <p className="text-xs text-slate-400">{player.player.nflTeam}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{player.player.fantasyPoints?.toFixed(1) || 0}</p>
                      <p className="text-xs text-slate-400">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Matchup */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-6">Week {currentWeek} Matchup</h2>
              
              <div className="flex items-center justify-between">
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {team.name?.charAt(0) || 'Y'}
                    </span>
                  </div>
                  <p className="font-bold text-white mb-1">{team.name}</p>
                  <p className="text-sm text-slate-400">{record}</p>
                  <p className="text-2xl font-bold text-white mt-2">{team.totalPoints?.toFixed(1) || 0}</p>
                </div>

                <div className="px-6">
                  <div className="text-2xl font-bold text-slate-400">VS</div>
                </div>

                <div className="flex-1 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {nextOpponent.name?.charAt(0) || 'O'}
                    </span>
                  </div>
                  <p className="font-bold text-white mb-1">{nextOpponent.name}</p>
                  <p className="text-sm text-slate-400">{nextOpponent.record}</p>
                  <p className="text-2xl font-bold text-white mt-2">{nextOpponent.points}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Your Win Probability</span>
                  <span className="font-bold text-green-400">{winProbability}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Actions & Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/team"
                  className="flex flex-col items-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors group"
                >
                  <Edit3 className="w-6 h-6 text-white" />
                  <span className="text-sm font-medium text-white">Set Lineup</span>
                </Link>

                <Link
                  href="/waivers"
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group"
                >
                  <TrendingUp className="w-6 h-6 text-white" />
                  <span className="text-sm font-medium text-white">Waivers</span>
                </Link>

                <Link
                  href="/trades"
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group"
                >
                  <Repeat className="w-6 h-6 text-white" />
                  <span className="text-sm font-medium text-white">Trades</span>
                </Link>

                <Link
                  href="/players"
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group"
                >
                  <Search className="w-6 h-6 text-white" />
                  <span className="text-sm font-medium text-white">Research</span>
                </Link>
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-4">Top Performers</h2>
              
              <div className="space-y-3">
                {topPerformers.map((player: any, idx: number) => (
                  <div
                    key={player.player.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => router.push(`/players/${player.player.id}`)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      idx === 0 ? "bg-yellow-500 text-yellow-900" :
                      idx === 1 ? "bg-slate-400 text-slate-900" :
                      "bg-orange-600 text-orange-100"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{player.player.name}</p>
                      <p className="text-xs text-slate-400">{player.player.position} • {player.player.nflTeam}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{player.player.fantasyPoints?.toFixed(1) || 0}</p>
                      <p className="text-xs text-green-400">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Activity className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">You won your matchup</p>
                    <p className="text-xs text-slate-400">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">Waiver claim processed</p>
                    <p className="text-xs text-slate-400">1 day ago</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Repeat className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">Trade proposed to you</p>
                    <p className="text-xs text-slate-400">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

