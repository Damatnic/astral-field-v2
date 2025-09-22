'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Search, Filter, Plus, TrendingUp, Clock, Users, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface Player {
  id: string;
  name: string;
  position: string;
  nflTeam: string;
  fantasyPoints: number;
  availability: 'available' | 'claimed' | 'waivers';
  projectedPoints: number;
}

export default function WaiversPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available waiver wire players from API
    const fetchWaiverPlayers = async () => {
      try {
        const response = await fetch('/api/waivers/wire');
        const data = await response.json();
        
        if (data.success && data.data) {
          setPlayers(data.data.map((player: any) => ({
            id: player.id,
            name: player.name,
            position: player.position,
            nflTeam: player.nflTeam || 'FA',
            fantasyPoints: player.fantasyPoints || 0,
            availability: 'available',
            projectedPoints: player.projectedPoints || 0
          })));
        }
      } catch (error) {
        console.error('Error fetching waiver players:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWaiverPlayers();
  }, []);

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.nflTeam.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
    return matchesSearch && matchesPosition;
  });

  const handleAddPlayer = async (playerId: string) => {
    // Create waiver claim via API
    try {
      const response = await fetch('/api/waivers/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          priority: 1,
          dropPlayerId: null // User can select player to drop in UI if needed
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update UI to show player as claimed
        setPlayers(players.map(p => 
          p.id === playerId 
            ? { ...p, availability: 'claimed' as const }
            : p
        ));
      } else {
        console.error('Failed to create waiver claim:', data.error);
      }
    } catch (error) {
      console.error('Error claiming player:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h1>
          <p className="text-gray-600">Please log in to access the waiver wire.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile-Responsive Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mr-2 sm:mr-3" />
                Waiver Wire
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
                Add and drop players to improve your team
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
              <div className="text-xs sm:text-sm text-gray-500">Waiver Period</div>
              <div className="text-base sm:text-lg font-bold text-gray-900">Tue 11:59 PM</div>
            </div>
          </div>
        </motion.div>

        {/* Mobile-Responsive Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border p-4 sm:p-6"
          >
            <div className="flex items-center">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              <div className="ml-3 sm:ml-4 min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">47</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">Available Players</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border p-4 sm:p-6"
          >
            <div className="flex items-center">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
              <div className="ml-3 sm:ml-4 min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">3</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">Pending Claims</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border p-4 sm:p-6"
          >
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
              <div className="ml-3 sm:ml-4 min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">6</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">Waiver Priority</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile-Responsive Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
              />
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-3 py-3 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation min-w-0"
              >
                <option value="ALL">All Positions</option>
                <option value="QB">Quarterback</option>
                <option value="RB">Running Back</option>
                <option value="WR">Wide Receiver</option>
                <option value="TE">Tight End</option>
                <option value="K">Kicker</option>
                <option value="DEF">Defense</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Players List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Available Players</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading players...</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-gray-200">
              {filteredPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="bg-white sm:bg-transparent rounded-lg sm:rounded-none p-4 sm:p-6 shadow-sm sm:shadow-none border sm:border-0 hover:bg-gray-50 transition-all touch-manipulation"
                >
                  {/* Mobile Card Layout */}
                  <div className="sm:hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-gray-600">{player.position}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate">{player.name}</h3>
                          <p className="text-sm text-gray-500">{player.position} • {player.nflTeam}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        player.availability === 'available' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {player.availability}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-6">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{player.fantasyPoints}</div>
                          <div className="text-xs text-gray-500">Last Week</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{player.projectedPoints}</div>
                          <div className="text-xs text-gray-500">Projected</div>
                        </div>
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddPlayer(player.id)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Desktop Table Layout */}
                  <div className="hidden sm:flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-600">{player.position}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{player.name}</h3>
                        <p className="text-sm text-gray-500">{player.position} • {player.nflTeam}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{player.fantasyPoints}</div>
                        <div className="text-xs text-gray-500">Last Week</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{player.projectedPoints}</div>
                        <div className="text-xs text-gray-500">Projected</div>
                      </div>
                      <div className="text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          player.availability === 'available' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {player.availability}
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddPlayer(player.id)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}