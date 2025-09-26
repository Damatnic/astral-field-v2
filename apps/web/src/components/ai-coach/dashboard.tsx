'use client'

import { useState, useEffect } from 'react'
import { 
  SparklesIcon, 
  ArrowsRightLeftIcon, 
  TrophyIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AICoachDashboardProps {
  userId: string
}

interface AIRecommendation {
  type: 'lineup' | 'trade' | 'waiver' | 'start_sit'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  action?: string
}

export function AICoachDashboard({ userId }: AICoachDashboardProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'lineup' | 'trades' | 'waivers'>('overview')

  useEffect(() => {
    fetchRecommendations()
  }, [userId])

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`/api/ai-coach/recommendations?userId=${userId}`)
      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error)
      // Mock data for demo
      setRecommendations([
        {
          type: 'lineup',
          title: 'Optimize Your Week 4 Lineup',
          description: 'Your current lineup has Josh Jacobs on the bench, but he has a 78% chance of outscoring your current RB2 this week.',
          confidence: 78,
          impact: 'high',
          action: 'Start Josh Jacobs over current RB2'
        },
        {
          type: 'trade',
          title: 'Trade Opportunity Detected',
          description: 'Consider trading Mike Evans + Tyler Bass for Travis Kelce. This improves your TE position significantly.',
          confidence: 65,
          impact: 'high',
          action: 'Propose trade to Team 3'
        },
        {
          type: 'waiver',
          title: 'Waiver Wire Gem',
          description: 'Gus Edwards is available and has a favorable upcoming schedule. Drop your lowest-scoring bench player.',
          confidence: 72,
          impact: 'medium',
          action: 'Claim Gus Edwards'
        },
        {
          type: 'start_sit',
          title: 'Start/Sit Alert',
          description: 'DJ Moore faces the #1 pass defense this week. Consider benching him for your FLEX option.',
          confidence: 68,
          impact: 'medium',
          action: 'Bench DJ Moore'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'lineup': return TrophyIcon
      case 'trade': return ArrowsRightLeftIcon
      case 'waiver': return SparklesIcon
      case 'start_sit': return ChartBarIcon
      default: return LightBulbIcon
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const executeRecommendation = async (recommendation: AIRecommendation) => {
    toast.info(`Executing: ${recommendation.action}`)
    // Implementation would depend on the specific action
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: SparklesIcon },
    { id: 'lineup', name: 'Lineup', icon: TrophyIcon },
    { id: 'trades', name: 'Trades', icon: ArrowsRightLeftIcon },
    { id: 'waivers', name: 'Waivers', icon: FireIcon },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    )
  }

  const filteredRecommendations = activeTab === 'overview' 
    ? recommendations 
    : recommendations.filter((r: any) => {
        switch (activeTab) {
          case 'lineup': return r.type === 'lineup' || r.type === 'start_sit'
          case 'trades': return r.type === 'trade'
          case 'waivers': return r.type === 'waiver'
          default: return true
        }
      })

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <SparklesIcon className="h-8 w-8 text-purple-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">AI Confidence</p>
              <p className="text-2xl font-bold text-white">
                {recommendations.length > 0 
                  ? Math.round(recommendations.reduce((sum: number, r: any) => sum + r.confidence, 0) / recommendations.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <TrophyIcon className="h-8 w-8 text-blue-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Lineup Score</p>
              <p className="text-2xl font-bold text-white">A-</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Win Probability</p>
              <p className="text-2xl font-bold text-white">67%</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-orange-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Action Items</p>
              <p className="text-2xl font-bold text-white">{recommendations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Recommendations */}
      <div className="space-y-6">
        {filteredRecommendations.length > 0 ? (
          filteredRecommendations.map((recommendation: any, index: number) => {
            const Icon = getRecommendationIcon(recommendation.type)
            
            return (
              <div key={index} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-slate-700 rounded-lg">
                      <Icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {recommendation.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border uppercase ${getImpactColor(recommendation.impact)}`}>
                          {recommendation.impact} impact
                        </span>
                      </div>
                      <p className="text-gray-300 mb-3">
                        {recommendation.description}
                      </p>
                      {recommendation.action && (
                        <p className="text-sm text-blue-400 font-medium">
                          💡 {recommendation.action}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-white mb-1">
                      {recommendation.confidence}%
                    </div>
                    <div className="text-xs text-gray-400">Confidence</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="w-full bg-slate-700 rounded-full h-2 mr-4">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${recommendation.confidence}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toast.info('Detailed analysis coming soon!')}
                    >
                      Details
                    </Button>
                    {recommendation.action && (
                      <Button 
                        size="sm"
                        onClick={() => executeRecommendation(recommendation)}
                      >
                        Execute
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-12">
            <SparklesIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No recommendations available</h3>
            <p className="text-gray-400 mb-6">
              {activeTab === 'overview' 
                ? 'Check back later for AI-powered insights'
                : `No ${activeTab} recommendations at this time`
              }
            </p>
            <Button onClick={fetchRecommendations}>
              <SparklesIcon className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>
        )}
      </div>

      {/* AI Coach Info */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30 p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <LightBulbIcon className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">How AI Coach Works</h3>
            <p className="text-gray-300 mb-4">
              Our AI analyzes thousands of data points including player performance, matchups, weather, 
              injuries, and historical trends to provide personalized recommendations for your team.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                Real-time player analysis
              </div>
              <div className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                Matchup predictions
              </div>
              <div className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Injury risk assessment
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}