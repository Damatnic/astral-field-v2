'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Clock, 
  Users, 
  Search, 
  Star, 
  AlertTriangle, 
  Play, 
  Pause, 
  SkipForward,
  Filter,
  CheckCircle,
  XCircle,
  Timer,
  Target,
  TrendingUp,
  Activity
} from 'lucide-react';
import { handleComponentError } from '@/lib/error-handling';

interface DraftTeam {
  id: string;
  name: string;
  userId: string;
  draftPosition: number;
}

interface DraftPick {
  id: string;
  round: number;
  pick: number;
  overallPick: number;
  teamId: string;
  teamName: string;
  playerId: string;
  playerName: string;
  playerPosition: string;
  playerTeam?: string;
}

interface AvailablePlayer {
  id: string;
  name: string;
  position: string;
  nflTeam?: string;
  adp?: number;
  searchRank?: number;
  injuryStatus?: string;
}

interface DraftData {
  draft: {
    id: string;
    status: string;
    currentRound: number;
    currentPick: number;
    currentTeamId: string;
    totalRounds: number;
    pickTimeLimit: number;
  };
  teams: DraftTeam[];
  picks: DraftPick[];
  availablePlayers: AvailablePlayer[];
  nextPicks: Array<{
    round: number;
    pick: number;
    teamId: string;
    overallPick: number;
  }>;
}

export default function DraftRoomPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;
  
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<AvailablePlayer | null>(null);
  const [makingPick, setMakingPick] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDraftData();
    setupLiveUpdates();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [draftId]);

  useEffect(() => {
    if (draftData && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, draftData]);

  const fetchDraftData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/draft/${draftId}/board`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setDraftData(data);
        setTimeRemaining(data.draft.pickTimeLimit || 120);
        
        // Check if it's the current user's turn
        const currentUser = await getCurrentUser();
        const currentTeam = data.teams.find((team: DraftTeam) => team.id === data.draft.currentTeamId);
        setIsMyTurn(currentUser && currentTeam && currentUser.id === currentTeam.userId);
      } else {
        setError(data.error || 'Failed to load draft data');
      }
    } catch (error) {
      setError('Error loading draft data');
      handleComponentError(error as Error, 'component');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      return data.success ? data.user : null;
    } catch {
      return null;
    }
  };

  const setupLiveUpdates = () => {
    eventSourceRef.current = new EventSource(`/api/draft/${draftId}/live`);
    
    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'pick_made':
            fetchDraftData(); // Refresh the board
            break;
          case 'draft_complete':
            setDraftData(prev => prev ? { ...prev, draft: { ...prev.draft, status: 'COMPLETED' } } : null);
            break;
          case 'heartbeat':
            // Keep connection alive
            break;
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };

    eventSourceRef.current.onerror = () => {
      // Reconnect after a delay
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          setupLiveUpdates();
        }
      }, 5000);
    };
  };

  const makeDraftPick = async (playerId: string) => {
    if (!isMyTurn || makingPick) return;
    
    try {
      setMakingPick(true);
      const response = await fetch(`/api/draft/${draftId}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playerId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedPlayer(null);
        fetchDraftData(); // Refresh board
      } else {
        setError(data.error || 'Failed to make pick');
      }
    } catch (error) {
      setError('Error making pick');
      handleComponentError(error as Error, 'component');
    } finally {
      setMakingPick(false);
    }
  };

  const filteredPlayers = draftData?.availablePlayers.filter(player => {
    const matchesSearch = searchQuery === '' || 
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.nflTeam?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
    
    return matchesSearch && matchesPosition;
  }) || [];

  const getPositionColor = (position: string) => {
    const colors: { [key: string]: string } = {
      'QB': 'bg-red-100 text-red-800',
      'RB': 'bg-green-100 text-green-800',
      'WR': 'bg-blue-100 text-blue-800',
      'TE': 'bg-yellow-100 text-yellow-800',
      'K': 'bg-purple-100 text-purple-800',
      'DST': 'bg-gray-100 text-gray-800'
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading draft room...</p>
        </div>
      </div>
    );
  }

  if (error || !draftData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Draft Room Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/draft')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Drafts
          </button>
        </div>
      </div>
    );
  }

  const currentTeam = draftData.teams.find(team => team.id === draftData.draft.currentTeamId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Draft Room</h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Round {draftData.draft.currentRound}</span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600">Pick {draftData.draft.currentPick}</span>
                {draftData.draft.status === 'IN_PROGRESS' && (
                  <>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center space-x-1">
                      <Timer className="h-4 w-4 text-red-500" />
                      <span className={`text-sm font-medium ${timeRemaining <= 30 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isMyTurn && draftData.draft.status === 'IN_PROGRESS' && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Your Turn!
                </div>
              )}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                draftData.draft.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                draftData.draft.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {draftData.draft.status.replace('_', ' ')}
              </div>
            </div>
          </div>
          
          {currentTeam && draftData.draft.status === 'IN_PROGRESS' && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>Currently drafting: <span className="font-medium">{currentTeam.name}</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Players */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Available Players</h3>
                  <div className="text-sm text-gray-500">
                    {filteredPlayers.length} players available
                  </div>
                </div>
                
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ALL">All Positions</option>
                    <option value="QB">QB</option>
                    <option value="RB">RB</option>
                    <option value="WR">WR</option>
                    <option value="TE">TE</option>
                    <option value="K">K</option>
                    <option value="DST">DST</option>
                  </select>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedPlayer?.id === player.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-500 w-8">{index + 1}</div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{player.name}</span>
                            <span className={`px-2 py-1 text-xs rounded ${getPositionColor(player.position)}`}>
                              {player.position}
                            </span>
                            {player.nflTeam && (
                              <span className="text-sm text-gray-600">{player.nflTeam}</span>
                            )}
                          </div>
                          {player.injuryStatus && player.injuryStatus !== 'HEALTHY' && (
                            <div className="flex items-center space-x-1 mt-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              <span className="text-xs text-red-600">{player.injuryStatus}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {player.adp && (
                          <div className="text-center">
                            <div className="text-xs text-gray-400">ADP</div>
                            <div>{player.adp.toFixed(1)}</div>
                          </div>
                        )}
                        {isMyTurn && draftData.draft.status === 'IN_PROGRESS' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              makeDraftPick(player.id);
                            }}
                            disabled={makingPick}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {makingPick ? 'Picking...' : 'Draft'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Draft Board and Team Info */}
          <div className="space-y-6">
            {/* Current Pick Info */}
            {currentTeam && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">On the Clock</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Team:</span>
                    <span className="font-medium">{currentTeam.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pick:</span>
                    <span className="font-medium">
                      {draftData.draft.currentRound}.{draftData.draft.currentPick}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overall:</span>
                    <span className="font-medium">
                      #{(draftData.draft.currentRound - 1) * draftData.teams.length + draftData.draft.currentPick}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Next Picks */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Coming Up</h3>
              <div className="space-y-2">
                {draftData.nextPicks.slice(0, 5).map((pick, index) => {
                  const team = draftData.teams.find(t => t.id === pick.teamId);
                  return (
                    <div key={`${pick.round}-${pick.pick}`} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {pick.round}.{pick.pick}
                      </span>
                      <span className="font-medium">{team?.name}</span>
                      <span className="text-gray-500">#{pick.overallPick}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Picks */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Picks</h3>
              <div className="space-y-3">
                {draftData.picks.slice(-5).reverse().map((pick) => (
                  <div key={pick.id} className="flex items-center space-x-3 text-sm">
                    <div className="text-gray-500 w-12">
                      {pick.round}.{pick.pick}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{pick.playerName}</div>
                      <div className="text-gray-600">{pick.teamName}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${getPositionColor(pick.playerPosition)}`}>
                      {pick.playerPosition}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Draft Progress */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Draft Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Picks Made:</span>
                  <span className="font-medium">
                    {draftData.picks.length} / {draftData.draft.totalRounds * draftData.teams.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(draftData.picks.length / (draftData.draft.totalRounds * draftData.teams.length)) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}