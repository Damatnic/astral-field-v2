'use client'

import { useState, useEffect } from 'react'
import { 
  SparklesIcon, 
  ArrowsRightLeftIcon, 
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
  ChartPieIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface MLIntelligenceDashboardProps {
  userId: string
  leagueId: string
  teamId: string
}

interface IntelligenceData {
  recommendations?: any
  anomalies?: any
  sentiment?: any
  lineup?: any
  predictions?: any
  insights?: any
}

interface MLMetrics {
  accuracy: number
  confidence: number
  processingTime: string
  dataPoints: number
}

export function MLIntelligenceDashboard({ userId, leagueId, teamId }: MLIntelligenceDashboardProps) {
  const [intelligenceData, setIntelligenceData] = useState<IntelligenceData>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'anomalies' | 'sentiment' | 'insights'>('overview')
  const [metrics, setMetrics] = useState<Record<string, MLMetrics>>({})
  const [nlpQuery, setNlpQuery] = useState('')
  const [nlpResponse, setNlpResponse] = useState<any>(null)
  const [nlpLoading, setNlpLoading] = useState(false)

  useEffect(() => {
    fetchIntelligenceData()
    fetchMLMetrics()
  }, [userId, leagueId, teamId])

  const fetchIntelligenceData = async () => {
    try {
      setLoading(true)
      
      // Fetch comprehensive intelligence dashboard
      const response = await fetch(`/api/ml/dashboard/${leagueId}/${teamId}?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setIntelligenceData(data.data)
      } else {
        // Fallback to mock data for demo
        setIntelligenceData({
          recommendations: {
            recommendations: [
              {
                player: 'DeAndre Hopkins',
                action: 'High-value waiver pickup',
                confidence: 0.89,
                reasoning: 'Recent target share increase and favorable upcoming schedule',
                riskLevel: 'low'
              },
              {
                player: 'Lineup Strategy',
                action: 'Start aggressive lineup this week',
                confidence: 0.82,
                reasoning: 'Projected to be trailing in matchup, need higher ceiling plays',
                riskLevel: 'medium'
              }
            ],
            strategy: 'balanced',
            confidence: 0.85
          },
          anomalies: {
            severity: 'medium',
            alerts: {
              immediate: ['Unusual scoring spike detected in Week 3'],
              review: ['Multiple teams with identical scores'],
              monitor: ['Higher than average kicker scores this week']
            },
            statistics: {
              mean: 108.7,
              stdDev: 22.4,
              anomalyCount: 3
            }
          },
          sentiment: {
            overallSentiment: {
              positive: 0.62,
              negative: 0.28,
              neutral: 0.10,
              compound: 0.34
            },
            insights: [
              'League sentiment trending positive after recent trade',
              'Commissioner approval rating stable at 78%',
              'Trade discussions show moderate optimism',
              'Player discussion sentiment mixed on waiver claims'
            ]
          },
          predictions: {
            weekly: [
              { player: 'Josh Jacobs', prediction: 18.4, confidence: 0.87, range: { low: 12.1, high: 24.7 } },
              { player: 'DeVonta Smith', prediction: 14.8, confidence: 0.81, range: { low: 8.3, high: 21.3 } },
              { player: 'George Kittle', prediction: 11.2, confidence: 0.79, range: { low: 6.1, high: 16.3 } }
            ]
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch intelligence data:', error)
      toast.error('Failed to load AI intelligence data')
    } finally {
      setLoading(false)
    }
  }

  const fetchMLMetrics = async () => {
    try {
      const response = await fetch('/api/ml/model-metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.data.models)
      }
    } catch (error) {
      console.error('Failed to fetch ML metrics:', error)
    }
  }

  const handleNLPQuery = async () => {
    if (!nlpQuery.trim()) return
    
    setNlpLoading(true)
    try {
      const response = await fetch('/api/ml/nlp-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: nlpQuery,
          context: { leagueId, teamId, userId }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setNlpResponse(data.data.response)
      } else {
        toast.error('Failed to process natural language query')
      }
    } catch (error) {
      console.error('NLP query failed:', error)
      toast.error('Failed to process query')
    } finally {
      setNlpLoading(false)
    }
  }

  const executeMLAnalysis = async (analysisType: string, params: any = {}) => {
    try {
      const endpoints = {
        'intelligent-recommendations': `/api/ml/intelligent-recommendations`,
        'predict-performance': `/api/ml/predict-performance`,
        'analyze-matchup': `/api/ml/analyze-matchup`,
        'detect-anomalies': `/api/ml/detect-anomalies`,
        'assess-injury-risk': `/api/ml/assess-injury-risk`,
        'analyze-sentiment': `/api/ml/analyze-sentiment`,
        'optimize-schedule': `/api/ml/optimize-schedule`
      }

      const endpoint = endpoints[analysisType as keyof typeof endpoints]
      if (!endpoint) {
        toast.error('Unknown analysis type')
        return
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          leagueId,
          teamId,
          ...params
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${analysisType} analysis completed`)
        return data.data
      } else {
        toast.error(`Failed to execute ${analysisType} analysis`)
      }
    } catch (error) {
      console.error(`${analysisType} analysis failed:`, error)
      toast.error(`${analysisType} analysis failed`)
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: SparklesIcon },
    { id: 'predictions', name: 'Predictions', icon: BeakerIcon },
    { id: 'anomalies', name: 'Anomalies', icon: ShieldCheckIcon },
    { id: 'sentiment', name: 'Sentiment', icon: ChatBubbleLeftRightIcon },
    { id: 'insights', name: 'Insights', icon: ChartPieIcon },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <CpuChipIcon className="h-8 w-8 text-blue-400 animate-pulse" />
          <div className="text-lg text-white">Loading AI Intelligence...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* AI Intelligence Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <CpuChipIcon className="h-8 w-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ML Intelligence Center</h1>
              <p className="text-gray-300">Advanced machine learning analytics for fantasy sports</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-400">AI Engine v4.0</div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-green-400">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Natural Language Query Interface */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <MagnifyingGlassIcon className="h-6 w-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Natural Language Query</h3>
        </div>
        
        <div className="flex space-x-3">
          <input
            type="text"
            value={nlpQuery}
            onChange={(e) => setNlpQuery(e.target.value)}
            placeholder="Ask me anything about your team... (e.g., 'Who should I start this week?' or 'Any trade opportunities?')"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleNLPQuery()}
          />
          <Button 
            onClick={handleNLPQuery}
            disabled={nlpLoading || !nlpQuery.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {nlpLoading ? (
              <ClockIcon className="h-4 w-4 animate-spin" />
            ) : (
              'Ask AI'
            )}
          </Button>
        </div>

        {nlpResponse && (
          <div className="mt-4 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <LightBulbIcon className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <div className="text-blue-400 font-medium mb-1">AI Response ({nlpResponse.confidence}% confidence)</div>
                <div className="text-gray-300">{nlpResponse.suggestion}</div>
                {nlpResponse.actions && (
                  <div className="flex space-x-2 mt-3">
                    {nlpResponse.actions.map((action: string, index: number) => (
                      <Button
                        key={index}
                        size="sm"
                        variant="outline"
                        onClick={() => executeMLAnalysis(action)}
                      >
                        {action.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <SparklesIcon className="h-8 w-8 text-purple-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">ML Confidence</p>
              <p className="text-2xl font-bold text-white">
                {intelligenceData.recommendations?.confidence 
                  ? Math.round(intelligenceData.recommendations.confidence * 100)
                  : 85}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-orange-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Anomaly Severity</p>
              <p className="text-2xl font-bold text-white capitalize">
                {intelligenceData.anomalies?.severity || 'Low'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">League Sentiment</p>
              <p className="text-2xl font-bold text-white">
                {intelligenceData.sentiment?.overallSentiment?.positive 
                  ? Math.round(intelligenceData.sentiment.overallSentiment.positive * 100)
                  : 62}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center">
            <BeakerIcon className="h-8 w-8 text-blue-400 mr-3" />
            <div>
              <p className="text-sm text-gray-400">Active Models</p>
              <p className="text-2xl font-bold text-white">12</p>
            </div>
          </div>
        </div>
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

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Intelligent Recommendations */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <SparklesIcon className="h-6 w-6 text-blue-400 mr-2" />
                Intelligent Recommendations
              </h3>
              
              {intelligenceData.recommendations?.recommendations?.map((rec: any, index: number) => (
                <div key={index} className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-white">{rec.player}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rec.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                          rec.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {rec.riskLevel} risk
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{rec.action}</p>
                      <p className="text-sm text-gray-400">{rec.reasoning}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-white">
                        {Math.round(rec.confidence * 100)}%
                      </div>
                      <div className="text-xs text-gray-400">Confidence</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Performance Predictions */}
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <BeakerIcon className="h-6 w-6 text-purple-400 mr-2" />
                Performance Predictions
              </h3>
              
              {intelligenceData.predictions?.weekly?.map((pred: any, index: number) => (
                <div key={index} className="mb-3 p-3 bg-slate-700/50 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{pred.player}</div>
                    <div className="text-sm text-gray-400">
                      Range: {pred.range.low} - {pred.range.high} pts
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-400">{pred.prediction} pts</div>
                    <div className="text-xs text-gray-400">{Math.round(pred.confidence * 100)}% confidence</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <BeakerIcon className="h-6 w-6 text-purple-400 mr-2" />
                  Advanced Predictions
                </h3>
                <Button
                  onClick={() => executeMLAnalysis('predict-performance', { weeks: 4, includeInjuryRisk: true })}
                  size="sm"
                >
                  Run New Prediction
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg">
                    <h4 className="font-semibold text-purple-400 mb-2">Ensemble Models</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Linear Regression</span>
                        <span className="text-white">82.4%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Random Forest</span>
                        <span className="text-white">87.1%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Neural Network</span>
                        <span className="text-white">89.3%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                    <h4 className="font-semibold text-blue-400 mb-2">Prediction Factors</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Recent Form</span>
                        <span className="text-white">High Impact</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Matchup Difficulty</span>
                        <span className="text-white">Medium Impact</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Injury Risk</span>
                        <span className="text-white">Low Impact</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <ShieldCheckIcon className="h-6 w-6 text-orange-400 mr-2" />
                  Anomaly Detection
                </h3>
                <Button
                  onClick={() => executeMLAnalysis('detect-anomalies', { timeWindow: 4 })}
                  size="sm"
                >
                  Scan for Anomalies
                </Button>
              </div>
              
              {intelligenceData.anomalies?.alerts && (
                <div className="space-y-4">
                  {intelligenceData.anomalies.alerts.immediate?.length > 0 && (
                    <div className="p-4 bg-red-600/20 border border-red-500/30 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">Immediate Alerts</h4>
                      {intelligenceData.anomalies.alerts.immediate.map((alert: string, index: number) => (
                        <div key={index} className="text-gray-300 text-sm">{alert}</div>
                      ))}
                    </div>
                  )}
                  
                  {intelligenceData.anomalies.alerts.review?.length > 0 && (
                    <div className="p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
                      <h4 className="font-semibold text-yellow-400 mb-2">Review Required</h4>
                      {intelligenceData.anomalies.alerts.review.map((alert: string, index: number) => (
                        <div key={index} className="text-gray-300 text-sm">{alert}</div>
                      ))}
                    </div>
                  )}
                  
                  {intelligenceData.anomalies.alerts.monitor?.length > 0 && (
                    <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                      <h4 className="font-semibold text-blue-400 mb-2">Monitor</h4>
                      {intelligenceData.anomalies.alerts.monitor.map((alert: string, index: number) => (
                        <div key={index} className="text-gray-300 text-sm">{alert}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sentiment' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-400 mr-2" />
                  Sentiment Analysis
                </h3>
                <Button
                  onClick={() => executeMLAnalysis('analyze-sentiment', { timeWindow: 24 })}
                  size="sm"
                >
                  Analyze Recent Messages
                </Button>
              </div>
              
              {intelligenceData.sentiment?.insights && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-green-600/20 border border-green-500/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">
                        {Math.round(intelligenceData.sentiment.overallSentiment.positive * 100)}%
                      </div>
                      <div className="text-sm text-gray-300">Positive</div>
                    </div>
                    <div className="text-center p-4 bg-red-600/20 border border-red-500/30 rounded-lg">
                      <div className="text-2xl font-bold text-red-400">
                        {Math.round(intelligenceData.sentiment.overallSentiment.negative * 100)}%
                      </div>
                      <div className="text-sm text-gray-300">Negative</div>
                    </div>
                    <div className="text-center p-4 bg-gray-600/20 border border-gray-500/30 rounded-lg">
                      <div className="text-2xl font-bold text-gray-400">
                        {Math.round(intelligenceData.sentiment.overallSentiment.neutral * 100)}%
                      </div>
                      <div className="text-sm text-gray-300">Neutral</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">Key Insights</h4>
                    {intelligenceData.sentiment.insights.map((insight: string, index: number) => (
                      <div key={index} className="p-3 bg-slate-700/50 rounded-lg text-gray-300 text-sm">
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <ChartPieIcon className="h-6 w-6 text-cyan-400 mr-2" />
                ML Model Performance
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(metrics).map(([modelName, modelMetrics]) => (
                  <div key={modelName} className="p-4 bg-slate-700/50 rounded-lg">
                    <h4 className="font-semibold text-white mb-3 capitalize">
                      {modelName.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Accuracy</span>
                        <span className="text-green-400">{modelMetrics.accuracy}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Confidence</span>
                        <span className="text-blue-400">{Math.round(modelMetrics.confidence * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Response Time</span>
                        <span className="text-yellow-400">{modelMetrics.processingTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Data Points</span>
                        <span className="text-purple-400">{modelMetrics.dataPoints.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick ML Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => executeMLAnalysis('intelligent-recommendations')}
            className="flex items-center"
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Get Recommendations
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => executeMLAnalysis('predict-performance')}
            className="flex items-center"
          >
            <BeakerIcon className="h-4 w-4 mr-2" />
            Predict Performance
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => executeMLAnalysis('detect-anomalies')}
            className="flex items-center"
          >
            <ShieldCheckIcon className="h-4 w-4 mr-2" />
            Scan Anomalies
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchIntelligenceData}
            className="flex items-center"
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>
    </div>
  )
}