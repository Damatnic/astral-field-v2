'use client';

import { useState } from 'react';
import { 
  Users, TrendingUp, TrendingDown, AlertTriangle,
  Save, RotateCcw, ChevronRight, Star,
  ArrowUp, ArrowDown, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

// Simple mock data
const mockRoster = {
  starters: [
    { id: '1', name: 'Patrick Mahomes', position: 'QB', team: 'KC', opponent: 'vs DEN', projection: 24.5, status: 'healthy', slot: 'QB' },
    { id: '2', name: 'Christian McCaffrey', position: 'RB', team: 'SF', opponent: '@ SEA', projection: 19.8, status: 'healthy', slot: 'RB1' },
    { id: '3', name: 'Austin Ekeler', position: 'RB', team: 'LAC', opponent: 'vs LV', projection: 16.2, status: 'questionable', slot: 'RB2' },
    { id: '4', name: 'Tyreek Hill', position: 'WR', team: 'MIA', opponent: '@ BUF', projection: 18.3, status: 'healthy', slot: 'WR1' },
    { id: '5', name: 'Stefon Diggs', position: 'WR', team: 'BUF', opponent: 'vs MIA', projection: 17.1, status: 'healthy', slot: 'WR2' },
    { id: '6', name: 'Travis Kelce', position: 'TE', team: 'KC', opponent: 'vs DEN', projection: 14.2, status: 'healthy', slot: 'TE' },
    { id: '7', name: 'Calvin Ridley', position: 'WR', team: 'JAX', opponent: '@ TEN', projection: 13.5, status: 'healthy', slot: 'FLEX' },
    { id: '8', name: 'Justin Tucker', position: 'K', team: 'BAL', opponent: 'vs CLE', projection: 8.5, status: 'healthy', slot: 'K' },
    { id: '9', name: 'San Francisco 49ers', position: 'DST', team: 'SF', opponent: '@ SEA', projection: 9.2, status: 'healthy', slot: 'DST' }
  ],
  bench: [
    { id: '10', name: 'Jaylen Waddle', position: 'WR', team: 'MIA', opponent: '@ BUF', projection: 14.8, status: 'healthy' },
    { id: '11', name: 'Rachaad White', position: 'RB', team: 'TB', opponent: 'vs NO', projection: 12.3, status: 'healthy' },
    { id: '12', name: 'George Kittle', position: 'TE', team: 'SF', opponent: '@ SEA', projection: 11.5, status: 'questionable' },
    { id: '13', name: 'Jahan Dotson', position: 'WR', team: 'WAS', opponent: '@ DAL', projection: 8.9, status: 'healthy' }
  ]
};

const PlayerCard = ({ player, isBench = false }: any) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'questionable': return 'text-orange-600 bg-orange-50';
      case 'out': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
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
    <div className={`bg-white rounded-lg border ${isBench ? 'border-gray-200' : 'border-l-4 border-l-field-green-500 border-gray-200'} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getPositionColor(player.position)}`}>
              {player.position}
            </span>
            {!isBench && (
              <span className="text-xs font-medium text-gray-500">
                {player.slot}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900">{player.name}</h3>
          <p className="text-sm text-gray-600">{player.team} - {player.opponent}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(player.status)}`}>
              {player.status === 'healthy' ? 'Healthy' : player.status === 'questionable' ? 'Q' : 'Out'}
            </span>
            <span className="text-sm text-gray-700">
              Proj: <strong>{player.projection}</strong>
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
  const [roster, setRoster] = useState(mockRoster);
  const [hasChanges, setHasChanges] = useState(false);

  const totalProjection = [...roster.starters, ...roster.bench].reduce(
    (sum, player) => sum + player.projection, 
    0
  );

  const starterProjection = roster.starters.reduce(
    (sum, player) => sum + player.projection, 
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
              <p className="text-gray-600 mt-1">Week 3 Lineup</p>
            </div>
            <div className="flex items-center gap-4">
              {hasChanges && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setHasChanges(false)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button className="btn-primary" onClick={() => setHasChanges(false)}>
                    <Save className="w-4 h-4 mr-2" />
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
                <Users className="w-5 h-5 text-field-green-600" />
                <span className="text-xs text-green-600 font-medium">Full</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">9/9</p>
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
              <p className="text-2xl font-bold text-gray-900">8</p>
              <p className="text-sm text-gray-600">Healthy Players</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">2</p>
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
                {roster.starters.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </div>
          </div>

          {/* Bench */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Bench</h2>
                <p className="text-sm text-gray-600">{roster.bench.length} players</p>
              </div>
              <div className="p-6 space-y-3">
                {roster.bench.map((player) => (
                  <PlayerCard key={player.id} player={player} isBench />
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