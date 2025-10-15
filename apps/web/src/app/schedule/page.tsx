'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernLayout } from '@/components/layout/modern-layout'
import { Calendar, Trophy, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SchedulePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [scheduleData, setScheduleData] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadSchedule()
    }
  }, [status, router, selectedWeek])

  const loadSchedule = async () => {
    try {
      setLoading(true)
      // Mock schedule data
      setScheduleData({
        currentWeek: 4,
        totalWeeks: 14,
        matchups: [
          {
            id: '1',
            week: selectedWeek,
            homeTeam: { name: 'Thunder Bolts', owner: 'User', score: 145.2, projected: 138.5 },
            awayTeam: { name: 'Gridiron Warriors', owner: 'Opponent', score: 132.8, projected: 140.2 },
            status: selectedWeek < 4 ? 'completed' : selectedWeek === 4 ? 'live' : 'upcoming'
          },
          {
            id: '2',
            week: selectedWeek,
            homeTeam: { name: 'Dynasty Squad', owner: 'Player 3', score: 128.5, projected: 125.0 },
            awayTeam: { name: 'Fantasy Kings', owner: 'Player 4', score: 118.3, projected: 122.0 },
            status: selectedWeek < 4 ? 'completed' : selectedWeek === 4 ? 'live' : 'upcoming'
          },
          {
            id: '3',
            week: selectedWeek,
            homeTeam: { name: 'League Legends', owner: 'Player 5', score: 142.7, projected: 135.0 },
            awayTeam: { name: 'Championship Chasers', owner: 'Player 6', score: 138.9, projected: 138.0 },
            status: selectedWeek < 4 ? 'completed' : selectedWeek === 4 ? 'live' : 'upcoming'
          },
          {
            id: '4',
            week: selectedWeek,
            homeTeam: { name: 'Elite Eleven', owner: 'Player 7', score: 151.2, projected: 145.0 },
            awayTeam: { name: 'Victory Vanguard', owner: 'Player 8', score: 147.8, projected: 148.0 },
            status: selectedWeek < 4 ? 'completed' : selectedWeek === 4 ? 'live' : 'upcoming'
          },
          {
            id: '5',
            week: selectedWeek,
            homeTeam: { name: 'Playoff Bound', owner: 'Player 9', score: 134.5, projected: 130.0 },
            awayTeam: { name: 'Point Machines', owner: 'Player 10', score: 129.2, projected: 132.0 },
            status: selectedWeek < 4 ? 'completed' : selectedWeek === 4 ? 'live' : 'upcoming'
          }
        ]
      })
    } catch (error) {
      console.error('Error loading schedule:', error)
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

  const weeks = Array.from({ length: scheduleData?.totalWeeks || 14 }, (_, i) => i + 1)
  const currentWeek = scheduleData?.currentWeek || 1

  return (
    <ModernLayout currentWeek={currentWeek}>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">League Schedule</h1>
              <p className="text-slate-400">View all matchups and results</p>
            </div>
          </div>
        </div>

        {/* Week Selector */}
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {weeks.map((week) => (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all flex-shrink-0",
                  selectedWeek === week
                    ? "bg-blue-600 text-white shadow-lg"
                    : week === currentWeek
                    ? "bg-slate-800 text-white border-2 border-blue-500"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                )}
              >
                <div className="text-center">
                  <div className="text-xs mb-1">Week</div>
                  <div className="text-lg font-bold">{week}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Matchups Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {scheduleData?.matchups.map((matchup: any) => {
            const homeWinning = matchup.homeTeam.score > matchup.awayTeam.score
            const isCompleted = matchup.status === 'completed'
            const isLive = matchup.status === 'live'

            return (
              <div
                key={matchup.id}
                className="bg-slate-900 rounded-xl p-6 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-400">Week {matchup.week}</span>
                  {isLive && (
                    <span className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                      <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {isCompleted && (
                    <span className="flex items-center gap-2 px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-medium">
                      <Trophy className="w-3 h-3" />
                      FINAL
                    </span>
                  )}
                  {!isLive && !isCompleted && (
                    <span className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                      <Clock className="w-3 h-3" />
                      UPCOMING
                    </span>
                  )}
                </div>

                {/* Teams */}
                <div className="space-y-3">
                  {/* Home Team */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg transition-all",
                      isCompleted && homeWinning
                        ? "bg-green-500/10 border-2 border-green-500/30"
                        : "bg-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">
                          {matchup.homeTeam.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{matchup.homeTeam.name}</p>
                        <p className="text-xs text-slate-400">{matchup.homeTeam.owner}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {isCompleted || isLive ? matchup.homeTeam.score.toFixed(1) : matchup.homeTeam.projected.toFixed(1)}
                      </p>
                      {!isCompleted && (
                        <p className="text-xs text-slate-400">
                          proj: {matchup.homeTeam.projected.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg transition-all",
                      isCompleted && !homeWinning
                        ? "bg-green-500/10 border-2 border-green-500/30"
                        : "bg-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">
                          {matchup.awayTeam.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{matchup.awayTeam.name}</p>
                        <p className="text-xs text-slate-400">{matchup.awayTeam.owner}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {isCompleted || isLive ? matchup.awayTeam.score.toFixed(1) : matchup.awayTeam.projected.toFixed(1)}
                      </p>
                      {!isCompleted && (
                        <p className="text-xs text-slate-400">
                          proj: {matchup.awayTeam.projected.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Margin */}
                {(isCompleted || isLive) && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Margin</span>
                      <span className="font-medium text-white">
                        {Math.abs(matchup.homeTeam.score - matchup.awayTeam.score).toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </ModernLayout>
  )
}
