'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRightLeft,
  Plus,
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Player {
  id: string
  name: string
  position: string
  team: string
  fantasyPoints: number
  projectedPoints: number
  value?: number // 0-100 trade value
}

interface TradeAnalysis {
  fairness: number // -100 to 100 (negative = bad for you, positive = good for you)
  myImpact: {
    points: number
    positions: string[]
    riskLevel: 'low' | 'medium' | 'high'
  }
  theirImpact: {
    points: number
    positions: string[]
    riskLevel: 'low' | 'medium' | 'high'
  }
  recommendation: 'accept' | 'reject' | 'counter'
  reasoning: string
}

interface VisualTradeBuilderProps {
  myRoster: Player[]
  theirRoster: Player[]
  myTeamName: string
  theirTeamName: string
  onProposeTrade: (myPlayers: string[], theirPlayers: string[]) => Promise<void>
}

export function VisualTradeBuilder({
  myRoster,
  theirRoster,
  myTeamName,
  theirTeamName,
  onProposeTrade
}: VisualTradeBuilderProps) {
  const [myTrading, setMyTrading] = useState<Player[]>([])
  const [theirTrading, setTheirTrading] = useState<Player[]>([])
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [proposing, setProposing] = useState(false)

  const handleAddMyPlayer = (player: Player) => {
    if (myTrading.find(p => p.id === player.id)) {
      setMyTrading(myTrading.filter(p => p.id !== player.id))
    } else {
      setMyTrading([...myTrading, player])
    }
  }

  const handleAddTheirPlayer = (player: Player) => {
    if (theirTrading.find(p => p.id === player.id)) {
      setTheirTrading(theirTrading.filter(p => p.id !== player.id))
    } else {
      setTheirTrading([...theirTrading, player])
    }
  }

  const handleAnalyze = async () => {
    if (myTrading.length === 0 || theirTrading.length === 0) {
      toast.error('Add players to both sides to analyze')
      return
    }

    setAnalyzing(true)
    
    // Simulate AI analysis (replace with real API call)
    setTimeout(() => {
      const myValue = myTrading.reduce((sum, p) => sum + (p.projectedPoints || 0), 0)
      const theirValue = theirTrading.reduce((sum, p) => sum + (p.projectedPoints || 0), 0)
      const diff = theirValue - myValue
      const fairness = Math.max(-100, Math.min(100, diff * 5))

      setAnalysis({
        fairness,
        myImpact: {
          points: diff,
          positions: [...new Set(theirTrading.map(p => p.position))],
          riskLevel: Math.abs(fairness) < 20 ? 'low' : Math.abs(fairness) < 50 ? 'medium' : 'high'
        },
        theirImpact: {
          points: -diff,
          positions: [...new Set(myTrading.map(p => p.position))],
          riskLevel: Math.abs(fairness) < 20 ? 'low' : Math.abs(fairness) < 50 ? 'medium' : 'high'
        },
        recommendation: fairness > 10 ? 'accept' : fairness < -10 ? 'reject' : 'counter',
        reasoning: fairness > 10 
          ? 'This trade significantly improves your team\'s projected points and addresses key position needs.'
          : fairness < -10
          ? 'This trade appears unfavorable. You\'re giving up more value than you\'re receiving.'
          : 'This trade is relatively balanced but may require fine-tuning based on your roster needs.'
      })
      
      setAnalyzing(false)
    }, 1500)
  }

  const handleMakeFair = () => {
    // Simple algorithm to balance trade (replace with AI)
    const myValue = myTrading.reduce((sum, p) => sum + (p.projectedPoints || 0), 0)
    const theirValue = theirTrading.reduce((sum, p) => sum + (p.projectedPoints || 0), 0)

    if (myValue > theirValue) {
      // Remove lowest value player from my side
      const sorted = [...myTrading].sort((a, b) => a.projectedPoints - b.projectedPoints)
      setMyTrading(sorted.slice(1))
    } else {
      // Remove lowest value player from their side
      const sorted = [...theirTrading].sort((a, b) => a.projectedPoints - b.projectedPoints)
      setTheirTrading(sorted.slice(1))
    }

    toast.success('Trade adjusted for fairness')
  }

  const handlePropose = async () => {
    setProposing(true)
    try {
      await onProposeTrade(
        myTrading.map(p => p.id),
        theirTrading.map(p => p.id)
      )
      toast.success('Trade proposed successfully!')
      // Reset
      setMyTrading([])
      setTheirTrading([])
      setAnalysis(null)
    } catch (error) {
      toast.error('Failed to propose trade')
    } finally {
      setProposing(false)
    }
  }

  const getFairnessColor = (fairness: number) => {
    if (fairness > 20) return 'text-emerald-400'
    if (fairness < -20) return 'text-red-400'
    return 'text-yellow-400'
  }

  const getFairnessLabel = (fairness: number) => {
    if (fairness > 40) return 'Great for You'
    if (fairness > 20) return 'Good for You'
    if (fairness > -20) return 'Fair Trade'
    if (fairness > -40) return 'Bad for You'
    return 'Terrible for You'
  }

  return (
    <div className="space-y-6">
      {/* Trade Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Side */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{myTeamName}</h3>
            <span className="text-sm text-slate-400">Giving</span>
          </div>

          {/* Trade Slots */}
          <div className="space-y-2">
            <AnimatePresence>
              {myTrading.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 group relative"
                >
                  <button
                    onClick={() => handleAddMyPlayer(player)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-opacity opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3 text-red-400" />
                  </button>

                  <div className="text-sm font-medium text-white">{player.name}</div>
                  <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                  <div className="text-xs text-red-400 mt-1">
                    Proj: {player.projectedPoints.toFixed(1)} pts
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {myTrading.length < 3 && (
              <div className="p-6 rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/30 text-center">
                <Plus className="w-6 h-6 mx-auto text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">Add player to trade</p>
              </div>
            )}
          </div>

          {/* My Roster */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {myRoster
              .filter(p => !myTrading.find(tp => tp.id === p.id))
              .map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleAddMyPlayer(player)}
                  className="w-full p-2 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-blue-500/50 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{player.name}</div>
                      <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                    </div>
                    <div className="text-sm font-semibold text-white tabular-nums">
                      {player.projectedPoints.toFixed(1)}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Center Column - Analysis */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-full bg-blue-500/10 border-2 border-blue-500/30">
            <ArrowRightLeft className="w-12 h-12 text-blue-400" />
          </div>

          {analysis ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full space-y-4"
            >
              {/* Fairness Score */}
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-slate-400">Trade Fairness</span>
                </div>

                <div className="text-center">
                  <div className={cn('text-4xl font-bold tabular-nums', getFairnessColor(analysis.fairness))}>
                    {analysis.fairness > 0 ? '+' : ''}{analysis.fairness}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {getFairnessLabel(analysis.fairness)}
                  </div>
                </div>

                <div className="relative h-2 bg-slate-700 rounded-full mt-3 overflow-hidden">
                  <motion.div
                    initial={{ width: '50%' }}
                    animate={{ left: `${50 + (analysis.fairness / 2)}%` }}
                    className="absolute top-0 bottom-0 w-1 bg-white"
                  />
                </div>
              </div>

              {/* Impact */}
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                <div className="text-sm font-medium text-white mb-2">Your Impact</div>
                <div className="flex items-center gap-2">
                  {analysis.myImpact.points > 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  <span className={cn(
                    'font-semibold',
                    analysis.myImpact.points > 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {analysis.myImpact.points > 0 ? '+' : ''}{analysis.myImpact.points.toFixed(1)} pts/week
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Risk: {analysis.myImpact.riskLevel}
                </div>
              </div>

              {/* Recommendation */}
              <div className={cn(
                'p-4 rounded-lg border',
                analysis.recommendation === 'accept' && 'bg-emerald-500/10 border-emerald-500/30',
                analysis.recommendation === 'reject' && 'bg-red-500/10 border-red-500/30',
                analysis.recommendation === 'counter' && 'bg-yellow-500/10 border-yellow-500/30'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className={cn(
                    'w-5 h-5',
                    analysis.recommendation === 'accept' && 'text-emerald-400',
                    analysis.recommendation === 'reject' && 'text-red-400',
                    analysis.recommendation === 'counter' && 'text-yellow-400'
                  )} />
                  <span className={cn(
                    'text-sm font-semibold uppercase',
                    analysis.recommendation === 'accept' && 'text-emerald-400',
                    analysis.recommendation === 'reject' && 'text-red-400',
                    analysis.recommendation === 'counter' && 'text-yellow-400'
                  )}>
                    {analysis.recommendation}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {analysis.reasoning}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="text-center space-y-3">
              <button
                onClick={handleAnalyze}
                disabled={myTrading.length === 0 || theirTrading.length === 0 || analyzing}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-lg font-semibold',
                  'bg-gradient-to-r from-purple-500 to-blue-500',
                  'text-white',
                  'hover:from-purple-600 hover:to-blue-600',
                  'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                  'shadow-lg hover:shadow-xl'
                )}
              >
                <Sparkles className="w-5 h-5" />
                <span>{analyzing ? 'Analyzing...' : 'Analyze Trade'}</span>
              </button>

              <button
                onClick={handleMakeFair}
                disabled={myTrading.length === 0 || theirTrading.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Scale className="w-4 h-4" />
                <span>Make Fair</span>
              </button>
            </div>
          )}
        </div>

        {/* Their Side */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{theirTeamName}</h3>
            <span className="text-sm text-slate-400">Receiving</span>
          </div>

          {/* Trade Slots */}
          <div className="space-y-2">
            <AnimatePresence>
              {theirTrading.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 group relative"
                >
                  <button
                    onClick={() => handleAddTheirPlayer(player)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-opacity opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3 text-red-400" />
                  </button>

                  <div className="text-sm font-medium text-white">{player.name}</div>
                  <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                  <div className="text-xs text-emerald-400 mt-1">
                    Proj: {player.projectedPoints.toFixed(1)} pts
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {theirTrading.length < 3 && (
              <div className="p-6 rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/30 text-center">
                <Plus className="w-6 h-6 mx-auto text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">Add player to receive</p>
              </div>
            )}
          </div>

          {/* Their Roster */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {theirRoster
              .filter(p => !theirTrading.find(tp => tp.id === p.id))
              .map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleAddTheirPlayer(player)}
                  className="w-full p-2 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 border border-slate-700/30 hover:border-blue-500/50 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{player.name}</div>
                      <div className="text-xs text-slate-400">{player.position} • {player.team}</div>
                    </div>
                    <div className="text-sm font-semibold text-white tabular-nums">
                      {player.projectedPoints.toFixed(1)}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-6 rounded-xl bg-slate-800/50 border border-slate-700/50"
        >
          <div className="flex items-center gap-4">
            {analysis.recommendation === 'accept' && (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            )}
            {analysis.recommendation === 'reject' && (
              <AlertTriangle className="w-8 h-8 text-red-400" />
            )}
            {analysis.recommendation === 'counter' && (
              <Scale className="w-8 h-8 text-yellow-400" />
            )}

            <div>
              <div className="font-semibold text-white">
                {analysis.recommendation === 'accept' && 'Ready to Propose'}
                {analysis.recommendation === 'reject' && 'Consider Adjusting'}
                {analysis.recommendation === 'counter' && 'Fair Trade'}
              </div>
              <div className="text-sm text-slate-400">
                {myTrading.length} for {theirTrading.length} player trade
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAnalysis(null)}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              Edit Trade
            </button>
            
            <button
              onClick={handlePropose}
              disabled={proposing || analysis.recommendation === 'reject'}
              className={cn(
                'px-6 py-2 rounded-lg font-semibold transition-all',
                'bg-gradient-to-r from-blue-500 to-purple-500',
                'hover:from-blue-600 hover:to-purple-600',
                'text-white shadow-lg',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {proposing ? 'Proposing...' : 'Propose Trade'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

