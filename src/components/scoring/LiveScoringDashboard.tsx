'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  Trophy,
  Clock,
  Zap,
  AlertCircle,
  Play,
  Users,
  ChevronUp,
  ChevronDown,
  Circle,
  Square,
  BarChart3,
  Flame
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { io, Socket } from 'socket.io-client';

interface GameUpdate {
  playerId: string;
  playerName: string;
  team: string;
  playType: string;
  points: number;
  description: string;
  timestamp: Date;
}

interface TeamScore {
  teamId: string;
  teamName: string;
  owner: string;
  currentScore: number;
  projectedScore: number;
  playersPlaying: number;
  playersRemaining: number;
  winProbability: number;
  momentum: 'hot' | 'cold' | 'neutral';
  recentPlays: GameUpdate[];
}

interface Matchup {
  matchupId: string;
  homeTeam: TeamScore;
  awayTeam: TeamScore;
  gameStatus: 'pregame' | 'active' | 'final';
  quarter: string;
  timeRemaining: string;
  redZone: boolean;
}

interface PlayerPerformance {
  playerId: string;
  name: string;
  position: string;
  team: string;
  currentPoints: number;
  projectedPoints: number;
  percentComplete: number;
  isPlaying: boolean;
  lastPlay?: string;
  trend: 'up' | 'down' | 'stable';
}

export function LiveScoringDashboard({ 
  leagueId,
  week,
  userId 
}: { 
  leagueId: string;
  week: number;
  userId: string;
}) {
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [selectedMatchup, setSelectedMatchup] = useState<Matchup | null>(null);
  const [topPerformers, setTopPerformers] = useState<PlayerPerformance[]>([]);
  const [recentPlays, setRecentPlays] = useState<GameUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    socketRef.current = io('/api/scoring/live', {
      query: { leagueId, week }
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to live scoring');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from live scoring');
    });

    socketRef.current.on('scoreUpdate', (data: any) => {
      handleScoreUpdate(data);
    });

    socketRef.current.on('playUpdate', (play: GameUpdate) => {
      handlePlayUpdate(play);
    });

    socketRef.current.on('matchupUpdate', (matchup: Matchup) => {
      handleMatchupUpdate(matchup);
    });

    // Initial data fetch
    fetchInitialData();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [leagueId, week]);

  const fetchInitialData = async () => {
    try {
      const response = await fetch(`/api/scoring/live?leagueId=${leagueId}&week=${week}`);
      if (response.ok) {
        const data = await response.json();
        setMatchups(data.matchups);
        setTopPerformers(data.topPerformers);
        setRecentPlays(data.recentPlays);
        if (data.matchups.length > 0) {
          setSelectedMatchup(data.matchups[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  };

  const handleScoreUpdate = (data: any) => {
    setMatchups(prev => prev.map(m => 
      m.matchupId === data.matchupId ? { ...m, ...data } : m
    ));
  };

  const handlePlayUpdate = (play: GameUpdate) => {
    setRecentPlays(prev => [play, ...prev.slice(0, 19)]);
    
    // Flash animation for big plays
    if (play.points > 10) {
      // Trigger special animation
    }
  };

  const handleMatchupUpdate = (matchup: Matchup) => {
    setMatchups(prev => prev.map(m => 
      m.matchupId === matchup.matchupId ? matchup : m
    ));
    
    if (selectedMatchup?.matchupId === matchup.matchupId) {
      setSelectedMatchup(matchup);
    }
  };

  const getScoreDifferenceColor = (diff: number) => {
    if (Math.abs(diff) < 5) return 'text-yellow-500';
    return diff > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getWinProbabilityBar = (probability: number) => {
    return (
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
          style={{ width: `${probability}%` }}
        />
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header with Connection Status */}
      <Card className="p-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Activity className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Live Scoring Dashboard</h2>
              <p className="text-gray-400">Real-time updates for Week {week}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'border-green-500' : 'border-gray-500'}
            >
              {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Matchup Scoreboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {matchups.map(matchup => (
          <motion.div
            key={matchup.matchupId}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedMatchup(matchup)}
            className="cursor-pointer"
          >
            <Card className={`p-4 bg-gray-800 border-gray-700 ${
              selectedMatchup?.matchupId === matchup.matchupId ? 'ring-2 ring-blue-500' : ''
            }`}>
              {/* Game Status Bar */}
              <div className="flex items-center justify-between mb-3">
                <Badge className={
                  matchup.gameStatus === 'active' ? 'bg-green-600' :
                  matchup.gameStatus === 'final' ? 'bg-gray-600' :
                  'bg-blue-600'
                }>
                  {matchup.gameStatus === 'active' ? (
                    <>
                      <Circle className="w-2 h-2 mr-1 fill-current" />
                      {matchup.quarter} - {matchup.timeRemaining}
                    </>
                  ) : matchup.gameStatus === 'final' ? (
                    'FINAL'
                  ) : (
                    'PREGAME'
                  )}
                </Badge>
                
                {matchup.redZone && (
                  <Badge className="bg-red-600 animate-pulse">
                    RED ZONE
                  </Badge>
                )}
              </div>

              {/* Teams and Scores */}
              <div className="space-y-3">
                {/* Home Team */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="font-semibold text-white">{matchup.homeTeam.teamName}</div>
                      <div className="text-xs text-gray-400">{matchup.homeTeam.owner}</div>
                    </div>
                    {matchup.homeTeam.momentum === 'hot' && (
                      <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {matchup.homeTeam.currentScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Proj: {matchup.homeTeam.projectedScore.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Win Probability Bar */}
                {getWinProbabilityBar(matchup.homeTeam.winProbability)}

                {/* Away Team */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="font-semibold text-white">{matchup.awayTeam.teamName}</div>
                      <div className="text-xs text-gray-400">{matchup.awayTeam.owner}</div>
                    </div>
                    {matchup.awayTeam.momentum === 'hot' && (
                      <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {matchup.awayTeam.currentScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Proj: {matchup.awayTeam.projectedScore.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Players Indicator */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{matchup.homeTeam.playersPlaying} playing</span>
                  <span>{matchup.awayTeam.playersPlaying} playing</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Selected Matchup Details */}
      {selectedMatchup && (
        <Card className="p-6 bg-gray-800 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Matchup Details</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Team Roster Performance */}
            <div>
              <h4 className="font-medium text-white mb-3">{selectedMatchup.homeTeam.teamName}</h4>
              <div className="space-y-2">
                {/* Player performances would be listed here */}
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge>QB</Badge>
                      <div>
                        <div className="text-sm font-medium text-white">Patrick Mahomes</div>
                        <div className="text-xs text-gray-400">KC vs BUF</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">24.8</div>
                      <div className="flex items-center text-xs text-green-500">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +4.2
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Last: 15-yd TD pass to Kelce
                  </div>
                </div>
              </div>
            </div>

            {/* Away Team Roster Performance */}
            <div>
              <h4 className="font-medium text-white mb-3">{selectedMatchup.awayTeam.teamName}</h4>
              <div className="space-y-2">
                {/* Player performances would be listed here */}
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge>RB</Badge>
                      <div>
                        <div className="text-sm font-medium text-white">Christian McCaffrey</div>
                        <div className="text-xs text-gray-400">SF vs DAL</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">28.3</div>
                      <div className="flex items-center text-xs text-green-500">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +6.1
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Last: 8-yd rushing TD
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="p-6 bg-gray-800 border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Top Performers</h3>
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          
          <div className="space-y-3">
            {topPerformers.slice(0, 5).map((player, idx) => (
              <motion.div
                key={player.playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold text-yellow-400">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white">{player.name}</div>
                    <div className="text-xs text-gray-400">
                      {player.position} - {player.team}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {player.currentPoints.toFixed(1)}
                  </div>
                  {player.trend === 'up' && (
                    <div className="flex items-center text-xs text-green-500">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      On Fire
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Recent Big Plays */}
        <Card className="p-6 bg-gray-800 border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Big Plays</h3>
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentPlays.map((play, idx) => (
              <motion.div
                key={`${play.playerId}-${play.timestamp}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-3 rounded-lg ${
                  play.points > 10 ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{play.playerName}</span>
                      <Badge variant="outline" className="text-xs">
                        {play.team}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {play.description}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className={`font-bold ${
                      play.points > 10 ? 'text-purple-400 text-lg' : 'text-white'
                    }`}>
                      +{play.points.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(play.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Win Probability Chart */}
      <Card className="p-6 bg-gray-800 border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Win Probability Timeline</h3>
          <BarChart3 className="w-5 h-5 text-blue-400" />
        </div>
        
        <div className="h-64 bg-gray-700/50 rounded-lg flex items-center justify-center">
          <span className="text-gray-500">Win probability chart over time</span>
        </div>
        
        <div className="mt-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400">Q1</div>
            <div className="text-sm font-medium text-white">52%</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Q2</div>
            <div className="text-sm font-medium text-white">48%</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Q3</div>
            <div className="text-sm font-medium text-white">61%</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Current</div>
            <div className="text-sm font-medium text-green-500">67%</div>
          </div>
        </div>
      </Card>
    </div>
  );
}export default LiveScoringDashboard;
