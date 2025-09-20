'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Target, Clock } from 'lucide-react';
import { handleComponentError } from '@/lib/error-handling';
import Link from 'next/link';

interface MatchupData {
  id: string;
  week: number;
  status: string;
  userTeam: {
    id: string;
    name: string;
    score: number;
    isHome: boolean;
    owner: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  };
  opponent: {
    id: string;
    name: string;
    score: number;
    isHome: boolean;
    owner: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  };
  league: {
    id: string;
    name: string;
    currentWeek: number;
    season: number;
  };
  projections: {
    userProjected: number;
    opponentProjected: number;
  };
}

export default function CurrentMatchup() {
  const [matchup, setMatchup] = useState<MatchupData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatchup() {
      try {
        const response = await fetch('/api/my-matchup');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch matchup');
        }

        if (result.success) {
          setMatchup(result.data);
        } else {
          throw new Error(result.message || 'Failed to load matchup data');
        }
      } catch (error) {
        handleComponentError(error as Error, 'CurrentMatchup');
        // Error fetching matchup data
      } finally {
        setLoading(false);
      }
    }

    fetchMatchup();
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            This Week&apos;s Matchup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matchup) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            This Week&apos;s Matchup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No matchup scheduled for this week</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const userScore = Number(matchup.userTeam.score) || 0;
  const opponentScore = Number(matchup.opponent.score) || 0;
  const isWinning = userScore > opponentScore;
  const isTied = userScore === opponentScore;
  
  // Determine result status
  let resultText = '';
  let resultColor = '';
  
  if (matchup.status === 'completed') {
    if (isWinning) {
      resultText = 'WIN';
      resultColor = 'bg-green-500';
    } else if (isTied) {
      resultText = 'TIE';
      resultColor = 'bg-yellow-500';
    } else {
      resultText = 'LOSS';
      resultColor = 'bg-red-500';
    }
  } else {
    if (isWinning) {
      resultText = 'WINNING';
      resultColor = 'bg-green-500';
    } else if (isTied) {
      resultText = 'TIED';
      resultColor = 'bg-yellow-500';
    } else {
      resultText = 'BEHIND';
      resultColor = 'bg-red-500';
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Week {matchup.week} Matchup
          </div>
          <Badge variant="outline" className="text-sm">
            {matchup.league.season} Season
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Matchup Header */}
        <div className="flex items-center justify-between">
          <Badge 
            className={`${resultColor} text-white`}
            variant="secondary"
          >
            {resultText}
          </Badge>
          <Badge variant="outline">
            {matchup.status === 'completed' ? 'Final' : 'Live'}
          </Badge>
        </div>

        {/* Teams */}
        <div className="space-y-4">
          {/* User Team */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {matchup.userTeam.name.charAt(0)}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{matchup.userTeam.name}</h3>
                <p className="text-sm text-gray-600">
                  {matchup.userTeam.owner.name} • {matchup.userTeam.isHome ? 'Home' : 'Away'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{userScore.toFixed(1)}</div>
              {matchup.status !== 'completed' && (
                <div className="text-sm text-gray-500">
                  Proj: {(Number(matchup.projections?.userProjected) || 0).toFixed(1)}
                </div>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-500">
              <hr className="w-16 border-gray-300" />
              <span className="text-sm font-medium">VS</span>
              <hr className="w-16 border-gray-300" />
            </div>
          </div>

          {/* Opponent Team */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border-l-4 border-gray-300">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold">
                  {matchup.opponent.name.charAt(0)}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{matchup.opponent.name}</h3>
                <p className="text-sm text-gray-600">
                  {matchup.opponent.owner.name} • {matchup.opponent.isHome ? 'Home' : 'Away'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{opponentScore.toFixed(1)}</div>
              {matchup.status !== 'completed' && (
                <div className="text-sm text-gray-500">
                  Proj: {(Number(matchup.projections?.opponentProjected) || 0).toFixed(1)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href={`/team/${matchup.userTeam.id}/lineup`} className="flex-1">
            <Button className="w-full">
              <Users className="h-4 w-4 mr-2" />
              Set Lineup
            </Button>
          </Link>
          <Link href={`/matchup/${matchup.id}`} className="flex-1">
            <Button className="w-full" variant="outline">
              <Target className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}