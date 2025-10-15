'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { TrendingUp, DollarSign, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { enhancePlayerWithAnalytics } from '@/lib/utils/player-analytics'

export default function WaiversPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [budget, setBudget] = useState(100)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadWaivers()
    }
  }, [status, router])

  const loadWaivers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/waivers?userId=${session?.user?.id}`)
      if (!response.ok) throw new Error('Failed to fetch waivers')
      
      const data = await response.json()
      setPlayers(data.availablePlayers || [])
      setBudget(data.waiverBudget || 100)
    } catch (err) {
      console.error('Error loading waivers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (playerId: string) => {
    try {
      const response = await fetch('/api/waivers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      })

      if (!response.ok) throw new Error('Failed to claim player')
      
      toast.success('Waiver claim submitted!')
      await loadWaivers()
    } catch (err) {
      console.error('Error claiming player:', err)
      toast.error('Failed to submit claim')
    }
  }

  const enhancedPlayers = players.map(p => enhancePlayerWithAnalytics(p)).slice(0, 50)

  return (
    <ModernLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Waiver Wire</h1>
              <p className="text-slate-400">Claim available players</p>
            </div>
          </div>

          {/* Budget */}
          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-4 border border-slate-800">
            <DollarSign className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-slate-400">Waiver Budget</p>
              <p className="text-xl font-bold text-white">${budget}</p>
            </div>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Player</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Position</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Team</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Points</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">AI Score</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : enhancedPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No available players
                    </td>
                  </tr>
                ) : (
                  enhancedPlayers.map((player) => (
                    <tr
                      key={player.id}
                      onClick={() => router.push(`/players/${player.id}`)}
                      className="hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-slate-400">{player.position}</span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{player.name}</p>
                            {player.trending && (
                              <p className="text-xs text-orange-400">
                                🔥 {player.trending.toUpperCase()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-medium">
                          {player.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">{player.nflTeam || player.team}</td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-white">{player.fantasyPoints?.toFixed(1) || 0}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                              style={{ width: `${player.aiScore || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-white">{player.aiScore || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleClaim(player.id)
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Claim
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

