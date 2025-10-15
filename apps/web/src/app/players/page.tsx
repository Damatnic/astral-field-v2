'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { Search, X } from 'lucide-react'
import { enhancePlayerWithAdvancedStats } from '@/lib/utils/advanced-player-stats'

export default function PlayersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [team, setTeam] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadPlayers()
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      const timer = setTimeout(() => loadPlayers(), 300)
      return () => clearTimeout(timer)
    }
  }, [search, position, team])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (position && position !== 'ALL') params.append('position', position)
      if (team && team !== 'ALL') params.append('team', team)

      const response = await fetch(`/api/players?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch players')
      
      const data = await response.json()
      setPlayers(data.players || [])
    } catch (err) {
      console.error('Error loading players:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setPosition('')
    setTeam('')
  }

  const enhancedPlayers = players.map(p => ({
    ...enhancePlayerWithAdvancedStats(p),
    nflTeam: p.nflTeam || p.team
  }))

  return (
    <ModernLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header with Filters */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Player Research</h1>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search players..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Position */}
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Positions</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="K">K</option>
              <option value="DEF">DEF</option>
            </select>

            {/* Team */}
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Teams</option>
              <option value="ARI">ARI</option>
              <option value="ATL">ATL</option>
              <option value="BAL">BAL</option>
              <option value="BUF">BUF</option>
              <option value="CAR">CAR</option>
              <option value="CHI">CHI</option>
              <option value="CIN">CIN</option>
              <option value="CLE">CLE</option>
              <option value="DAL">DAL</option>
              <option value="DEN">DEN</option>
              <option value="DET">DET</option>
              <option value="GB">GB</option>
              <option value="HOU">HOU</option>
              <option value="IND">IND</option>
              <option value="JAX">JAX</option>
              <option value="KC">KC</option>
              <option value="LAC">LAC</option>
              <option value="LAR">LAR</option>
              <option value="LV">LV</option>
              <option value="MIA">MIA</option>
              <option value="MIN">MIN</option>
              <option value="NE">NE</option>
              <option value="NO">NO</option>
              <option value="NYG">NYG</option>
              <option value="NYJ">NYJ</option>
              <option value="PHI">PHI</option>
              <option value="PIT">PIT</option>
              <option value="SEA">SEA</option>
              <option value="SF">SF</option>
              <option value="TB">TB</option>
              <option value="TEN">TEN</option>
              <option value="WAS">WAS</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-colors"
            >
              <X className="w-5 h-5" />
              Clear
            </button>
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
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Projected</th>
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
                      No players found
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
                            {player.targetShare && (
                              <p className="text-xs text-slate-400">
                                Target Share: {player.targetShare.toFixed(1)}%
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
                      <td className="px-6 py-4 text-white font-medium">{player.nflTeam}</td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-white">{player.fantasyPoints?.toFixed(1) || 0}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-medium text-slate-300">{player.projectedPoints?.toFixed(1) || 0}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/players/${player.id}`)
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                          View
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

