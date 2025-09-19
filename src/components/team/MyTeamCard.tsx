'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Trophy, TrendingUp, Loader2, ExternalLink } from 'lucide-react';
import { handleComponentError } from '@/lib/error-handling';

interface UserTeam {
  id: string;
  name: string;
  leagueId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  league: {
    id: string;
    name: string;
    currentWeek: number;
    season: number;
  };
  rosterCount: number;
}

interface MyTeamCardProps {
  className?: string;
}

export default function MyTeamCard({ className = '' }: MyTeamCardProps) {
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserTeam();
  }, []);

  const fetchUserTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-team');
      const data = await response.json();
      
      if (data.success) {
        setTeam(data.data);
      } else if (response.status === 401) {
        setError('Please log in to view your team');
      } else if (response.status === 404) {
        setError('No team found. Join a league to get started!');
      } else {
        setError(data.message || 'Failed to load team');
      }
    } catch (error) {
      setError('Error loading team information');
      handleComponentError(error as Error, 'component');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading your team...</span>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}>
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">My Team</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/leagues"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Trophy className="h-4 w-4 mr-2" />
            View Leagues
          </Link>
        </div>
      </div>
    );
  }

  const winPercentage = team.wins + team.losses + team.ties > 0 
    ? ((team.wins + team.ties * 0.5) / (team.wins + team.losses + team.ties) * 100).toFixed(1)
    : '0.0';

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-blue-900">{team.name}</h3>
          <p className="text-sm text-blue-700">{team.league.name}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-900">
            {team.wins}-{team.losses}
          </div>
          <div className="text-sm text-blue-700">
            {winPercentage}% Win Rate
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/80 rounded-lg p-3">
          <div className="flex items-center">
            <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm text-gray-600">Points For</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">{team.pointsFor.toFixed(1)}</div>
        </div>
        <div className="bg-white/80 rounded-lg p-3">
          <div className="flex items-center">
            <Users className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-gray-600">Roster Size</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">{team.rosterCount}</div>
        </div>
      </div>

      <div className="space-y-2">
        <Link
          href={`/teams/${team.id}` as any}
          className="flex items-center justify-between w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <span>View My Team</span>
          <ExternalLink className="h-4 w-4" />
        </Link>
        <Link
          href={`/teams/${team.id}/lineup` as any}
          className="flex items-center justify-between w-full px-4 py-3 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium"
        >
          <span>Set Lineup</span>
          <Users className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 pt-4 border-t border-blue-200">
        <p className="text-xs text-blue-600 text-center">
          Week {team.league.currentWeek} • {team.league.season} Season
        </p>
      </div>
    </div>
  );
}