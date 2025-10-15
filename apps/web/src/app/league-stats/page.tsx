'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import { ShareButton } from '@/components/sharing/share-button'

export default function LeagueStatsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      setLoading(false)
    }
  }, [status, router])

  const standings = [
    { rank: 1, name: 'Thunder Bolts', record: '6-2-0', points: 1124.5, change: 0 },
    { rank: 2, name: 'Gridiron Warriors', record: '5-3-0', points: 1089.3, change: 1 },
    { rank: 3, name: 'Dynasty Squad', record: '5-3-0', points: 1076.8, change: -1 },
    { rank: 4, name: 'Fantasy Kings', record: '4-4-0', points: 1045.2, change: 2 },
    { rank: 5, name: 'League Legends', record: '4-4-0', points: 1038.7, change: 0 },
    { rank: 6, name: 'Championship Chasers', record: '3-5-0', points: 998.5, change: -2 },
    { rank: 7, name: 'Elite Eleven', record: '3-5-0', points: 985.3, change: 1 },
    { rank: 8, name: 'Victory Vanguard', record: '3-5-0', points: 967.8, change: -1 },
    { rank: 9, name: 'Playoff Bound', record: '2-6-0', points: 945.2, change: 0 },
    { rank: 10, name: 'Point Machines', record: '1-7-0', points: 892.1, change: 0 }
  ]

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-600 rounded-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">League Standings</h1>
              <p className="text-slate-400">Current rankings and records</p>
            </div>
          </div>
          <ShareButton
            data={{
              title: 'League Standings - Week 4',
              text: `Check out our league standings! ${standings[0].name} leads with ${standings[0].points} points!`,
              url: `${typeof window !== 'undefined' ? window.location.origin : ''}/league-stats`,
              hashtags: ['FantasyFootball', 'LeagueStandings'],
              imageUrl: `/api/og?type=team&title=League Standings&subtitle=Week 4&stat1=1st:${standings[0].name}&stat2=Points:${standings[0].points}&stat3=Record:${standings[0].record}`
            }}
            variant="icon"
          />
        </div>

        {/* Standings Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Rank</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">Team</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">Record</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">Points</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {standings.map((team, idx) => (
                <tr
                  key={team.rank}
                  className={`hover:bg-slate-800 transition-colors ${
                    idx === 0 ? 'bg-yellow-500/5' : idx === 1 ? 'bg-slate-700/30' : idx === 2 ? 'bg-orange-600/5' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {idx < 3 && (
                        <Trophy
                          className={`w-5 h-5 ${
                            idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-400' : 'text-orange-500'
                          }`}
                        />
                      )}
                      <span className="text-lg font-bold text-white">#{team.rank}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{team.name}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-medium text-white">{team.record}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-white">{team.points.toFixed(1)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      {team.change > 0 ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm font-medium">+{team.change}</span>
                        </div>
                      ) : team.change < 0 ? (
                        <div className="flex items-center gap-1 text-red-400">
                          <TrendingDown className="w-4 h-4" />
                          <span className="text-sm font-medium">{team.change}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModernLayout>
  )
}

