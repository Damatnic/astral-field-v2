import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { phoenixDb, getOptimizedDashboardData } from '@/lib/optimized-prisma'
import { ClientOnly, LazyHydrate } from '@/components/performance/catalyst-hydration-boundary'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

// Emoji-based icons to replace heroicons
const TrophyIcon = ({ className }: { className?: string }) => <span className={`w-5 h-5 flex items-center justify-center ${className}`}>🏆</span>
const ChartBarIcon = ({ className }: { className?: string }) => <span className={`w-5 h-5 flex items-center justify-center ${className}`}>📊</span>
const UsersIcon = ({ className }: { className?: string }) => <span className={`w-5 h-5 flex items-center justify-center ${className}`}>👥</span>
const CalendarIcon = ({ className }: { className?: string }) => <span className={`w-5 h-5 flex items-center justify-center ${className}`}>📅</span>
const SparklesIcon = ({ className }: { className?: string }) => <span className={`w-5 h-5 flex items-center justify-center ${className}`}>✨</span>
const FireIcon = ({ className }: { className?: string }) => <span className={`w-5 h-5 flex items-center justify-center ${className}`}>🔥</span>

// Catalyst: Optimized dashboard data fetching with caching and single query
async function getDashboardData(userId: string) {
  try {
    console.log('[Catalyst] Fetching optimized dashboard data for user:', userId)
    const startTime = performance.now()
    
    // Try optimized single query first
    let optimizedData = await getOptimizedDashboardData(userId)
    
    if (optimizedData && Array.isArray(optimizedData) && optimizedData.length > 0) {
      const endTime = performance.now()
      console.log(`[Catalyst] Optimized query completed in ${(endTime - startTime).toFixed(2)}ms`)
      
      // Transform optimized data
      const userTeams = optimizedData.map((row: any) => ({
        id: row.id,
        name: row.name,
        wins: row.wins,
        losses: row.losses,
        ties: row.ties,
        league: {
          id: row.leagueId,
          name: row.league_name,
          currentWeek: row.currentWeek
        },
        opponentName: row.opponent_name,
        rosterPlayers: row.roster_players || []
      }))
      
      const recentNews = optimizedData[0]?.news_data || []
      
      return {
        userTeams,
        recentNews,
        standings: [] // Calculate separately if needed
      }
    }
    
    // Fallback to Phoenix DB service
    console.log('[Catalyst] Falling back to Phoenix service')
    const userWithRelations = await phoenixDb.findUserWithRelations(userId)
    
    if (!userWithRelations) {
      console.log('[Catalyst] No user found, creating demo data')
      // Create demo data using Phoenix service
      return {
        userTeams: [],
        recentNews: [],
        standings: []
      }
    }
    
    const endTime = performance.now()
    console.log(`[Catalyst] Phoenix fallback completed in ${(endTime - startTime).toFixed(2)}ms`)
    
    return {
      userTeams: userWithRelations.teams || [],
      recentNews: [],
      standings: []
    }
    
  } catch (error) {
    console.error('[Catalyst] Dashboard data fetch error:', error)
    return {
      userTeams: [],
      recentNews: [],
      standings: []
    }
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

  let data
  try {
    data = await getDashboardData(userId)
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    data = { userTeams: [], recentNews: [], standings: [] }
  }

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
        ? ((data.userTeams.reduce((sum: number, team: any) => sum + team.wins, 0) / 
           data.userTeams.reduce((sum: number, team: any) => sum + (team.wins + team.losses + team.ties), 0)) * 100).toFixed(0) + '%'
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
      <div className="p-4 mobile:p-4 sm:p-6 lg:p-8 pt-8 mobile:pt-6 lg:pt-8 safe-area-top">
        {/* Header - Mobile optimized */}
        <div className="mb-6 mobile:mb-4">
          <h1 className="text-2xl mobile:text-xl sm:text-3xl font-bold text-white">
            Welcome back, {session.user.name || 'Player'}!
          </h1>
          <p className="text-gray-400 mt-2 text-sm mobile:text-sm sm:text-base">
            Here's what's happening in your fantasy leagues
          </p>
        </div>

        {/* Stats Cards - Mobile responsive grid */}
        <div className="grid grid-cols-2 mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mobile:gap-3 sm:gap-6 mb-6 mobile:mb-4">
          {stats.map((stat: any) => (
            <div key={stat.name} className="bg-slate-800/50 rounded-xl mobile:rounded-lg p-4 mobile:p-3 sm:p-6 border border-slate-700 touch-manipulation">
              <div className="flex items-center mobile:flex-col mobile:items-start sm:flex-row sm:items-center">
                <div className={`flex-shrink-0 ${stat.color} mobile:mb-2 sm:mb-0`}>
                  <stat.icon className="h-6 w-6 mobile:h-5 mobile:w-5 sm:h-8 sm:w-8" />
                </div>
                <div className="ml-0 mobile:ml-0 sm:ml-4">
                  <p className="text-xs mobile:text-xs sm:text-sm font-medium text-gray-400">{stat.name}</p>
                  <p className="text-lg mobile:text-base sm:text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 mobile:grid-cols-1 lg:grid-cols-2 gap-6 mobile:gap-4 lg:gap-8">
          {/* My Teams - Lazy Load */}
          <LazyHydrate 
            fallback={
              <div className="bg-slate-800/50 rounded-xl mobile:rounded-lg border border-slate-700 animate-pulse">
                <div className="p-4 mobile:p-4 sm:p-6 border-b border-slate-700">
                  <div className="h-6 bg-slate-700 rounded w-32"></div>
                </div>
                <div className="p-4 mobile:p-4 sm:p-6 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-slate-700 rounded"></div>
                  ))}
                </div>
              </div>
            }
          >
            <div className="bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <UsersIcon className="h-5 w-5 mr-2 text-blue-400" />
                  My Teams
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <ClientOnly
                  fallback={
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-700/30 rounded animate-pulse"></div>
                      ))}
                    </div>
                  }
                >
                  {data.userTeams.length > 0 ? (
                    data.userTeams.map((team: any) => {
                      const matchup = team.homeMatchups?.[0] || team.awayMatchups?.[0]
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
                </ClientOnly>
              </div>
            </div>
          </LazyHydrate>

          {/* Recent News - Lazy Load */}
          <LazyHydrate
            fallback={
              <div className="bg-slate-800/50 rounded-lg border border-slate-700 animate-pulse">
                <div className="p-6 border-b border-slate-700">
                  <div className="h-6 bg-slate-700 rounded w-32"></div>
                </div>
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-slate-700 rounded"></div>
                  ))}
                </div>
              </div>
            }
          >
            <div className="bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-2 text-purple-400" />
                  Latest News
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <ClientOnly
                  fallback={
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-slate-700/30 rounded animate-pulse"></div>
                      ))}
                    </div>
                  }
                >
                  {data.recentNews.length > 0 ? (
                    data.recentNews.map((news: any) => (
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
                </ClientOnly>
              </div>
            </div>
          </LazyHydrate>
        </div>

        {/* League Standings */}
        {data.standings.length > 0 && (
          <div className="mt-8 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">League Standings</h2>
            </div>
            <div className="p-6">
              {data.standings.map((standing: any) => (
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
                        {standing.teams.map((team: any, index: number) => (
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