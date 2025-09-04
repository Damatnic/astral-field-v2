'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Target,
  Brain,
  Users,
  Clock,
  Star,
  Info
} from 'lucide-react'
import tradeAnalyzer, { type LineupOptimization } from '@/services/ai/tradeAnalyzer'

interface LineupOptimizerProps {
  teamId: string
  week: number
  onLineupChange?: (lineup: any) => void
}

export default function LineupOptimizer({ teamId, week, onLineupChange }: LineupOptimizerProps) {
  const [optimization, setOptimization] = useState<LineupOptimization | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null)
  const [showAdvice, setShowAdvice] = useState(false)

  useEffect(() => {
    optimizeLineup()
  }, [teamId, week])

  const optimizeLineup = async () => {
    setIsOptimizing(true)
    try {
      const result = await tradeAnalyzer.optimizeLineup(teamId, week)
      setOptimization(result)
      onLineupChange?.(result.lineup)
    } catch (error) {
      console.error('Failed to optimize lineup:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleAlternativeClick = (alternativeId: string) => {
    setSelectedAlternative(selectedAlternative === alternativeId ? null : alternativeId)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400 bg-green-900/20'
    if (confidence >= 60) return 'text-yellow-400 bg-yellow-900/20'
    return 'text-red-400 bg-red-900/20'
  }

  const getPositionDisplayName = (position: string) => {
    const displayNames: Record<string, string> = {
      quarterback: 'Quarterback',
      runningBacks: 'Running Backs',
      wideReceivers: 'Wide Receivers',
      tightEnd: 'Tight End',
      flex: 'Flex',
      defense: 'Defense/ST',
      kicker: 'Kicker'
    }
    return displayNames[position] || position
  }

  if (isOptimizing) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-white mb-2">Optimizing Lineup...</h3>
          <p className="text-gray-400">AI is analyzing player projections and matchups</p>
        </div>
      </div>
    )
  }

  if (!optimization) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Optimization Failed</h3>
          <p className="text-gray-400 mb-4">Unable to optimize lineup. Please try again.</p>
          <button
            onClick={optimizeLineup}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry Optimization
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <Zap className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Lineup Optimizer</h2>
              <p className="text-sm text-gray-400">Week {week} • Optimized for maximum points</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg border ${getConfidenceColor(optimization.confidence)}`}>
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span className="font-medium">{optimization.confidence}% Confident</span>
              </div>
            </div>
            <button
              onClick={optimizeLineup}
              disabled={isOptimizing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>Re-optimize</span>
            </button>
          </div>
        </div>

        {/* Projected Points */}
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-2">
            {optimization.projectedPoints.toFixed(1)} Points
          </div>
          <p className="text-gray-400">Projected Total</p>
        </div>
      </div>

      {/* Optimal Lineup */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
          Optimal Lineup
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(optimization.lineup)
            .filter(([position, players]) => position !== 'bench' && players.length > 0)
            .map(([position, players]) => (
              <div key={position} className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium text-white mb-2">
                  {getPositionDisplayName(position)}
                </h4>
                <div className="space-y-2">
                  {(Array.isArray(players) ? players : [players]).map((playerId: string, index: number) => {
                    if (!playerId) return null
                    
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">Player {playerId.slice(-2)}</div>
                          <div className="text-sm text-gray-400">Projected: 18.5 pts</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                            OPTIMAL
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Alternatives & Improvements */}
      {optimization.alternatives.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-400 mr-2" />
              Lineup Alternatives
            </h3>
            <span className="text-sm text-gray-400">
              {optimization.alternatives.length} suggestion(s)
            </span>
          </div>
          
          <div className="space-y-3">
            {optimization.alternatives.map((alt, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => handleAlternativeClick(`alt-${index}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm bg-blue-900/30 text-blue-400 px-2 py-1 rounded uppercase font-medium">
                        {alt.position}
                      </span>
                      <div>
                        <div className="font-medium text-white">
                          {alt.suggestedPlayer} → {alt.currentPlayer}
                        </div>
                        <div className="text-sm text-gray-400">{alt.reason}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-medium">
                      +{alt.pointsGain.toFixed(1)} pts
                    </div>
                    <div className="text-xs text-gray-400">Expected gain</div>
                  </div>
                </div>

                {selectedAlternative === `alt-${index}` && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-600"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Current Player</div>
                        <div className="text-white font-medium">{alt.currentPlayer}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Suggested Player</div>
                        <div className="text-white font-medium">{alt.suggestedPlayer}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Point Difference</div>
                        <div className="text-green-400 font-medium">+{alt.pointsGain.toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                        Apply Change
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Matchup Advice */}
      {optimization.matchupAdvice.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="h-5 w-5 text-purple-400 mr-2" />
              Strategic Advice
            </h3>
            <button
              onClick={() => setShowAdvice(!showAdvice)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showAdvice ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {showAdvice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              {optimization.matchupAdvice.map((advice, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                  <div className="p-1 bg-purple-900/30 rounded">
                    <Info className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white mb-1">{advice.advice}</div>
                    <div className="text-sm text-gray-400">{advice.reasoning}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
          <div className="p-3 bg-blue-900/30 rounded-lg inline-block mb-3">
            <Target className="h-8 w-8 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {optimization.projectedPoints.toFixed(0)}
          </div>
          <div className="text-gray-400">Projected Points</div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
          <div className="p-3 bg-green-900/30 rounded-lg inline-block mb-3">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {optimization.confidence}%
          </div>
          <div className="text-gray-400">Confidence Level</div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
          <div className="p-3 bg-purple-900/30 rounded-lg inline-block mb-3">
            <Star className="h-8 w-8 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {optimization.alternatives.length}
          </div>
          <div className="text-gray-400">Improvements Found</div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-900/50 rounded-lg">
            <Brain className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">AI Optimization Tips</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>This lineup is optimized for maximum projected points</span>
              </li>
              <li className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span>Re-optimize closer to game time for updated projections</span>
              </li>
              <li className="flex items-start space-x-2">
                <Users className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Consider your league's scoring system when making final decisions</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}