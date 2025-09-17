'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calculator,
  MessageCircle,
  Send,
  Plus,
  Minus,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Trophy,
  Target,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  value: number; // Trade value
  projectedPoints: number;
  seasonPoints: number;
  trend: 'up' | 'down' | 'neutral';
  injury?: string;
}

interface Team {
  id: string;
  name: string;
  owner: string;
  record: string;
  rank: number;
  roster: Player[];
  needs: string[]; // Position needs
}

interface TradeOffer {
  id: string;
  fromTeam: Team;
  toTeam: Team;
  playersOffered: Player[];
  playersRequested: Player[];
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  fairnessRating: number; // 0-100
  winProbabilityChange: {
    fromTeam: number;
    toTeam: number;
  };
  timestamp: Date;
  message?: string;
  aiAnalysis?: {
    recommendation: 'accept' | 'reject' | 'counter';
    reasoning: string[];
    confidence: number;
  };
}

interface TradeAnalysis {
  fairnessScore: number;
  winProbabilityImpact: number;
  playoffOddsChange: number;
  strengthOfSchedule: number;
  injuryRisk: number;
  recommendation: string;
}

export default function TradeCenter() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [playersOffered, setPlayersOffered] = useState<Player[]>([]);
  const [playersRequested, setPlayersRequested] = useState<Player[]>([]);
  const [tradeMessage, setTradeMessage] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [tradeAnalysis, setTradeAnalysis] = useState<TradeAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'propose' | 'pending' | 'history'>('propose');
  const [pendingTrades, setPendingTrades] = useState<TradeOffer[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeOffer[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [multiTeamMode, setMultiTeamMode] = useState(false);
  const [additionalTeams, setAdditionalTeams] = useState<Team[]>([]);

  // Mock data initialization
  useEffect(() => {
    const mockTeams: Team[] = [
      {
        id: '1',
        name: 'Thunder Bolts',
        owner: 'You',
        record: '6-2',
        rank: 2,
        roster: [
          { id: 'p1', name: 'Patrick Mahomes', position: 'QB', team: 'KC', value: 95, projectedPoints: 24.5, seasonPoints: 198, trend: 'up' },
          { id: 'p2', name: 'Christian McCaffrey', position: 'RB', team: 'SF', value: 98, projectedPoints: 18.3, seasonPoints: 156, trend: 'down', injury: 'Q' },
          { id: 'p3', name: 'Tyreek Hill', position: 'WR', team: 'MIA', value: 92, projectedPoints: 16.8, seasonPoints: 142, trend: 'up' },
          { id: 'p4', name: 'Travis Kelce', position: 'TE', team: 'KC', value: 88, projectedPoints: 13.2, seasonPoints: 112, trend: 'neutral' }
        ],
        needs: ['RB', 'WR']
      },
      {
        id: '2',
        name: 'Lightning Strike',
        owner: 'Sarah W.',
        record: '5-3',
        rank: 4,
        roster: [
          { id: 'p5', name: 'Jalen Hurts', position: 'QB', team: 'PHI', value: 93, projectedPoints: 23.8, seasonPoints: 189, trend: 'up' },
          { id: 'p6', name: 'Austin Ekeler', position: 'RB', team: 'LAC', value: 85, projectedPoints: 14.2, seasonPoints: 128, trend: 'neutral' },
          { id: 'p7', name: 'CeeDee Lamb', position: 'WR', team: 'DAL', value: 90, projectedPoints: 15.9, seasonPoints: 138, trend: 'up' },
          { id: 'p8', name: 'Mark Andrews', position: 'TE', team: 'BAL', value: 82, projectedPoints: 11.5, seasonPoints: 98, trend: 'down' }
        ],
        needs: ['RB', 'TE']
      },
      {
        id: '3',
        name: 'Dark Horses',
        owner: 'Mike J.',
        record: '4-4',
        rank: 6,
        roster: [
          { id: 'p9', name: 'Josh Allen', position: 'QB', team: 'BUF', value: 94, projectedPoints: 24.2, seasonPoints: 195, trend: 'up' },
          { id: 'p10', name: 'Derrick Henry', position: 'RB', team: 'TEN', value: 83, projectedPoints: 13.8, seasonPoints: 118, trend: 'down' },
          { id: 'p11', name: 'Justin Jefferson', position: 'WR', team: 'MIN', value: 96, projectedPoints: 17.2, seasonPoints: 148, trend: 'up' },
        ],
        needs: ['QB', 'WR']
      }
    ];

    setTeams(mockTeams.slice(1));
    setMyTeam(mockTeams[0]);

    // Mock pending trades
    setPendingTrades([
      {
        id: 't1',
        fromTeam: mockTeams[1],
        toTeam: mockTeams[0],
        playersOffered: [mockTeams[1].roster[2]],
        playersRequested: [mockTeams[0].roster[1]],
        status: 'pending',
        fairnessRating: 72,
        winProbabilityChange: { fromTeam: 3.2, toTeam: -1.8 },
        timestamp: new Date(Date.now() - 3600000),
        message: 'I need RB help, willing to overpay slightly',
        aiAnalysis: {
          recommendation: 'counter',
          reasoning: [
            'McCaffrey has higher trade value despite injury concern',
            'You\'re thin at RB position',
            'Consider countering for additional asset'
          ],
          confidence: 78
        }
      }
    ]);
  }, []);

  const calculateTradeValue = () => {
    const offeredValue = playersOffered.reduce((sum, p) => sum + p.value, 0);
    const requestedValue = playersRequested.reduce((sum, p) => sum + p.value, 0);
    const fairness = 100 - Math.abs(offeredValue - requestedValue);
    return { offeredValue, requestedValue, fairness: Math.max(0, fairness) };
  };

  const analyzeTrade = () => {
    setIsAnalyzing(true);
    setShowAnalysis(true);
    
    setTimeout(() => {
      const { fairness } = calculateTradeValue();
      setTradeAnalysis({
        fairnessScore: fairness,
        winProbabilityImpact: Math.random() * 10 - 5,
        playoffOddsChange: Math.random() * 20 - 10,
        strengthOfSchedule: Math.random() * 100,
        injuryRisk: Math.random() * 30,
        recommendation: fairness > 70 ? 'This trade looks favorable' : 'Consider negotiating further'
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  const proposeTrade = () => {
    if (!selectedTeam || playersOffered.length === 0 || playersRequested.length === 0) return;

    const newTrade: TradeOffer = {
      id: `t${Date.now()}`,
      fromTeam: myTeam!,
      toTeam: selectedTeam,
      playersOffered,
      playersRequested,
      status: 'pending',
      fairnessRating: calculateTradeValue().fairness,
      winProbabilityChange: {
        fromTeam: Math.random() * 10 - 5,
        toTeam: Math.random() * 10 - 5
      },
      timestamp: new Date(),
      message: tradeMessage
    };

    setPendingTrades(prev => [...prev, newTrade]);
    resetTrade();
  };

  const resetTrade = () => {
    setPlayersOffered([]);
    setPlayersRequested([]);
    setTradeMessage('');
    setSelectedTeam(null);
    setShowAnalysis(false);
    setTradeAnalysis(null);
  };

  const PlayerCard = ({ player, isSelected, onToggle }: { 
    player: Player; 
    isSelected: boolean; 
    onToggle: () => void;
  }) => {
    const positionColors: Record<string, string> = {
      QB: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      RB: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      WR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      TE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onToggle}
        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
          isSelected 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${positionColors[player.position]}`}>
              {player.position}
            </span>
            {player.injury && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                {player.injury}
              </span>
            )}
            {player.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {player.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {player.value}
          </span>
        </div>
        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{player.name}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{player.team}</p>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-gray-500">Proj: {player.projectedPoints}</span>
          <span className="text-gray-500">Total: {player.seasonPoints}</span>
        </div>
      </motion.div>
    );
  };

  const TradeOfferCard = ({ trade }: { trade: TradeOffer }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-5 w-5 text-gray-500" />
          <div>
            <p className="font-semibold text-sm">
              {trade.fromTeam.name} ↔ {trade.toTeam.name}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(trade.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          trade.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
          trade.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
          trade.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        }`}>
          {trade.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Offering</p>
          <div className="space-y-1">
            {trade.playersOffered.map(player => (
              <div key={player.id} className="text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                {player.name} ({player.position})
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Requesting</p>
          <div className="space-y-1">
            {trade.playersRequested.map(player => (
              <div key={player.id} className="text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                {player.name} ({player.position})
              </div>
            ))}
          </div>
        </div>
      </div>

      {trade.message && (
        <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-3">
          &ldquo;{trade.message}&rdquo;
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 text-xs">
          <span className={`font-medium ${
            trade.fairnessRating > 70 ? 'text-green-600' : 
            trade.fairnessRating > 40 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {trade.fairnessRating}% Fair
          </span>
          <span className="text-gray-500">
            Win Prob: {trade.winProbabilityChange.toTeam > 0 ? '+' : ''}{trade.winProbabilityChange.toTeam.toFixed(1)}%
          </span>
        </div>
        {trade.status === 'pending' && (
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium">
              Accept
            </button>
            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium">
              Counter
            </button>
            <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">
              Reject
            </button>
          </div>
        )}
      </div>

      {trade.aiAnalysis && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">
              AI Recommends: {trade.aiAnalysis.recommendation.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">
              ({trade.aiAnalysis.confidence}% confident)
            </span>
          </div>
          <div className="space-y-1">
            {trade.aiAnalysis.reasoning.map((reason, idx) => (
              <p key={idx} className="text-xs text-gray-600 dark:text-gray-400 pl-6">
                • {reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trade Center</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Propose, analyze, and manage trades with AI-powered insights
          </p>
        </div>
        <button
          onClick={() => setMultiTeamMode(!multiTeamMode)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            multiTeamMode 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
          }`}
        >
          {multiTeamMode ? 'Multi-Team Active' : 'Enable Multi-Team'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['propose', 'pending', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab === 'propose' && 'Propose Trade'}
            {tab === 'pending' && `Pending (${pendingTrades.length})`}
            {tab === 'history' && 'History'}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'propose' && (
          <motion.div
            key="propose"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Selection */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">Select Team to Trade With</h3>
                  <div className="space-y-2">
                    {teams.map(team => (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedTeam?.id === team.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{team.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {team.owner} • {team.record} (#{team.rank})
                            </p>
                          </div>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                        {team.needs.length > 0 && (
                          <div className="mt-2 flex gap-1">
                            {team.needs.map(need => (
                              <span key={need} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                Needs {need}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trade Builder */}
              <div className="lg:col-span-2">
                {selectedTeam ? (
                  <div className="space-y-4">
                    {/* My Roster */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold mb-3">Your Players to Offer</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {myTeam?.roster.map(player => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            isSelected={playersOffered.includes(player)}
                            onToggle={() => {
                              setPlayersOffered(prev =>
                                prev.includes(player)
                                  ? prev.filter(p => p.id !== player.id)
                                  : [...prev, player]
                              );
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Their Roster */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold mb-3">Request from {selectedTeam.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedTeam.roster.map(player => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            isSelected={playersRequested.includes(player)}
                            onToggle={() => {
                              setPlayersRequested(prev =>
                                prev.includes(player)
                                  ? prev.filter(p => p.id !== player.id)
                                  : [...prev, player]
                              );
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Trade Summary */}
                    {(playersOffered.length > 0 || playersRequested.length > 0) && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold mb-3">Trade Summary</h4>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">You Send:</p>
                            {playersOffered.map(player => (
                              <div key={player.id} className="text-sm font-medium">
                                {player.name} ({player.position})
                              </div>
                            ))}
                            {playersOffered.length === 0 && (
                              <p className="text-sm text-gray-500">No players selected</p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">You Receive:</p>
                            {playersRequested.map(player => (
                              <div key={player.id} className="text-sm font-medium">
                                {player.name} ({player.position})
                              </div>
                            ))}
                            {playersRequested.length === 0 && (
                              <p className="text-sm text-gray-500">No players selected</p>
                            )}
                          </div>
                        </div>

                        {/* Trade Value Bar */}
                        {playersOffered.length > 0 && playersRequested.length > 0 && (
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                              <span>Trade Value</span>
                              <span>{calculateTradeValue().fairness.toFixed(0)}% Fair</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  calculateTradeValue().fairness > 70 
                                    ? 'bg-green-500' 
                                    : calculateTradeValue().fairness > 40 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${calculateTradeValue().fairness}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Message */}
                        <div className="mb-4">
                          <textarea
                            value={tradeMessage}
                            onChange={(e) => setTradeMessage(e.target.value)}
                            placeholder="Add a message (optional)..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 text-sm"
                            rows={2}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                          <button
                            onClick={analyzeTrade}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
                          >
                            <Calculator className="h-4 w-4" />
                            Analyze Trade
                          </button>
                          <button
                            onClick={proposeTrade}
                            disabled={playersOffered.length === 0 || playersRequested.length === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            <Send className="h-4 w-4" />
                            Send Trade Offer
                          </button>
                          <button
                            onClick={resetTrade}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    )}

                    {/* AI Analysis */}
                    {showAnalysis && tradeAnalysis && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-purple-200 dark:border-purple-800"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-5 w-5 text-purple-600" />
                          <h4 className="font-semibold">AI Trade Analysis</h4>
                        </div>
                        {isAnalyzing ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Fairness Score</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                  {tradeAnalysis.fairnessScore.toFixed(0)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Win Probability Impact</p>
                                <p className={`text-lg font-bold ${
                                  tradeAnalysis.winProbabilityImpact > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {tradeAnalysis.winProbabilityImpact > 0 ? '+' : ''}{tradeAnalysis.winProbabilityImpact.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Playoff Odds Change</p>
                                <p className={`text-lg font-bold ${
                                  tradeAnalysis.playoffOddsChange > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {tradeAnalysis.playoffOddsChange > 0 ? '+' : ''}{tradeAnalysis.playoffOddsChange.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Injury Risk</p>
                                <p className={`text-lg font-bold ${
                                  tradeAnalysis.injuryRisk < 20 ? 'text-green-600' : 
                                  tradeAnalysis.injuryRisk < 50 ? 'text-yellow-600' : 
                                  'text-red-600'
                                }`}>
                                  {tradeAnalysis.injuryRisk.toFixed(0)}%
                                </p>
                              </div>
                            </div>
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {tradeAnalysis.recommendation}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Select a team to start building your trade
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {pendingTrades.length > 0 ? (
              pendingTrades.map(trade => (
                <TradeOfferCard key={trade.id} trade={trade} />
              ))
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  No pending trades at the moment
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {tradeHistory.length > 0 ? (
              tradeHistory.map(trade => (
                <TradeOfferCard key={trade.id} trade={trade} />
              ))
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-12 text-center">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  No completed trades yet this season
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}