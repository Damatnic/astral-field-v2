'use client'

/**
 * AI Coach Page - Complete Rebuild
 * AI-powered lineup recommendations and insights
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { StatCard } from '@/components/ui/stat-card'
import { ActionButton } from '@/components/ui/action-button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
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
  Info,
  Loader2
} from 'lucide-react'

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

export default function AICoachPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      // Load recommendations
      setRecommendations(mockRecommendations)
      setLoading(false)
    }
  }, [status, router])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading AI insights...</p>
        </div>
      </DashboardLayout>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'start': return TrendingUp
      case 'sit': return AlertCircle
      case 'add': return Users
      case 'drop': return Target
      case 'trade': return ArrowRight
      default: return Sparkles
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'start': return 'text-green-400'
      case 'sit': return 'text-red-400'
      case 'add': return 'text-blue-400'
      case 'drop': return 'text-yellow-400'
      case 'trade': return 'text-purple-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title="AI Coach"
          description="AI-powered recommendations to optimize your team"
          icon={Brain}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'AI Coach' },
          ]}
          actions={
            <ActionButton variant="primary" size="sm" icon={Zap}>
              Generate New Analysis
            </ActionButton>
          }
        />

        {/* AI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Confidence Score"
            value="89%"
            icon={Brain}
            trend="up"
            description="recommendation accuracy"
            variant="success"
          />
          <StatCard
            label="Projected Gain"
            value="+12.7"
            icon={Target}
            trend="up"
            description="points this week"
            variant="info"
          />
          <StatCard
            label="Recommendations"
            value={recommendations.length.toString()}
            icon={Sparkles}
            description="active insights"
            variant="default"
          />
          <StatCard
            label="Win Probability"
            value="67%"
            icon={TrendingUp}
            trend="up"
            description="this week"
            variant="success"
          />
        </div>

        {/* AI Recommendations */}
        <div className="space-y-6">
          {recommendations.map((rec, index) => {
            const IconComponent = getTypeIcon(rec.type)
            const colorClass = getTypeColor(rec.type)
            
            return (
              <ModernCard key={index} variant={index === 0 ? "gradient" : "default"} glow={index === 0}>
                <ModernCardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon & Type */}
                    <div className={`p-3 rounded-lg bg-slate-800/50 flex-shrink-0`}>
                      <IconComponent className={`w-6 h-6 ${colorClass}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`text-xs font-bold uppercase ${colorClass}`}>
                              {rec.type}
                            </span>
                            <span className="text-lg font-bold text-white">
                              {rec.player}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {rec.reason}
                          </p>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-slate-800 rounded-full h-2 w-24">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                              style={{ width: `${rec.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">
                            {rec.confidence}% confidence
                          </span>
                        </div>
                        
                        <div className="text-sm font-medium text-green-400">
                          {rec.impact}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4">
                        <button className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                          View Details
                        </button>
                        <span className="text-slate-600">•</span>
                        <button className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors">
                          Apply Suggestion
                        </button>
                        <span className="text-slate-600">•</span>
                        <button className="text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            )
          })}
        </div>

        {/* AI Insights */}
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2 text-blue-400" />
              Weekly Insights
            </ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-blue-400 mb-2">Matchup Advantage</h4>
                <p className="text-sm text-blue-400/80">
                  Your opponent has 3 players on bye this week. This is a great opportunity to secure a win with your full roster active.
                </p>
              </div>
              
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-400 mb-2">Injury Alert</h4>
                <p className="text-sm text-yellow-400/80">
                  Monitor Christian McCaffrey's status. Consider having Elijah Mitchell as a backup plan.
                </p>
              </div>

              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-green-400 mb-2">Waiver Wire Opportunity</h4>
                <p className="text-sm text-green-400/80">
                  Jerome Ford is available and could be a league-winner with Nick Chubb out. Use your #3 waiver priority wisely.
                </p>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>
    </DashboardLayout>
  )
}