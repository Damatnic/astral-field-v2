'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  User,
  Calendar,
  Info,
  ChevronRight,
  Heart,
  Zap,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface InjuryHistory {
  date: string;
  type: string;
  duration: number;
  severity: 'minor' | 'moderate' | 'severe';
}

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  age: number;
  yearsInNFL: number;
  currentStatus: string;
  injuryHistory: InjuryHistory[];
  workload: {
    snapsPerGame: number;
    touchesPerGame: number;
    targetShare: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
}

interface InjuryPrediction {
  player: Player;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  primaryFactors: string[];
  projectedGamesAffected: number;
  confidenceLevel: number;
  recommendations: string[];
  similarPlayers: {
    name: string;
    outcome: string;
    similarity: number;
  }[];
  backupSuggestions: {
    player: string;
    availability: string;
    projectedPoints: number;
  }[];
}

interface TeamInjuryReport {
  teamId: string;
  teamName: string;
  overallRisk: number;
  playersAtRisk: InjuryPrediction[];
  positionVulnerability: {
    position: string;
    risk: number;
    depth: number;
  }[];
  weeklyProjection: {
    week: number;
    expectedHealthy: number;
    expectedQuestionable: number;
    expectedOut: number;
  }[];
}

export function InjuryPredictor({ 
  teamId,
  leagueId 
}: { 
  teamId: string;
  leagueId: string;
}) {
  const [teamReport, setTeamReport] = useState<TeamInjuryReport | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<InjuryPrediction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'recommendations'>('overview');

  useEffect(() => {
    analyzeTeamInjuryRisk();
  }, [teamId]);

  const analyzeTeamInjuryRisk = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/injury/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, leagueId })
      });

      if (response.ok) {
        const data = await response.json();
        setTeamReport(data);
      }
    } catch (error) {
      console.error('Failed to analyze injury risk:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-900/20 border-green-500/30';
      case 'medium': return 'bg-yellow-900/20 border-yellow-500/30';
      case 'high': return 'bg-orange-900/20 border-orange-500/30';
      case 'critical': return 'bg-red-900/20 border-red-500/30';
      default: return 'bg-gray-900/20 border-gray-500/30';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-red-900/20 to-orange-900/20 border-red-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <Heart className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Injury Prediction System</h2>
              <p className="text-gray-400">AI-powered injury risk analysis and prevention</p>
            </div>
          </div>
          
          <Button
            onClick={analyzeTeamInjuryRisk}
            disabled={isAnalyzing}
            className="bg-red-600 hover:bg-red-700"
          >
            {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </div>
      </Card>

      {/* View Mode Tabs */}
      <div className="flex space-x-2">
        {['overview', 'detailed', 'recommendations'].map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'default' : 'outline'}
            onClick={() => setViewMode(mode as any)}
            className="capitalize"
          >
            {mode}
          </Button>
        ))}
      </div>

      {teamReport && (
        <AnimatePresence mode="wait">
          {viewMode === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Team Risk Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gray-800 border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Overall Team Risk</span>
                    <Shield className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {teamReport.overallRisk}%
                  </div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        teamReport.overallRisk > 70 ? 'bg-red-500' :
                        teamReport.overallRisk > 40 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${teamReport.overallRisk}%` }}
                    />
                  </div>
                </Card>

                <Card className="p-4 bg-gray-800 border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Players at Risk</span>
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {teamReport.playersAtRisk.filter(p => p.riskLevel !== 'low').length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {teamReport.playersAtRisk.filter(p => p.riskLevel === 'critical').length} critical
                  </div>
                </Card>

                <Card className="p-4 bg-gray-800 border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Projected Impact</span>
                    <Calendar className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {teamReport.playersAtRisk.reduce((sum, p) => sum + p.projectedGamesAffected, 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    games affected total
                  </div>
                </Card>
              </div>

              {/* High Risk Players */}
              <Card className="p-6 bg-gray-800 border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">High Risk Players</h3>
                
                <div className="space-y-3">
                  {teamReport.playersAtRisk
                    .filter(p => p.riskLevel !== 'low')
                    .sort((a, b) => b.riskScore - a.riskScore)
                    .map((prediction) => (
                      <motion.div
                        key={prediction.player.id}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-lg cursor-pointer ${getRiskBgColor(prediction.riskLevel)}`}
                        onClick={() => setSelectedPlayer(prediction)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-lg ${
                              prediction.riskLevel === 'critical' ? 'bg-red-500/20' :
                              prediction.riskLevel === 'high' ? 'bg-orange-500/20' :
                              'bg-yellow-500/20'
                            }`}>
                              <AlertTriangle className={`w-5 h-5 ${getRiskColor(prediction.riskLevel)}`} />
                            </div>
                            
                            <div>
                              <div className="font-semibold text-white">
                                {prediction.player.name}
                              </div>
                              <div className="text-sm text-gray-400">
                                {prediction.player.position} - {prediction.player.team}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getRiskColor(prediction.riskLevel)}`}>
                              {prediction.riskScore}%
                            </div>
                            <Badge className={`${getRiskColor(prediction.riskLevel)} bg-opacity-20`}>
                              {prediction.riskLevel.toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {prediction.primaryFactors.slice(0, 3).map((factor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="text-sm text-gray-400">
                            {prediction.projectedGamesAffected.toFixed(1)} games at risk
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </Card>

              {/* Position Vulnerability */}
              <Card className="p-6 bg-gray-800 border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Position Vulnerability</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {teamReport.positionVulnerability.map((pos) => (
                    <div key={pos.position} className="text-center">
                      <div className="text-sm text-gray-400 mb-1">{pos.position}</div>
                      <div className={`text-2xl font-bold ${
                        pos.risk > 60 ? 'text-red-500' :
                        pos.risk > 30 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {pos.risk}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Depth: {pos.depth}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {viewMode === 'detailed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Detailed Player Analysis */}
              {teamReport.playersAtRisk.map((prediction) => (
                <Card key={prediction.player.id} className="p-6 bg-gray-800 border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getRiskBgColor(prediction.riskLevel)}`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{prediction.player.name}</h4>
                        <div className="text-sm text-gray-400">
                          {prediction.player.position} | Age: {prediction.player.age} | {prediction.player.yearsInNFL} years NFL
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getRiskColor(prediction.riskLevel)}`}>
                        {prediction.riskScore}% Risk
                      </div>
                      <div className="text-sm text-gray-400">
                        {prediction.confidenceLevel}% confidence
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Workload Analysis */}
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <h5 className="font-medium text-white mb-2">Workload Analysis</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Snaps/Game</span>
                          <span className="text-white">{prediction.player.workload.snapsPerGame}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Touches/Game</span>
                          <span className="text-white">{prediction.player.workload.touchesPerGame}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Usage Trend</span>
                          <div className="flex items-center">
                            {prediction.player.workload.trend === 'increasing' ? (
                              <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                            ) : prediction.player.workload.trend === 'decreasing' ? (
                              <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                            ) : (
                              <Activity className="w-4 h-4 text-yellow-500 mr-1" />
                            )}
                            <span className="text-white capitalize">{prediction.player.workload.trend}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Injury History */}
                    <div className="p-4 bg-gray-700/50 rounded-lg">
                      <h5 className="font-medium text-white mb-2">Recent Injury History</h5>
                      <div className="space-y-2">
                        {prediction.player.injuryHistory.slice(0, 3).map((injury, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">{injury.type}</span>
                              <Badge variant="outline" className={`text-xs ${
                                injury.severity === 'severe' ? 'border-red-500 text-red-500' :
                                injury.severity === 'moderate' ? 'border-yellow-500 text-yellow-500' :
                                'border-green-500 text-green-500'
                              }`}>
                                {injury.duration} weeks
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">{injury.date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Primary Risk Factors */}
                  <div className="mt-4">
                    <h5 className="font-medium text-white mb-2">Primary Risk Factors</h5>
                    <div className="flex flex-wrap gap-2">
                      {prediction.primaryFactors.map((factor, idx) => (
                        <Badge key={idx} className="bg-gray-700">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}

          {viewMode === 'recommendations' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Recommendations for Each At-Risk Player */}
              {teamReport.playersAtRisk
                .filter(p => p.riskLevel !== 'low')
                .map((prediction) => (
                  <Card key={prediction.player.id} className="p-6 bg-gray-800 border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-white">{prediction.player.name}</h4>
                      <Badge className={getRiskColor(prediction.riskLevel)}>
                        {prediction.riskLevel.toUpperCase()} RISK
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Action Items */}
                      <div>
                        <h5 className="font-medium text-white mb-3">Recommended Actions</h5>
                        <div className="space-y-2">
                          {prediction.recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                              <span className="text-sm text-gray-300">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Backup Options */}
                      <div>
                        <h5 className="font-medium text-white mb-3">Backup Options</h5>
                        <div className="space-y-2">
                          {prediction.backupSuggestions.map((backup, idx) => (
                            <div key={idx} className="p-3 bg-gray-700/50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white">{backup.player}</div>
                                  <div className="text-xs text-gray-400">{backup.availability}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-white">
                                    {backup.projectedPoints.toFixed(1)} pts
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Similar Player Outcomes */}
                    <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
                      <h5 className="font-medium text-white mb-2">Similar Player Outcomes</h5>
                      <div className="space-y-1">
                        {prediction.similarPlayers.map((similar, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{similar.name}</span>
                            <span className="text-gray-300">{similar.outcome}</span>
                            <Badge variant="outline" className="text-xs">
                              {similar.similarity}% match
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}

              {/* Weekly Projection */}
              <Card className="p-6 bg-gray-800 border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">4-Week Health Projection</h3>
                
                <div className="grid grid-cols-4 gap-4">
                  {teamReport.weeklyProjection.slice(0, 4).map((week) => (
                    <div key={week.week} className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-400 mb-2">Week {week.week}</div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Healthy</span>
                          <span className="text-sm font-bold text-green-500">{week.expectedHealthy}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Quest.</span>
                          <span className="text-sm font-bold text-yellow-500">{week.expectedQuestionable}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Out</span>
                          <span className="text-sm font-bold text-red-500">{week.expectedOut}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
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
                {selectedPlayer.player.name} - Detailed Analysis
              </h3>
              <Button
                variant="ghost"
                onClick={() => setSelectedPlayer(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              {/* Risk Assessment */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Risk Assessment</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Risk Score</div>
                    <div className={`text-2xl font-bold ${getRiskColor(selectedPlayer.riskLevel)}`}>
                      {selectedPlayer.riskScore}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Confidence</div>
                    <div className="text-2xl font-bold text-white">
                      {selectedPlayer.confidenceLevel}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Recommendations */}
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Management Strategy</h4>
                <div className="space-y-2">
                  {selectedPlayer.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <Target className="w-4 h-4 text-blue-400 mt-0.5" />
                      <span className="text-sm text-gray-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}export default InjuryPredictor;
