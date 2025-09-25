import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { prisma } from '@/lib/prisma'
import { 
  TrophyIcon, 
  ChartBarIcon, 
  UsersIcon, 
  CalendarIcon,
  SparklesIcon,
  FireIcon
} from '@heroicons/react/24/outline'

async function getDashboardData(userId: string) {
  // Get user's teams and leagues
  const userTeams = await prisma.team.findMany({
    where: { ownerId: userId },
    include: {
      league: {
        select: {
          id: true,
          name: true,
          currentWeek: true
        }
      },
      homeMatchups: {
        where: {
          week: 1, // Current week
          season: 2024
        },
        include: {
          awayTeam: {
            select: { name: true, ownerId: true }
          }
        }
      },
      awayMatchups: {
        where: {
          week: 1,
          season: 2024
        },
        include: {
          homeTeam: {
            select: { name: true, ownerId: true }
          }
        }
      },
      roster: {
        include: {
          player: {
            select: {
              id: true,
              name: true,
              position: true,
              nflTeam: true
            }
          }
        },
        take: 5 // Top 5 players
      }
    }
  })

  // Get recent player news
  const recentNews = await prisma.playerNews.findMany({
    include: {
      player: {
        select: {
          name: true,
          position: true,
          nflTeam: true
        }
      }
    },
    orderBy: { publishedAt: 'desc' },
    take: 5
  })

  // Get league standings for user's leagues
  const standings = await Promise.all(
    userTeams.map(async (team: any) => {
      const leagueTeams = await prisma.team.findMany({
        where: { leagueId: team.leagueId },
        orderBy: [
          { wins: 'desc' },
          { losses: 'asc' }
        ],
        select: {
          id: true,
          name: true,
          wins: true,
          losses: true,
          ties: true,
          owner: {
            select: { name: true }
          }
        }
      })
      return {
        leagueId: team.leagueId,
        leagueName: team.league.name,
        teams: leagueTeams,
        userTeamId: team.id
      }
    })
  )

  return {
    userTeams,
    recentNews,
    standings
  }
}

export default async function DashboardPage() {
  let session = null
  try {
    session = await auth()
  } catch (error) {
    console.warn('Session fetch failed:', error)
  }
  
  if (!session || !session.user) {
    redirect('/auth/signin')
  }

  // Ensure we have a user ID
  const userId = session.user.id || session.user.sub
  if (!userId) {
    console.error('No user ID found in session:', session)
    redirect('/auth/signin')
  }

  const data = await getDashboardData(userId)

  const stats = [
    { 
      name: 'Active Leagues', 
      value: data.userTeams.length, 
      icon: TrophyIcon,
      color: 'text-blue-400'
    },
    { 
      name: 'Total Points', 
      value: data.userTeams.reduce((sum: number, team: any) => sum + (team.wins * 100 + team.ties * 50), 0).toString(), 
      icon: ChartBarIcon,
      color: 'text-green-400'
    },
    { 
      name: 'Win Rate', 
      value: data.userTeams.length > 0 
        ? ((data.userTeams.reduce((sum, team) => sum + team.wins, 0) / 
           data.userTeams.reduce((sum, team) => sum + (team.wins + team.losses + team.ties), 0)) * 100).toFixed(0) + '%'
        : '0%', 
      icon: FireIcon,
      color: 'text-orange-400'
    },
    { 
      name: 'Current Week', 
      value: data.userTeams[0]?.league.currentWeek || 1, 
      icon: CalendarIcon,
      color: 'text-purple-400'
    }
  ]

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {session.user.name || 'Player'}!
          </h1>
          <p className="text-gray-400 mt-2">
            Here's what's happening in your fantasy leagues
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color}`}>
                  <stat.icon className="h-8 w-8" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Teams */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <UsersIcon className="h-5 w-5 mr-2 text-blue-400" />
                My Teams
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {data.userTeams.length > 0 ? (
                data.userTeams.map((team) => {
                  const matchup = team.homeMatchups[0] || team.awayMatchups[0]
                  return (
                    <div key={team.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-white">{team.name}</h3>
                        <p className="text-sm text-gray-400">{team.league.name}</p>
                        <p className="text-xs text-gray-500">
                          {team.wins}W - {team.losses}L - {team.ties}T
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">
                          {team.wins}-{team.losses}-{team.ties}
                        </p>
                        {matchup && (
                          <p className="text-xs text-gray-400">
                            vs {(matchup as any).awayTeam?.name || (matchup as any).homeTeam?.name}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <TrophyIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No active teams</p>
                  <p className="text-sm text-gray-500">Join a league to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent News */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-purple-400" />
                Latest News
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {data.recentNews.length > 0 ? (
                data.recentNews.map((news) => (
                  <div key={news.id} className="border-b border-slate-700 last:border-b-0 pb-4 last:pb-0">
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold position-${news.player.position.toLowerCase()}`}>
                        {news.player.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {news.player.name} ({news.player.nflTeam})
                        </p>
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {news.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(news.publishedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <SparklesIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No recent news</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* League Standings */}
        {data.standings.length > 0 && (
          <div className="mt-8 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">League Standings</h2>
            </div>
            <div className="p-6">
              {data.standings.map((standing) => (
                <div key={standing.leagueId} className="mb-6 last:mb-0">
                  <h3 className="font-medium text-white mb-4">{standing.leagueName}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-slate-700">
                          <th className="text-left py-2">Team</th>
                          <th className="text-center py-2">W-L-T</th>
                          <th className="text-right py-2">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standing.teams.map((team, index) => (
                          <tr 
                            key={team.id} 
                            className={`border-b border-slate-700/50 last:border-b-0 ${
                              team.id === standing.userTeamId ? 'bg-blue-500/10' : ''
                            }`}
                          >
                            <td className="py-3">
                              <div className="flex items-center">
                                <span className="text-gray-400 w-6">{index + 1}.</span>
                                <span className={team.id === standing.userTeamId ? 'text-blue-400 font-medium' : 'text-white'}>
                                  {team.name}
                                </span>
                              </div>
                            </td>
                            <td className="text-center py-3 text-gray-300">
                              {team.wins}-{team.losses}-{team.ties}
                            </td>
                            <td className="text-right py-3 text-gray-300">
                              {team.wins * 100 + team.ties * 50}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/ai-coach" className="block p-6 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30 hover:border-purple-400/50 transition-colors group">
            <SparklesIcon className="h-8 w-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-2">AI Coach</h3>
            <p className="text-sm text-gray-300">Get personalized lineup and trade recommendations</p>
          </a>
          
          <a href="/players" className="block p-6 bg-gradient-to-r from-green-600/20 to-teal-600/20 rounded-lg border border-green-500/30 hover:border-green-400/50 transition-colors group">
            <ChartBarIcon className="h-8 w-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-2">Player Research</h3>
            <p className="text-sm text-gray-300">Analyze player stats and projections</p>
          </a>
          
          <a href="/team" className="block p-6 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-lg border border-orange-500/30 hover:border-orange-400/50 transition-colors group">
            <UsersIcon className="h-8 w-8 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-2">Manage Team</h3>
            <p className="text-sm text-gray-300">Set lineups and make roster moves</p>
          </a>
        </div>
      </div>
    </DashboardLayout>
  )
}