'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { Repeat, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function TradesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [myTeam, setMyTeam] = useState<any>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [myPlayers, setMyPlayers] = useState<string[]>([])
  const [theirPlayers, setTheirPlayers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadTradeData()
    }
  }, [status, router])

  const loadTradeData = async () => {
    try {
      setLoading(true)
      // Fetch my team
      const myTeamRes = await fetch(`/api/teams?userId=${session?.user?.id}`)
      const myTeamData = await myTeamRes.json()
      setMyTeam(myTeamData)

      // Fetch other teams (mock)
      setTeams([
        { id: '2', name: 'Team 2', roster: [] },
        { id: '3', name: 'Team 3', roster: [] },
        { id: '4', name: 'Team 4', roster: [] }
      ])
    } catch (err) {
      console.error('Error loading trade data:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleMyPlayer = (playerId: string) => {
    setMyPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const toggleTheirPlayer = (playerId: string) => {
    setTheirPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const handleProposeTrade = async () => {
    if (!selectedTeam || myPlayers.length === 0 || theirPlayers.length === 0) {
      toast.error('Please select players from both teams')
      return
    }

    toast.success('Trade proposed!')
    setMyPlayers([])
    setTheirPlayers([])
  }

  if (loading || !myTeam) {
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
          <div className="p-3 bg-purple-600 rounded-lg">
            <Repeat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Trade Center</h1>
            <p className="text-slate-400">Propose trades with other teams</p>
          </div>
        </div>

        {/* Team Selector */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Team to Trade With
          </label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a team...</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        {/* Trade Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Team */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">Your Players</h2>
            <div className="space-y-2">
              {myTeam.roster?.map((player: any) => (
                <div
                  key={player.player.id}
                  onClick={() => toggleMyPlayer(player.player.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    myPlayers.includes(player.player.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold">{player.player.position}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{player.player.name}</p>
                      <p className="text-xs opacity-70">{player.player.nflTeam}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold">{player.player.fantasyPoints?.toFixed(1) || 0} pts</p>
                </div>
              ))}
            </div>
          </div>

          {/* Their Team */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">Their Players</h2>
            {!selectedTeam ? (
              <p className="text-slate-400 text-center py-12">Select a team to view their roster</p>
            ) : (
              <p className="text-slate-400 text-center py-12">Loading roster...</p>
            )}
          </div>
        </div>

        {/* Trade Summary & Propose */}
        {(myPlayers.length > 0 || theirPlayers.length > 0) && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Trade Summary</h3>
                <p className="text-slate-400">
                  Sending {myPlayers.length} player(s) • Receiving {theirPlayers.length} player(s)
                </p>
              </div>
              <button
                onClick={handleProposeTrade}
                disabled={!selectedTeam || myPlayers.length === 0 || theirPlayers.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
              >
                <Send className="w-5 h-5" />
                Propose Trade
              </button>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  )
}

