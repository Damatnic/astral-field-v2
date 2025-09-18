'use client';


import { handleComponentError } from '@/lib/error-handling';
import React, { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
  Loader2,
  DollarSign,
  Calendar
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

interface Player {
  id: string;
  name: string;
  position: string;
  nflTeam: string;
  status: string;
  injuryStatus?: string;
  adp?: number;
  projectedPoints?: number;
  seasonPoints?: number;
  value?: number;
  trend?: 'up' | 'down' | 'neutral';
}

interface RosterPlayer {
  id: string;
  playerId: string;
  teamId: string;
  position: string;
  player: Player;
}

interface Team {
  id: string;
  name: string;
  userId: string;
  ownerId: string;
  ownerName?: string;
  record?: string;
  rank?: number;
  roster?: RosterPlayer[];
  needs?: string[];
}

interface TradeItem {
  fromTeamId: string;
  toTeamId: string;
  playerId?: string;
  itemType: 'player' | 'draft_pick' | 'faab';
  draftPick?: {
    year: number;
    round: number;
    originalTeamId: string;
  };
  faabAmount?: number;
}

interface TradeOffer {
  id: string;
  leagueId: string;
  proposerId: string;
  teamId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  proposer: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  team: {
    id: string;
    name: string;
    ownerId: string;
  };
  items: Array<{
    id: string;
    fromTeamId: string;
    toTeamId: string;
    playerId?: string;
    itemType: string;
    metadata?: any;
    player?: Player;
  }>;
}

interface TradeCenterProps {
  leagueId: string;
  userId?: string;
  teamId?: string;
}

export default function TradeCenter({ leagueId, userId, teamId }: TradeCenterProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [playersOffered, setPlayersOffered] = useState<RosterPlayer[]>([]);
  const [playersRequested, setPlayersRequested] = useState<RosterPlayer[]>([]);
  const [tradeMessage, setTradeMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'propose' | 'pending' | 'history'>('propose');
  const [pendingTrades, setPendingTrades] = useState<TradeOffer[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProposing, setIsProposing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { success, error: showError, info } = useToast();

  // Fetch league data
  const fetchLeagueData = useCallback(async () => {
    if (!leagueId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch teams in league
      const teamsResponse = await fetch(`/api/leagues/${leagueId}/teams`);
      const teamsData = await teamsResponse.json();
      
      if (teamsData.success) {
        const allTeams = teamsData.teams;
        setTeams(allTeams.filter((team: Team) => team.id !== teamId));
        setMyTeam(allTeams.find((team: Team) => team.id === teamId) || null);
      } else {
        throw new Error(teamsData.error || 'Failed to load teams');
      }
      
      // Fetch pending trades
      if (activeTab === 'pending') {
        await fetchPendingTrades();
      }
      
      // Fetch trade history
      if (activeTab === 'history') {
        await fetchTradeHistory();
      }
      
    } catch (err) {
      handleComponentError(err as Error, 'TradeCenter');
      setError('Failed to load league data');
      showError('Failed to load data', 'Please try again');
    } finally {
      setIsLoading(false);
    }
  }, [leagueId, teamId, activeTab, showError]);

  const fetchPendingTrades = async () => {
    try {
      const response = await fetch(`/api/trades/league/${leagueId}?status=PENDING`);
      const data = await response.json();
      
      if (data.success) {
        setPendingTrades(data.trades || []);
      }
    } catch (err) {
      handleComponentError(err as Error, 'TradeCenter');
    }
  };

  const fetchTradeHistory = async () => {
    try {
      const response = await fetch(`/api/trades/league/${leagueId}?status=ACCEPTED,REJECTED`);
      const data = await response.json();
      
      if (data.success) {
        setTradeHistory(data.trades || []);
      }
    } catch (err) {
      handleComponentError(err as Error, 'TradeCenter');
    }
  };

  useEffect(() => {
    fetchLeagueData();
  }, [fetchLeagueData]);

  const calculateTradeValue = () => {
    const offeredValue = playersOffered.reduce((sum, rp) => sum + (rp.player.value || 0), 0);
    const requestedValue = playersRequested.reduce((sum, rp) => sum + (rp.player.value || 0), 0);
    const fairness = 100 - Math.abs(offeredValue - requestedValue);
    return { offeredValue, requestedValue, fairness: Math.max(0, fairness) };
  };

  const analyzeTrade = async () => {
    if (playersOffered.length === 0 || playersRequested.length === 0) {
      info('Add players', 'Select players to offer and request before analyzing');
      return;
    }
    
    setIsAnalyzing(true);
    setShowAnalysis(true);
    
    try {
      const response = await fetch(`/api/trades/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leagueId,
          teamId,
          targetTeamId: selectedTeam?.id,
          offeredPlayers: playersOffered.map(rp => rp.playerId),
          requestedPlayers: playersRequested.map(rp => rp.playerId)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Handle analysis result
        info('Analysis complete', `Trade fairness: ${data.analysis.fairnessScore}%`);
      } else {
        showError('Analysis failed', data.error);
      }
    } catch (err) {
      handleComponentError(err as Error, 'TradeCenter');
      showError('Analysis failed', 'Please try again');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const proposeTrade = async () => {
    if (!selectedTeam || playersOffered.length === 0 || playersRequested.length === 0) {
      showError('Invalid trade', 'Select a team and players to trade');
      return;
    }
    
    setIsProposing(true);
    
    try {
      const tradeItems: TradeItem[] = [
        ...playersOffered.map(rp => ({
          fromTeamId: teamId!,
          toTeamId: selectedTeam.id,
          playerId: rp.playerId,
          itemType: 'player' as const
        })),
        ...playersRequested.map(rp => ({
          fromTeamId: selectedTeam.id,
          toTeamId: teamId!,
          playerId: rp.playerId,
          itemType: 'player' as const
        }))
      ];
      
      const response = await fetch('/api/trades/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leagueId,
          proposedToTeamIds: [selectedTeam.id],
          tradeItems,
          notes: tradeMessage || undefined,
          expirationHours: 48
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        success('Trade proposed', `Trade offer sent to ${selectedTeam.name}`);
        resetTrade();
        
        // Refresh pending trades if on that tab
        if (activeTab === 'pending') {
          await fetchPendingTrades();
        }
      } else {
        showError('Trade proposal failed', data.message || 'Please try again');
      }
    } catch (err) {
      handleComponentError(err as Error, 'TradeCenter');
      showError('Trade proposal failed', 'Please try again');
    } finally {
      setIsProposing(false);
    }
  };

  const respondToTrade = async (tradeId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch(`/api/trades/${tradeId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      
      if (data.success) {
        success(
          `Trade ${action}ed`, 
          `Trade has been ${action}ed successfully`
        );
        await fetchPendingTrades();
      } else {
        showError(`Failed to ${action} trade`, data.error);
      }
    } catch (err) {
      handleComponentError(err as Error, 'TradeCenter');
      showError(`Failed to ${action} trade`, 'Please try again');
    }
  };

  const resetTrade = () => {
    setPlayersOffered([]);
    setPlayersRequested([]);
    setTradeMessage('');
    setSelectedTeam(null);
    setShowAnalysis(false);
  };

  const PlayerCard = ({ rosterPlayer, isSelected, onToggle, disabled = false }: { 
    rosterPlayer: RosterPlayer; 
    isSelected: boolean; 
    onToggle: () => void;
    disabled?: boolean;
  }) => {
    const player = rosterPlayer.player;
    const positionColors: Record<string, string> = {
      QB: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      RB: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      WR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      TE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      K: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      DEF: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };

    return (
      <motion.div
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        onClick={disabled ? undefined : onToggle}
        className={`p-3 rounded-lg border-2 transition-all ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer'
        } ${
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
            {player.injuryStatus && player.injuryStatus !== 'Healthy' && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                {player.injuryStatus}
              </span>
            )}
            {player.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {player.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {player.value || player.adp || '--'}
          </span>
        </div>
        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{player.name}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{player.nflTeam}</p>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-gray-500">
            Proj: {player.projectedPoints?.toFixed(1) || '--'}
          </span>
          <span className="text-gray-500">
            Total: {player.seasonPoints?.toFixed(1) || '--'}
          </span>
        </div>
      </motion.div>
    );
  };

  const TradeOfferCard = ({ trade }: { trade: TradeOffer }) => {
    const isIncomingTrade = trade.teamId !== teamId;
    const canRespond = isIncomingTrade && trade.status === 'PENDING' && userId;
    
    // Group items by team
    const itemsFromProposer = trade.items.filter(item => item.fromTeamId === trade.teamId);
    const itemsToProposer = trade.items.filter(item => item.toTeamId === trade.teamId);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-semibold text-sm">
                {trade.team.name} {isIncomingTrade ? '→ You' : '→ Other Team'}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(trade.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              trade.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
              trade.status === 'ACCEPTED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
              trade.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {trade.status}
            </span>
            {trade.status === 'PENDING' && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expires {new Date(trade.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">
              {isIncomingTrade ? 'They Offer' : 'You Offered'}
            </p>
            <div className="space-y-1">
              {itemsFromProposer.map(item => (
                <div key={item.id} className="text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                  {item.player ? (
                    `${item.player.name} (${item.player.position})`
                  ) : (
                    item.itemType === 'draft_pick' ? 'Draft Pick' : 'FAAB'
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">
              {isIncomingTrade ? 'They Want' : 'You Wanted'}
            </p>
            <div className="space-y-1">
              {itemsToProposer.map(item => (
                <div key={item.id} className="text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                  {item.player ? (
                    `${item.player.name} (${item.player.position})`
                  ) : (
                    item.itemType === 'draft_pick' ? 'Draft Pick' : 'FAAB'
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {trade.notes && (
          <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-3">
            &ldquo;{trade.notes}&rdquo;
          </p>
        )}

        {canRespond && (
          <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button 
              onClick={() => respondToTrade(trade.id, 'accept')}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
            >
              Accept
            </button>
            <button 
              onClick={() => respondToTrade(trade.id, 'reject')}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-6">
        <div className="mb-6">
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={16} width={300} />
        </div>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={40} width={120} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton height={300} />
          <div className="lg:col-span-2">
            <Skeleton height={400} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load trade center</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchLeagueData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Trade Center</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Propose, analyze, and manage trades
          </p>
        </div>
        <button
          onClick={fetchLeagueData}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['propose', 'pending', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
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
                              {team.ownerName || 'Owner'} • {team.record || 'N/A'} {team.rank ? `(#${team.rank})` : ''}
                            </p>
                          </div>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                        {team.needs && team.needs.length > 0 && (
                          <div className="mt-2 flex gap-1 flex-wrap">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {myTeam?.roster?.map(rosterPlayer => (
                          <PlayerCard
                            key={rosterPlayer.id}
                            rosterPlayer={rosterPlayer}
                            isSelected={playersOffered.some(p => p.id === rosterPlayer.id)}
                            onToggle={() => {
                              setPlayersOffered(prev =>
                                prev.some(p => p.id === rosterPlayer.id)
                                  ? prev.filter(p => p.id !== rosterPlayer.id)
                                  : [...prev, rosterPlayer]
                              );
                            }}
                          />
                        )) || (
                          <div className="col-span-full text-center text-gray-500 py-4">
                            No players available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Their Roster */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold mb-3">Request from {selectedTeam.name}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedTeam.roster?.map(rosterPlayer => (
                          <PlayerCard
                            key={rosterPlayer.id}
                            rosterPlayer={rosterPlayer}
                            isSelected={playersRequested.some(p => p.id === rosterPlayer.id)}
                            onToggle={() => {
                              setPlayersRequested(prev =>
                                prev.some(p => p.id === rosterPlayer.id)
                                  ? prev.filter(p => p.id !== rosterPlayer.id)
                                  : [...prev, rosterPlayer]
                              );
                            }}
                          />
                        )) || (
                          <div className="col-span-full text-center text-gray-500 py-4">
                            No players available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Trade Summary */}
                    {(playersOffered.length > 0 || playersRequested.length > 0) && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold mb-3">Trade Summary</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">You Send:</p>
                            {playersOffered.map(rosterPlayer => (
                              <div key={rosterPlayer.id} className="text-sm font-medium">
                                {rosterPlayer.player.name} ({rosterPlayer.player.position})
                              </div>
                            ))}
                            {playersOffered.length === 0 && (
                              <p className="text-sm text-gray-500">No players selected</p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">You Receive:</p>
                            {playersRequested.map(rosterPlayer => (
                              <div key={rosterPlayer.id} className="text-sm font-medium">
                                {rosterPlayer.player.name} ({rosterPlayer.player.position})
                              </div>
                            ))}
                            {playersRequested.length === 0 && (
                              <p className="text-sm text-gray-500">No players selected</p>
                            )}
                          </div>
                        </div>

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
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={analyzeTrade}
                            disabled={isAnalyzing}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAnalyzing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Calculator className="h-4 w-4" />
                            )}
                            Analyze Trade
                          </button>
                          <button
                            onClick={proposeTrade}
                            disabled={playersOffered.length === 0 || playersRequested.length === 0 || isProposing}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {isProposing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
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