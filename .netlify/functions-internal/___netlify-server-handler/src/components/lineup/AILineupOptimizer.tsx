'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  Trophy,
  CloudRain,
  Shield,
  Target,
  ChevronRight,
  RefreshCw,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  opponent: string;
  projectedPoints: number;
  confidenceScore: number;
  injuryStatus?: string;
  weather?: {
    condition: string;
    windSpeed: number;
    temperature: number;
    precipitation: number;
  };
  trends: {
    last3Games: number;
    seasonAvg: number;
    vsOpponentAvg: number;
  };
}

interface LineupRecommendation {
  player: Player;
  slot: string;
  reasoning: string[];
  alternatives: Player[];
  riskLevel: 'low' | 'medium' | 'high';
  upside: number;
  floor: number;
}

interface OptimizationResult {
  lineup: LineupRecommendation[];
  totalProjectedPoints: number;
  confidenceScore: number;
  winProbability: number;
  keyInsights: string[];
  riskProfile: {
    overall: 'conservative' | 'balanced' | 'aggressive';
    breakdown: {
      injuries: number;
      weather: number;
      matchups: number;
    };
  };
}

function AILineupOptimizer({ 
  teamId, 
  week, 
  leagueId 
}: { 
  teamId: string; 
  week: number; 
  leagueId: string;
}) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<LineupRecommendation | null>(null);
  const [appliedLineup, setAppliedLineup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimizeLineup = useCallback(async () => {
    setIsOptimizing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/optimize-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, week, leagueId })
      });

      if (!response.ok) throw new Error('Failed to optimize lineup');
      
      const data = await response.json();
      setOptimization(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  }, [teamId, week, leagueId]);

  const applyLineup = async () => {
    if (!optimization) return;
    
    try {
      const response = await fetch('/api/lineup/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId, 
          week, 
          lineup: optimization.lineup.map(l => ({
            playerId: l.player.id,
            slot: l.slot
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to apply lineup');
      
      setAppliedLineup(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply lineup');
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header with AI Branding */}
      <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AI Lineup Optimizer</h2>
              <p className="text-gray-400">Machine learning-powered lineup recommendations</p>
            </div>
          </div>
          
          <Button
            onClick={optimizeLineup}
            disabled={isOptimizing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Optimize Lineup
              </>
            )}
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-red-900/20 border-red-500/30">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        </Card>
      )}

      {optimization && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-gray-800 border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Projected Points</span>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {optimization.totalProjectedPoints.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  +{(optimization.totalProjectedPoints * 0.12).toFixed(1)} vs avg
                </div>
              </Card>

              <Card className="p-4 bg-gray-800 border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Confidence Score</span>
                  <Shield className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold text-white">
                    {optimization.confidenceScore}%
                  </div>
                  <div className={`h-2 w-16 rounded-full bg-gray-700`}>
                    <div 
                      className={`h-full rounded-full ${getConfidenceColor(optimization.confidenceScore)}`}
                      style={{ width: `${optimization.confidenceScore}%` }}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gray-800 border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Win Probability</span>
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {optimization.winProbability}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Based on opponent projections
                </div>
              </Card>

              <Card className="p-4 bg-gray-800 border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Risk Profile</span>
                  <Target className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold capitalize text-white">
                  {optimization.riskProfile.overall}
                </div>
                <div className="flex space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    I: {optimization.riskProfile.breakdown.injuries}%
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    W: {optimization.riskProfile.breakdown.weather}%
                  </Badge>
                </div>
              </Card>
            </div>

            {/* Key Insights */}
            <Card className="p-4 bg-gray-800 border-gray-700">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Key Insights</h3>
              </div>
              <div className="space-y-2">
                {optimization.keyInsights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start space-x-2"
                  >
                    <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5" />
                    <span className="text-sm text-gray-300">{insight}</span>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Optimized Lineup */}
            <Card className="p-6 bg-gray-800 border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Optimized Lineup</h3>
                {!appliedLineup && (
                  <Button
                    onClick={applyLineup}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Apply Lineup
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {optimization.lineup.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-all cursor-pointer"
                    onClick={() => setSelectedPlayer(rec)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge className="bg-purple-600">
                          {rec.slot}
                        </Badge>
                        <div>
                          <div className="font-semibold text-white">
                            {rec.player.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {rec.player.team} vs {rec.player.opponent}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {rec.player.projectedPoints.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-400">
                            Floor: {rec.floor.toFixed(1)} | Ceiling: {rec.upside.toFixed(1)}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center">
                          <div className={`text-sm font-medium ${getRiskColor(rec.riskLevel)}`}>
                            {rec.riskLevel.toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-500">risk</div>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="text-sm font-bold text-blue-400">
                            {rec.player.confidenceScore}%
                          </div>
                          <div className="text-xs text-gray-500">conf</div>
                        </div>
                      </div>
                    </div>

                    {/* Weather & Injury Indicators */}
                    <div className="flex items-center space-x-2 mt-2">
                      {rec.player.injuryStatus && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {rec.player.injuryStatus}
                        </Badge>
                      )}
                      {rec.player.weather && rec.player.weather.precipitation > 50 && (
                        <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                          <CloudRain className="w-3 h-3 mr-1" />
                          {rec.player.weather.precipitation}% rain
                        </Badge>
                      )}
                    </div>

                    {/* Reasoning Pills */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.reasoning.slice(0, 3).map((reason, ridx) => (
                        <Badge 
                          key={ridx} 
                          variant="outline" 
                          className="text-xs bg-gray-600/50 border-gray-600"
                        >
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {selectedPlayer.player.name} Analysis
              </h3>
              <Button
                variant="ghost"
                onClick={() => setSelectedPlayer(null)}
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Detailed Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-3 bg-gray-700">
                  <div className="text-xs text-gray-400">Last 3 Games</div>
                  <div className="text-lg font-bold text-white">
                    {selectedPlayer.player.trends.last3Games.toFixed(1)}
                  </div>
                </Card>
                <Card className="p-3 bg-gray-700">
                  <div className="text-xs text-gray-400">Season Avg</div>
                  <div className="text-lg font-bold text-white">
                    {selectedPlayer.player.trends.seasonAvg.toFixed(1)}
                  </div>
                </Card>
                <Card className="p-3 bg-gray-700">
                  <div className="text-xs text-gray-400">vs Opponent</div>
                  <div className="text-lg font-bold text-white">
                    {selectedPlayer.player.trends.vsOpponentAvg.toFixed(1)}
                  </div>
                </Card>
              </div>

              {/* All Reasoning */}
              <div>
                <h4 className="font-semibold text-white mb-2">AI Analysis</h4>
                <div className="space-y-1">
                  {selectedPlayer.reasoning.map((reason, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <span className="text-sm text-gray-300">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternatives */}
              {selectedPlayer.alternatives.length > 0 && (
                <div>
                  <h4 className="font-semibold text-white mb-2">Alternative Options</h4>
                  <div className="space-y-2">
                    {selectedPlayer.alternatives.map((alt, idx) => (
                      <div key={idx} className="p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">{alt.name}</div>
                            <div className="text-sm text-gray-400">
                              {alt.team} vs {alt.opponent}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-white">
                              {alt.projectedPoints.toFixed(1)} pts
                            </div>
                            <div className="text-xs text-gray-400">
                              {alt.confidenceScore}% confidence
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
export default AILineupOptimizer;
