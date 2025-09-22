'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Trophy, Users, Calendar, TrendingUp, Shield, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { safeToFixed } from '@/utils/numberUtils';

interface Matchup {
  id: string;
  week: number;
  homeTeam: {
    id: string;
    name: string;
    owner: string;
    score: number;
    projectedScore: number;
    logo?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    owner: string;
    score: number;
    projectedScore: number;
    logo?: string;
  };
  status: 'scheduled' | 'in_progress' | 'completed';
  isPlayoffs: boolean;
  isChampionship: boolean;
}

export default function MatchupsPage() {
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [currentWeek, setCurrentWeek] = useState(15);
  const [selectedWeek, setSelectedWeek] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchups();
  }, [fetchMatchups]);

  const fetchMatchups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/matchups?week=${selectedWeek}`);
      const data = await response.json();
      
      if (data.success) {
        setMatchups(data.data || []);
      } else {
        setError(data.message || 'Failed to load matchups');
      }
    } catch (err) {
      setError('Error loading matchups');
    } finally {
      setLoading(false);
    }
  }, [selectedWeek]);

  const getMatchupStatus = (matchup: Matchup) => {
    if (matchup.status === 'completed') {
      const homeWon = matchup.homeTeam.score > matchup.awayTeam.score;
      return homeWon ? 'home_win' : 'away_win';
    }
    return matchup.status;
  };

  const weekOptions = Array.from({ length: 17 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Trophy className="h-8 w-8" />
                League Matchups
              </h1>
              <p className="mt-2 text-blue-100">
                {selectedWeek >= 15 ? 'Playoffs' : 'Regular Season'} • Week {selectedWeek}
              </p>
            </div>
            <Link href="/">
              <Button variant="secondary" size="lg">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Week Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {weekOptions.map((week) => (
                <Button
                  key={week}
                  variant={selectedWeek === week ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedWeek(week)}
                  className="relative"
                >
                  Week {week}
                  {week === currentWeek && (
                    <Badge className="absolute -top-2 -right-2 h-5 px-1" variant="danger">
                      Current
                    </Badge>
                  )}
                  {week >= 15 && (
                    <Shield className="ml-1 h-3 w-3" />
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matchups Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <Card className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Loading matchups...</span>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-12">
            <div className="text-center text-red-600">
              <p>{error}</p>
              <Button onClick={fetchMatchups} className="mt-4">
                Retry
              </Button>
            </div>
          </Card>
        ) : matchups.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-gray-600">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No matchups scheduled for Week {selectedWeek}</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {matchups.map((matchup) => {
              const status = getMatchupStatus(matchup);
              return (
                <Link key={matchup.id} href={`/matchup/${matchup.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                    {/* Special Badge for Playoffs/Championship */}
                    {(matchup.isPlayoffs || matchup.isChampionship) && (
                      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-2 text-sm font-semibold">
                        {matchup.isChampionship ? '🏆 CHAMPIONSHIP GAME 🏆' : '⚔️ PLAYOFF MATCHUP ⚔️'}
                      </div>
                    )}
                    
                    <CardContent className="p-6">
                      {/* Away Team */}
                      <div className={`flex items-center justify-between mb-4 p-3 rounded-lg ${
                        status === 'away_win' ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {matchup.awayTeam.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{matchup.awayTeam.name}</div>
                            <div className="text-sm text-gray-600">{matchup.awayTeam.owner}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {safeToFixed(matchup.awayTeam.score, 1)}
                          </div>
                          {matchup.status !== 'completed' && (
                            <div className="text-xs text-gray-500">
                              Proj: {safeToFixed(matchup.awayTeam.projectedScore, 1)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* VS Divider */}
                      <div className="text-center my-2 text-gray-400 font-semibold">VS</div>

                      {/* Home Team */}
                      <div className={`flex items-center justify-between p-3 rounded-lg ${
                        status === 'home_win' ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                            {matchup.homeTeam.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{matchup.homeTeam.name}</div>
                            <div className="text-sm text-gray-600">{matchup.homeTeam.owner}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {safeToFixed(matchup.homeTeam.score, 1)}
                          </div>
                          {matchup.status !== 'completed' && (
                            <div className="text-xs text-gray-500">
                              Proj: {safeToFixed(matchup.homeTeam.projectedScore, 1)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mt-4 flex items-center justify-between">
                        <Badge variant={
                          matchup.status === 'completed' ? 'secondary' : 
                          matchup.status === 'in_progress' ? 'default' : 
                          'outline'
                        }>
                          {matchup.status === 'completed' ? 'Final' :
                           matchup.status === 'in_progress' ? 'Live' :
                           'Scheduled'}
                        </Badge>
                        <span className="text-sm text-blue-600 hover:underline">
                          View Details →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}