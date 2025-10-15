'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernLayout } from '@/components/layout/modern-layout'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Flame,
  Shield,
  Target,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [insightIndex, setInsightIndex] = useState(0)

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
            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xl text-slate-300 font-medium">Loading your command center...</p>
          </div>
        </div>
      </ModernLayout>
    )
  }

  const currentWeek = data.league?.currentWeek || 1
  const team = data
  const myScore = team.totalPoints || 0
  const myProjected = team.projectedPoints || 145.5
  const opponentScore = 138.5
  const opponentProjected = 142.1
  const isWinning = myScore > opponentScore || myProjected > opponentProjected
  const winProbability = 62
  
  const starters = team.roster?.filter((r: any) => r.isStarter).slice(0, 9) || []
  
  // AI Insights
  const insights = [
    { message: "Start Josh Allen over Dak Prescott for +5.2 projected points", type: 'lineup' },
    { message: "Jerome Ford available - Top waiver wire target this week", type: 'waiver' },
    { message: "Your RBs averaging 15% below projection - consider trades", type: 'alert' }
  ]

  // Recent league activity
  const recentActivity = [
    { type: 'trade', message: 'Team Alpha traded WR for RB', time: '2h ago' },
    { type: 'waiver', message: 'Team Beta claimed Jerome Ford', time: '5h ago' },
    { type: 'lineup', message: 'Team Gamma changed their lineup', time: '1d ago' }
  ]

  return (
    <ModernLayout currentWeek={currentWeek} leagueName={data.league?.name}>
      <div className="p-4 lg:p-8 space-y-6">
        
        {/* HERO: Matchup Card */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-8 lg:p-12 transition-all duration-500",
          isWinning 
            ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600" 
            : "bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"
        )}>
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-pulse" />
          </div>

          <div className="relative z-10">
            {/* Week & Status */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                <Clock className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">Week {currentWeek}</span>
              </div>
              <div className="text-white/90 text-lg font-medium">
                {isWinning ? '🔥 Projected to WIN' : '⚡ Tight Matchup'}
              </div>
            </div>

            {/* Matchup Display */}
            <div className="grid grid-cols-3 gap-8 items-center">
              {/* Your Team */}
              <div className="text-center">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 shadow-2xl">
                  <span className="text-4xl lg:text-5xl font-black text-white">
                    {team.name?.charAt(0) || 'Y'}
                  </span>
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">{team.name}</h2>
                <p className="text-white/80 text-sm mb-4">{team.wins || 0}-{team.losses || 0}-{team.ties || 0}</p>
                <div className="text-5xl lg:text-7xl font-black text-white mb-2">
                  {myProjected.toFixed(0)}
                </div>
                <p className="text-white/80 text-sm">Projected Points</p>
              </div>

              {/* VS + Win Probability */}
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-black text-white/50 mb-6">VS</div>
                
                {/* Circular Win Probability */}
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="white"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - winProbability / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-black text-white">{winProbability}%</div>
                      <div className="text-xs text-white/80">to win</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white/10 backdrop-blur-md rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/20 shadow-2xl">
                  <span className="text-4xl lg:text-5xl font-black text-white/70">
                    O
                  </span>
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-white/90 mb-2">Opponent</h2>
                <p className="text-white/70 text-sm mb-4">3-1-0</p>
                <div className="text-5xl lg:text-7xl font-black text-white/90 mb-2">
                  {opponentProjected.toFixed(0)}
                </div>
                <p className="text-white/70 text-sm">Projected Points</p>
              </div>
            </div>
          </div>
        </div>

        {/* MEGA STATS: 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* This Week */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 lg:p-8">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white/90 font-semibold">This Week</h3>
              </div>
              <div className="text-6xl font-black text-white mb-2">{myProjected.toFixed(0)}</div>
              <p className="text-white/80 text-sm mb-4">Projected Points</p>
              
              {/* Progress Bar */}
              <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-white transition-all duration-1000"
                  style={{ width: `${Math.min(100, (myProjected / 200) * 100)}%` }}
                />
              </div>
              <p className="text-white/90 text-sm font-medium">
                On pace for {isWinning ? 'WIN 🔥' : 'competitive game'}
              </p>
            </div>
          </div>

          {/* Season Standing */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 lg:p-8">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white/90 font-semibold">Standing</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-black text-white">#{team.rank || 1}</span>
                <span className="text-2xl text-white/80">of 10</span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-white text-lg font-bold">
                  {team.wins || 0}-{team.losses || 0}-{team.ties || 0}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white font-medium">
                  {team.totalPoints?.toFixed(0) || 0} PF
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Trophy className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-medium">Playoff Position</span>
              </div>
            </div>
          </div>

          {/* Power Ranking */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-6 lg:p-8">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white/90 font-semibold">Power Rank</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-black text-white">#3</span>
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <p className="text-white/80 text-sm mb-4">Up 1 spot this week</p>
              
              {/* Power Meter */}
              <div className="flex items-center gap-2">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-2 rounded-full transition-all",
                      i < 7 ? "bg-white" : "bg-white/20"
                    )}
                  />
                ))}
              </div>
              <p className="text-white/90 text-sm font-medium mt-2">Strong Team</p>
            </div>
          </div>
        </div>

        {/* STARTING LINEUP: Interactive 3x3 Grid */}
        <div className="bg-slate-900 rounded-2xl p-6 lg:p-8 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Starting Lineup</h2>
            <Link
              href="/team"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Edit →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {starters.map((player: any, idx: number) => {
              const points = player.player.fantasyPoints || 0
              const projected = player.player.projectedPoints || 0
              const performance = points >= projected * 1.1 ? 'good' : points >= projected * 0.9 ? 'ok' : 'poor'
              
              return (
                <div
                  key={player.player.id}
                  onClick={() => router.push(`/players/${player.player.id}`)}
                  className={cn(
                    "relative group cursor-pointer rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl",
                    performance === 'good' ? "bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-2 border-green-500/30" :
                    performance === 'ok' ? "bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/30" :
                    "bg-gradient-to-br from-red-600/20 to-orange-600/20 border-2 border-red-500/30"
                  )}
                >
                  {/* Position Badge */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 backdrop-blur-sm rounded-lg">
                    <span className="text-xs font-bold text-white">{player.player.position}</span>
                  </div>

                  {/* Status Indicator */}
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  </div>

                  {/* Player Info */}
                  <div className="text-center mt-8 mb-4">
                    <p className="text-sm font-bold text-white mb-1 truncate">{player.player.name}</p>
                    <p className="text-xs text-slate-400">{player.player.nflTeam}</p>
                  </div>

                  {/* Points */}
                  <div className="text-center">
                    <div className={cn(
                      "text-3xl font-black mb-1",
                      performance === 'good' ? "text-green-400" :
                      performance === 'ok' ? "text-white" :
                      "text-red-400"
                    )}>
                      {projected.toFixed(1)}
                    </div>
                    <p className="text-xs text-slate-400">projected</p>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end justify-center p-4">
                    <span className="text-white text-sm font-medium">View Details</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* TWO COLUMN: Actions & League Pulse */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* What You Need to Do */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-6">What You Need to Do</h2>
            
            <div className="space-y-4">
              {/* Action 1: Set Lineup */}
              <Link
                href="/team"
                className="block p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-2 border-blue-500/30 rounded-xl hover:border-blue-500/60 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Optimize Your Lineup</h3>
                      <p className="text-slate-400 text-sm">2 bench players projected higher</p>
                    </div>
                  </div>
                  <div className="text-green-400 font-bold">+5.2 pts</div>
                </div>
              </Link>

              {/* Action 2: Waiver Wire */}
              <Link
                href="/waivers"
                className="block p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/30 rounded-xl hover:border-green-500/60 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Top Waiver Target</h3>
                      <p className="text-slate-400 text-sm">Jerome Ford available</p>
                    </div>
                  </div>
                  <div className="text-orange-400 font-bold">🔥 HOT</div>
                </div>
              </Link>

              {/* Action 3: Injury Alert */}
              <div className="p-4 bg-gradient-to-r from-orange-600/20 to-red-600/20 border-2 border-orange-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Injury Report Clear</h3>
                    <p className="text-slate-400 text-sm">All players healthy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* League Pulse */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-6">League Pulse</h2>
            
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className={cn(
                    "p-2 rounded-lg",
                    activity.type === 'trade' ? "bg-purple-500/20" :
                    activity.type === 'waiver' ? "bg-green-500/20" :
                    "bg-blue-500/20"
                  )}>
                    <Activity className={cn(
                      "w-4 h-4",
                      activity.type === 'trade' ? "text-purple-400" :
                      activity.type === 'waiver' ? "text-green-400" :
                      "text-blue-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{activity.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">League Avg Points</span>
                  <span className="text-white font-bold">132.5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Your Rank Trend</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-bold">+2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI INSIGHTS: Carousel */}
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">AI Insights</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInsightIndex((prev) => (prev - 1 + insights.length) % insights.length)}
                className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-purple-400" />
              </button>
              <button
                onClick={() => setInsightIndex((prev) => (prev + 1) % insights.length)}
                className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-purple-400" />
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500"
              style={{ transform: `translateX(-${insightIndex * 100}%)` }}
            >
              {insights.map((insight, idx) => (
                <div key={idx} className="min-w-full px-2">
                  <div className="p-6 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-purple-500/20">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-3 rounded-lg",
                        insight.type === 'lineup' ? "bg-blue-500/20" :
                        insight.type === 'waiver' ? "bg-green-500/20" :
                        "bg-orange-500/20"
                      )}>
                        <Sparkles className={cn(
                          "w-6 h-6",
                          insight.type === 'lineup' ? "text-blue-400" :
                          insight.type === 'waiver' ? "text-green-400" :
                          "text-orange-400"
                        )} />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-lg font-medium leading-relaxed">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {insights.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setInsightIndex(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === insightIndex ? "bg-purple-400 w-6" : "bg-purple-400/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}
