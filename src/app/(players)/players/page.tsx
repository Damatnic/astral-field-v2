'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Search, Filter, TrendingUp, TrendingDown, Star,
  User, Trophy, ChevronDown, Plus, Eye, MessageCircle, 
  Share2, Heart, Users, BarChart3, PieChart, Activity,
  Target, Zap, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSwipeGesture, useBreakpoint, useTouchDevice } from '@/components/mobile/ResponsiveUtils';

// Position configuration
const POSITIONS = [
  { value: 'ALL', label: 'All Positions' },
  { value: 'QB', label: 'Quarterback' },
  { value: 'RB', label: 'Running Back' },
  { value: 'WR', label: 'Wide Receiver' },
  { value: 'TE', label: 'Tight End' },
  { value: 'K', label: 'Kicker' },
  { value: 'DST', label: 'Defense/ST' }
];

const NFL_TEAMS = ['ALL', 'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'];

// Mock player data
const mockPlayers = [
  {
    id: '1',
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'SF',
    rank: 1,
    adp: 1.2,
    points: 312.5,
    avgPoints: 19.5,
    ownership: 99.8,
    trend: 'up',
    status: 'healthy',
    opponent: '@ SEA',
    projection: 22.1,
    salary: 9800,
    notes: 3,
    likes: 124,
    isWatched: false,
    leagueOwnership: 87
  },
  {
    id: '2',
    name: 'Cooper Kupp',
    position: 'WR',
    team: 'LAR',
    rank: 2,
    adp: 3.1,
    points: 298.7,
    avgPoints: 18.7,
    ownership: 97.5,
    trend: 'up',
    status: 'healthy',
    opponent: 'vs ARI',
    projection: 19.3,
    salary: 9400,
    notes: 7,
    likes: 89,
    isWatched: true,
    leagueOwnership: 72
  },
  {
    id: '3',
    name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    rank: 1,
    adp: 2.8,
    points: 289.4,
    avgPoints: 18.1,
    ownership: 94.2,
    trend: 'stable',
    status: 'healthy',
    opponent: 'vs MIA',
    projection: 23.5,
    salary: 8900,
    notes: 12,
    likes: 156,
    isWatched: true,
    leagueOwnership: 94
  },
  {
    id: '4',
    name: 'Travis Kelce',
    position: 'TE',
    team: 'KC',
    rank: 1,
    adp: 8.5,
    points: 267.3,
    avgPoints: 16.7,
    ownership: 89.1,
    trend: 'down',
    status: 'questionable',
    opponent: 'vs DEN',
    projection: 15.8,
    salary: 7800,
    notes: 5,
    likes: 67,
    isWatched: false,
    leagueOwnership: 45
  },
  {
    id: '5',
    name: 'Derrick Henry',
    position: 'RB',
    team: 'TEN',
    rank: 5,
    adp: 12.3,
    points: 245.8,
    avgPoints: 15.4,
    ownership: 87.6,
    trend: 'up',
    status: 'healthy',
    opponent: '@ JAX',
    projection: 17.2,
    salary: 7200,
    notes: 2,
    likes: 78,
    isWatched: true,
    leagueOwnership: 63
  },
  {
    id: '6',
    name: 'Tyreek Hill',
    position: 'WR',
    team: 'MIA',
    rank: 3,
    adp: 4.7,
    points: 278.9,
    avgPoints: 17.4,
    ownership: 96.3,
    trend: 'stable',
    status: 'healthy',
    opponent: '@ BUF',
    projection: 18.6,
    salary: 8600,
    notes: 9,
    likes: 102,
    isWatched: false,
    leagueOwnership: 81
  }
];

const PlayerCard = ({ player }: any) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(player.isWatched);
  const [showNotes, setShowNotes] = useState(false);
  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'RB': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'WR': return 'bg-green-100 text-green-700 border-green-200';
      case 'TE': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'K': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'DST': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'questionable': return 'text-orange-600 bg-orange-50';
      case 'out': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <span className="w-4 h-4 bg-gray-300 rounded-full"></span>;
    }
  };

  return (
    <div className="player-card-premium touch-feedback group">
      {/* Premium gradient header based on position */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${getPositionColor(player.position).replace('border-', 'bg-')}`}></div>
      
      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Position Badge with Glow Effect */}
          <div className={`relative px-3 py-1.5 text-xs font-bold rounded-lg border-2 ${getPositionColor(player.position)} shadow-sm`}>
            {player.position}
            <div className="absolute inset-0 rounded-lg opacity-20 bg-gradient-to-r from-white to-transparent"></div>
          </div>
          
          {/* Rank with Premium Styling */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-500">#</span>
            <span className="text-sm font-bold text-gray-700">{player.rank}</span>
          </div>
        </div>
        
        {/* Enhanced Trend Indicator */}
        <div className={`p-2 rounded-full transition-all duration-300 ${
          player.trend === 'up' ? 'bg-green-50 hover:bg-green-100' :
          player.trend === 'down' ? 'bg-red-50 hover:bg-red-100' :
          'bg-gray-50 hover:bg-gray-100'
        }`}>
          {getTrendIcon(player.trend)}
        </div>
      </div>
      
      {/* Player Info with Enhanced Typography */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">
          {player.name}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-semibold">{player.team}</span>
          <span className="text-gray-400">vs</span>
          <span>{player.opponent}</span>
        </div>
      </div>
      
      {/* Enhanced Stats Grid with Visual Bars */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1">Projection</p>
          <p className="text-xl font-bold text-gray-900 mb-1">{player.projection}</p>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{width: `${(player.projection / 30) * 100}%`}}></div>
          </div>
        </div>
        
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1">Avg Points</p>
          <p className="text-xl font-bold text-gray-900 mb-1">{player.avgPoints}</p>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{width: `${(player.avgPoints / 25) * 100}%`}}></div>
          </div>
        </div>
        
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1">Ownership</p>
          <p className="text-xl font-bold text-gray-900 mb-1">{player.ownership}%</p>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{width: `${player.ownership}%`}}></div>
          </div>
        </div>
        
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              player.status === 'healthy' ? 'bg-green-500' :
              player.status === 'questionable' ? 'bg-orange-500' :
              'bg-red-500'
            }`}></div>
            <span className={`text-sm font-semibold ${getStatusColor(player.status).replace('bg-', 'text-').replace('-50', '-600')}`}>
              {player.status === 'healthy' ? 'Healthy' : player.status === 'questionable' ? 'Questionable' : 'Out'}
            </span>
          </div>
        </div>
      </div>
      
      {/* League Ownership Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>League Ownership</span>
          <span>{player.leagueOwnership}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
            style={{width: `${player.leagueOwnership}%`}}
          ></div>
        </div>
      </div>

      {/* Social Interactions */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLiked(!isLiked)}
            className={`flex items-center gap-1 transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{player.likes + (isLiked ? 1 : 0)}</span>
          </button>
          
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{player.notes}</span>
          </button>
          
          <button className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        
        <button 
          onClick={() => setIsWatchlisted(!isWatchlisted)}
          className={`p-1.5 rounded-full transition-all ${
            isWatchlisted 
              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
              : 'bg-gray-100 text-gray-500 hover:bg-yellow-100 hover:text-yellow-600'
          }`}
        >
          <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Enhanced Action Buttons */}
      <div className="flex gap-3">
        <button className="btn-gradient flex-1 flex items-center justify-center gap-2 touch-feedback">
          <Plus className="w-4 h-4" />
          <span>Add Player</span>
        </button>
        
        <button className="glass-card px-4 py-3 flex items-center justify-center hover:scale-105 transition-all duration-200 touch-feedback">
          <Eye className="w-4 h-4 text-green-600" />
        </button>
      </div>
      
      {/* Live Score Indicator (if applicable) */}
      {player.trend === 'up' && (
        <div className="absolute top-4 right-4">
          <div className="update-indicator"></div>
        </div>
      )}
    </div>
  );
};

export default function PlayersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [sortBy, setSortBy] = useState('rank');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [recentUpdates, setRecentUpdates] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState({
    minProjection: 0,
    maxProjection: 100,
    minOwnership: 0,
    maxOwnership: 100,
    status: 'all', // all, healthy, questionable, out
    trend: 'all', // all, up, down, stable
    showFavorites: false
  });
  
  // Mobile detection and gesture handling
  const { isMobile, isTablet } = useBreakpoint();
  const isTouch = useTouchDevice();
  
  // Swipe gestures for mobile navigation
  const swipeHandlers = useSwipeGesture(
    () => {
      // Swipe left - next position filter
      const currentIndex = POSITIONS.findIndex(pos => pos.value === selectedPosition);
      const nextIndex = (currentIndex + 1) % POSITIONS.length;
      setSelectedPosition(POSITIONS[nextIndex].value);
    },
    () => {
      // Swipe right - previous position filter
      const currentIndex = POSITIONS.findIndex(pos => pos.value === selectedPosition);
      const prevIndex = currentIndex === 0 ? POSITIONS.length - 1 : currentIndex - 1;
      setSelectedPosition(POSITIONS[prevIndex].value);
    },
    () => {
      // Swipe up - hide filters
      if (isMobile) setShowFilters(false);
    },
    () => {
      // Swipe down - show filters
      if (isMobile) setShowFilters(true);
    }
  );

  // Debounced search for instant results
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setLastUpdated(new Date());
      
      // Randomly update player stats
      const randomPlayer = mockPlayers[Math.floor(Math.random() * mockPlayers.length)];
      const updates = [
        `${randomPlayer.name} projection updated`,
        `${randomPlayer.name} status changed`,
        `Live scoring update for ${randomPlayer.name}`,
        `${randomPlayer.name} trending up`
      ];
      
      setRecentUpdates(prev => {
        const newUpdate = updates[Math.floor(Math.random() * updates.length)];
        return [newUpdate, ...prev].slice(0, 3);
      });
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, [isLiveMode]);

  const filteredPlayers = useMemo(() => {
    return mockPlayers
      .filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            player.position.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            player.team.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition;
        const matchesTeam = selectedTeam === 'ALL' || player.team === selectedTeam;
        
        // Advanced filters
        const matchesProjection = player.projection >= advancedFilters.minProjection && 
                                 player.projection <= advancedFilters.maxProjection;
        const matchesOwnership = player.ownership >= advancedFilters.minOwnership && 
                               player.ownership <= advancedFilters.maxOwnership;
        const matchesStatus = advancedFilters.status === 'all' || player.status === advancedFilters.status;
        const matchesTrend = advancedFilters.trend === 'all' || player.trend === advancedFilters.trend;
        
        return matchesSearch && matchesPosition && matchesTeam && 
               matchesProjection && matchesOwnership && matchesStatus && matchesTrend;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'rank': return a.rank - b.rank;
          case 'points': return b.points - a.points;
          case 'projection': return b.projection - a.projection;
          case 'ownership': return b.ownership - a.ownership;
          default: return 0;
        }
      });
  }, [debouncedSearchTerm, selectedPosition, selectedTeam, sortBy, advancedFilters]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const players = filteredPlayers;
    const totalPlayers = players.length;
    
    return {
      totalPlayers,
      avgProjection: totalPlayers > 0 ? (players.reduce((acc, p) => acc + p.projection, 0) / totalPlayers).toFixed(1) : '0.0',
      avgOwnership: totalPlayers > 0 ? (players.reduce((acc, p) => acc + p.ownership, 0) / totalPlayers).toFixed(1) : '0.0',
      topPerformers: players.filter(p => p.trend === 'up').length,
      healthyConcerns: players.filter(p => p.status !== 'healthy').length,
      highValueTargets: players.filter(p => p.projection > 18 && p.ownership < 70).length,
      positionBreakdown: POSITIONS.slice(1).map(pos => ({
        position: pos.label,
        count: players.filter(p => p.position === pos.value).length,
        avgProjection: players.filter(p => p.position === pos.value).length > 0 
          ? (players.filter(p => p.position === pos.value).reduce((acc, p) => acc + p.projection, 0) / 
             players.filter(p => p.position === pos.value).length).toFixed(1) 
          : '0.0'
      })),
      trendingPlayers: players.filter(p => p.trend === 'up').slice(0, 3),
      sleepers: players.filter(p => p.projection > 15 && p.ownership < 50).slice(0, 3)
    };
  }, [filteredPlayers]);

  return (
    <div 
      className="min-h-screen bg-gray-50"
      {...(isTouch ? swipeHandlers : {})}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Players</h1>
              <p className="text-gray-600 mt-1">Browse and add players to your team</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  showAnalytics 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Analytics Sidebar */}
        {showAnalytics && (
          <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-xl z-30 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <ChevronDown className="w-5 h-5 rotate-90" />
                </button>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.avgProjection}</div>
                  <div className="text-xs text-gray-600">Avg Projection</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{analytics.avgOwnership}%</div>
                  <div className="text-xs text-gray-600">Avg Ownership</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.topPerformers}</div>
                  <div className="text-xs text-gray-600">Trending Up</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{analytics.healthyConcerns}</div>
                  <div className="text-xs text-gray-600">Health Concerns</div>
                </div>
              </div>

              {/* Value Targets */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  High-Value Targets
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-lg font-bold text-green-700">{analytics.highValueTargets}</div>
                  <div className="text-sm text-green-600">Players with 18+ projection & &lt;70% ownership</div>
                </div>
              </div>

              {/* Position Breakdown */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-600" />
                  Position Distribution
                </h3>
                <div className="space-y-2">
                  {analytics.positionBreakdown.map((pos, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{pos.position}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">{pos.count}</span>
                        <span className="text-green-600 font-medium">{pos.avgProjection}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Players */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  Trending Players
                </h3>
                <div className="space-y-2">
                  {analytics.trendingPlayers.map((player, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
                      <span className="font-medium text-gray-900">{player.name}</span>
                      <span className="text-green-600">{player.projection}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sleeper Picks */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Sleeper Picks
                </h3>
                <div className="space-y-2">
                  {analytics.sleepers.map((player, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-purple-50 p-2 rounded">
                      <span className="font-medium text-gray-900">{player.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-600">{player.projection}</span>
                        <span className="text-xs text-gray-500">{player.ownership}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${
          showAnalytics ? 'mr-80' : ''
        }`}>
        {/* Premium Search & Filters */}
        <div className={`glass-card p-6 mb-8 search-section-premium transition-all duration-300 ${
          isMobile && !showFilters ? 'max-h-16 overflow-hidden' : 'max-h-none'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Search & Filter Players</h2>
            </div>
            {isMobile && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 transition-colors"
              >
                <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Enhanced Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Search Players</label>
              <div className="relative search-bar-enhanced">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                <input
                  type="text"
                  placeholder="Search by name, position, or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 text-gray-900 placeholder-gray-500 font-medium"
                />
                {searchTerm && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
                {debouncedSearchTerm !== searchTerm && (
                  <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                    <div className="w-1 h-1 bg-orange-500 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Position Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Position</label>
              <div className="relative">
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="select-enhanced w-full"
                >
                  {POSITIONS.map(pos => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Enhanced Team Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Team</label>
              <div className="relative">
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="select-enhanced w-full"
                >
                  {NFL_TEAMS.map(team => (
                    <option key={team} value={team}>{team === 'ALL' ? 'All Teams' : team}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Advanced Sort & View Options */}
          <div className="flex flex-wrap items-center justify-between mt-6 pt-6 border-t border-gray-200/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="select-compact"
                  >
                    <option value="rank">Overall Rank</option>
                    <option value="points">Total Points</option>
                    <option value="projection">Projection</option>
                    <option value="ownership">Ownership %</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <button 
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all ${
                  isLiveMode 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                <span>{isLiveMode ? 'Live Updates' : 'Paused'}</span>
              </button>
              
              {/* Advanced Filter Toggles */}
              <button 
                className={`btn-filter ${advancedFilters.trend === 'up' ? 'active' : ''}`}
                onClick={() => setAdvancedFilters(prev => ({
                  ...prev,
                  trend: prev.trend === 'up' ? 'all' : 'up'
                }))}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Trending</span>
              </button>
              
              <button 
                className={`btn-filter ${advancedFilters.status === 'healthy' ? 'active' : ''}`}
                onClick={() => setAdvancedFilters(prev => ({
                  ...prev,
                  status: prev.status === 'healthy' ? 'all' : 'healthy'
                }))}
              >
                <span>Healthy Only</span>
              </button>
              
              <button 
                className={`btn-filter ${advancedFilters.showFavorites ? 'active' : ''}`}
                onClick={() => setAdvancedFilters(prev => ({
                  ...prev,
                  showFavorites: !prev.showFavorites
                }))}
              >
                <Star className="w-3 h-3" />
                <span>Favorites</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <p className="text-lg font-semibold text-gray-900">
                {filteredPlayers.length} {filteredPlayers.length === 1 ? 'Player' : 'Players'} Found
              </p>
            </div>
            {filteredPlayers.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            {recentUpdates.length > 0 && (
              <div className="hidden lg:block">
                <div className="text-xs text-gray-500 mb-1">Recent Updates:</div>
                <div className="space-y-1">
                  {recentUpdates.map((update, index) => (
                    <div 
                      key={index} 
                      className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded animate-fade-in"
                    >
                      {update}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Mobile Gesture Hint */}
            {isMobile && isTouch && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                <span>💫</span>
                <span>Swipe left/right to filter by position</span>
              </div>
            )}
            
            {/* League Community Stats */}
            <div className="hidden lg:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span>League Activity:</span>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <Heart className="w-3 h-3" />
                <span>{filteredPlayers.reduce((acc, p) => acc + p.likes, 0)} likes</span>
              </div>
              <div className="flex items-center gap-1 text-blue-600">
                <MessageCircle className="w-3 h-3" />
                <span>{filteredPlayers.reduce((acc, p) => acc + p.notes, 0)} discussions</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-600">
                <Star className="w-3 h-3" />
                <span>{filteredPlayers.filter(p => p.isWatched).length} watchlisted</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="btn-secondary-small">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="btn-secondary-small">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Advanced</span>
            </button>
          </div>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlayers.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="glass-card text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No players found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We couldn't find any players matching your criteria. Try adjusting your search terms or filters.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedPosition('ALL');
                  setSelectedTeam('ALL');
                }}
                className="btn-secondary"
              >
                Clear All Filters
              </button>
              <button className="btn-outline">
                <Plus className="w-4 h-4 mr-2" />
                Suggest a Player
              </button>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}