import type { Viewport } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { TradeCenter } from '@/components/trades/trade-center'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'Trades - AstralField',
  description: 'Manage fantasy football trades and proposals'
}

export const viewport: Viewport = {
  themeColor: '#0f172a'
}

async function getUserTeams(userId: string) {
  try {
    const userTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      include: {
        league: {
          select: { 
            id: true, 
            name: true, 
            currentWeek: true,
            settings: {
              select: { commissionerId: true }
            }
          }
        },
        roster: {
          include: {
            player: {
              include: {
                projections: {
                  where: { week: null }, // Season projections
                  take: 1
                },
                stats: {
                  where: { week: 4, season: 2025 },
                  take: 1
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return userTeams.map(team => ({
      id: team.id,
      name: team.name,
      league: team.league,
      roster: team.roster.map(rp => ({
        ...rp.player,
        rosterPosition: rp.position,
        isStarter: rp.isStarter
      })),
      isCommissioner: team.league.settings?.commissionerId === userId
    }))
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch user teams:', error);
    }
    return []
  }
}

async function getTradeStats(userId: string) {
  try {
    const userTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      select: { id: true }
    })

    const userTeamIds = userTeams.map(t => t.id)

    const [totalTrades, pendingTrades, acceptedTrades, rejectedTrades] = await Promise.all([
      prisma.tradeProposal.count({
        where: {
          OR: [
            { proposingTeamId: { in: userTeamIds } },
            { receivingTeamId: { in: userTeamIds } }
          ]
        }
      }),
      prisma.tradeProposal.count({
        where: {
          status: 'PENDING',
          OR: [
            { proposingTeamId: { in: userTeamIds } },
            { receivingTeamId: { in: userTeamIds } }
          ]
        }
      }),
      prisma.tradeProposal.count({
        where: {
          status: 'ACCEPTED',
          OR: [
            { proposingTeamId: { in: userTeamIds } },
            { receivingTeamId: { in: userTeamIds } }
          ]
        }
      }),
      prisma.tradeProposal.count({
        where: {
          status: 'REJECTED',
          OR: [
            { proposingTeamId: { in: userTeamIds } },
            { receivingTeamId: { in: userTeamIds } }
          ]
        }
      })
    ])

    return {
      totalTrades,
      pendingTrades,
      acceptedTrades,
      rejectedTrades,
      successRate: totalTrades > 0 ? ((acceptedTrades / totalTrades) * 100).toFixed(1) : '0'
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch trade stats:', error);
    }
    return {
      totalTrades: 0,
      pendingTrades: 0,
      acceptedTrades: 0,
      rejectedTrades: 0,
      successRate: '0'
    }
  }
}

export default async function TradesPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const [userTeams, tradeStats] = await Promise.all([
    getUserTeams(session.user.id),
    getTradeStats(session.user.id)
  ])

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Trade Center</h1>
              <p className="text-gray-400 mt-2">
                Manage your fantasy football trades and proposals
              </p>
            </div>
          </div>

          {/* Trade Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold text-white">{tradeStats.totalTrades}</div>
              <div className="text-sm text-gray-400">Total Trades</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold text-yellow-400">{tradeStats.pendingTrades}</div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold text-green-400">{tradeStats.acceptedTrades}</div>
              <div className="text-sm text-gray-400">Accepted</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold text-red-400">{tradeStats.rejectedTrades}</div>
              <div className="text-sm text-gray-400">Rejected</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold text-blue-400">{tradeStats.successRate}%</div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Team Selection and Trade Center */}
        {userTeams.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Teams Found</h3>
            <p className="text-gray-400 mb-6">Join a league to start trading players</p>
            <a
              href="/leagues"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              Browse Leagues
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Your Teams */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {userTeams.map(team => (
                <div key={team.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{team.name}</h3>
                      <p className="text-sm text-gray-400">{team.league.name}</p>
                    </div>
                    {team.isCommissioner && (
                      <div className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">
                        Commissioner
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    {team.roster.length} players • Week {team.league.currentWeek}
                  </div>
                </div>
              ))}
            </div>

            {/* Trade Center Component */}
            <TradeCenter
              leagueId={userTeams[0].league.id} // Default to first league
              currentUserId={session.user.id}
              userTeams={userTeams}
            />
          </div>
        )}

        {/* Trade Tips */}
        <div className="mt-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Trade Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-400">Fair Value</h4>
              <p className="text-sm text-gray-400">
                Aim for trades where both sides receive similar projected points. The system automatically calculates trade fairness.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-400">Timing Matters</h4>
              <p className="text-sm text-gray-400">
                Trades typically take 24-48 hours to process. Consider upcoming matchups and bye weeks when proposing trades.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-400">Communication</h4>
              <p className="text-sm text-gray-400">
                Include a message explaining your trade rationale. Clear communication increases acceptance rates significantly.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Trade Activity */}
        <div className="mt-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">League Trade Activity</h3>
          <div className="space-y-3">
            {/* Sample trade activity - would be real data in production */}
            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div>
                <div className="text-sm text-white">
                  <span className="font-medium">Team Alpha</span> traded 
                  <span className="font-medium"> Josh Allen</span> to 
                  <span className="font-medium"> Team Beta</span>
                </div>
                <div className="text-xs text-gray-400">2 hours ago</div>
              </div>
              <div className="px-2 py-1 bg-green-600 text-green-100 text-xs rounded">
                Completed
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div>
                <div className="text-sm text-white">
                  <span className="font-medium">Team Gamma</span> proposed trade to 
                  <span className="font-medium"> Team Delta</span>
                </div>
                <div className="text-xs text-gray-400">5 hours ago</div>
              </div>
              <div className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">
                Pending
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div>
                <div className="text-sm text-white">
                  <span className="font-medium">Team Echo</span> rejected trade from 
                  <span className="font-medium"> Team Foxtrot</span>
                </div>
                <div className="text-xs text-gray-400">1 day ago</div>
              </div>
              <div className="px-2 py-1 bg-red-600 text-red-100 text-xs rounded">
                Rejected
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}