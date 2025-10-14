/**
 * Trades Page - Complete Rebuild
 * Modern trade center with AI-powered analysis
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { ActionButton } from '@/components/ui/action-button'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown, 
  Sparkles,
  Users,
  Plus,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getTradesData(userId: string) {
  try {
    // Get user's team
    const team = await prisma.team.findFirst({
      where: { userId },
      include: {
        roster: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                team: true,
                fantasyPoints: true,
              },
            },
          },
        },
        league: {
          select: {
            name: true,
            teams: {
              where: {
                userId: {
                  not: userId,
                },
              },
              take: 5,
              select: {
                id: true,
                name: true,
                userId: true,
              },
            },
          },
        },
      },
    })

    // Get recent trades
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { proposingTeamId: team?.id },
          { receivingTeamId: team?.id },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        proposingTeam: {
          select: {
            name: true,
          },
        },
        receivingTeam: {
          select: {
            name: true,
          },
        },
      },
    })

    return {
      team,
      trades,
    }
  } catch (error) {
    console.error('Error fetching trades data:', error)
    return {
      team: null,
      trades: [],
    }
  }
}

export default async function TradesPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { team, trades } = await getTradesData(session.user.id)

  // Calculate trade stats
  const pendingTrades = trades.filter(t => t.status === 'pending').length
  const acceptedTrades = trades.filter(t => t.status === 'accepted').length
  const rejectedTrades = trades.filter(t => t.status === 'rejected').length

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title="Trade Center"
          description="Propose trades and get AI-powered analysis to make winning deals"
          icon={ArrowLeftRight}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Trades' },
          ]}
          actions={
            <ActionButton variant="primary" icon={Plus}>
              Propose Trade
            </ActionButton>
          }
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trade Builder - Takes 2 columns */}
          <ModernCard variant="gradient" glow className="lg:col-span-2">
            <ModernCardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <ModernCardTitle>Build a Trade</ModernCardTitle>
                  <p className="text-sm text-slate-400 mt-1">
                    Select players to trade and get instant AI analysis
                  </p>
                </div>
              </div>
            </ModernCardHeader>

            <ModernCardContent>
              <div className="space-y-6">
                {/* Trade Setup */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Your Team */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">You're Trading</h3>
                      <ActionButton variant="ghost" size="sm" icon={Plus}>
                        Add
                      </ActionButton>
                    </div>
                    <div className="min-h-[200px] p-4 rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/50">
                      <EmptyState
                        title="Select players"
                        description="Add players from your roster"
                      />
                    </div>
                  </div>

                  {/* Receiving */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">You're Receiving</h3>
                      <ActionButton variant="ghost" size="sm" icon={Plus}>
                        Add
                      </ActionButton>
                    </div>
                    <div className="min-h-[200px] p-4 rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/50">
                      <EmptyState
                        title="Select players"
                        description="Add players from other teams"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Analysis Preview */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/30">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">AI Trade Analyzer</h3>
                      <p className="text-sm text-slate-400">
                        Add players to both sides to get instant AI-powered trade analysis with fairness ratings,
                        impact metrics, and personalized recommendations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <ActionButton variant="primary" icon={Sparkles} className="flex-1">
                    Analyze Trade
                  </ActionButton>
                  <ActionButton variant="outline" icon={Users} className="flex-1">
                    Select Team
                  </ActionButton>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Trade Stats & Activity */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <ModernCard variant="glass">
              <ModernCardHeader>
                <ModernCardTitle className="text-base">Trade Activity</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Pending</span>
                  </div>
                  <span className="text-lg font-bold text-white">{pendingTrades}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Accepted</span>
                  </div>
                  <span className="text-lg font-bold text-white">{acceptedTrades}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Rejected</span>
                  </div>
                  <span className="text-lg font-bold text-white">{rejectedTrades}</span>
                </div>
              </ModernCardContent>
            </ModernCard>

            {/* Trade Block */}
            <ModernCard variant="glass">
              <ModernCardHeader>
                <div className="flex items-center justify-between">
                  <ModernCardTitle className="text-base">League Trade Block</ModernCardTitle>
                  <ActionButton variant="ghost" size="sm">
                    View All
                  </ActionButton>
                </div>
              </ModernCardHeader>
              <ModernCardContent>
                <div className="space-y-2">
                  {team?.league.teams.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white text-sm">{t.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">Looking to trade</p>
                        </div>
                        <ActionButton variant="ghost" size="sm">
                          View
                        </ActionButton>
                      </div>
                    </div>
                  ))}

                  {(!team?.league.teams || team.league.teams.length === 0) && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      No active trade offers
                    </div>
                  )}
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        </div>

        {/* Recent Trades */}
        <ModernCard variant="glass">
          <ModernCardHeader>
            <ModernCardTitle>Recent Trade History</ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            {trades.length > 0 ? (
              <div className="space-y-2">
                {trades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        trade.status === 'accepted' ? 'bg-emerald-500/20' :
                        trade.status === 'rejected' ? 'bg-red-500/20' :
                        'bg-amber-500/20'
                      }`}>
                        {trade.status === 'accepted' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : trade.status === 'rejected' ? (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {trade.proposingTeam.name} ⇄ {trade.receivingTeam.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(trade.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                      trade.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {trade.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title="No trade history yet"
                description="Your trade activity will appear here"
                action={{
                  label: "Propose Your First Trade",
                  onClick: () => {},
                  icon: Plus,
                }}
              />
            )}
          </ModernCardContent>
        </ModernCard>
      </div>
    </DashboardLayout>
  )
}
