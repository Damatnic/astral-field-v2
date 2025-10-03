'use client'

import { useState, useEffect } from 'react'
import { 
  SparklesIcon,
  TrophyIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  FireIcon,
  BeakerIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  CpuChipIcon,
  ClockIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowsRightLeftIcon,
  PlayIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface EnhancedAIDashboardProps {
  userId: string
  leagueId: string
  teamId: string
  currentWeek?: number
}

interface AIInsight {
  type: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  action?: string
  confidence: number
}

interface PlayerPrediction {
  playerId: string
  name: string
  position: string
  projectedPoints: number
  confidence: number
  startSitRecommendation: 'START' | 'SIT' | 'FLEX'
  reasoning: string
}

interface WaiverTarget {
  playerId: string
  name: string
  position: string
  priority: number
  recommendationType: string
  reasoning: string
  projectedValue: number
}

interface TradeOpportunity {
  targetPlayer: string
  offerPlayer: string
  fairnessScore: number
  recommendation: string
  reasoning: string
}

export function EnhancedAIDashboard({ 
  userId, 
  leagueId, 
  teamId, 
  currentWeek = 4 
}: EnhancedAIDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'lineup' | 'waiver' | 'trades' | 'matchup'>('overview')
  const [loading, setLoading] = useState(true)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [playerPredictions, setPlayerPredictions] = useState<PlayerPrediction[]>([])
  const [waiverTargets, setWaiverTargets] = useState<WaiverTarget[]>([])
  const [tradeOpportunities, setTradeOpportunities] = useState<TradeOpportunity[]>([])
  const [lineupOptimization, setLineupOptimization] = useState<any>(null)
  const [matchupAnalysis, setMatchupAnalysis] = useState<any>(null)
  const [nlpQuery, setNlpQuery] = useState('')
  const [nlpResponse, setNlpResponse] = useState<any>(null)
  const [nlpLoading, setNlpLoading] = useState(false)

  useEffect(() => {
    initializeAIData()
  }, [userId, leagueId, teamId, currentWeek])

  const initializeAIData = async () => {
    try {
      setLoading(true)
      
      // Load all AI data in parallel
      await Promise.all([
        loadPlayerPredictions(),
        loadWaiverAnalysis(),
        loadTradeOpportunities(),
        loadLineupOptimization(),
        loadMatchupAnalysis(),
        generateAIInsights()
      ])

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load AI data:', error);
      }
      toast.error('Failed to load AI intelligence')
    } finally {
      setLoading(false)
    }
  }

  const loadPlayerPredictions = async () => {
    try {
      const response = await fetch(`/api/ai/player-predictions?week=${currentWeek}&limit=15`)
      if (response.ok) {
        const data = await response.json()
        setPlayerPredictions(data.data.predictions.map((p: any) => ({
          playerId: p.player.id,
          name: p.player.name,
          position: p.player.position,
          projectedPoints: p.prediction.projectedPoints,
          confidence: p.prediction.confidence,
          startSitRecommendation: p.prediction.startSitRecommendation,
          reasoning: p.prediction.reasoning
        })))
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load predictions:', error);
      }
    }
  }

  const loadWaiverAnalysis = async () => {
    try {
      const response = await fetch('/api/ai/waiver-wire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          teamId,
          teamNeeds: ['RB', 'WR'], // Mock team needs
          week: currentWeek,
          maxRecommendations: 10
        })
      })
      if (response.ok) {
        const data = await response.json()
        setWaiverTargets(data.data.recommendations.map((r: any) => ({
          playerId: r.playerId,
          name: 'Mock Player', // Would get from player data
          position: 'RB', // Would get from player data
          priority: r.priority,
          recommendationType: r.recommendationType,
          reasoning: r.reasoning,
          projectedValue: r.projectedValue
        })))
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load waiver analysis:', error);
      }
    }
  }

  const loadTradeOpportunities = async () => {
    try {
      const response = await fetch(`/api/ai/trade-analysis?teamId=${teamId}&week=${currentWeek}`)
      if (response.ok) {
        const data = await response.json()
        // Mock trade opportunities from the response
        setTradeOpportunities([
          {
            targetPlayer: 'Josh Jacobs',
            offerPlayer: 'DeAndre Hopkins',
            fairnessScore: 0.15,
            recommendation: 'ACCEPT',
            reasoning: 'Addresses RB need while maintaining WR depth'
          },
          {
            targetPlayer: 'George Kittle',
            offerPlayer: 'Two bench players',
            fairnessScore: -0.1,
            recommendation: 'COUNTER',
            reasoning: 'Slight overpay but fills TE need'
          }
        ])
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load trade opportunities:', error);
      }
    }
  }

  const loadLineupOptimization = async () => {
    try {
      const mockRoster = Array.from({ length: 16 }, (_, i) => `player_${i + 1}`)
      const response = await fetch('/api/ai/lineup-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          strategy: 'BALANCED',
          week: currentWeek,
          rosterPlayerIds: mockRoster
        })
      })
      if (response.ok) {
        const data = await response.json()
        setLineupOptimization(data.data.optimization)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load lineup optimization:', error);
      }
    }
  }

  const loadMatchupAnalysis = async () => {
    try {
      const response = await fetch('/api/ai/matchup-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeamId: teamId,
          awayTeamId: 'opponent_team_id',
          week: currentWeek
        })
      })
      if (response.ok) {
        const data = await response.json()
        setMatchupAnalysis(data.data.analysis)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load matchup analysis:', error);
      }
    }
  }

  const generateAIInsights = async () => {
    // Generate comprehensive AI insights based on all data
    const insights: AIInsight[] = [
      {
        type: 'LINEUP_OPTIMIZATION',
        priority: 'HIGH',
        title: 'Lineup Optimization Available',
        description: 'AI suggests starting DeAndre Hopkins over current WR2 for +3.2 projected points',
        action: 'Optimize Lineup',
        confidence: 0.87
      },
      {
        type: 'WAIVER_PRIORITY',
        priority: 'HIGH',
        title: 'High-Value Waiver Target',
        description: 'Rachaad White available with 85% breakout probability this week',
        action: 'Add to Waiver Claims',
        confidence: 0.78
      },
      {
        type: 'TRADE_OPPORTUNITY',
        priority: 'MEDIUM',
        title: 'Favorable Trade Available',
        description: 'Package deal could net you Josh Jacobs while addressing team needs',
        action: 'Analyze Trade',
        confidence: 0.72
      },
      {
        type: 'MATCHUP_ADVANTAGE',
        priority: 'MEDIUM',
        title: 'Favorable Weekly Matchup',
        description: 'Your WR corps has excellent matchups this week (+15% projected boost)',
        action: 'Review Matchup',
        confidence: 0.81
      },
      {
        type: 'INJURY_ALERT',
        priority: 'HIGH',
        title: 'Injury Impact Assessment',
        description: 'Key player injury affects optimal lineup strategy for Week 4',
        action: 'Adjust Strategy',
        confidence: 0.92
      }
    ]

    setAiInsights(insights)
  }

  const handleNLPQuery = async () => {
    if (!nlpQuery.trim()) return
    
    setNlpLoading(true)
    try {
      // Mock NLP response based on query
      const responses = {
        'lineup': {
          suggestion: 'Based on Week 4 projections, I recommend starting DeAndre Hopkins over your current WR2. Hopkins has a favorable matchup and 18.3 projected points vs 14.1 for your current starter.',
          confidence: 85,
          actions: ['optimize-lineup', 'view-predictions']
        },
        'waiver': {
          suggestion: 'Top waiver priority should be Rachaad White (RB, TB). He\'s seeing increased touches and has a 78% chance of a breakout performance this week.',
          confidence: 78,
          actions: ['view-waiver-wire', 'add-waiver-claim']
        },
        'trade': {
          suggestion: 'Consider trading for Josh Jacobs. You can offer DeAndre Hopkins + bench player for a slight value upgrade that addresses your RB need.',
          confidence: 72,
          actions: ['analyze-trade', 'explore-trade-scenarios']
        }
      }

      const responseKey = nlpQuery.toLowerCase().includes('lineup') ? 'lineup' :
                          nlpQuery.toLowerCase().includes('waiver') ? 'waiver' :
                          nlpQuery.toLowerCase().includes('trade') ? 'trade' : 'lineup'

      setNlpResponse(responses[responseKey])
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('NLP query failed:', error);
      }
      toast.error('Failed to process query')
    } finally {
      setNlpLoading(false)
    }
  }

  const executeAIAction = async (actionType: string) => {
    toast.success(`Executing ${actionType} analysis...`)
    // In production, this would trigger the appropriate AI analysis
  }

  const tabs = [
    { id: 'overview', name: 'AI Overview', icon: SparklesIcon },
    { id: 'predictions', name: 'Predictions', icon: BeakerIcon },
    { id: 'lineup', name: 'Lineup AI', icon: TrophyIcon },
    { id: 'waiver', name: 'Waiver Wire', icon: ArrowTrendingUpIcon },
    { id: 'trades', name: 'Trade Engine', icon: ArrowsRightLeftIcon },
    { id: 'matchup', name: 'Matchup AI', icon: UserGroupIcon },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-3">
          <CpuChipIcon className="h-8 w-8 text-purple-400 animate-pulse" />
          <div className="text-lg text-white">Loading Nova AI Intelligence...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enhanced AI Header */}
      <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-lg border border-purple-500/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <CpuChipIcon className="h-8 w-8 text-purple-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Nova AI Coach</h1>
              <p className="text-gray-300">Week {currentWeek} • Advanced Fantasy Intelligence</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-400">Confidence Score</div>
            <div className="text-2xl font-bold text-green-400">
              {aiInsights.length > 0 ? Math.round(aiInsights.reduce((sum, insight) => sum + insight.confidence, 0) / aiInsights.length * 100) : 85}%
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiInsights.slice(0, 6).map((insight, index) => (
          <div key={index} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${
                    insight.priority === 'HIGH' ? 'bg-red-400' :
                    insight.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-400'
                  }`}></div>
                  <h3 className="font-semibold text-white text-sm">{insight.title}</h3>
                </div>
                <p className="text-gray-300 text-sm mb-3">{insight.description}</p>
                {insight.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => executeAIAction(insight.action!)}
                    className="text-xs"
                  >
                    {insight.action}
                  </Button>
                )}
              </div>
              <div className="text-right ml-3">
                <div className="text-xs text-gray-400">Confidence</div>
                <div className="text-sm font-bold text-white">
                  {Math.round(insight.confidence * 100)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Natural Language Query Interface */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <MagnifyingGlassIcon className="h-6 w-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Ask Nova AI</h3>
        </div>
        
        <div className="flex space-x-3">
          <input
            type="text"
            value={nlpQuery}
            onChange={(e) => setNlpQuery(e.target.value)}
            placeholder="Ask about your lineup, waiver wire, trades, or strategy..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            onKeyPress={(e) => e.key === 'Enter' && handleNLPQuery()}
          />
          <Button 
            onClick={handleNLPQuery}
            disabled={nlpLoading || !nlpQuery.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {nlpLoading ? (
              <ClockIcon className="h-4 w-4 animate-spin" />
            ) : (
              'Ask AI'
            )}
          </Button>
        </div>

        {nlpResponse && (
          <div className="mt-4 p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <LightBulbIcon className="h-5 w-5 text-purple-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-purple-400 font-medium mb-1">
                  Nova AI ({nlpResponse.confidence}% confidence)
                </div>
                <div className="text-gray-300 mb-3">{nlpResponse.suggestion}</div>
                {nlpResponse.actions && (
                  <div className="flex space-x-2">
                    {nlpResponse.actions.map((action: string, index: number) => (
                      <Button
                        key={index}
                        size="sm"
                        variant="outline"
                        onClick={() => executeAIAction(action)}
                        className="text-xs"
                      >
                        {action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Week 4 Predictions Summary */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <BeakerIcon className="h-6 w-6 text-purple-400 mr-2" />
                Week 4 Top Predictions
              </h3>
              
              {playerPredictions.slice(0, 5).map((prediction, index) => (
                <div key={index} className="mb-3 p-3 bg-slate-700/50 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{prediction.name}</div>
                    <div className="text-sm text-gray-400">{prediction.position} • {prediction.startSitRecommendation}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-400">{prediction.projectedPoints} pts</div>
                    <div className="text-xs text-gray-400">{Math.round(prediction.confidence * 100)}% confident</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Lineup Optimization Preview */}
            {lineupOptimization && (
              <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <TrophyIcon className="h-6 w-6 text-green-400 mr-2" />
                  Optimized Lineup
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Projected Score:</span>
                    <span className="text-white font-bold">{lineupOptimization.projectedScore} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Win Probability:</span>
                    <span className="text-green-400 font-bold">{Math.round(lineupOptimization.winProbability * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Strategy:</span>
                    <span className="text-purple-400 font-bold">{lineupOptimization.strategy}</span>
                  </div>
                  <div className="pt-2">
                    <Button size="sm" className="w-full">
                      View Full Optimization
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">
                Week {currentWeek} Player Predictions
              </h3>
              
              <div className="space-y-4">
                {playerPredictions.map((prediction, index) => (
                  <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-white">{prediction.name}</h4>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                          {prediction.position}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          prediction.startSitRecommendation === 'START' ? 'bg-green-500/20 text-green-400' :
                          prediction.startSitRecommendation === 'SIT' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {prediction.startSitRecommendation}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{prediction.projectedPoints} pts</div>
                        <div className="text-xs text-gray-400">{Math.round(prediction.confidence * 100)}% confidence</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">{prediction.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'waiver' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">
                Week {currentWeek} Waiver Wire Targets
              </h3>
              
              <div className="space-y-4">
                {waiverTargets.slice(0, 8).map((target, index) => (
                  <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-white">Mock Player {index + 1}</h4>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                          RB
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          target.priority <= 3 ? 'bg-red-500/20 text-red-400' :
                          target.priority <= 6 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          Priority {target.priority}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">{target.recommendationType}</div>
                        <div className="text-xs text-gray-400">Value: {target.projectedValue.toFixed(1)}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300">{target.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">
                AI Trade Recommendations
              </h3>
              
              <div className="space-y-4">
                {tradeOpportunities.map((trade, index) => (
                  <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white">
                          Target: {trade.targetPlayer}
                        </h4>
                        <p className="text-sm text-gray-400">
                          Offer: {trade.offerPlayer}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                          trade.recommendation === 'ACCEPT' ? 'bg-green-500/20 text-green-400' :
                          trade.recommendation === 'COUNTER' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.recommendation}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{trade.reasoning}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Fairness Score:</span>
                      <span className={trade.fairnessScore > 0 ? 'text-green-400' : 'text-red-400'}>
                        {trade.fairnessScore > 0 ? '+' : ''}{trade.fairnessScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matchup' && matchupAnalysis && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">
                Week {currentWeek} Matchup Analysis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Your Projected Score</div>
                  <div className="text-2xl font-bold text-white">{matchupAnalysis.projectedHomeScore}</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Opponent Projected Score</div>
                  <div className="text-2xl font-bold text-white">{matchupAnalysis.projectedAwayScore}</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Win Probability</span>
                  <span className="text-white font-bold">{Math.round(matchupAnalysis.winProbability * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full"
                    style={{ width: `${matchupAnalysis.winProbability * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-3">Key Matchups</h4>
                <div className="space-y-2">
                  {matchupAnalysis.keyMatchups?.slice(0, 4).map((matchup: any, index: number) => (
                    <div key={index} className="p-3 bg-slate-700/30 rounded">
                      <div className="font-medium text-white">{matchup.position}</div>
                      <div className="text-sm text-gray-300">{matchup.analysis}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick AI Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="outline" size="sm" onClick={() => executeAIAction('lineup-optimization')}>
            <TrophyIcon className="h-4 w-4 mr-2" />
            Optimize Lineup
          </Button>
          <Button variant="outline" size="sm" onClick={() => executeAIAction('waiver-analysis')}>
            <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
            Analyze Waivers
          </Button>
          <Button variant="outline" size="sm" onClick={() => executeAIAction('trade-finder')}>
            <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
            Find Trades
          </Button>
          <Button variant="outline" size="sm" onClick={() => executeAIAction('matchup-prep')}>
            <UserGroupIcon className="h-4 w-4 mr-2" />
            Matchup Prep
          </Button>
        </div>
      </div>
    </div>
  )
}