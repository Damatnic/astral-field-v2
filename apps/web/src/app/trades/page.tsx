'use client'

/**
 * Trades Page - Elite Trade Center
 * AI-powered trade builder with fairness analysis
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { VisualTradeBuilder } from '@/components/trades/visual-trade-builder'
import { 
  ArrowLeftRight, 
  Sparkles,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface TradeData {
  myTeam: {
    id: string
    name: string
    roster: Array<{
      id: string
      player: {
        id: string
        name: string
        position: string
        team: string
        fantasyPoints: number
      }
    }>
  }
  leagueTeams: Array<{
    id: string
    name: string
    roster: Array<{
      id: string
      player: {
        id: string
        name: string
        position: string
        team: string
        fantasyPoints: number
      }
    }>
  }>
  recentTrades: Array<{
    id: string
    status: string
    createdAt: string
    fromTeam: { name: string }
    toTeam: { name: string }
  }>
}

export default function TradesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tradeData, setTradeData] = useState<TradeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user?.id) {
      loadTradeData()
    }
  }, [status, session, router])

  const loadTradeData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/trades?userId=${session?.user?.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch trade data')
      }
      
      const data = await response.json()
      setTradeData(data)
    } catch (err) {
      console.error('Error loading trade data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trade data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading trade center...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !tradeData) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
          <PageHeader
            title="Trading Center"
            description="Negotiate trades with other teams"
            icon={ArrowLeftRight}
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Trading Center' },
            ]}
          />

          <EmptyState
            icon={AlertCircle}
            title="Error Loading Trades"
            description={error || 'Unable to load trade data'}
            action={{
              label: "Try Again",
              onClick: loadTradeData,
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title="Trading Center"
          description="Negotiate trades with other teams"
          icon={ArrowLeftRight}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Trading Center' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <ActionButton variant="outline" size="sm" icon={Plus}>
                Propose Trade
              </ActionButton>
              <ActionButton variant="primary" size="sm" icon={Sparkles}>
                AI Trade Helper
              </ActionButton>
            </div>
          }
        />

        {/* Trade Block */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your Trade Block */}
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                Your Trade Block
              </ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-3">
                {tradeData.myTeam.roster.slice(0, 5).map((roster) => (
                  <div
                    key={roster.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{roster.player.name}</div>
                      <div className="text-xs text-slate-400">{roster.player.position} • {roster.player.team}</div>
                    </div>
                    <div className="text-sm font-semibold text-green-400">
                      {roster.player.fantasyPoints.toFixed(1)} pts
                    </div>
                  </div>
                ))}
                <div className="text-center py-4">
                  <ActionButton variant="outline" size="sm" icon={Plus}>
                    Add Players to Block
                  </ActionButton>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* League Trade Block */}
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-400" />
                League Trade Block
              </ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-3">
                {tradeData.leagueTeams.slice(0, 3).map((team) => (
                  <div key={team.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="text-sm font-medium text-white mb-2">{team.name}</div>
                    <div className="space-y-2">
                      {team.roster.slice(0, 3).map((roster) => (
                        <div key={roster.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{roster.player.name}</span>
                          <span className="text-green-400">{roster.player.fantasyPoints.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Recent Trades */}
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle className="flex items-center">
              <ArrowLeftRight className="w-5 h-5 mr-2 text-purple-400" />
              Recent Trades
            </ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            {tradeData.recentTrades.length > 0 ? (
              <div className="space-y-3">
                {tradeData.recentTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        trade.status === 'completed' ? 'bg-green-400' : 
                        trade.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-white">
                          {trade.fromTeam.name} ↔ {trade.toTeam.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(trade.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${
                      trade.status === 'completed' ? 'text-green-400' : 
                      trade.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {trade.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title="No Recent Trades"
                description="No trades have been completed recently in your league"
              />
            )}
          </ModernCardContent>
        </ModernCard>

        {/* AI Trade Analysis */}
        <ModernCard variant="gradient" glow>
          <ModernCardHeader>
            <ModernCardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
              AI Trade Analysis
            </ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-green-400">+12.3</div>
                <div className="text-sm text-slate-400">Projected Points Gain</div>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">85%</div>
                <div className="text-sm text-slate-400">Trade Success Rate</div>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">3</div>
                <div className="text-sm text-slate-400">Recommended Trades</div>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>
    </DashboardLayout>
  )
}