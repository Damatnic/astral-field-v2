/**
 * League Analytics - Dynasty league rankings and competitive intelligence
 * Elite competitive analysis platform for championship pursuit
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Users, TrendingUp, TrendingDown, Crown, Shield,
  Target, Activity, BarChart3, Eye, Zap, Star, Brain,
  Calendar, Clock, Award, Flame, Sparkles, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, Search
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Mock league data with enhanced analytics
const mockLeagues = [
  {
    id: '1',
    name: 'Elite Dynasty Championship',
    type: 'Dynasty',
    teams: 12,
    scoring: 'PPR',
    buyIn: 250,
    totalPot: 3000,
    season: 2025,
    week: 3,
    commissionerRating: 9.8,
    competitiveIndex: 96,
    activity: 'Very High',
    difficulty: 'Elite',
    payoutStructure: '60/25/15',
    tradingVolume: 'High',
    waiverActivity: 'Active',
    avgTeamValue: 1250,
    topTeam: 'Quantum Dynasty',
    standings: [
      { rank: 1, team: 'Quantum Dynasty', owner: 'Alex', record: '3-0', points: 412.5, change: 0 },
      { rank: 2, team: 'Cosmic Force', owner: 'Sarah', record: '2-1', points: 398.2, change: 1 },
      { rank: 3, team: 'Nebula Warriors', owner: 'Mike', record: '2-1', points: 387.8, change: -1 },
      { rank: 4, team: 'Stellar Command', owner: 'You', record: '2-1', points: 385.3, change: 2 }
    ]
  },
  {
    id: '2',
    name: 'Cosmic Redraft League',
    type: 'Redraft',
    teams: 10,
    scoring: 'Half PPR',
    buyIn: 100,
    totalPot: 1000,
    season: 2025,
    week: 3,
    commissionerRating: 8.9,
    competitiveIndex: 84,
    activity: 'High',
    difficulty: 'Competitive',
    payoutStructure: '50/30/20',
    tradingVolume: 'Medium',
    waiverActivity: 'Very Active',
    avgTeamValue: 850,
    topTeam: 'Astral Legends',
    standings: [
      { rank: 1, team: 'Astral Legends', owner: 'Jordan', record: '3-0', points: 356.7, change: 0 },
      { rank: 2, team: 'Galaxy Raiders', owner: 'Chris', record: '2-1', points: 342.1, change: 1 },
      { rank: 3, team: 'Void Hunters', owner: 'Taylor', record: '2-1', points: 339.8, change: -1 },
      { rank: 4, team: 'Your Squad', owner: 'You', record: '1-2', points: 298.5, change: 0 }
    ]
  },
  {
    id: '3',
    name: 'Championship Dynasty Pro',
    type: 'Dynasty',
    teams: 14,
    scoring: 'PPR + TEP',
    buyIn: 500,
    totalPot: 7000,
    season: 2025,
    week: 3,
    commissionerRating: 9.5,
    competitiveIndex: 98,
    activity: 'Extreme',
    difficulty: 'Professional',
    payoutStructure: '50/25/15/10',
    tradingVolume: 'Very High',
    waiverActivity: 'Competitive',
    avgTeamValue: 2100,
    topTeam: 'Dynasty Elite',
    standings: [
      { rank: 1, team: 'Dynasty Elite', owner: 'Marcus', record: '3-0', points: 456.8, change: 0 },
      { rank: 2, team: 'Pro Command', owner: 'Lisa', record: '3-0', points: 445.2, change: 1 },
      { rank: 3, team: 'Championship Core', owner: 'David', record: '2-1', points: 421.6, change: -1 }
    ]
  }
];

// League activity indicators
const getActivityColor = (activity: string) => {
  switch (activity) {
    case 'Extreme': return 'text-astral-supernova-400 bg-astral-supernova-400/20 border-astral-supernova-400/30';
    case 'Very High': return 'text-astral-gold-400 bg-astral-gold-400/20 border-astral-gold-400/30';
    case 'High': return 'text-astral-cosmic-400 bg-astral-cosmic-400/20 border-astral-cosmic-400/30';
    case 'Medium': return 'text-astral-nebula-400 bg-astral-nebula-400/20 border-astral-nebula-400/30';
    default: return 'text-astral-quantum-400 bg-astral-quantum-400/20 border-astral-quantum-400/30';
  }
};

// Difficulty tier colors
const getDifficultyGradient = (difficulty: string) => {
  switch (difficulty) {
    case 'Professional': return 'from-astral-supernova-500 to-astral-gold-600';
    case 'Elite': return 'from-astral-gold-500 to-astral-cosmic-600';
    case 'Competitive': return 'from-astral-cosmic-500 to-astral-nebula-600';
    case 'Casual': return 'from-astral-nebula-500 to-astral-quantum-600';
    default: return 'from-astral-cosmic-500 to-astral-quantum-600';
  }
};

// Enhanced league card component
const LeagueCard = ({ league, onViewDetails }: any) => {
  const difficultyGradient = getDifficultyGradient(league.difficulty);
  const userTeam = league.standings.find((team: any) => team.owner === 'You');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="astral-card-premium group relative overflow-hidden cursor-pointer"
      onClick={() => onViewDetails(league)}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${difficultyGradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500`}></div>
      
      {/* Competitive Index indicator */}
      <div className="absolute top-4 right-4 z-20">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
          league.competitiveIndex >= 95 ? 'bg-astral-supernova-500/20 text-astral-supernova-400 border border-astral-supernova-500/30' :
          league.competitiveIndex >= 85 ? 'bg-astral-gold-500/20 text-astral-gold-400 border border-astral-gold-500/30' :
          league.competitiveIndex >= 75 ? 'bg-astral-cosmic-500/20 text-astral-cosmic-400 border border-astral-cosmic-500/30' :
          'bg-astral-nebula-500/20 text-astral-nebula-400 border border-astral-nebula-500/30'
        }`}>
          <Brain className="w-3 h-3" />
          {league.competitiveIndex}
        </div>
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-white font-orbitron text-xl leading-tight mb-2">
              {league.name}
            </h3>
            
            <div className="flex items-center gap-3 text-sm mb-3">
              <span className={`px-2 py-1 rounded-lg font-medium bg-gradient-to-r ${difficultyGradient} bg-opacity-20 text-white border border-current border-opacity-30`}>
                {league.type}
              </span>
              <span className="text-astral-cosmic-400 font-bold">{league.teams} Teams</span>
              <span className="text-astral-light-shadow">{league.scoring}</span>
            </div>
            
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getActivityColor(league.activity)}`}>
              <Activity className="w-3 h-3" />
              {league.activity} Activity
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-astral-light-shadow mb-1">Week</div>
            <div className="text-2xl font-bold text-white font-orbitron">{league.week}</div>
          </div>
        </div>

        {/* League Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-xs text-astral-light-shadow mb-1">Buy-in</div>
            <div className="text-lg font-bold text-astral-gold-400 font-orbitron">${league.buyIn}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-astral-light-shadow mb-1">Total Pot</div>
            <div className="text-lg font-bold text-astral-cosmic-400 font-orbitron">${league.totalPot}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-astral-light-shadow mb-1">Commissioner</div>
            <div className="text-lg font-bold text-astral-nebula-400 font-orbitron">{league.commissionerRating}/10</div>
          </div>
        </div>

        {/* Your Team Performance */}
        {userTeam && (
          <div className="bg-astral-dark-surface/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-astral-light-shadow mb-1">Your Performance</div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">#{userTeam.rank}</span>
                  <span className="text-astral-cosmic-400">{userTeam.record}</span>
                  <span className="text-astral-light-shadow">{userTeam.points} pts</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {userTeam.change > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-astral-status-healthy" />
                ) : userTeam.change < 0 ? (
                  <ArrowDownRight className="w-4 h-4 text-astral-status-out" />
                ) : (
                  <Minus className="w-4 h-4 text-astral-light-shadow" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Leader */}
        <div className="bg-astral-cosmic-500/10 border border-astral-cosmic-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-astral-light-shadow mb-1">League Leader</div>
              <div className="text-sm font-medium text-white">{league.topTeam}</div>
            </div>
            <Crown className="w-4 h-4 text-astral-gold-400" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// League quick stats component
const QuickStats = ({ leagues }: any) => {
  const totalPot = leagues.reduce((sum: number, league: any) => sum + league.totalPot, 0);
  const avgCompetitive = leagues.reduce((sum: number, league: any) => sum + league.competitiveIndex, 0) / leagues.length;
  const totalTeams = leagues.reduce((sum: number, league: any) => sum + league.teams, 0);

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="astral-card-premium p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-astral-gold-600 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-astral-light-shadow text-sm">Total Prize Pool</p>
            <p className="text-2xl font-bold text-white font-orbitron">${totalPot.toLocaleString()}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="astral-card-premium p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-astral-cosmic-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-astral-light-shadow text-sm">Avg Competition</p>
            <p className="text-2xl font-bold text-white font-orbitron">{avgCompetitive.toFixed(0)}/100</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="astral-card-premium p-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-astral-nebula-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-astral-light-shadow text-sm">Total Dynasties</p>
            <p className="text-2xl font-bold text-white font-orbitron">{totalTeams}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function LeaguesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'competitive' | 'buyIn' | 'pot'>('competitive');
  const router = useRouter();

  // Filter and sort leagues
  const filteredLeagues = useMemo(() => {
    let leagues = [...mockLeagues];
    
    if (filterType !== 'ALL') {
      leagues = leagues.filter(league => league.type === filterType);
    }
    
    if (searchQuery) {
      leagues = leagues.filter(league => 
        league.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    leagues.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'competitive': return b.competitiveIndex - a.competitiveIndex;
        case 'buyIn': return b.buyIn - a.buyIn;
        case 'pot': return b.totalPot - a.totalPot;
        default: return 0;
      }
    });
    
    return leagues;
  }, [searchQuery, filterType, sortBy]);

  const handleViewDetails = (league: any) => {
    router.push(`/leagues/${league.id}`);
  };

  return (
    <div className="min-h-screen bg-astral-dark-void relative overflow-hidden">
      {/* Enhanced background */}
      <div className="futuristic-background">
        <div className="neural-network">
          {Array.from({ length: 15 }, (_, i) => (
            <motion.div
              key={i}
              className="neural-node"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 6 + Math.random() * 2,
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
                League Analytics
              </motion.h1>
              <p className="text-astral-light-shadow font-medium">
                Dynasty league rankings and competitive intelligence
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-astral-light-shadow">Active Leagues</div>
                <div className="text-2xl font-bold text-white font-orbitron">{filteredLeagues.length}</div>
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
                placeholder="Search league dynasties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-astral w-full pl-12 pr-4 py-3 text-lg"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-astral-light-shadow">Type:</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input-astral px-3 py-2 text-sm bg-astral-dark-surface border border-astral-cosmic-500/30"
                >
                  <option value="ALL">All Dynasties</option>
                  <option value="Dynasty">Dynasty Leagues</option>
                  <option value="Redraft">Redraft Leagues</option>
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
                  <option value="competitive">Competition Level</option>
                  <option value="pot">Prize Pool</option>
                  <option value="buyIn">Buy-in Amount</option>
                  <option value="name">League Name</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Quick Stats */}
        <QuickStats leagues={filteredLeagues} />

        {/* League Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          layout
        >
          <AnimatePresence mode="popLayout">
            {filteredLeagues.map((league, index) => (
              <motion.div
                key={league.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: index * 0.1 }
                }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <LeagueCard
                  league={league}
                  onViewDetails={handleViewDetails}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredLeagues.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <BarChart3 className="w-16 h-16 text-astral-cosmic-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white font-orbitron mb-2">
              No Dynasties Found
            </h3>
            <p className="text-astral-light-shadow">
              Adjust your search criteria to find elite competitions
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}