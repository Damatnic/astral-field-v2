'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Search, Star, TrendingUp, AlertCircle, Crown, Timer } from 'lucide-react';

interface DraftPick {
  id: string;
  round: number;
  pickNumber: number;
  teamId: string;
  playerId?: string;
  player?: {
    id: string;
    name: string;
    position: string;
    team: string;
    adp: number;
    projectedPoints: number;
  };
  pickedAt?: Date;
  timeRemaining?: number;
}

interface DraftTeam {
  id: string;
  name: string;
  owner: {
    id: string;
    name: string;
    image?: string;
  };
  picks: DraftPick[];
  isOnClock: boolean;
}

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  adp: number;
  projectedPoints: number;
  bye: number;
  tier: number;
  isRookie: boolean;
  injuryStatus?: string;
  news?: string;
}

export default function DraftRoomPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [draftState, setDraftState] = useState<{
    draft: any;
    teams: DraftTeam[];
    currentPick: DraftPick | null;
    picks: DraftPick[];
    timeRemaining: number;
  } | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draftStarted, setDraftStarted] = useState(false);
  const [myTeam, setMyTeam] = useState<DraftTeam | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadDraftData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Simulate loading draft data
      const mockDraft = {
        id: params.id,
        name: 'Dynasty League 2025 Draft',
        status: 'IN_PROGRESS',
        currentRound: 1,
        currentPick: 3,
        pickTimeLimit: 90,
        totalRounds: 16,
        teams: 12
      };

      const mockTeams: DraftTeam[] = Array.from({ length: 12 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        owner: {
          id: `user-${i + 1}`,
          name: `Owner ${i + 1}`,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 1}`
        },
        picks: [],
        isOnClock: i === 2
      }));

      const mockCurrentPick: DraftPick = {
        id: 'pick-current',
        round: 1,
        pickNumber: 3,
        teamId: 'team-3',
        timeRemaining: 90
      };

      const mockPlayers: Player[] = [
        { id: '1', name: 'Christian McCaffrey', position: 'RB', team: 'SF', adp: 1.2, projectedPoints: 285, bye: 9, tier: 1, isRookie: false },
        { id: '2', name: 'Josh Allen', position: 'QB', team: 'BUF', adp: 8.5, projectedPoints: 310, bye: 12, tier: 1, isRookie: false },
        { id: '3', name: 'Tyreek Hill', position: 'WR', team: 'MIA', adp: 5.2, projectedPoints: 245, bye: 6, tier: 1, isRookie: false },
        { id: '4', name: 'Travis Kelce', position: 'TE', team: 'KC', adp: 12.1, projectedPoints: 195, bye: 10, tier: 1, isRookie: false },
        { id: '5', name: 'Austin Ekeler', position: 'RB', team: 'LAC', adp: 3.8, projectedPoints: 265, bye: 5, tier: 1, isRookie: false },
        { id: '6', name: 'Cooper Kupp', position: 'WR', team: 'LAR', adp: 4.5, projectedPoints: 255, bye: 7, tier: 1, isRookie: false },
        { id: '7', name: 'Stefon Diggs', position: 'WR', team: 'BUF', adp: 6.2, projectedPoints: 235, bye: 12, tier: 1, isRookie: false },
        { id: '8', name: 'Saquon Barkley', position: 'RB', team: 'NYG', adp: 7.1, projectedPoints: 225, bye: 11, tier: 2, isRookie: false },
        { id: '9', name: 'Patrick Mahomes', position: 'QB', team: 'KC', adp: 15.3, projectedPoints: 305, bye: 10, tier: 1, isRookie: false },
        { id: '10', name: 'Davante Adams', position: 'WR', team: 'LV', adp: 9.8, projectedPoints: 220, bye: 13, tier: 2, isRookie: false }
      ];

      setDraftState({
        draft: mockDraft,
        teams: mockTeams,
        currentPick: mockCurrentPick,
        picks: [],
        timeRemaining: 90
      });
      
      setAvailablePlayers(mockPlayers);
      setMyTeam(mockTeams.find(team => team.owner.name === 'Owner 1') || mockTeams[0]);
      setDraftStarted(true);
      
    } catch (error) {
      console.error('Failed to load draft data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      loadDraftData();
    }
  }, [params.id, loadDraftData]);

  const makePick = useCallback((player: Player) => {
    if (!draftState?.currentPick) return;

    setDraftState(prev => {
      if (!prev) return prev;

      const newPick: DraftPick = {
        ...prev.currentPick!,
        playerId: player.id,
        player,
        pickedAt: new Date()
      };

      const updatedTeams = prev.teams.map(team => {
        if (team.id === prev.currentPick!.teamId) {
          return {
            ...team,
            picks: [...team.picks, newPick],
            isOnClock: false
          };
        }
        return { ...team, isOnClock: false };
      });

      // Determine next pick
      const nextPickNumber = prev.currentPick!.pickNumber + 1;
      const nextRound = Math.ceil(nextPickNumber / prev.teams.length);
      const nextTeamIndex = getNextTeamIndex(nextPickNumber, prev.teams.length);
      
      const nextPick: DraftPick = {
        id: `pick-${nextPickNumber}`,
        round: nextRound,
        pickNumber: nextPickNumber,
        teamId: prev.teams[nextTeamIndex].id,
        timeRemaining: 90
      };

      updatedTeams[nextTeamIndex].isOnClock = true;

      return {
        ...prev,
        teams: updatedTeams,
        currentPick: nextPick,
        picks: [...prev.picks, newPick],
        timeRemaining: 90
      };
    });

    setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
    setSelectedPlayer(null);
  }, [draftState]);

  const autoPick = useCallback(() => {
    if (!availablePlayers.length) return;
    
    const bestAvailable = availablePlayers
      .sort((a, b) => a.adp - b.adp)[0];
    
    makePick(bestAvailable);
  }, [availablePlayers, makePick]);

  const startPickTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setDraftState(prev => {
        if (!prev || !prev.currentPick) return prev;
        
        const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
        
        if (newTimeRemaining === 0) {
          autoPick();
        }
        
        return {
          ...prev,
          timeRemaining: newTimeRemaining
        };
      });
    }, 1000);
  }, [autoPick]);

  useEffect(() => {
    if (draftState?.currentPick && draftStarted) {
      startPickTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [draftState?.currentPick, draftStarted, startPickTimer]);

  const getNextTeamIndex = (pickNumber: number, teamCount: number): number => {
    const round = Math.ceil(pickNumber / teamCount);
    const positionInRound = ((pickNumber - 1) % teamCount) + 1;
    
    // Snake draft logic
    if (round % 2 === 1) {
      return positionInRound - 1;
    } else {
      return teamCount - positionInRound;
    }
  };

  const filteredPlayers = availablePlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
    return matchesSearch && matchesPosition;
  });

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST'];

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-white mt-4">Loading draft room...</p>
        </div>
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Draft Not Found</h1>
          <p>The draft room could not be loaded.</p>
        </div>
      </div>
    );
  }

  const isMyPick = draftState.currentPick?.teamId === myTeam?.id;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              {draftState.draft.name}
            </h1>
            <p className="text-gray-400">
              Round {draftState.currentPick?.round} • Pick {draftState.currentPick?.pickNumber}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {formatTime(draftState.timeRemaining)}
              </div>
              <div className="text-sm text-gray-400">Time Remaining</div>
            </div>
            
            {isMyPick && (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="bg-green-600 px-4 py-2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  <span className="font-semibold">YOUR PICK!</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Player Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Available Players</h2>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400">{filteredPlayers.length}</span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Player List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPlayers.map((player) => (
                <motion.div
                  key={player.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedPlayer(player)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPlayer?.id === player.id
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                  } border`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-gray-400">
                        {player.position} • {player.team} • Bye {player.bye}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-400">
                        {player.projectedPoints} pts
                      </div>
                      <div className="text-xs text-gray-400">ADP {player.adp}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Draft Button */}
            {isMyPick && selectedPlayer && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => makePick(selectedPlayer)}
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Draft {selectedPlayer.name}
              </motion.button>
            )}
          </div>
        </div>

        {/* Draft Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Draft Board</h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {draftState.teams.map((team) => (
                <div
                  key={team.id}
                  className={`p-4 rounded-lg transition-colors ${
                    team.isOnClock
                      ? 'bg-green-600/20 border-green-500'
                      : 'bg-gray-700 border-gray-600'
                  } border`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={team.owner.image}
                        alt={team.owner.name}
                        className="h-8 w-8 rounded-full"
                      />
                      <div>
                        <div className="font-semibold">{team.name}</div>
                        <div className="text-sm text-gray-400">{team.owner.name}</div>
                      </div>
                    </div>
                    
                    {team.isOnClock && (
                      <div className="flex items-center gap-2 text-green-400">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-semibold">ON THE CLOCK</span>
                      </div>
                    )}
                  </div>

                  {/* Team's Picks */}
                  <div className="grid grid-cols-8 gap-1">
                    {Array.from({ length: 16 }, (_, i) => {
                      const pick = team.picks.find(p => p.round === i + 1);
                      return (
                        <div
                          key={i}
                          className={`h-8 text-xs flex items-center justify-center rounded ${
                            pick
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 text-gray-400'
                          }`}
                        >
                          {pick ? pick.player?.position : '—'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Picks */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">Recent Picks</h3>
            <div className="space-y-2">
              {draftState.picks.slice(-5).reverse().map((pick, index) => (
                <motion.div
                  key={pick.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-2 bg-gray-700 rounded"
                >
                  <div>
                    <span className="font-semibold">{pick.player?.name}</span>
                    <span className="text-gray-400 ml-2">
                      {pick.player?.position} • {pick.player?.team}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {pick.round}.{pick.pickNumber}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}