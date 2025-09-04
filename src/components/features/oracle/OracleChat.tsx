'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send,
  Sparkles,
  Brain,
  MessageCircle,
  TrendingUp,
  Target,
  Users,
  Trophy,
  Clock,
  RotateCcw,
  Settings,
  History,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Copy,
  ExternalLink,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import { useOracleStore } from '@/stores/oracleStore'
import { useAuthStore } from '@/stores/authStore'
import { useLeagueStore } from '@/stores/leagueStore'
import type { OracleResponse, OracleRecommendation, OracleInsight } from '@/services/ai/oracleService'

interface OracleChatProps {
  leagueId?: string
  teamId?: string
  initialQuestion?: string
  compact?: boolean
}

export default function OracleChat({ 
  leagueId, 
  teamId, 
  initialQuestion, 
  compact = false 
}: OracleChatProps) {
  const { user } = useAuthStore()
  const { teams } = useLeagueStore()
  const {
    currentConversation,
    isThinking,
    lastResponse,
    personality,
    quickInsights,
    askOracle,
    startNewConversation,
    refreshQuickInsights,
    updatePersonality,
    clearError
  } = useOracleStore()

  const [question, setQuestion] = useState(initialQuestion || '')
  const [showSettings, setShowSettings] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const userTeam = teams.find(team => team.user_id === user?.id)

  useEffect(() => {
    if (userTeam) {
      refreshQuickInsights(userTeam.id)
    }
  }, [userTeam, refreshQuickInsights])

  useEffect(() => {
    scrollToBottom()
  }, [currentConversation?.queries])

  useEffect(() => {
    if (initialQuestion && !currentConversation) {
      handleSubmitQuestion(initialQuestion)
    }
  }, [initialQuestion])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmitQuestion = async (questionText?: string) => {
    const finalQuestion = questionText || question.trim()
    if (!finalQuestion) return

    clearError()
    
    const context = {
      leagueId,
      teamId: teamId || userTeam?.id
    }

    await askOracle(finalQuestion, 'general_question', context)
    setQuestion('')
  }

  const handleQuickAction = (insight: any) => {
    insight.action()
  }

  const handleFollowUpQuestion = (followUpQuestion: string) => {
    setQuestion(followUpQuestion)
  }

  const copyResponse = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-400'
    if (confidence >= 70) return 'text-yellow-400'
    if (confidence >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-900/20'
      case 'medium': return 'border-yellow-500 bg-yellow-900/20'
      default: return 'border-blue-500 bg-blue-900/20'
    }
  }

  const getInsightIcon = (category: string) => {
    switch (category) {
      case 'trend': return <TrendingUp className="h-4 w-4" />
      case 'matchup': return <Target className="h-4 w-4" />
      case 'opportunity': return <Zap className="h-4 w-4" />
      case 'risk': return <AlertTriangle className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  return (
    <div className={`flex flex-col h-full ${compact ? '' : 'bg-gray-900'}`}>
      {/* Header */}
      {!compact && (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Oracle</h1>
                <p className="text-sm text-gray-400">Your AI Fantasy Football Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => startNewConversation()}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-gray-700 rounded-lg"
              >
                <h3 className="text-white font-medium mb-3">Oracle Personality</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Tone</label>
                    <select
                      value={personality.tone}
                      onChange={(e) => updatePersonality({ tone: e.target.value as any })}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    >
                      <option value="analytical">Analytical</option>
                      <option value="casual">Casual</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="conservative">Conservative</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Expertise</label>
                    <select
                      value={personality.expertise}
                      onChange={(e) => updatePersonality({ expertise: e.target.value as any })}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Detail Level</label>
                    <select
                      value={personality.verbosity}
                      onChange={(e) => updatePersonality({ verbosity: e.target.value as any })}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    >
                      <option value="concise">Concise</option>
                      <option value="detailed">Detailed</option>
                      <option value="comprehensive">Comprehensive</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Quick Actions */}
      {!compact && quickInsights.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Quick Insights</h3>
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              {showQuickActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          
          <AnimatePresence>
            {showQuickActions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-2"
              >
                {quickInsights.map((insight, index) => (
                  <button
                    key={insight.type}
                    onClick={() => handleQuickAction(insight)}
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                  >
                    <h4 className="text-sm font-medium text-white">{insight.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{insight.description}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Conversation */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${compact ? 'max-h-96' : ''}`}>
        {!currentConversation?.queries.length && !isThinking && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Welcome to Oracle</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              I'm your AI fantasy football assistant. Ask me anything about your team, players, 
              matchups, trades, or strategy!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'Who should I start this week?',
                'Should I accept this trade?',
                'What players should I target?',
                'How are my playoff chances?'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSubmitQuestion(suggestion)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full text-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentConversation?.queries.map((exchange, index) => (
          <div key={index} className="space-y-4">
            {/* User Question */}
            <div className="flex justify-end">
              <div className="bg-blue-600 rounded-lg px-4 py-3 max-w-md">
                <p className="text-white text-sm">{exchange.query.question}</p>
                <div className="flex items-center mt-2 text-xs text-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(exchange.query.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Oracle Response */}
            <div className="flex justify-start">
              <div className="max-w-4xl">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 flex-1">
                    {/* Response Text */}
                    <div className="prose prose-sm prose-invert max-w-none">
                      <p className="text-gray-200 whitespace-pre-line">{exchange.response.response}</p>
                    </div>

                    {/* Confidence Score */}
                    <div className="flex items-center mt-3 text-sm">
                      <span className="text-gray-400 mr-2">Confidence:</span>
                      <span className={`font-medium ${getConfidenceColor(exchange.response.confidence)}`}>
                        {exchange.response.confidence}%
                      </span>
                    </div>

                    {/* Recommendations */}
                    {exchange.response.recommendations.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-white font-medium mb-2 flex items-center">
                          <Target className="h-4 w-4 mr-2" />
                          Recommendations
                        </h4>
                        <div className="space-y-2">
                          {exchange.response.recommendations.map((rec, recIndex) => (
                            <div
                              key={recIndex}
                              className={`border-l-2 pl-3 py-2 ${getPriorityColor(rec.priority)}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-white font-medium capitalize">
                                  {rec.type} {rec.player?.name}
                                </span>
                                <span className={`text-sm ${getConfidenceColor(rec.confidence)}`}>
                                  {rec.confidence}%
                                </span>
                              </div>
                              <p className="text-gray-400 text-sm mt-1">{rec.reasoning}</p>
                              {rec.expectedImpact !== 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Expected impact: {rec.expectedImpact > 0 ? '+' : ''}{rec.expectedImpact.toFixed(1)} pts
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Insights */}
                    {exchange.response.insights.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-white font-medium mb-2 flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Key Insights
                        </h4>
                        <div className="space-y-2">
                          {exchange.response.insights.map((insight, insightIndex) => (
                            <div key={insightIndex} className="bg-gray-700 rounded p-3">
                              <div className="flex items-start space-x-2">
                                <div className="text-blue-400 mt-0.5">
                                  {getInsightIcon(insight.category)}
                                </div>
                                <div className="flex-1">
                                  <h5 className="text-white font-medium text-sm">{insight.title}</h5>
                                  <p className="text-gray-400 text-sm mt-1">{insight.description}</p>
                                  {insight.dataSupport.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-500">
                                      {insight.dataSupport.join(' • ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Points */}
                    {exchange.response.dataPoints.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-white font-medium mb-2 flex items-center">
                          <Trophy className="h-4 w-4 mr-2" />
                          Key Metrics
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {exchange.response.dataPoints.map((dataPoint, dpIndex) => (
                            <div key={dpIndex} className="bg-gray-700 rounded p-2">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">{dataPoint.metric}</span>
                                <span className="text-white font-medium">{dataPoint.value}</span>
                              </div>
                              {dataPoint.comparison && (
                                <div className="text-xs text-gray-500 mt-1">
                                  vs {dataPoint.comparison.type.replace('_', ' ')}: {dataPoint.comparison.value}
                                  {dataPoint.comparison.percentile && (
                                    <span className="ml-1">({dataPoint.comparison.percentile}th percentile)</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Questions */}
                    {exchange.response.followUpQuestions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-gray-400 text-sm mb-2">Follow-up questions:</h4>
                        <div className="flex flex-wrap gap-2">
                          {exchange.response.followUpQuestions.map((followUp, fuIndex) => (
                            <button
                              key={fuIndex}
                              onClick={() => handleFollowUpQuestion(followUp)}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-xs transition-colors"
                            >
                              {followUp}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {new Date(exchange.response.timestamp).toLocaleTimeString()}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyResponse(exchange.response.response)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-green-400 transition-colors">
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Thinking Animation */}
        {isThinking && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Brain className="h-4 w-4 text-white animate-pulse" />
              </div>
              <div className="bg-gray-800 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="text-gray-400 text-sm ml-2">Oracle is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitQuestion()}
              placeholder="Ask Oracle anything about fantasy football..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
              disabled={isThinking}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Sparkles className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <button
            onClick={() => handleSubmitQuestion()}
            disabled={!question.trim() || isThinking}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center"
          >
            {isThinking ? (
              <RotateCcw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Oracle • AI Fantasy Football Assistant</span>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  )
}