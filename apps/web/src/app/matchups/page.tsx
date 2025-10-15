'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { Trophy, TrendingUp } from 'lucide-react'

export default function MatchupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [matchup, setMatchup] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadMatchup()
    }
  }, [status, router])

  const loadMatchup = async () => {
    try {
      setLoading(true)
      // Mock matchup data
      setMatchup({
        myTeam: {
          name: 'Your Team',
          score: 145.2,
          projected: 152.3,
          players: []
        },
        opponent: {
          name: 'Opponent Team',
          score: 138.5,
          projected: 142.1,
          players: []
        },
        winProbability: 62
      })
    } catch (err) {
      console.error('Error loading matchup:', err)
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

  return (
    <ModernLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-600 rounded-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">This Week's Matchup</h1>
            <p className="text-slate-400">Head-to-head competition</p>
          </div>
        </div>

        {/* Matchup Card */}
        <div className="bg-slate-900 rounded-xl p-8 border border-slate-800">
          <div className="flex items-center justify-between mb-8">
            {/* My Team */}
            <div className="flex-1 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">Y</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{matchup.myTeam.name}</h3>
              <p className="text-3xl font-bold text-white mb-1">{matchup.myTeam.score.toFixed(1)}</p>
              <p className="text-sm text-slate-400">Proj: {matchup.myTeam.projected.toFixed(1)}</p>
            </div>

            {/* VS */}
            <div className="px-8">
              <div className="text-3xl font-bold text-slate-400">VS</div>
            </div>

            {/* Opponent */}
            <div className="flex-1 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">O</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{matchup.opponent.name}</h3>
              <p className="text-3xl font-bold text-white mb-1">{matchup.opponent.score.toFixed(1)}</p>
              <p className="text-sm text-slate-400">Proj: {matchup.opponent.projected.toFixed(1)}</p>
            </div>
          </div>

          {/* Win Probability */}
          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Your Win Probability</span>
              <span className="font-bold text-green-400">{matchup.winProbability}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                style={{ width: `${matchup.winProbability}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

