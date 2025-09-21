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
    // Mock waiver players data - replace with API call
    const mockPlayers: Player[] = [
      {
        id: '1',
        name: 'Gabe Davis',
        position: 'WR',
        nflTeam: 'BUF',
        fantasyPoints: 12.4,
        availability: 'available',
        projectedPoints: 14.2
      },
      {
        id: '2',
        name: 'Kenneth Walker III',
        position: 'RB',
        nflTeam: 'SEA',
        fantasyPoints: 18.7,
        availability: 'waivers',
        projectedPoints: 16.8
      },
      {
        id: '3',
        name: 'Romeo Doubs',
        position: 'WR',
        nflTeam: 'GB',
        fantasyPoints: 8.3,
        availability: 'available',
        projectedPoints: 10.1
      },
      {
        id: '4',
        name: 'Tyler Higbee',
        position: 'TE',
        nflTeam: 'LAR',
        fantasyPoints: 7.2,
        availability: 'available',
        projectedPoints: 8.5
      }
    ];

    // Simulate API call
    setTimeout(() => {
      setPlayers(mockPlayers);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.nflTeam.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
    return matchesSearch && matchesPosition;
  });

  const handleAddPlayer = async (playerId: string) => {
    // Implement waiver claim logic
    // TODO: Add API call to create waiver claim
    setPlayers(players.map(p => 
      p.id === playerId 
        ? { ...p, availability: 'claimed' as const }
        : p
    ));
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Target className="h-8 w-8 text-green-600 mr-3" />
                Waiver Wire
              </h1>
              <p className="text-gray-600 mt-2">
                Add and drop players to improve your team
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-sm text-gray-500">Waiver Period</div>
              <div className="text-lg font-bold text-gray-900">Tue 11:59 PM</div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border p-6"
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">47</div>
                <div className="text-sm text-gray-500">Available Players</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border p-6"
          >
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">3</div>
                <div className="text-sm text-gray-500">Pending Claims</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border p-6"
          >
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">6</div>
                <div className="text-sm text-gray-500">Waiver Priority</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-4">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Positions</option>
                <option value="QB">Quarterback</option>
                <option value="RB">Running Back</option>
                <option value="WR">Wide Receiver</option>
                <option value="TE">Tight End</option>
                <option value="K">Kicker</option>
                <option value="DST">Defense</option>
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
            <div className="divide-y divide-gray-200">
              {filteredPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
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
                      <button
                        onClick={() => handleAddPlayer(player.id)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add</span>
                      </button>
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