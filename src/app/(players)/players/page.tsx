/**
 * Player Universe - Advanced scouting intelligence with cosmic AI insights
 * Elite discovery platform for championship-caliber talent
 */

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, TrendingUp, TrendingDown, Minus, AlertCircle, Trophy,
  User, Activity, Calendar, DollarSign, Award, Target, Info,
  ChevronDown, ChevronUp, Star, Heart, BarChart3, Clock,
  PlayCircle, FileText, ExternalLink, X, Check, Zap, Eye,
  Sparkles, Crown, Shield, Brain, Cpu, Bolt, Flame, Radar
} from 'lucide-react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { format } from 'date-fns';

// Enhanced position groups with cosmic themes
const POSITIONS = [
  { value: 'ALL', label: 'All Champions', icon: Crown },
  { value: 'QB', label: 'Quantum Backs', icon: Crown },
  { value: 'RB', label: 'Cosmic Runners', icon: Bolt },
  { value: 'WR', label: 'Nebula Receivers', icon: Zap },
  { value: 'TE', label: 'Stellar Ends', icon: Target },
  { value: 'K', label: 'Galaxy Kickers', icon: Star },
  { value: 'DST', label: 'Defense Matrix', icon: Shield }
];

const NFL_TEAMS = ['ALL', 'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'];

// Enhanced mock player data with cosmic analytics
const mockPlayers = [
  {
    id: '1',
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'SF',
    byeWeek: 9,
    rank: 1,
    adp: 1.2,
    points: 312.5,
    avgPoints: 19.5,
    projectedPoints: 21.2,
    lastWeekPoints: 24.3,
    trend: 'up',
    trendChange: '+15%',
    injuryStatus: null,
    owned: 99.8,
    started: 98.5,
    tier: 'elite',
    confidence: 96,
    aiScore: 9.8,
    fantasy_outlook: 'Elite RB1 with championship upside',
    strengths: ['Goal line touches', 'Pass catching', 'Health'],
    weaknesses: ['Age concerns'],
    news: 'Practiced in full Wednesday - trending toward another explosive week',
    matchup: 'vs SEA (30th vs RB)',
    weather: 'Dome - Perfect conditions'
  },
  {
    id: '2',
    name: 'Tyreek Hill',
    position: 'WR',
    team: 'MIA',
    byeWeek: 10,
    rank: 2,
    adp: 3.5,
    points: 298.7,
    avgPoints: 18.7,
    projectedPoints: 19.8,
    lastWeekPoints: 15.2,
    trend: 'down',
    trendChange: '-8%',
    injuryStatus: null,
    owned: 99.9,
    started: 97.8,
    tier: 'elite',
    confidence: 92,
    aiScore: 9.5,
    fantasy_outlook: 'WR1 with explosive ceiling',
    strengths: ['Deep speed', 'Red zone targets', 'Volume'],
    weaknesses: ['Inconsistent floor'],
    news: 'Leading league in receiving yards - no signs of slowing down',
    matchup: '@ BUF (18th vs WR)',
    weather: 'Clear - 45°F, Light wind'
  },
  {
    id: '3',
    name: 'Austin Ekeler',
    position: 'RB',
    team: 'LAC',
    byeWeek: 5,
    rank: 8,
    adp: 7.3,
    points: 245.2,
    avgPoints: 15.3,
    projectedPoints: 14.8,
    lastWeekPoints: 16.1,
    trend: 'same',
    trendChange: '0%',
    injuryStatus: 'Q',
    owned: 98.2,
    started: 92.1,
    tier: 'high',
    confidence: 78,
    aiScore: 8.2,
    fantasy_outlook: 'Solid RB2 with passing game upside',
    strengths: ['Pass catching', 'Red zone usage'],
    weaknesses: ['Injury prone', 'Age'],
    news: 'Limited in practice with ankle injury - monitor status',
    matchup: 'vs LV (22nd vs RB)',
    weather: 'Clear - 72°F, No wind'
  },
  {
    id: '4',
    name: 'Travis Kelce',
    position: 'TE',
    team: 'KC',
    byeWeek: 10,
    rank: 1,
    adp: 12.1,
    points: 201.3,
    avgPoints: 12.6,
    projectedPoints: 14.2,
    lastWeekPoints: 18.4,
    trend: 'up',
    trendChange: '+22%',
    injuryStatus: null,
    owned: 98.7,
    started: 96.3,
    tier: 'elite',
    confidence: 94,
    aiScore: 9.7,
    fantasy_outlook: 'TE1 with elite ceiling',
    strengths: ['Target share', 'Red zone looks', 'Consistency'],
    weaknesses: ['Age regression risk'],
    news: 'Mahomes favorite target in red zone - elite chemistry continues',
    matchup: 'vs DEN (28th vs TE)',
    weather: 'Clear - 38°F, Light wind'
  }
];

// Player tier color mapping
const getTierGradient = (tier: string) => {
  switch (tier) {
    case 'elite': return 'from-astral-gold-500 to-astral-supernova-600';
    case 'high': return 'from-astral-cosmic-500 to-astral-quantum-600';
    case 'medium': return 'from-astral-nebula-500 to-astral-cosmic-600';
    case 'low': return 'from-astral-quantum-500 to-astral-supernova-600';
    default: return 'from-astral-cosmic-500 to-astral-quantum-600';
  }
};

// Enhanced player card component
const PlayerCard = ({ player, isFavorite, onToggleFavorite, onViewDetails }: any) => {
  const tierGradient = getTierGradient(player.tier);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="astral-card-premium group relative overflow-hidden cursor-pointer"
      onClick={() => onViewDetails(player)}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Tier background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${tierGradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500`}></div>
      
      {/* AI Score indicator */}
      <div className="absolute top-3 right-3 z-20">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
          player.aiScore >= 9.5 ? 'bg-astral-gold-500/20 text-astral-gold-400 border border-astral-gold-500/30' :
          player.aiScore >= 8.5 ? 'bg-astral-cosmic-500/20 text-astral-cosmic-400 border border-astral-cosmic-500/30' :
          player.aiScore >= 7.5 ? 'bg-astral-nebula-500/20 text-astral-nebula-400 border border-astral-nebula-500/30' :
          'bg-astral-quantum-500/20 text-astral-quantum-400 border border-astral-quantum-500/30'
        }`}>
          <Brain className="w-3 h-3" />
          {player.aiScore}
        </div>
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-white font-orbitron text-lg leading-tight">
                {player.name}
              </h3>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(player.id);
                }}
                className={`p-1 rounded-full transition-colors ${
                  isFavorite ? 'text-astral-supernova-400' : 'text-astral-light-shadow hover:text-astral-supernova-400'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </motion.button>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <span className={`px-2 py-1 rounded-lg font-medium bg-gradient-to-r ${tierGradient} bg-opacity-20 text-white border border-current border-opacity-30`}>
                {player.position}
              </span>
              <span className="text-astral-cosmic-400 font-bold">{player.team}</span>
              <div className={`w-2 h-2 rounded-full ${
                player.injuryStatus === 'Q' ? 'bg-astral-status-questionable' :
                player.injuryStatus === 'D' ? 'bg-astral-status-doubtful' :
                player.injuryStatus === 'O' ? 'bg-astral-status-out' :
                'bg-astral-status-healthy'
              }`} />
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-astral-light-shadow mb-1">Dynasty Rank</div>
            <div className="text-2xl font-bold text-white font-orbitron">#{player.rank}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-xs text-astral-light-shadow mb-1">Proj Pts</div>
            <div className="text-lg font-bold text-white font-orbitron">{player.projectedPoints}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-astral-light-shadow mb-1">Avg Pts</div>
            <div className="text-lg font-bold text-white font-orbitron">{player.avgPoints}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-astral-light-shadow mb-1">Owned</div>
            <div className="text-lg font-bold text-white font-orbitron">{player.owned}%</div>
          </div>
        </div>

        {/* Trend and Confidence */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {player.trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-astral-status-healthy" />
            ) : player.trend === 'down' ? (
              <TrendingDown className="w-4 h-4 text-astral-status-out" />
            ) : (
              <Minus className="w-4 h-4 text-astral-light-shadow" />
            )}
            <span className={`text-sm font-medium ${
              player.trend === 'up' ? 'text-astral-status-healthy' :
              player.trend === 'down' ? 'text-astral-status-out' :
              'text-astral-light-shadow'
            }`}>
              {player.trendChange}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className={`w-full bg-astral-dark-surface rounded-full h-2 ${
              player.confidence >= 90 ? 'w-16' : 'w-12'
            }`}>
              <div 
                className={`h-2 rounded-full bg-gradient-to-r ${
                  player.confidence >= 90 ? 'from-astral-gold-500 to-astral-supernova-600' :
                  player.confidence >= 75 ? 'from-astral-cosmic-500 to-astral-quantum-600' :
                  'from-astral-nebula-500 to-astral-cosmic-600'
                }`}
                style={{ width: `${player.confidence}%` }}
              />
            </div>
            <span className="text-xs text-astral-light-shadow ml-1">{player.confidence}%</span>
          </div>
        </div>

        {/* Matchup info */}
        <div className="bg-astral-dark-surface/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-astral-light-shadow mb-1">Next Matchup</div>
              <div className="text-sm font-medium text-white">{player.matchup}</div>
            </div>
            <Eye className="w-4 h-4 text-astral-cosmic-400" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Player details modal
const PlayerModal = ({ player, isOpen, onClose }: any) => (
  <AnimatePresence>
    {isOpen && player && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-astral-dark-void/80 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div
          className="relative astral-card-premium max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          <div className="p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white font-orbitron mb-2">
                  {player.name}
                </h2>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-lg font-medium bg-gradient-to-r ${getTierGradient(player.tier)} bg-opacity-20 text-white border border-current border-opacity-30`}>
                    {player.position} • {player.team}
                  </span>
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-astral-cosmic-400" />
                    <span className="text-astral-cosmic-400 font-bold">AI Score: {player.aiScore}/10</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-astral-dark-surface/50 hover:bg-astral-dark-surface transition-colors"
              >
                <X className="w-5 h-5 text-astral-light-shadow" />
              </button>
            </div>

            {/* Content Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Stats & Analysis */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white font-orbitron mb-4">Performance Analysis</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-astral-dark-surface/50 rounded-lg p-4">
                      <div className="text-astral-light-shadow text-sm mb-1">Dynasty Rank</div>
                      <div className="text-2xl font-bold text-astral-gold-400 font-orbitron">#{player.rank}</div>
                    </div>
                    <div className="bg-astral-dark-surface/50 rounded-lg p-4">
                      <div className="text-astral-light-shadow text-sm mb-1">Total Points</div>
                      <div className="text-2xl font-bold text-astral-cosmic-400 font-orbitron">{player.points}</div>
                    </div>
                    <div className="bg-astral-dark-surface/50 rounded-lg p-4">
                      <div className="text-astral-light-shadow text-sm mb-1">Projected</div>
                      <div className="text-2xl font-bold text-astral-nebula-400 font-orbitron">{player.projectedPoints}</div>
                    </div>
                    <div className="bg-astral-dark-surface/50 rounded-lg p-4">
                      <div className="text-astral-light-shadow text-sm mb-1">Confidence</div>
                      <div className="text-2xl font-bold text-astral-quantum-400 font-orbitron">{player.confidence}%</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white font-orbitron mb-4">AI Assessment</h3>
                  <div className="bg-astral-cosmic-500/10 border border-astral-cosmic-500/30 rounded-lg p-4">
                    <p className="text-astral-light-shadow mb-3">{player.fantasy_outlook}</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-astral-status-healthy font-medium mb-2">Strengths</h4>
                        <ul className="text-sm text-astral-light-shadow space-y-1">
                          {player.strengths?.map((strength: string, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              <Check className="w-3 h-3 text-astral-status-healthy" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-astral-supernova-400 font-medium mb-2">Risk Factors</h4>
                        <ul className="text-sm text-astral-light-shadow space-y-1">
                          {player.weaknesses?.map((weakness: string, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              <AlertCircle className="w-3 h-3 text-astral-supernova-400" />
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matchup & News */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white font-orbitron mb-4">Matchup Intelligence</h3>
                  <div className="bg-astral-nebula-500/10 border border-astral-nebula-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-astral-nebula-400" />
                      <span className="text-white font-medium">{player.matchup}</span>
                    </div>
                    <div className="text-sm text-astral-light-shadow mb-2">
                      <span className="font-medium">Weather:</span> {player.weather}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white font-orbitron mb-4">Latest Intelligence</h3>
                  <div className="bg-astral-gold-500/10 border border-astral-gold-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-astral-gold-400 mt-0.5" />
                      <p className="text-astral-light-shadow leading-relaxed">{player.news}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default function PlayersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [sortBy, setSortBy] = useState<'rank' | 'points' | 'projected' | 'owned'>('rank');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let players = [...mockPlayers];
    
    if (selectedPosition !== 'ALL') {
      players = players.filter(p => p.position === selectedPosition);
    }
    
    if (selectedTeam !== 'ALL') {
      players = players.filter(p => p.team === selectedTeam);
    }
    
    if (debouncedSearch) {
      players = players.filter(p => 
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.team.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    
    // Sort
    players.sort((a, b) => {
      switch (sortBy) {
        case 'rank': return a.rank - b.rank;
        case 'points': return b.points - a.points;
        case 'projected': return b.projectedPoints - a.projectedPoints;
        case 'owned': return b.owned - a.owned;
        default: return 0;
      }
    });
    
    return players;
  }, [selectedPosition, selectedTeam, debouncedSearch, sortBy]);

  const toggleFavorite = (playerId: string) => {
    setFavorites(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  return (
    <div className="min-h-screen bg-astral-dark-void relative overflow-hidden">
      {/* Enhanced background */}
      <div className="futuristic-background">
        <div className="neural-network">
          {Array.from({ length: 20 }, (_, i) => (
            <motion.div
              key={i}
              className="neural-node"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.2, 0.7, 0.2],
              }}
              transition={{
                duration: 5 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="nav-astral border-b border-astral-cosmic-500/20 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <motion.h1 
                className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-astral-cosmic-400 via-astral-nebula-400 to-astral-quantum-400 font-orbitron mb-2"
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] 
                }}
                transition={{ 
                  duration: 5, 
                  repeat: Infinity 
                }}
                style={{ backgroundSize: '200% 200%' }}
              >
                Player Universe
              </motion.h1>
              <p className="text-astral-light-shadow font-medium">
                Advanced scouting intelligence powered by Quantum AI
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-astral-light-shadow">Elite Champions</div>
                <div className="text-2xl font-bold text-white font-orbitron">{filteredPlayers.length}</div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-astral-light-shadow" />
              <input
                type="text"
                placeholder="Search for champions by name or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-astral w-full pl-12 pr-4 py-3 text-lg"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Position Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-astral-light-shadow">Position:</span>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="input-astral px-3 py-2 text-sm bg-astral-dark-surface border border-astral-cosmic-500/30"
                >
                  {POSITIONS.map(pos => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
              </div>

              {/* Team Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-astral-light-shadow">Team:</span>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="input-astral px-3 py-2 text-sm bg-astral-dark-surface border border-astral-cosmic-500/30"
                >
                  {NFL_TEAMS.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-astral-light-shadow">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="input-astral px-3 py-2 text-sm bg-astral-dark-surface border border-astral-cosmic-500/30"
                >
                  <option value="rank">Dynasty Rank</option>
                  <option value="points">Total Points</option>
                  <option value="projected">Projected Points</option>
                  <option value="owned">Ownership %</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Player Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          layout
        >
          <AnimatePresence mode="popLayout">
            {filteredPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: index * 0.05 }
                }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <PlayerCard
                  player={player}
                  isFavorite={favorites.includes(player.id)}
                  onToggleFavorite={toggleFavorite}
                  onViewDetails={setSelectedPlayer}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredPlayers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Radar className="w-16 h-16 text-astral-cosmic-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white font-orbitron mb-2">
              No Champions Found
            </h3>
            <p className="text-astral-light-shadow">
              Adjust your search criteria to discover elite talent
            </p>
          </motion.div>
        )}
      </main>

      {/* Player Details Modal */}
      <PlayerModal
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}