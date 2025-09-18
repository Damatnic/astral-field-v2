'use client';


import { handleComponentError } from '@/lib/error-handling';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Trophy,
  AlertTriangle,
  BarChart3,
  Calendar,
  Zap,
  Shield,
  Target,
  ArrowRight,
  RefreshCw,
  Users,
  DollarSign
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  currentValue: number;
  futureValue: number;
  dynastyValue: number;
  age: number;
  injuryRisk: number;
  consistency: number;
}

interface Team {
  id: string;
  name: string;
  owner: string;
  record: string;
  projectedRank: number;
}

interface TradeAnalysis {
  fairnessScore: number;
  team1Impact: {
    immediateValue: number;
    futureValue: number;
    winProbabilityChange: number;
    playoffOddsChange: number;
    strengthChanges: {
      position: string;
      change: number;
    }[];
  };
  team2Impact: {
    immediateValue: number;
    futureValue: number;
    winProbabilityChange: number;
    playoffOddsChange: number;
    strengthChanges: {
      position: string;
      change: number;
    }[];
  };
  dynastyImpact: {
    team1YearOverYear: number[];
    team2YearOverYear: number[];
  };
  marketContext: {
    similarTrades: {
      date: string;
      description: string;
      fairnessScore: number;
    }[];
    marketTrend: 'buyers' | 'sellers' | 'balanced';
  };
  recommendations: string[];
  risks: string[];
}

interface TradeOffer {
  team1: Team;
  team2: Team;
  team1Gives: Player[];
  team2Gives: Player[];
  draftPicks?: {
    team: string;
    round: number;
    year: number;
  }[];
  faabAmount?: number;
}

export function AdvancedTradeAnalyzer({ 
  leagueId,
  currentTeamId 
}: { 
  leagueId: string;
  currentTeamId: string;
}) {
  const [tradeOffer, setTradeOffer] = useState<TradeOffer | null>(null);
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'dynasty' | 'market'>('overview');
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);

  const analyzeTrade = async () => {
    if (!tradeOffer) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/trade/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leagueId,
          trade: tradeOffer 
        })
      });

      if (!response.ok) throw new Error('Failed to analyze trade');
      
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      handleComponentError(error as Error, 'AdvancedTradeAnalyzer');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFairnessColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getFairnessLabel = (score: number) => {
    if (score >= 90) return 'Very Fair';
    if (score >= 75) return 'Fair';
    if (score >= 60) return 'Slightly Unbalanced';
    if (score >= 40) return 'Unbalanced';
    return 'Heavily Unbalanced';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Scale className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Advanced Trade Analyzer</h2>
              <p className="text-gray-400">Dynasty-aware trade evaluation with future projections</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Trade Builder */}
      <Card className="p-6 bg-gray-800 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Build Trade Offer</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team 1 Side */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-white">Your Team</h4>
              <Badge className="bg-blue-600">4-2 Record</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Players to Give:</div>
              <div className="min-h-[100px] p-4 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600">
                {team1Players.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-gray-700 rounded mb-2">
                    <div>
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="text-xs text-gray-400">{player.position} - {player.team}</div>
                    </div>
                    <Badge variant="outline">{player.currentValue} pts</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center justify-center">
            <ArrowRight className="w-8 h-8 text-gray-500" />
          </div>

          {/* Team 2 Side */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-white">Trade Partner</h4>
              <Badge className="bg-purple-600">3-3 Record</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Players to Receive:</div>
              <div className="min-h-[100px] p-4 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600">
                {team2Players.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-gray-700 rounded mb-2">
                    <div>
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="text-xs text-gray-400">{player.position} - {player.team}</div>
                    </div>
                    <Badge variant="outline">{player.currentValue} pts</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            onClick={analyzeTrade}
            disabled={isAnalyzing || team1Players.length === 0 || team2Players.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Trade...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analyze Trade
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Fairness Score */}
            <Card className="p-6 bg-gray-800 border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Trade Fairness Score</h3>
                  <div className="flex items-center space-x-4">
                    <div className={`text-4xl font-bold ${getFairnessColor(analysis.fairnessScore)}`}>
                      {analysis.fairnessScore}%
                    </div>
                    <Badge className={`${getFairnessColor(analysis.fairnessScore)} bg-opacity-20`}>
                      {getFairnessLabel(analysis.fairnessScore)}
                    </Badge>
                  </div>
                </div>
                
                <div className="w-32 h-32">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(analysis.fairnessScore / 100) * 352} 352`}
                      className={getFairnessColor(analysis.fairnessScore)}
                    />
                  </svg>
                </div>
              </div>
            </Card>

            {/* Tab Navigation */}
            <div className="flex space-x-2">
              {['overview', 'dynasty', 'market'].map((tab) => (
                <Button
                  key={tab}
                  variant={selectedTab === tab ? 'primary' : 'outline'}
                  onClick={() => setSelectedTab(tab as any)}
                  className="capitalize"
                >
                  {tab}
                </Button>
              ))}
            </div>

            {/* Tab Content */}
            {selectedTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team 1 Impact */}
                <Card className="p-6 bg-gray-800 border-gray-700">
                  <h4 className="font-semibold text-white mb-4">Your Team Impact</h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Immediate Value</div>
                        <div className={`text-2xl font-bold ${
                          analysis.team1Impact.immediateValue > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {analysis.team1Impact.immediateValue > 0 ? '+' : ''}
                          {analysis.team1Impact.immediateValue.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Future Value</div>
                        <div className={`text-2xl font-bold ${
                          analysis.team1Impact.futureValue > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {analysis.team1Impact.futureValue > 0 ? '+' : ''}
                          {analysis.team1Impact.futureValue.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Win Probability</span>
                        <span className={`font-medium ${
                          analysis.team1Impact.winProbabilityChange > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {analysis.team1Impact.winProbabilityChange > 0 ? '+' : ''}
                          {analysis.team1Impact.winProbabilityChange.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Playoff Odds</span>
                        <span className={`font-medium ${
                          analysis.team1Impact.playoffOddsChange > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {analysis.team1Impact.playoffOddsChange > 0 ? '+' : ''}
                          {analysis.team1Impact.playoffOddsChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-2">Position Strength Changes</div>
                      <div className="space-y-1">
                        {analysis.team1Impact.strengthChanges.map((change, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-white">{change.position}</span>
                            <div className="flex items-center">
                              {change.change > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                              )}
                              <span className={`text-sm ${
                                change.change > 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {change.change > 0 ? '+' : ''}{change.change}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Team 2 Impact */}
                <Card className="p-6 bg-gray-800 border-gray-700">
                  <h4 className="font-semibold text-white mb-4">Trade Partner Impact</h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Immediate Value</div>
                        <div className={`text-2xl font-bold ${
                          analysis.team2Impact.immediateValue > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {analysis.team2Impact.immediateValue > 0 ? '+' : ''}
                          {analysis.team2Impact.immediateValue.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Future Value</div>
                        <div className={`text-2xl font-bold ${
                          analysis.team2Impact.futureValue > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {analysis.team2Impact.futureValue > 0 ? '+' : ''}
                          {analysis.team2Impact.futureValue.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Win Probability</span>
                        <span className={`font-medium ${
                          analysis.team2Impact.winProbabilityChange > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {analysis.team2Impact.winProbabilityChange > 0 ? '+' : ''}
                          {analysis.team2Impact.winProbabilityChange.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Playoff Odds</span>
                        <span className={`font-medium ${
                          analysis.team2Impact.playoffOddsChange > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {analysis.team2Impact.playoffOddsChange > 0 ? '+' : ''}
                          {analysis.team2Impact.playoffOddsChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-2">Position Strength Changes</div>
                      <div className="space-y-1">
                        {analysis.team2Impact.strengthChanges.map((change, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-white">{change.position}</span>
                            <div className="flex items-center">
                              {change.change > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                              )}
                              <span className={`text-sm ${
                                change.change > 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {change.change > 0 ? '+' : ''}{change.change}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {selectedTab === 'dynasty' && (
              <Card className="p-6 bg-gray-800 border-gray-700">
                <h4 className="font-semibold text-white mb-4">Dynasty Impact (3-Year Projection)</h4>
                
                <div className="space-y-6">
                  {/* Year over year chart would go here */}
                  <div className="h-64 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">Dynasty value projection chart</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-white mb-2">Your Team Trajectory</h5>
                      <div className="space-y-2">
                        {analysis.dynastyImpact.team1YearOverYear.map((value, year) => (
                          <div key={year} className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Year {year + 1}</span>
                            <span className={`font-medium ${
                              value > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {value > 0 ? '+' : ''}{value.toFixed(1)} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-white mb-2">Partner Team Trajectory</h5>
                      <div className="space-y-2">
                        {analysis.dynastyImpact.team2YearOverYear.map((value, year) => (
                          <div key={year} className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Year {year + 1}</span>
                            <span className={`font-medium ${
                              value > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {value > 0 ? '+' : ''}{value.toFixed(1)} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {selectedTab === 'market' && (
              <Card className="p-6 bg-gray-800 border-gray-700">
                <h4 className="font-semibold text-white mb-4">Market Context</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-400">Current Market</span>
                    <Badge className={
                      analysis.marketContext.marketTrend === 'buyers' ? 'bg-green-600' :
                      analysis.marketContext.marketTrend === 'sellers' ? 'bg-red-600' :
                      'bg-yellow-600'
                    }>
                      {analysis.marketContext.marketTrend.toUpperCase()} MARKET
                    </Badge>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Similar Recent Trades</h5>
                    <div className="space-y-2">
                      {analysis.marketContext.similarTrades.map((trade, idx) => (
                        <div key={idx} className="p-3 bg-gray-700/50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-white">{trade.description}</div>
                              <div className="text-xs text-gray-400">{trade.date}</div>
                            </div>
                            <Badge variant="outline" className={getFairnessColor(trade.fairnessScore)}>
                              {trade.fairnessScore}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Recommendations & Risks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-gray-800 border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="w-5 h-5 text-green-400" />
                  <h4 className="font-semibold text-white">Recommendations</h4>
                </div>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <div className="w-1 h-1 bg-green-400 rounded-full mt-2" />
                      <span className="text-sm text-gray-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-gray-800 border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h4 className="font-semibold text-white">Risk Factors</h4>
                </div>
                <div className="space-y-2">
                  {analysis.risks.map((risk, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <div className="w-1 h-1 bg-yellow-400 rounded-full mt-2" />
                      <span className="text-sm text-gray-300">{risk}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}export default AdvancedTradeAnalyzer;
