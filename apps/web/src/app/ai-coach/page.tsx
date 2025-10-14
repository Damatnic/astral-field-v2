/**
 * AI Coach Page - Complete Rebuild
 * AI-powered lineup recommendations and insights
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { StatCard } from '@/components/ui/stat-card'
import { ActionButton } from '@/components/ui/action-button'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  Brain,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react'
import { prisma } from '@/lib/database/prisma'

async function getAICoachData(userId: string) {
  try {
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
                projectedPoints: true,
              },
            },
          },
        },
        league: {
          select: {
            currentWeek: true,
          },
        },
      },
    })

    return { team }
  } catch (error) {
    console.error('Error fetching AI coach data:', error)
    return { team: null }
  }
}

interface Recommendation {
  type: 'start' | 'sit' | 'add' | 'drop' | 'trade'
  player: string
  reason: string
  confidence: number
  impact: string
}

// Mock recommendations (replace with real AI later)
const mockRecommendations: Recommendation[] = [
  {
    type: 'start',
    player: 'Tyreek Hill',
    reason: 'Favorable matchup vs DEN (ranked 28th vs WR). Averaging 12+ targets in last 3 games.',
    confidence: 94,
    impact: '+8.2 pts projected',
  },
  {
    type: 'sit',
    player: 'Josh Jacobs',
    reason: 'Tough matchup vs SF (ranked 1st vs RB). Limited to 3.2 YPC in last 2 games.',
    confidence: 87,
    impact: '-4.5 pts projected',
  },
  {
    type: 'add',
    player: 'Jerome Ford',
    reason: 'Nick Chubb out. Ford has RB1 upside with 20+ touches expected.',
    confidence: 91,
    impact: 'High upside',
  },
  {
    type: 'trade',
    player: 'Travis Kelce',
    reason: 'Buy-low opportunity. TE1 value with upcoming favorable schedule.',
    confidence: 85,
    impact: 'Season-long value',
  },
]

export default async function AICoachPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { team } = await getAICoachData(session.user.id)
  const currentWeek = team?.league?.currentWeek || 1

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title="Nova AI Coach"
          description="AI-powered insights and recommendations to dominate your league"
          icon={Brain}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'AI Coach' },
          ]}
        />

        {/* AI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="AI Confidence"
            value="89%"
            icon={Brain}
            trend="up"
            trendValue="+3%"
            description="this week"
            variant="success"
          />

          <StatCard
            label="Recommendations"
            value={mockRecommendations.length}
            icon={Sparkles}
            description="active insights"
            variant="info"
          />

          <StatCard
            label="Accuracy"
            value="87%"
            icon={Target}
            trend="up"
            description="historical"
            variant="success"
          />

          <StatCard
            label="Points Gained"
            value="+24.3"
            icon={TrendingUp}
            trend="up"
            description="from AI advice"
            variant="success"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommendations - Larger section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Week {currentWeek} Recommendations</h2>
              <ActionButton variant="ghost" size="sm" icon={Zap}>
                Refresh
              </ActionButton>
            </div>

            <div className="space-y-3">
              {mockRecommendations.map((rec, index) => (
                <ModernCard key={index} variant="glass" hover>
                  <ModernCardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Type Badge */}
                      <div className={`p-3 rounded-xl ${
                        rec.type === 'start' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                        rec.type === 'sit' ? 'bg-red-500/20 border border-red-500/30' :
                        rec.type === 'add' ? 'bg-blue-500/20 border border-blue-500/30' :
                        rec.type === 'drop' ? 'bg-amber-500/20 border border-amber-500/30' :
                        'bg-purple-500/20 border border-purple-500/30'
                      }`}>
                        {rec.type === 'start' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : rec.type === 'sit' ? (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        ) : rec.type === 'add' ? (
                          <TrendingUp className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-purple-400" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            rec.type === 'start' ? 'bg-emerald-500/20 text-emerald-400' :
                            rec.type === 'sit' ? 'bg-red-500/20 text-red-400' :
                            rec.type === 'add' ? 'bg-blue-500/20 text-blue-400' :
                            rec.type === 'drop' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {rec.type}
                          </span>
                          <h3 className="font-semibold text-white">{rec.player}</h3>
                        </div>

                        <p className="text-sm text-slate-300 mb-3">
                          {rec.reason}
                        </p>

                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                style={{ width: `${rec.confidence}%` }}
                              />
                            </div>
                            <span className="text-slate-400">{rec.confidence}% confidence</span>
                          </div>
                          <span className="text-slate-500">•</span>
                          <span className="text-purple-400 font-medium">{rec.impact}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <ActionButton variant="ghost" size="sm">
                        <ArrowRight className="w-4 h-4" />
                      </ActionButton>
                    </div>
                  </ModernCardContent>
                </ModernCard>
              ))}
            </div>
          </div>

          {/* Sidebar - Quick Actions */}
          <div className="space-y-4">
            {/* Lineup Optimizer */}
            <ModernCard variant="gradient" glow>
              <ModernCardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <ModernCardTitle className="text-base">Lineup Optimizer</ModernCardTitle>
                </div>
              </ModernCardHeader>
              <ModernCardContent>
                <p className="text-sm text-slate-400 mb-4">
                  Let AI automatically set your optimal lineup for Week {currentWeek}
                </p>
                <ActionButton variant="primary" size="sm" icon={Zap} fullWidth>
                  Optimize Lineup
                </ActionButton>
              </ModernCardContent>
            </ModernCard>

            {/* Trade Analyzer */}
            <ModernCard variant="glass">
              <ModernCardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Target className="w-4 h-4 text-blue-400" />
                  </div>
                  <ModernCardTitle className="text-base">Trade Analyzer</ModernCardTitle>
                </div>
              </ModernCardHeader>
              <ModernCardContent>
                <p className="text-sm text-slate-400 mb-4">
                  Get AI analysis on any trade proposal with fairness ratings
                </p>
                <ActionButton variant="outline" size="sm" icon={ArrowRight} fullWidth>
                  Analyze Trade
                </ActionButton>
              </ModernCardContent>
            </ModernCard>

            {/* Waiver Wire */}
            <ModernCard variant="glass">
              <ModernCardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <ModernCardTitle className="text-base">Waiver Targets</ModernCardTitle>
                </div>
              </ModernCardHeader>
              <ModernCardContent>
                <p className="text-sm text-slate-400 mb-4">
                  AI-recommended free agents to add to your roster
                </p>
                <ActionButton variant="outline" size="sm" icon={ArrowRight} fullWidth>
                  View Targets
                </ActionButton>
              </ModernCardContent>
            </ModernCard>

            {/* AI Info */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-1">How it works</h4>
                  <p className="text-xs text-blue-400/80 leading-relaxed">
                    Our AI analyzes millions of data points including player stats, matchups, 
                    weather, injuries, and trends to provide personalized recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
