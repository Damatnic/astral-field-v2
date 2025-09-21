/**
 * Trade Center - Complete trade system with analysis
 * Free platform with all trade features unlocked
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftRight, TrendingUp, TrendingDown, Users, Plus, X,
  ChevronRight, AlertCircle, CheckCircle, Info, Send,
  MessageSquare, ThumbsUp, ThumbsDown, Clock, Shield,
  BarChart3, Target, Zap, Award, Filter, Search
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Trade status types
type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'completed';

// Mock data for teams and players
const teams = [
  { id: '1', name: "D'Amato Dynasty", owner: "Nicholas D'Amato", record: '3-0' },
  { id: '2', name: "Hartley's Heroes", owner: "Nick Hartley", record: '2-1' },
  { id: '3', name: "McCaigue Mayhem", owner: "Jack McCaigue", record: '2-1' },
  { id: '4', name: "Kornbeck Crushers", owner: "Jon Kornbeck", record: '1-2' },
];

const myRoster = [
  { id: 'p1', name: 'Christian McCaffrey', position: 'RB', value: 95, projection: 19.5 },
  { id: 'p2', name: 'Tyreek Hill', position: 'WR', value: 88, projection: 17.8 },
  { id: 'p3', name: 'Travis Kelce', position: 'TE', value: 82, projection: 14.2 },
  { id: 'p4', name: 'Austin Ekeler', position: 'RB', value: 76, projection: 15.3 },
  { id: 'p5', name: 'Calvin Ridley', position: 'WR', value: 72, projection: 13.5 },
];

const mockTrades = [
  {
    id: 't1',
    status: 'pending' as TradeStatus,
    proposer: teams[0],
    receiver: teams[1],
    proposerPlayers: [myRoster[0]],
    receiverPlayers: [
      { id: 'p10', name: 'Justin Jefferson', position: 'WR', value: 92, projection: 18.2 },
      { id: 'p11', name: 'Josh Jacobs', position: 'RB', value: 74, projection: 14.8 }
    ],
    message: "I need WR depth, you need an RB1",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 46 * 60 * 60 * 1000),
  },
  {
    id: 't2',
    status: 'completed' as TradeStatus,
    proposer: teams[2],
    receiver: teams[0],
    proposerPlayers: [
      { id: 'p20', name: 'Stefon Diggs', position: 'WR', value: 85, projection: 16.8 }
    ],
    receiverPlayers: [
      { id: 'p21', name: 'Jaylen Waddle', position: 'WR', value: 78, projection: 14.9 },
      { id: 'p22', name: 'Rachaad White', position: 'RB', value: 68, projection: 12.3 }
    ],
    message: "Good trade for both teams",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
  }
];

export default function TradesPage() {
  const [activeTab, setActiveTab] = useState<'propose' | 'pending' | 'history'>('propose');
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [mySelectedPlayers, setMySelectedPlayers] = useState<any[]>([]);
  const [theirSelectedPlayers, setTheirSelectedPlayers] = useState<any[]>([]);
  const [tradeMessage, setTradeMessage] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const queryClient = useQueryClient();

  // Calculate trade value
  const tradeAnalysis = useMemo(() => {
    const myValue = mySelectedPlayers.reduce((sum, p) => sum + p.value, 0);
    const theirValue = theirSelectedPlayers.reduce((sum, p) => sum + p.value, 0);
    const difference = myValue - theirValue;
    const fairness = 100 - Math.abs(difference);
    
    return {
      myValue,
      theirValue,
      difference,
      fairness: Math.max(0, Math.min(100, fairness)),
      recommendation: 
        difference > 20 ? 'You are giving too much' :
        difference < -20 ? 'Great value for you' :
        'Fair trade',
      impact: {
        rb: mySelectedPlayers.filter(p => p.position === 'RB').length - 
            theirSelectedPlayers.filter(p => p.position === 'RB').length,
        wr: mySelectedPlayers.filter(p => p.position === 'WR').length - 
            theirSelectedPlayers.filter(p => p.position === 'WR').length,
        te: mySelectedPlayers.filter(p => p.position === 'TE').length - 
            theirSelectedPlayers.filter(p => p.position === 'TE').length,
      }
    };
  }, [mySelectedPlayers, theirSelectedPlayers]);

  // Position impact data for radar chart
  const positionImpactData = [
    { position: 'QB', before: 8, after: 8 },
    { position: 'RB', before: 7, after: 7 - tradeAnalysis.impact.rb },
    { position: 'WR', before: 8, after: 8 - tradeAnalysis.impact.wr },
    { position: 'TE', before: 6, after: 6 - tradeAnalysis.impact.te },
    { position: 'FLEX', before: 7, after: 7 },
  ];

  // Send trade proposal
  const sendTrade = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/trades/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedTeam?.id,
          proposerPlayers: mySelectedPlayers.map(p => p.id),
          receiverPlayers: theirSelectedPlayers.map(p => p.id),
          message: tradeMessage
        })
      });
      if (!response.ok) throw new Error('Failed to send trade');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Trade proposal sent!');
      setMySelectedPlayers([]);
      setTheirSelectedPlayers([]);
      setTradeMessage('');
      setSelectedTeam(null);
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
    onError: () => {
      toast.error('Failed to send trade proposal');
    }
  });

  const getStatusBadge = (status: TradeStatus) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
      accepted: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: X },
      countered: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: ArrowLeftRight },
      expired: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: Clock },
      completed: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckCircle }
    };
    
    const { color, icon: Icon } = config[status];
    
    return (
      <span className={cn("inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium", color)}>
        <Icon className="h-3 w-3" />
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  const canProposeTrade = selectedTeam && (mySelectedPlayers.length > 0 || theirSelectedPlayers.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Trade Center
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Propose, analyze, and manage trades
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>New Trade</span>
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 mt-6 border-b border-gray-200 dark:border-gray-800">
            {['propose', 'pending', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  'px-4 py-2 font-medium capitalize transition border-b-2 -mb-[1px]',
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                {tab}
                {tab === 'pending' && (
                  <span className="ml-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-0.5 rounded-full text-xs">
                    {mockTrades.filter(t => t.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <AnimatePresence mode="wait">
          {/* Propose Trade Tab */}
          {activeTab === 'propose' && (
            <motion.div
              key="propose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Team Selection */}
              {!selectedTeam ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Select Trading Partner
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.slice(1).map((team) => (
                      <motion.button
                        key={team.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTeam(team)}
                        className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition text-left"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">
                          {team.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {team.owner} • {team.record}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Trade Builder */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Your Players */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Your Players to Trade
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                          {mySelectedPlayers.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                              No players selected
                            </p>
                          ) : (
                            mySelectedPlayers.map((player) => (
                              <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {player.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {player.position} • {player.projection} proj pts
                                  </p>
                                </div>
                                <button
                                  onClick={() => setMySelectedPlayers(prev => prev.filter(p => p.id !== player.id))}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                                >
                                  <X className="h-4 w-4 text-gray-500" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available Players</p>
                          <div className="space-y-1">
                            {myRoster.filter(p => !mySelectedPlayers.includes(p)).map((player) => (
                              <button
                                key={player.id}
                                onClick={() => setMySelectedPlayers([...mySelectedPlayers, player])}
                                className="w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {player.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {player.position} • {player.projection} proj pts
                                    </p>
                                  </div>
                                  <Plus className="h-4 w-4 text-gray-400" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Their Players */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {selectedTeam.name}'s Players
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                          {theirSelectedPlayers.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                              No players selected
                            </p>
                          ) : (
                            theirSelectedPlayers.map((player) => (
                              <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {player.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {player.position} • {player.projection} proj pts
                                  </p>
                                </div>
                                <button
                                  onClick={() => setTheirSelectedPlayers(prev => prev.filter(p => p.id !== player.id))}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                                >
                                  <X className="h-4 w-4 text-gray-500" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Request Players</p>
                          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                            Player selection would load their roster here
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trade Analysis */}
                  {(mySelectedPlayers.length > 0 || theirSelectedPlayers.length > 0) && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Trade Analysis
                        </h3>
                        <button
                          onClick={() => setShowAnalysis(!showAnalysis)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {showAnalysis ? 'Hide' : 'Show'} Details
                        </button>
                      </div>
                      
                      {/* Trade Fairness Meter */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Trade Fairness</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {tradeAnalysis.fairness}%
                          </span>
                        </div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              tradeAnalysis.fairness >= 80 ? "bg-green-500" :
                              tradeAnalysis.fairness >= 60 ? "bg-yellow-500" :
                              "bg-red-500"
                            )}
                            style={{ width: `${tradeAnalysis.fairness}%` }}
                          />
                        </div>
                        <p className={cn(
                          "text-sm mt-2 font-medium",
                          tradeAnalysis.difference > 20 ? "text-red-600 dark:text-red-400" :
                          tradeAnalysis.difference < -20 ? "text-green-600 dark:text-green-400" :
                          "text-gray-600 dark:text-gray-400"
                        )}>
                          {tradeAnalysis.recommendation}
                        </p>
                      </div>
                      
                      {showAnalysis && (
                        <AnimatePresence>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">You Give</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {tradeAnalysis.myValue}
                                </p>
                                <p className="text-xs text-gray-500">Total Value</p>
                              </div>
                              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">You Get</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {tradeAnalysis.theirValue}
                                </p>
                                <p className="text-xs text-gray-500">Total Value</p>
                              </div>
                            </div>
                            
                            {/* Position Impact Chart */}
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Roster Impact
                              </p>
                              <ResponsiveContainer width="100%" height={200}>
                                <RadarChart data={positionImpactData}>
                                  <PolarGrid stroke="#374151" />
                                  <PolarAngleAxis dataKey="position" tick={{ fill: '#9CA3AF' }} />
                                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#9CA3AF' }} />
                                  <Radar name="Before" dataKey="before" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                                  <Radar name="After" dataKey="after" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                                </RadarChart>
                              </ResponsiveContainer>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      )}
                      
                      {/* Trade Message */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Message (Optional)
                        </label>
                        <textarea
                          value={tradeMessage}
                          onChange={(e) => setTradeMessage(e.target.value)}
                          placeholder="Add a message to explain your trade..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-3 mt-4">
                        <button
                          onClick={() => {
                            setSelectedTeam(null);
                            setMySelectedPlayers([]);
                            setTheirSelectedPlayers([]);
                            setTradeMessage('');
                          }}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => sendTrade.mutate()}
                          disabled={!canProposeTrade || sendTrade.isPending}
                          className={cn(
                            "px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2",
                            canProposeTrade
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                          )}
                        >
                          <Send className="h-4 w-4" />
                          <span>{sendTrade.isPending ? 'Sending...' : 'Send Trade'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Pending Trades Tab */}
          {activeTab === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {mockTrades.filter(t => t.status === 'pending').map((trade) => (
                <div key={trade.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Trade with {trade.receiver.name}
                        </h3>
                        {getStatusBadge(trade.status)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Proposed {formatDistanceToNow(trade.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Expires in
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDistanceToNow(trade.expiresAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        You Send
                      </p>
                      <div className="space-y-1">
                        {trade.proposerPlayers.map((player) => (
                          <div key={player.id} className="text-sm text-gray-900 dark:text-white">
                            {player.name} ({player.position})
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        You Receive
                      </p>
                      <div className="space-y-1">
                        {trade.receiverPlayers.map((player) => (
                          <div key={player.id} className="text-sm text-gray-900 dark:text-white">
                            {player.name} ({player.position})
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {trade.message && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          "{trade.message}"
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3">
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
                      View Details
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                      Cancel Trade
                    </button>
                  </div>
                </div>
              ))}
              
              {mockTrades.filter(t => t.status === 'pending').length === 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                  <ArrowLeftRight className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No pending trades</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Trade History Tab */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {mockTrades.filter(t => t.status === 'completed').map((trade) => (
                <div key={trade.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Trade with {trade.receiver.name}
                        </h3>
                        {getStatusBadge(trade.status)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Completed {formatDistanceToNow(trade.completedAt!, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sent
                      </p>
                      <div className="space-y-1">
                        {trade.receiverPlayers.map((player) => (
                          <div key={player.id} className="text-sm text-gray-900 dark:text-white">
                            {player.name} ({player.position})
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Received
                      </p>
                      <div className="space-y-1">
                        {trade.proposerPlayers.map((player) => (
                          <div key={player.id} className="text-sm text-gray-900 dark:text-white">
                            {player.name} ({player.position})
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}