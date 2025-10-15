'use client'

import { TrendingUp, Zap, Target, Activity, AlertTriangle, Shield } from 'lucide-react'
import { StreamingRecommendation } from '@/lib/ai/streaming-advisor'
import { BreakoutPrediction } from '@/lib/ai/breakout-predictor'
import { motion } from 'framer-motion'

interface AdvancedInsightsPanelProps {
  streamingTargets?: StreamingRecommendation[]
  breakoutCandidates?: BreakoutPrediction[]
  sellHighCandidates?: any[]
  buyLowTargets?: any[]
  injuryImpacts?: any[]
}

export function AdvancedInsightsPanel({
  streamingTargets = [],
  breakoutCandidates = [],
  sellHighCandidates = [],
  buyLowTargets = [],
  injuryImpacts = []
}: AdvancedInsightsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Streaming Targets */}
      {streamingTargets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Weekly Streaming Targets</h3>
              <p className="text-sm text-slate-400">Best matchup-based pickups</p>
            </div>
          </div>

          <div className="space-y-3">
            {streamingTargets.slice(0, 3).map((rec, idx) => (
              <div
                key={rec.player.id}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : 'text-orange-600'
                    }`}>
                      #{idx + 1}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{rec.player.name}</h4>
                    <p className="text-sm text-slate-400">
                      {rec.player.position} • {rec.player.team} vs {rec.matchup.opponent}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {rec.reasoning.join(' • ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">{rec.projectedPoints}</div>
                  <div className="text-xs text-slate-400">Projected pts</div>
                  <div className={`text-xs font-semibold mt-1 ${
                    rec.upside === 'BOOM' ? 'text-purple-400' :
                    rec.upside === 'HIGH' ? 'text-blue-400' :
                    rec.upside === 'MODERATE' ? 'text-green-400' : 'text-slate-400'
                  }`}>
                    {rec.upside} UPSIDE
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Breakout Watch List */}
      {breakoutCandidates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Breakout Watch List</h3>
              <p className="text-sm text-slate-400">Players poised for breakout performance</p>
            </div>
          </div>

          <div className="space-y-3">
            {breakoutCandidates.slice(0, 5).map((pred) => (
              <div
                key={pred.player.id}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-white">{pred.player.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      pred.recommendedAction === 'ADD_NOW' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      pred.recommendedAction === 'MONITOR' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {pred.recommendedAction.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">
                    {pred.player.position} • {pred.player.team}
                  </p>
                  <p className="text-xs text-slate-500">{pred.reasoning}</p>
                </div>
                <div className="text-right ml-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-2xl font-bold text-purple-400">{pred.breakoutProbability}%</div>
                      <div className="text-xs text-slate-400">Breakout</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{pred.timeframe.replace('_', ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Buy Low / Sell High */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sell High */}
        {sellHighCandidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Sell High Candidates</h3>
                <p className="text-sm text-slate-400">Players at peak value</p>
              </div>
            </div>

            <div className="space-y-2">
              {sellHighCandidates.slice(0, 3).map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div>
                    <div className="font-semibold text-white">{player.name}</div>
                    <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">
                      {player.fantasyPoints?.toFixed(1)} pts
                    </div>
                    <div className="text-xs text-slate-500">
                      Proj: {player.projectedPoints?.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Buy Low */}
        {buyLowTargets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Target className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Buy Low Targets</h3>
                <p className="text-sm text-slate-400">Undervalued players</p>
              </div>
            </div>

            <div className="space-y-2">
              {buyLowTargets.slice(0, 3).map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div>
                    <div className="font-semibold text-white">{player.name}</div>
                    <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-orange-400">
                      {player.fantasyPoints?.toFixed(1)} pts
                    </div>
                    <div className="text-xs text-slate-500">
                      Proj: {player.projectedPoints?.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Injury Impact Report */}
      {injuryImpacts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Injury Impact Report</h3>
              <p className="text-sm text-slate-400">Players affected by injuries</p>
            </div>
          </div>

          <div className="space-y-3">
            {injuryImpacts.slice(0, 3).map((impact: any) => (
              <div
                key={impact.player?.id || Math.random()}
                className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-white">{impact.player?.name}</h4>
                    <p className="text-sm text-slate-400">{impact.player?.position} • {impact.player?.team}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    impact.severity === 'SEVERE' ? 'bg-red-500/20 text-red-400' :
                    impact.severity === 'MODERATE' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {impact.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Expected to miss {impact.expectedWeeks || 2} weeks • {impact.returnProbability}% return probability
                </p>
                {impact.handcuff && (
                  <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded border border-blue-500/30">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Handcuff: {impact.handcuff.name}</div>
                      <div className="text-xs text-slate-400">Add for {impact.handcuff.projectedIncrease}+ pts</div>
                    </div>
                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium text-white transition-colors">
                      Add
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

