'use client';

import { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, TrendingDown, AlertTriangle,
  Save, RotateCcw, ChevronRight, Star,
  ArrowUp, ArrowDown, CheckCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

// Position configuration
const ROSTER_SLOTS = {
  QB: { min: 1, max: 1, name: 'Quarterback' },
  RB: { min: 2, max: 2, name: 'Running Back' },
  WR: { min: 2, max: 2, name: 'Wide Receiver' },
  TE: { min: 1, max: 1, name: 'Tight End' },
  FLEX: { min: 1, max: 1, name: 'Flex (RB/WR/TE)' },
  K: { min: 1, max: 1, name: 'Kicker' },
  DST: { min: 1, max: 1, name: 'Defense/ST' },
  BENCH: { min: 0, max: 7, name: 'Bench' },
};

interface RosterPlayer {
  id: string;
  playerId: string;
  name: string;
  position: string;
  team: string;
  rosterSlot: string;
  status: string;
  injuryStatus?: string;
  byeWeek?: number;
  projectedPoints: number;
  lastWeekPoints: number;
  averagePoints: number;
  isLocked?: boolean;
}

interface RosterData {
  success: boolean;
  roster: RosterPlayer[];
  rosterByPosition: Record<string, RosterPlayer[]>;
  teamId: string;
  teamName: string;
  league: { id: string; name: string };
}

const PlayerCard = ({ player, isBench = false, onDragStart, onDragOver, onDrop }: { 
  player: RosterPlayer; 
  isBench?: boolean; 
  onDragStart?: (e: React.DragEvent, player: RosterPlayer) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetSlot: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'questionable': return 'text-orange-600 bg-orange-50';
      case 'out': return 'text-red-600 bg-red-50';
      case 'doubtful': return 'text-red-600 bg-red-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

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

  return (
    <div 
      className={`bg-white rounded-lg border ${isBench ? 'border-gray-200' : 'border-l-4 border-l-green-500 border-gray-200'} p-4 hover:shadow-md transition-shadow cursor-move`}
      draggable
      onDragStart={(e) => onDragStart?.(e, player)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e); }}
      onDrop={(e) => onDrop?.(e, player.rosterSlot)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getPositionColor(player.position)}`}>
              {player.position}
            </span>
            {!isBench && (
              <span className="text-xs font-medium text-gray-500">
                {player.rosterSlot}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900">{player.name}</h3>
          <p className="text-sm text-gray-600">{player.team}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(player.status)}`}>
              {player.injuryStatus || (player.status === 'ACTIVE' ? 'Healthy' : player.status)}
            </span>
            <span className="text-sm text-gray-700">
              Proj: <strong>{player.projectedPoints?.toFixed(1) || '0.0'}</strong>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <button className="text-gray-400 hover:text-gray-600 p-1">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function RosterPage() {
  const { user } = useAuth();
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState<RosterPlayer | null>(null);

  // Fetch roster data on component mount
  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const response = await fetch('/api/roster');
        const data = await response.json();
        
        if (data.success) {
          setRosterData(data);
        } else {
          toast.error('Failed to load roster');
        }
      } catch (error) {
        console.error('Error fetching roster:', error);
        toast.error('Failed to load roster');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRoster();
    } else {
      setLoading(false);
    }
  }, [user]);

  const starters = rosterData?.roster?.filter(p => p.rosterSlot !== 'BENCH') || [];
  const bench = rosterData?.roster?.filter(p => p.rosterSlot === 'BENCH') || [];
  
  const totalProjection = rosterData?.roster?.reduce((sum, player) => sum + (player.projectedPoints || 0), 0) || 0;
  const starterProjection = starters.reduce((sum, player) => sum + (player.projectedPoints || 0), 0);
  
  const healthyCount = rosterData?.roster?.filter(p => p.status === 'ACTIVE').length || 0;
  const questionableCount = rosterData?.roster?.filter(p => ['QUESTIONABLE', 'DOUBTFUL'].includes(p.status)).length || 0;

  const handleDragStart = (e: React.DragEvent, player: RosterPlayer) => {
    setDraggedPlayer(player);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSlot: string) => {
    e.preventDefault();
    
    if (!draggedPlayer || !rosterData) return;
    
    // Prevent dropping in the same position
    if (draggedPlayer.rosterSlot === targetSlot) {
      setDraggedPlayer(null);
      return;
    }
    
    // Simple position validation
    const validPositions: Record<string, string[]> = {
      'QB': ['QB'],
      'RB': ['RB', 'FLEX'],
      'WR': ['WR', 'FLEX'],
      'TE': ['TE', 'FLEX'],
      'K': ['K'],
      'DST': ['DST'],
      'BENCH': ['BENCH']
    };
    
    if (!validPositions[draggedPlayer.position]?.includes(targetSlot) && targetSlot !== 'BENCH') {
      toast.error(`${draggedPlayer.position} cannot be placed in ${targetSlot} position`);
      setDraggedPlayer(null);
      return;
    }
    
    // Update roster locally
    const updatedRoster = rosterData.roster.map(player => {
      if (player.id === draggedPlayer.id) {
        return { ...player, rosterSlot: targetSlot };
      }
      // If there's a player in the target position and it's not bench, swap them
      if (player.rosterSlot === targetSlot && targetSlot !== 'BENCH') {
        return { ...player, rosterSlot: draggedPlayer.rosterSlot };
      }
      return player;
    });
    
    setRosterData({
      ...rosterData,
      roster: updatedRoster
    });
    
    setHasChanges(true);
    setDraggedPlayer(null);
    toast.success(`Moved ${draggedPlayer.name} to ${targetSlot}`);
  };

  const saveLineup = async () => {
    if (!rosterData || !hasChanges) return;
    
    setSaving(true);
    try {
      // Create roster moves array for API
      const rosterMoves = rosterData.roster.map(player => ({
        rosterId: player.id,
        newPosition: player.rosterSlot
      }));
      
      const response = await fetch('/api/roster', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterMoves })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Lineup saved successfully!');
        setHasChanges(false);
      } else {
        toast.error('Failed to save lineup');
      }
    } catch (error) {
      console.error('Error saving lineup:', error);
      toast.error('Failed to save lineup');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h1>
          <p className="text-gray-600">Please log in to manage your roster.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your roster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{rosterData?.teamName || 'My Team'}</h1>
              <p className="text-gray-600 mt-1">{rosterData?.league.name || 'Fantasy League'}</p>
            </div>
            <div className="flex items-center gap-4">
              {hasChanges && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setHasChanges(false)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button className="btn-primary" onClick={saveLineup} disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Lineup
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Full</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{starters.length}/9</p>
              <p className="text-sm text-gray-600">Starting Lineup</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">+5.2</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{starterProjection.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Projected Points</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{healthyCount}</p>
              <p className="text-sm text-gray-600">Healthy Players</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{questionableCount}</p>
              <p className="text-sm text-gray-600">Questionable</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Starting Lineup */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Starting Lineup</h2>
                <p className="text-sm text-gray-600">Set your optimal lineup</p>
              </div>
              <div className="p-6 space-y-3">
                {starters.map((player) => (
                  <PlayerCard 
                    key={player.id} 
                    player={player} 
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bench */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Bench</h2>
                <p className="text-sm text-gray-600">{bench.length} players</p>
              </div>
              <div className="p-6 space-y-3">
                {bench.map((player) => (
                  <PlayerCard 
                    key={player.id} 
                    player={player} 
                    isBench 
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card mt-6">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-2">
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-between group">
                  <span className="text-sm text-gray-700">Optimize Lineup</span>
                  <Star className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-between group">
                  <span className="text-sm text-gray-700">View Projections</span>
                  <TrendingUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-between group">
                  <span className="text-sm text-gray-700">Add/Drop Players</span>
                  <Users className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}