'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, TrendingDown, Target, Shield, Star, Users, ChevronRight } from 'lucide-react';
import { safeToFixed, safeNumber } from '@/lib/utils';

interface TeamData {
  id: string;
  name: string;
  owner: {
    name: string;
    email: string;
  };
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
  streak: string;
  record: {
    percentage: number;
  };
  recentForm: string[];
  projectedRank?: number;
  playoffChance?: number;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'rank' | 'points' | 'record'>('rank');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedTeams = [...teams].sort((a, b) => {
    switch (sortBy) {
      case 'rank':
        return (a.rank || 999) - (b.rank || 999);
      case 'points':
        return b.pointsFor - a.pointsFor;
      case 'record':
        return (b.record?.percentage || 0) - (a.record?.percentage || 0);
      default:
        return 0;
    }
  });

  const getStreakIcon = (streak: string) => {
    if (!streak) return null;
    const isWinning = streak.startsWith('W');
    return isWinning ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getFormIndicator = (form: string) => {
    switch (form) {
      case 'W':
        return <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">W</div>;
      case 'L':
        return <div className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">L</div>;
      case 'T':
        return <div className="w-6 h-6 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center font-bold">T</div>;
      default:
        return <div className="w-6 h-6 rounded-full bg-gray-300"></div>;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <div className="flex items-center gap-1 text-yellow-600"><Trophy className="h-4 w-4 fill-yellow-600" />1st</div>;
      case 2:
        return <div className="flex items-center gap-1 text-gray-500"><Trophy className="h-4 w-4" />2nd</div>;
      case 3:
        return <div className="flex items-center gap-1 text-orange-600"><Trophy className="h-4 w-4" />3rd</div>;
      default:
        return <div className="text-gray-600">#{rank}</div>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">All Teams</h1>
            <p className="text-gray-600">D'Amato Dynasty League • 2025 Season</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={sortBy === 'rank' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('rank')}
            >
              By Rank
            </Button>
            <Button
              variant={sortBy === 'points' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('points')}
            >
              By Points
            </Button>
            <Button
              variant={sortBy === 'record' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('record')}
            >
              By Record
            </Button>
          </div>
        </div>

        {/* League Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Teams</p>
                <p className="text-2xl font-bold text-blue-900">{teams.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-700 font-medium">Total Points</p>
                <p className="text-2xl font-bold text-green-900">
                  {safeToFixed(teams.reduce((sum, team) => sum + safeNumber(team.pointsFor), 0), 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-700 font-medium">League Leader</p>
                <p className="text-lg font-bold text-purple-900">
                  {sortedTeams[0]?.name || 'TBD'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-700 font-medium">Playoff Teams</p>
                <p className="text-2xl font-bold text-orange-900">6</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Teams List */}
      <div className="space-y-4">
        {sortedTeams.map((team, index) => (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Rank Badge */}
                  <div className="text-center min-w-[60px]">
                    {getRankBadge(team.rank)}
                  </div>

                  {/* Team Info */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                      {team.name}
                      {team.rank === 1 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    </h3>
                    <p className="text-sm text-gray-600">{team.owner?.name}</p>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="font-medium">
                        {team.wins}-{team.losses}
                        {team.ties > 0 && `-${team.ties}`}
                      </span>
                      <span className="text-gray-500">
                        ({safeToFixed(safeNumber(team.record?.percentage) * 100, 0)}%)
                      </span>
                      <span className="flex items-center gap-1">
                        {getStreakIcon(team.streak)}
                        <span className={team.streak?.startsWith('W') ? 'text-green-600' : 'text-red-600'}>
                          {team.streak || 'N/A'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats & Form */}
                <div className="flex items-center gap-8">
                  {/* Recent Form */}
                  <div className="hidden md:flex items-center gap-1">
                    {team.recentForm?.slice(-5).map((result, i) => (
                      <div key={i}>{getFormIndicator(result)}</div>
                    )) || <span className="text-gray-400 text-sm">No recent games</span>}
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Points</div>
                    <div className="font-bold text-lg">{safeToFixed(team.pointsFor, 1)}</div>
                    <div className="text-xs text-gray-400">
                      vs {safeToFixed(team.pointsAgainst, 1)}
                    </div>
                  </div>

                  {/* Playoff Chance */}
                  {team.playoffChance !== undefined && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Playoff %</div>
                      <div className={`font-bold text-lg ${
                        team.playoffChance >= 75 ? 'text-green-600' :
                        team.playoffChance >= 50 ? 'text-yellow-600' :
                        team.playoffChance >= 25 ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {safeToFixed(team.playoffChance, 0)}%
                      </div>
                    </div>
                  )}

                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Playoff Picture */}
      <Card className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-green-50">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Playoff Picture</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Current Playoff Teams</h3>
            <div className="space-y-2">
              {sortedTeams.slice(0, 6).map((team, index) => (
                <div key={team.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600">#{index + 1}</span>
                    <span>{team.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {team.wins}-{team.losses}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">On the Bubble</h3>
            <div className="space-y-2">
              {sortedTeams.slice(6, 10).map((team, index) => (
                <div key={team.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-600">#{index + 7}</span>
                    <span>{team.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {team.wins}-{team.losses}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}