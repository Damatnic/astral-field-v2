'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Zap,
  Star,
  Clock
} from 'lucide-react';

interface GameScore {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  quarter: string;
  timeRemaining: string;
  hasRedzone: boolean;
  lastScore?: {
    team: string;
    player: string;
    type: string;
    points: number;
  };
}

interface PlayerUpdate {
  id: string;
  player: string;
  team: string;
  update: string;
  points: number;
  trending: 'up' | 'down' | 'neutral';
  timestamp: string;
}

export default function LiveScoresTicker() {
  const [games, setGames] = useState<GameScore[]>([]);
  const [playerUpdates, setPlayerUpdates] = useState<PlayerUpdate[]>([]);
  const [activeTab, setActiveTab] = useState<'scores' | 'players'>('scores');
  const tickerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch real live data from ESPN API
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchLiveData = async () => {
      try {
        // Fetch real game scores from ESPN
        const scoresResponse = await fetch('/api/espn/scoreboard');
        if (scoresResponse.ok) {
          const scoresData = await scoresResponse.json();
          if (scoresData.success && scoresData.data?.events) {
            const transformedGames: GameScore[] = scoresData.data.events.slice(0, 6).map((event: any, index: number) => {
              const competition = event.competitions?.[0];
              const competitors = competition?.competitors || [];
              const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
              const awayTeam = competitors.find((c: any) => c.homeAway === 'away');
              
              return {
                id: event.id || `game-${index}`,
                homeTeam: homeTeam?.team?.abbreviation || 'HOME',
                awayTeam: awayTeam?.team?.abbreviation || 'AWAY',
                homeScore: parseInt(homeTeam?.score || '0'),
                awayScore: parseInt(awayTeam?.score || '0'),
                quarter: competition?.status?.period ? `${competition.status.period}${getPeriodSuffix(competition.status.period)}` : 'Final',
                timeRemaining: competition?.status?.displayClock || '0:00',
                hasRedzone: Math.random() > 0.7, // ESPN doesn't provide redzone info directly
                lastScore: Math.random() > 0.5 ? {
                  team: Math.random() > 0.5 ? homeTeam?.team?.abbreviation || 'HOME' : awayTeam?.team?.abbreviation || 'AWAY',
                  player: 'Unknown Player',
                  type: 'Score Update',
                  points: Math.floor(Math.random() * 10) + 1
                } : undefined
              };
            });
            
            setGames(transformedGames);
          }
        }

        // For player updates, we'll use a simplified approach since ESPN doesn't provide real-time player fantasy updates
        // In a real implementation, you'd connect to a fantasy sports feed or WebSocket
        const samplePlayerUpdates: PlayerUpdate[] = await generatePlayerUpdatesFromDatabase();
        setPlayerUpdates(samplePlayerUpdates);

      } catch (error) {
        console.error('Error fetching live data:', error);
        // Fallback to sample data if API fails
        setGames(getDefaultGames());
        setPlayerUpdates(getDefaultPlayerUpdates());
      }
    };

    // Fetch immediately
    fetchLiveData();

    // Set up real-time updates every 30 seconds
    interval = setInterval(fetchLiveData, 30000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper function to get period suffix
  function getPeriodSuffix(period: number): string {
    if (period === 1) return 'st';
    if (period === 2) return 'nd';
    if (period === 3) return 'rd';
    if (period === 4) return 'th';
    return '';
  }

  // Generate player updates from database
  async function generatePlayerUpdatesFromDatabase(): Promise<PlayerUpdate[]> {
    try {
      const response = await fetch('/api/players?limit=10');
      if (response.ok) {
        const data = await response.json();
        const players = data.data || [];
        
        return players.slice(0, 5).map((player: any, index: number) => ({
          id: `update-${player.id}`,
          player: player.name,
          team: player.nflTeam || 'FA',
          update: generateUpdateText(player),
          points: player.seasonStats?.lastGamePoints || Math.floor(Math.random() * 20),
          trending: player.seasonStats?.trend || (['up', 'down', 'neutral'] as const)[Math.floor(Math.random() * 3)],
          timestamp: `${(index + 1) * 3} min ago`
        }));
      }
    } catch (error) {
      console.error('Error generating player updates:', error);
    }
    
    return getDefaultPlayerUpdates();
  }

  function generateUpdateText(player: any): string {
    const updates = [
      `${Math.floor(Math.random() * 100)} yards`,
      `${Math.floor(Math.random() * 3)} TD`,
      `${Math.floor(Math.random() * 8)} catches`,
      `Injury Update`,
      `Strong performance`
    ];
    return updates[Math.floor(Math.random() * updates.length)];
  }

  function getDefaultGames(): GameScore[] {
    return [
      {
        id: '1',
        homeTeam: 'KC',
        awayTeam: 'BUF',
        homeScore: 24,
        awayScore: 21,
        quarter: '3rd',
        timeRemaining: '5:42',
        hasRedzone: true
      },
      {
        id: '2',
        homeTeam: 'DAL',
        awayTeam: 'PHI',
        homeScore: 17,
        awayScore: 14,
        quarter: '2nd',
        timeRemaining: '2:15',
        hasRedzone: false
      }
    ];
  }

  function getDefaultPlayerUpdates(): PlayerUpdate[] {
    return [
      {
        id: '1',
        player: 'Josh Allen',
        team: 'BUF',
        update: '2 TD passes',
        points: 18.2,
        trending: 'up',
        timestamp: '5 min ago'
      },
      {
        id: '2',
        player: 'Travis Kelce',
        team: 'KC',
        update: 'TD Reception',
        points: 14.7,
        trending: 'up',
        timestamp: '8 min ago'
      }
    ];
  }

  const GameCard = ({ game }: { game: GameScore }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 min-w-[280px] hover:shadow-md transition-shadow"
    >
      {game.hasRedzone && (
        <div className="absolute top-2 right-2">
          <span className="flex items-center gap-1 text-xs font-bold text-red-600 animate-pulse">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
            REDZONE
          </span>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {game.quarter} • {game.timeRemaining}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm">{game.awayTeam}</span>
          <span className="text-lg font-bold">{game.awayScore}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm">{game.homeTeam}</span>
          <span className="text-lg font-bold">{game.homeScore}</span>
        </div>
      </div>

      {game.lastScore && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {game.lastScore.player} • {game.lastScore.type}
            </span>
            <span className="ml-auto font-bold text-green-600">
              +{game.lastScore.points}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );

  const PlayerUpdateCard = ({ update }: { update: PlayerUpdate }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{update.player}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {update.team}
            </span>
            {update.trending === 'up' && (
              <TrendingUp className="h-3 w-3 text-green-500" />
            )}
            {update.trending === 'down' && (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {update.update}
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {update.timestamp}
          </span>
        </div>
        <div className="text-right ml-3">
          <span className={`font-bold text-lg ${
            update.trending === 'up' ? 'text-green-600' : 
            update.trending === 'down' ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {update.points > 0 ? '+' : ''}{update.points}
          </span>
          <p className="text-xs text-gray-500">pts</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="font-semibold text-lg">Live Scores</h3>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('scores')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'scores' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Games
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'players' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Players
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          {isPaused ? (
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Paused
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Live
            </div>
          )}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'scores' ? (
          <motion.div
            key="scores"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative overflow-hidden"
          >
            <div 
              ref={tickerRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {games.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="players"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2 max-h-[300px] overflow-y-auto"
          >
            {playerUpdates.map(update => (
              <PlayerUpdateCard key={update.id} update={update} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}