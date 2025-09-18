'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Search,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Send,
  Bot,
  User
} from 'lucide-react';

interface DraftPick {
  id: string;
  round: number;
  pick: number;
  overall: number;
  team: string;
  player?: {
    id: string;
    name: string;
    position: string;
    team: string;
    adp: number;
    projectedPoints: number;
    tier: number;
  };
  timestamp?: string;
}

interface AvailablePlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  adp: number; // Average Draft Position
  projectedPoints: number;
  tier: number;
  bye: number;
  injury?: string;
  news?: string;
  stats: {
    lastYear: number;
    projection: number;
    consistency: number;
  };
}

interface DraftTeam {
  id: string;
  name: string;
  owner: string;
  draftPosition: number;
  picks: DraftPick[];
  isCurrentPick: boolean;
  isUserTeam: boolean;
  needsByPosition: Record<string, number>;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
}

interface DraftRoomProps {
  draftId: string;
  userId?: string;
}

export default function DraftRoom({ }: DraftRoomProps) {
  const [draftStarted, setDraftStarted] = useState(false);
  const [currentPick, setCurrentPick] = useState<DraftPick>({
    id: '1',
    round: 1,
    pick: 1,
    overall: 1,
    team: 'Thunder Bolts'
  });
  const [timeRemaining, setTimeRemaining] = useState(90); // 90 seconds per pick
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<AvailablePlayer | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([]);
  const [draftBoard, setDraftBoard] = useState<DraftPick[]>([]);
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPickEnabled, setAutoPickEnabled] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mock data initialization
  useEffect(() => {
    const mockPlayers: AvailablePlayer[] = [
      {
        id: 'p1',
        name: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        adp: 1.2,
        projectedPoints: 320,
        tier: 1,
        bye: 9,
        stats: { lastYear: 298, projection: 320, consistency: 0.92 }
      },
      {
        id: 'p2',
        name: 'Tyreek Hill',
        position: 'WR',
        team: 'MIA',
        adp: 2.5,
        projectedPoints: 285,
        tier: 1,
        bye: 10,
        stats: { lastYear: 276, projection: 285, consistency: 0.88 }
      },
      {
        id: 'p3',
        name: 'Justin Jefferson',
        position: 'WR',
        team: 'MIN',
        adp: 3.1,
        projectedPoints: 290,
        tier: 1,
        bye: 13,
        stats: { lastYear: 282, projection: 290, consistency: 0.90 }
      },
      {
        id: 'p4',
        name: 'Austin Ekeler',
        position: 'RB',
        team: 'LAC',
        adp: 4.8,
        projectedPoints: 265,
        tier: 1,
        bye: 5,
        stats: { lastYear: 258, projection: 265, consistency: 0.85 }
      },
      {
        id: 'p5',
        name: 'Patrick Mahomes',
        position: 'QB',
        team: 'KC',
        adp: 12.3,
        projectedPoints: 380,
        tier: 1,
        bye: 10,
        stats: { lastYear: 365, projection: 380, consistency: 0.94 }
      },
      {
        id: 'p6',
        name: 'Travis Kelce',
        position: 'TE',
        team: 'KC',
        adp: 8.7,
        projectedPoints: 220,
        tier: 1,
        bye: 10,
        stats: { lastYear: 208, projection: 220, consistency: 0.91 }
      }
    ];

    const mockTeams: DraftTeam[] = Array.from({ length: 10 }, (_, i) => ({
      id: `team${i + 1}`,
      name: `Team ${i + 1}`,
      owner: `Owner ${i + 1}`,
      draftPosition: i + 1,
      picks: [],
      isCurrentPick: i === 0,
      isUserTeam: i === 2, // User is team 3
      needsByPosition: {
        QB: 2,
        RB: 5,
        WR: 5,
        TE: 2,
        K: 1,
        DEF: 1
      }
    }));

    setAvailablePlayers(mockPlayers);
    setTeams(mockTeams);

    // Initial chat messages
    setChatMessages([
      {
        id: '1',
        user: 'System',
        message: 'Welcome to the 2025 D\'Amato Dynasty League Draft!',
        timestamp: new Date().toISOString(),
        isSystem: true
      },
      {
        id: '2',
        user: 'Commissioner',
        message: 'Good luck everyone! Let\'s have a great draft.',
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  const getNextPick = useCallback((): DraftPick => {
    const totalTeams = teams.length;
    const isOddRound = currentPick.round % 2 === 1;
    let nextPick = currentPick.pick + 1;
    let nextRound = currentPick.round;
    let nextTeam: string;

    if (nextPick > totalTeams) {
      nextPick = 1;
      nextRound++;
    }

    if (isOddRound) {
      nextTeam = teams[nextPick - 1]?.name || 'Team';
    } else {
      nextTeam = teams[totalTeams - nextPick]?.name || 'Team';
    }

    return {
      id: `${nextRound}-${nextPick}`,
      round: nextRound,
      pick: nextPick,
      overall: (nextRound - 1) * totalTeams + nextPick,
      team: nextTeam
    };
  }, [teams, currentPick]);

  const handleDraftPlayer = useCallback(() => {
    if (!selectedPlayer) return;

    const pick: DraftPick = {
      ...currentPick,
      player: {
        ...selectedPlayer,
        tier: selectedPlayer.tier
      },
      timestamp: new Date().toISOString()
    };

    setDraftBoard(prev => [...prev, pick]);
    setAvailablePlayers(prev => prev.filter(p => p.id !== selectedPlayer.id));
    
    addSystemMessage(
      `${currentPick.team} selects ${selectedPlayer.name} (${selectedPlayer.position}, ${selectedPlayer.team})`
    );

    // Move to next pick
    const nextPick = getNextPick();
    setCurrentPick(nextPick);
    setSelectedPlayer(null);
    setTimeRemaining(90);

    if (soundEnabled) {
      // Play draft sound
      playDraftSound();
    }
  }, [selectedPlayer, currentPick, soundEnabled, getNextPick, setDraftBoard, setAvailablePlayers, setCurrentPick, setTimeRemaining]);

  const playDraftSound = () => {
    // Simple beep sound using Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handleAutoPick = useCallback(() => {
    const bestAvailable = availablePlayers[0]; // Simple BPA strategy
    if (bestAvailable) {
      setSelectedPlayer(bestAvailable);
      setTimeout(() => handleDraftPlayer(), 500);
    }
  }, [availablePlayers, handleDraftPlayer]);

  // Timer countdown
  useEffect(() => {
    if (draftStarted && !isPaused && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-pick logic
            handleAutoPick();
            return 90;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [draftStarted, isPaused, timeRemaining, handleAutoPick]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleStartDraft = () => {
    setDraftStarted(true);
    addSystemMessage('Draft has started! Thunder Bolts is on the clock.');
  };

  const handlePauseDraft = () => {
    setIsPaused(!isPaused);
    addSystemMessage(isPaused ? 'Draft resumed.' : 'Draft paused.');
  };







  const addSystemMessage = (message: string) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: 'System',
      message,
      timestamp: new Date().toISOString(),
      isSystem: true
    }]);
  };

  const sendChatMessage = () => {
    if (!newMessage.trim()) return;

    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: 'You',
      message: newMessage,
      timestamp: new Date().toISOString()
    }]);
    setNewMessage('');
  };



  const filteredPlayers = availablePlayers.filter(player => {
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.team.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      RB: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      WR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      TE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      K: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      DEF: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[position] || 'bg-gray-100 text-gray-700';
  };

  const getTierColor = (tier: number) => {
    const colors = [
      'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
      'border-gray-300 bg-gray-50 dark:bg-gray-800/20',
      'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
      'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
      'border-gray-200 bg-white dark:bg-gray-900/20'
    ];
    return colors[tier - 1] || colors[4];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                2025 Draft Room
              </h1>
              <p className="text-gray-300">
                D&apos;Amato Dynasty League • Snake Draft • 16 Rounds
              </p>
            </div>
            
            {/* Timer */}
            <div className="text-center">
              <div className={`text-5xl font-bold ${
                timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-white'
              }`}>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-gray-400 text-sm mt-1">Time Remaining</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {!draftStarted ? (
                <button
                  onClick={handleStartDraft}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                >
                  <Play className="h-5 w-5" />
                  Start Draft
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePauseDraft}
                    className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setAutoPickEnabled(!autoPickEnabled)}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      autoPickEnabled 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Bot className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Current Pick Info */}
          {draftStarted && (
            <div className="mt-4 p-4 bg-white/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <span className="text-sm text-gray-400">On the Clock:</span>
                  <p className="text-xl font-bold">{currentPick.team}</p>
                </div>
                <div className="text-white text-right">
                  <span className="text-sm text-gray-400">Pick:</span>
                  <p className="text-xl font-bold">
                    Round {currentPick.round}, Pick {currentPick.pick} (#{currentPick.overall} Overall)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Player Pool */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-3">Available Players</h2>
              
              {/* Filters */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                >
                  <option value="ALL">All Positions</option>
                  <option value="QB">QB</option>
                  <option value="RB">RB</option>
                  <option value="WR">WR</option>
                  <option value="TE">TE</option>
                  <option value="K">K</option>
                  <option value="DEF">DEF</option>
                </select>
              </div>
            </div>

            {/* Player List */}
            <div className="max-h-[600px] overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredPlayers.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlayer?.id === player.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : getTierColor(player.tier)
                    }`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getPositionColor(player.position)}`}>
                          {player.position}
                        </span>
                        <div>
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {player.team} • Bye: {player.bye}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{player.projectedPoints} pts</p>
                        <p className="text-xs text-gray-500">ADP: {player.adp}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Draft Button */}
            {selectedPlayer && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleDraftPlayer}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  Draft {selectedPlayer.name}
                </button>
              </div>
            )}
          </div>

          {/* Draft Board */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Draft Board</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto p-4">
              <div className="space-y-2">
                {draftBoard.map((pick) => (
                  <div key={pick.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-12">#{pick.overall}</span>
                    <span className="font-medium w-24 truncate">{pick.team}</span>
                    {pick.player && (
                      <>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          getPositionColor(pick.player.position)
                        }`}>
                          {pick.player.position}
                        </span>
                        <span className="flex-1 truncate">{pick.player.name}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Draft Chat
              </h2>
            </div>
            <div className="h-[400px] overflow-y-auto p-4">
              <div className="space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${
                      msg.isSystem
                        ? 'text-center text-gray-500 italic text-sm'
                        : 'flex items-start gap-2'
                    }`}
                  >
                    {!msg.isSystem && (
                      <>
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {msg.user}
                          </p>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </>
                    )}
                    {msg.isSystem && <p>{msg.message}</p>}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
                <button
                  onClick={sendChatMessage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}