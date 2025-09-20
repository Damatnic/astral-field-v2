'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { safeToFixed } from '@/utils/numberUtils';

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  points: number;
  projected: number;
  status: 'active' | 'bench' | 'injured' | 'bye';
  gameStatus?: 'yet_to_play' | 'in_progress' | 'final';
}

interface TeamLineup {
  teamId: string;
  teamName: string;
  owner: string;
  score: number;
  projected: number;
  players: Player[];
  avatar: string;
  color: string;
  record: string;
}

interface MatchupData {
  id: string;
  week: number;
  homeTeam: TeamLineup;
  awayTeam: TeamLineup;
  status: 'upcoming' | 'in_progress' | 'final';
  startTime?: Date;
}

// Mock data generator
const generateMockPlayer = (position: string, slot: string): Player => {
  const players: Record<string, Player[]> = {
    QB: [
      { id: '1', name: 'Josh Allen', position: 'QB', team: 'BUF', points: 28.4, projected: 26.5, status: 'active', gameStatus: 'final' },
      { id: '2', name: 'Jalen Hurts', position: 'QB', team: 'PHI', points: 0, projected: 25.8, status: 'active', gameStatus: 'yet_to_play' }
    ],
    RB: [
      { id: '3', name: 'Christian McCaffrey', position: 'RB', team: 'SF', points: 22.7, projected: 21.3, status: 'active', gameStatus: 'final' },
      { id: '4', name: 'Austin Ekeler', position: 'RB', team: 'LAC', points: 18.3, projected: 17.5, status: 'active', gameStatus: 'final' },
      { id: '5', name: 'Breece Hall', position: 'RB', team: 'NYJ', points: 0, projected: 16.8, status: 'active', gameStatus: 'yet_to_play' }
    ],
    WR: [
      { id: '6', name: 'Tyreek Hill', position: 'WR', team: 'MIA', points: 24.8, projected: 22.1, status: 'active', gameStatus: 'final' },
      { id: '7', name: 'CeeDee Lamb', position: 'WR', team: 'DAL', points: 19.2, projected: 20.5, status: 'active', gameStatus: 'final' },
      { id: '8', name: 'A.J. Brown', position: 'WR', team: 'PHI', points: 0, projected: 18.7, status: 'active', gameStatus: 'yet_to_play' }
    ],
    TE: [
      { id: '9', name: 'Travis Kelce', position: 'TE', team: 'KC', points: 15.3, projected: 14.8, status: 'active', gameStatus: 'final' },
      { id: '10', name: 'T.J. Hockenson', position: 'TE', team: 'MIN', points: 12.1, projected: 11.5, status: 'active', gameStatus: 'in_progress' }
    ],
    FLEX: [
      { id: '11', name: 'Davante Adams', position: 'WR', team: 'LV', points: 16.5, projected: 17.2, status: 'active', gameStatus: 'final' }
    ],
    DST: [
      { id: '12', name: 'San Francisco', position: 'DST', team: 'SF', points: 12, projected: 9.5, status: 'active', gameStatus: 'final' },
      { id: '13', name: 'Dallas', position: 'DST', team: 'DAL', points: 8, projected: 8.8, status: 'active', gameStatus: 'final' }
    ],
    K: [
      { id: '14', name: 'Justin Tucker', position: 'K', team: 'BAL', points: 9, projected: 8.5, status: 'active', gameStatus: 'final' },
      { id: '15', name: 'Harrison Butker', position: 'K', team: 'KC', points: 11, projected: 9.2, status: 'active', gameStatus: 'final' }
    ]
  };
  
  const positionPlayers = players[position] || players['FLEX'];
  return positionPlayers[Math.floor(Math.random() * positionPlayers.length)];
};

const generateTeamLineup = (teamName: string, owner: string, avatar: string, color: string): TeamLineup => {
  const lineup: Player[] = [
    generateMockPlayer('QB', 'QB'),
    generateMockPlayer('RB', 'RB1'),
    generateMockPlayer('RB', 'RB2'),
    generateMockPlayer('WR', 'WR1'),
    generateMockPlayer('WR', 'WR2'),
    generateMockPlayer('TE', 'TE'),
    generateMockPlayer('FLEX', 'FLEX'),
    generateMockPlayer('DST', 'DST'),
    generateMockPlayer('K', 'K')
  ];

  const score = lineup.reduce((sum, player) => sum + player.points, 0);
  const projected = lineup.reduce((sum, player) => sum + player.projected, 0);

  return {
    teamId: Math.random().toString(),
    teamName,
    owner,
    score,
    projected,
    players: lineup,
    avatar,
    color,
    record: `${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 7)}`
  };
};

export default function MatchupPage() {
  const params = useParams();
  const router = useRouter();
  const [matchup, setMatchup] = useState<MatchupData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading matchup data
    setTimeout(() => {
      const mockMatchup: MatchupData = {
        id: params.id as string,
        week: 15,
        homeTeam: generateTeamLineup("D'Amato Dynasty", "Nicholas D'Amato", 'ND', 'bg-purple-600'),
        awayTeam: generateTeamLineup('McCaigue Mayhem', 'Jack McCaigue', 'JM', 'bg-green-500'),
        status: 'in_progress'
      };
      setMatchup(mockMatchup);
      setLoading(false);
    }, 500);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading matchup...</p>
        </div>
      </div>
    );
  }

  if (!matchup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Matchup Not Found</h2>
            <p className="text-gray-600 mb-4">This matchup could not be loaded.</p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700">Upcoming</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-700">Live</Badge>;
      case 'final':
        return <Badge className="bg-gray-100 text-gray-700">Final</Badge>;
      default:
        return null;
    }
  };

  const getPlayerStatusIcon = (status: string) => {
    switch (status) {
      case 'final':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'yet_to_play':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const homeWinning = matchup.homeTeam.score > matchup.awayTeam.score;
  const scoreDiff = Math.abs(matchup.homeTeam.score - matchup.awayTeam.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Week {matchup.week} Matchup</h1>
              <p className="text-gray-600 mt-1">Fantasy Football Head-to-Head</p>
            </div>
            {getStatusBadge(matchup.status)}
          </div>
        </div>

        {/* Score Summary */}
        <Card className="mb-8 shadow-xl">
          <CardContent className="p-8">
            <div className="grid grid-cols-3 gap-8 items-center">
              {/* Home Team */}
              <div className="text-center">
                <div className={`w-24 h-24 ${matchup.homeTeam.color} rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold relative`}>
                  {matchup.homeTeam.avatar}
                  {homeWinning && matchup.status === 'in_progress' && (
                    <TrendingUp className="absolute -top-2 -right-2 h-6 w-6 text-green-500 bg-white rounded-full p-1" />
                  )}
                  {homeWinning && matchup.status === 'final' && (
                    <Trophy className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 bg-white rounded-full p-1" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{matchup.homeTeam.teamName}</h2>
                <p className="text-gray-600">{matchup.homeTeam.owner}</p>
                <p className="text-sm text-gray-500 mt-1">{matchup.homeTeam.record}</p>
                <div className="mt-4">
                  <div className="text-4xl font-bold text-gray-900">
                    {safeToFixed(matchup.homeTeam.score, 1)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Projected: {safeToFixed(matchup.homeTeam.projected, 1)}
                  </div>
                </div>
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400 mb-2">VS</div>
                {matchup.status === 'in_progress' && (
                  <div className="flex items-center justify-center gap-2">
                    <Activity className="h-5 w-5 text-yellow-500 animate-pulse" />
                    <span className="text-sm text-yellow-700 font-medium">LIVE</span>
                  </div>
                )}
                {scoreDiff > 0 && (
                  <div className="mt-4">
                    <Badge className="bg-blue-100 text-blue-700">
                      {homeWinning ? 'Leading' : 'Trailing'} by {safeToFixed(scoreDiff, 1)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="text-center">
                <div className={`w-24 h-24 ${matchup.awayTeam.color} rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold relative`}>
                  {matchup.awayTeam.avatar}
                  {!homeWinning && matchup.status === 'in_progress' && (
                    <TrendingUp className="absolute -top-2 -right-2 h-6 w-6 text-green-500 bg-white rounded-full p-1" />
                  )}
                  {!homeWinning && matchup.status === 'final' && (
                    <Trophy className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 bg-white rounded-full p-1" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{matchup.awayTeam.teamName}</h2>
                <p className="text-gray-600">{matchup.awayTeam.owner}</p>
                <p className="text-sm text-gray-500 mt-1">{matchup.awayTeam.record}</p>
                <div className="mt-4">
                  <div className="text-4xl font-bold text-gray-900">
                    {safeToFixed(matchup.awayTeam.score, 1)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Projected: {safeToFixed(matchup.awayTeam.projected, 1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {matchup.status === 'in_progress' && (
              <div className="mt-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{matchup.homeTeam.teamName}</span>
                  <span>{matchup.awayTeam.teamName}</span>
                </div>
                <Progress 
                  value={(matchup.homeTeam.score / (matchup.homeTeam.score + matchup.awayTeam.score)) * 100}
                  className="h-3"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lineups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Home Team Lineup */}
          <Card className="shadow-lg">
            <CardHeader className={`${matchup.homeTeam.color} text-white`}>
              <CardTitle className="flex items-center justify-between">
                <span>{matchup.homeTeam.teamName}</span>
                <Badge className="bg-white/20 text-white border-white/40">
                  {safeToFixed(matchup.homeTeam.score, 1)} pts
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {matchup.homeTeam.players.map((player) => (
                  <div key={player.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-sm">
                          {player.position}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{player.name}</p>
                          <p className="text-sm text-gray-500">{player.team}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{safeToFixed(player.points, 1)}</span>
                          {getPlayerStatusIcon(player.gameStatus || 'yet_to_play')}
                        </div>
                        <p className="text-xs text-gray-500">Proj: {safeToFixed(player.projected, 1)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Away Team Lineup */}
          <Card className="shadow-lg">
            <CardHeader className={`${matchup.awayTeam.color} text-white`}>
              <CardTitle className="flex items-center justify-between">
                <span>{matchup.awayTeam.teamName}</span>
                <Badge className="bg-white/20 text-white border-white/40">
                  {safeToFixed(matchup.awayTeam.score, 1)} pts
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {matchup.awayTeam.players.map((player) => (
                  <div key={player.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-sm">
                          {player.position}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{player.name}</p>
                          <p className="text-sm text-gray-500">{player.team}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{safeToFixed(player.points, 1)}</span>
                          {getPlayerStatusIcon(player.gameStatus || 'yet_to_play')}
                        </div>
                        <p className="text-xs text-gray-500">Proj: {safeToFixed(player.projected, 1)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Performers */}
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Key Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">MVP</span>
                </div>
                <p className="font-bold text-gray-900">Josh Allen</p>
                <p className="text-sm text-gray-600">28.4 points</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Best Value</span>
                </div>
                <p className="font-bold text-gray-900">Tyreek Hill</p>
                <p className="text-sm text-gray-600">+2.7 vs projection</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Underperformer</span>
                </div>
                <p className="font-bold text-gray-900">A.J. Brown</p>
                <p className="text-sm text-gray-600">Yet to play</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/league">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              League Standings
            </Button>
          </Link>
          <Link href="/schedule">
            <Button>
              <ChevronRight className="h-4 w-4 mr-2" />
              Full Schedule
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}