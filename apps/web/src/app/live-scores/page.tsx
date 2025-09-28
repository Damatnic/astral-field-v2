import type { Viewport } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { LiveScoreboard } from '@/components/live-scoring/live-scoreboard'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'Live Scores - AstralField',
  description: 'Real-time fantasy football scoring and updates'
}

export const viewport: Viewport = {
  themeColor: '#0f172a'
}

async function getUserLeagues(userId: string) {
  try {
    const userTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      include: {
        league: {
          include: {
            _count: {
              select: { teams: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return userTeams.map(team => ({
      leagueId: team.league.id,
      leagueName: team.league.name,
      teamName: team.name,
      currentWeek: team.league.currentWeek,
      teamCount: team.league._count.teams
    }))
  } catch (error) {
    console.error('Failed to fetch user leagues:', error)
    return []
  }
}

export default async function LiveScoresPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const userLeagues = await getUserLeagues(session.user.id)
  const currentWeek = 4 // Week 4 is currently active

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Live Scores</h1>
              <p className="text-gray-400 mt-2">
                Real-time fantasy football scoring and updates
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-sm text-gray-400">Current Week</div>
                <div className="text-2xl font-bold text-white">{currentWeek}</div>
              </div>
            </div>
          </div>
        </div>

        {/* League Selection and Live Scores */}
        {userLeagues.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Leagues Found</h3>
            <p className="text-gray-400 mb-6">Join or create a league to view live scores</p>
            <a
              href="/leagues"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              Browse Leagues
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {userLeagues.map(league => (
              <div key={league.leagueId} className="space-y-4">
                {/* League Header */}
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{league.leagueName}</h2>
                    <p className="text-gray-400">Your Team: {league.teamName}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">{league.teamCount} Teams</div>
                    <div className="text-sm text-gray-400">Week {league.currentWeek}</div>
                  </div>
                </div>

                {/* Live Scoreboard */}
                <LiveScoreboard
                  leagueId={league.leagueId}
                  week={league.currentWeek}
                  season={2025}
                />
              </div>
            ))}
          </div>
        )}

        {/* Week Selector */}
        <div className="mt-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Week Selector</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-17 gap-2">
            {Array.from({ length: 17 }, (_, i) => i + 1).map(week => (
              <a
                key={week}
                href={`/live-scores?week=${week}`}
                className={`p-3 text-center rounded-md font-medium transition-colors ${
                  week === currentWeek
                    ? 'bg-blue-600 text-white'
                    : week < currentWeek
                    ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    : 'bg-slate-900 text-gray-500 cursor-not-allowed'
                }`}
              >
                <div className="text-xs">Week</div>
                <div>{week}</div>
                {week < currentWeek && <div className="text-xs mt-1">Final</div>}
                {week === currentWeek && <div className="text-xs mt-1">Live</div>}
                {week > currentWeek && <div className="text-xs mt-1">Future</div>}
              </a>
            ))}
          </div>
        </div>

        {/* Live Updates Feed */}
        <div className="mt-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Live Updates</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {/* Sample live updates - would be real data in production */}
            <LiveUpdateItem
              time="2:15 PM"
              player="Josh Allen"
              team="BUF"
              action="20 yard touchdown pass to Stefon Diggs"
              points="+4.8 pts"
              type="TD"
            />
            <LiveUpdateItem
              time="2:12 PM"
              player="Derrick Henry"
              team="TEN"
              action="15 yard rushing touchdown"
              points="+7.5 pts"
              type="TD"
            />
            <LiveUpdateItem
              time="2:08 PM"
              player="Travis Kelce"
              team="KC"
              action="8 yard reception"
              points="+1.3 pts"
              type="REC"
            />
            <LiveUpdateItem
              time="2:05 PM"
              player="Lamar Jackson"
              team="BAL"
              action="12 yard rushing gain"
              points="+1.2 pts"
              type="RUSH"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function LiveUpdateItem({
  time,
  player,
  team,
  action,
  points,
  type
}: {
  time: string
  player: string
  team: string
  action: string
  points: string
  type: string
}) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TD':
        return 'bg-green-600 text-green-100'
      case 'REC':
        return 'bg-blue-600 text-blue-100'
      case 'RUSH':
        return 'bg-purple-600 text-purple-100'
      case 'PASS':
        return 'bg-orange-600 text-orange-100'
      default:
        return 'bg-gray-600 text-gray-100'
    }
  }

  return (
    <div className="flex items-center space-x-4 p-3 bg-slate-700 rounded-lg">
      <div className="text-sm text-gray-400 min-w-[60px]">{time}</div>
      <div className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(type)}`}>
        {type}
      </div>
      <div className="flex-1">
        <div className="text-white font-medium">{player} ({team})</div>
        <div className="text-sm text-gray-400">{action}</div>
      </div>
      <div className="text-green-400 font-medium">{points}</div>
    </div>
  )
}