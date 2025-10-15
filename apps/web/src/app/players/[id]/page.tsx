'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ModernLayout } from '@/components/layout/modern-layout'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Calendar,
  AlertCircle,
  Plus,
  Minus,
  Repeat
} from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ShareButton } from '@/components/sharing/share-button'

export default function PlayerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [player, setPlayer] = useState<any>(null)

  useEffect(() => {
    loadPlayerData()
  }, [params.id])

  const loadPlayerData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/espn/players/${params.id}`)
      const data = await res.json()
      setPlayer(data)
    } catch (error) {
      console.error('Error loading player:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ModernLayout>
    )
  }

  if (!player) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Player Not Found</h2>
            <Link href="/players" className="text-blue-400 hover:text-blue-300">
              ← Back to Players
            </Link>
          </div>
        </div>
      </ModernLayout>
    )
  }

  // Mock performance data for chart
  const performanceData = [
    { week: 'W1', points: 18.5 },
    { week: 'W2', points: 22.3 },
    { week: 'W3', points: 15.8 },
    { week: 'W4', points: 24.1 },
    { week: 'W5', points: 19.7 },
    { week: 'W6', points: 27.3 },
    { week: 'W7', points: 16.2 },
    { week: 'W8', points: 21.8 }
  ]

  const upcomingMatchups = [
    { week: 9, opponent: 'vs KC', difficulty: 'hard' },
    { week: 10, opponent: '@ SF', difficulty: 'medium' },
    { week: 11, opponent: 'vs CAR', difficulty: 'easy' }
  ]

  return (
    <ModernLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Player Header */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 lg:p-8 text-white">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Player Avatar */}
            <div className="w-32 h-32 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-4xl font-bold">{player.position}</span>
            </div>

            {/* Player Info */}
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold mb-2">{player.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90 mb-4">
                <span className="text-lg">{player.position}</span>
                <span>•</span>
                <span className="text-lg">{player.team}</span>
                <span>•</span>
                <span className="text-lg">#{player.jerseyNumber || '00'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  Available
                </span>
                <span className="px-3 py-1 bg-green-500/20 rounded-full text-sm">
                  Healthy
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-white/80 text-sm mb-1">Season Points</p>
                <p className="text-3xl font-bold">{player.fantasyPoints?.toFixed(1) || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-white/80 text-sm mb-1">Avg/Game</p>
                <p className="text-3xl font-bold">
                  {player.fantasyPoints ? (player.fantasyPoints / 8).toFixed(1) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors">
            <Plus className="w-5 h-5" />
            Add to Team
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors">
            <Minus className="w-5 h-5" />
            Drop Player
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">
            <Repeat className="w-5 h-5" />
            Propose Trade
          </button>
          <ShareButton
            data={{
              title: `${player.name} - Fantasy Stats`,
              text: `Check out ${player.name}'s performance on AstralField! ${player.fantasyPoints?.toFixed(1)} fantasy points this season.`,
              url: `${typeof window !== 'undefined' ? window.location.origin : ''}/players/${player.id}`,
              hashtags: ['FantasyFootball', 'NFL'],
              imageUrl: `/api/og?type=player&title=${encodeURIComponent(player.name)}&subtitle=${encodeURIComponent(player.position + ' • ' + player.team)}&stat1=Points:${player.fantasyPoints?.toFixed(1)}&stat2=Avg:${(player.fantasyPoints / 8).toFixed(1)}&stat3=Proj:${player.projectedPoints?.toFixed(1)}`
            }}
            variant="minimal"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats & Performance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-6">Performance Trend</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="week" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="points"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Season Stats */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-6">Season Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">Games Played</p>
                  <p className="text-2xl font-bold text-white">8</p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">Total Points</p>
                  <p className="text-2xl font-bold text-white">{player.fantasyPoints?.toFixed(1) || 0}</p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">High Score</p>
                  <p className="text-2xl font-bold text-white">27.3</p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <p className="text-slate-400 text-sm mb-1">Low Score</p>
                  <p className="text-2xl font-bold text-white">15.8</p>
                </div>
              </div>
            </div>

            {/* Advanced Metrics */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-6">Advanced Metrics</h2>
              <div className="space-y-4">
                {player.position === 'WR' || player.position === 'TE' ? (
                  <>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <span className="text-slate-300">Target Share</span>
                      <span className="text-white font-bold">24.5%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <span className="text-slate-300">Routes Run</span>
                      <span className="text-white font-bold">412</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <span className="text-slate-300">Yards/Route</span>
                      <span className="text-white font-bold">2.1</span>
                    </div>
                  </>
                ) : null}
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Snap Count %</span>
                  <span className="text-white font-bold">78%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Red Zone Usage</span>
                  <span className="text-white font-bold">High</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Matchups & Info */}
          <div className="space-y-6">
            {/* Upcoming Matchups */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-4">Upcoming Schedule</h2>
              <div className="space-y-3">
                {upcomingMatchups.map((matchup) => (
                  <div
                    key={matchup.week}
                    className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">Week {matchup.week}</p>
                      <p className="text-xs text-slate-400">{matchup.opponent}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        matchup.difficulty === 'easy'
                          ? 'bg-green-500/20 text-green-400'
                          : matchup.difficulty === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {matchup.difficulty}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ownership & Trends */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-4">Ownership</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 text-sm">League Ownership</span>
                    <span className="text-white font-bold">45%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '45%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 text-sm">Weekly Trend</span>
                    <span className="flex items-center gap-1 text-green-400 font-bold">
                      <TrendingUp className="w-4 h-4" />
                      +12%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* News & Updates */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-4">Latest News</h2>
              <div className="space-y-4">
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-300 mb-2">
                    {player.name} had a standout performance in Week 8...
                  </p>
                  <p className="text-xs text-slate-500">2 hours ago</p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-300 mb-2">
                    Coach praises {player.name}'s consistency...
                  </p>
                  <p className="text-xs text-slate-500">1 day ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

