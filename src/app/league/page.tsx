'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Trophy, 
  Users, 
  Calendar, 
  TrendingUp, 
  Award,
  Shield,
  Activity,
  ChevronRight,
  Star,
  Target,
  Zap,
  Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { safeToFixed } from '@/utils/numberUtils';

interface TeamStanding {
  id: string;
  name: string;
  owner: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
  isPlayoffTeam?: boolean;
  isChampion?: boolean;
  avatar?: string;
  color?: string;
}

interface LeagueInfo {
  name: string;
  season: number;
  currentWeek: number;
  totalWeeks: number;
  playoffWeek: number;
  championshipWeek: number;
  scoringType: string;
  waiverType: string;
  tradeDeadline: string;
}

// Mock data for the D'Amato Dynasty League
const mockLeagueInfo: LeagueInfo = {
  name: "D'Amato Dynasty League",
  season: 2025,
  currentWeek: 15,
  totalWeeks: 17,
  playoffWeek: 15,
  championshipWeek: 17,
  scoringType: "PPR",
  waiverType: "FAAB",
  tradeDeadline: "Week 12"
};

const mockStandings: TeamStanding[] = [
  {
    id: '1',
    name: 'McCaigue Mayhem',
    owner: 'Jack McCaigue',
    wins: 10,
    losses: 3,
    ties: 0,
    pointsFor: 1654.8,
    pointsAgainst: 1432.2,
    streak: 'W3',
    isPlayoffTeam: true,
    isChampion: true,
    avatar: 'JM',
    color: 'bg-green-500'
  },
  {
    id: '2',
    name: "Renee's Reign",
    owner: 'Renee McCaigue',
    wins: 9,
    losses: 4,
    ties: 0,
    pointsFor: 1598.4,
    pointsAgainst: 1456.7,
    streak: 'W1',
    isPlayoffTeam: true,
    avatar: 'RM',
    color: 'bg-pink-500'
  },
  {
    id: '3',
    name: 'Hartley Heroes',
    owner: 'Nick Hartley',
    wins: 8,
    losses: 5,
    ties: 0,
    pointsFor: 1543.2,
    pointsAgainst: 1489.3,
    streak: 'L1',
    isPlayoffTeam: true,
    avatar: 'NH',
    color: 'bg-blue-500'
  },
  {
    id: '4',
    name: "D'Amato Dynasty",
    owner: "Nicholas D'Amato",
    wins: 7,
    losses: 6,
    ties: 0,
    pointsFor: 1512.7,
    pointsAgainst: 1501.8,
    streak: 'W2',
    isPlayoffTeam: true,
    avatar: 'ND',
    color: 'bg-purple-600'
  },
  {
    id: '5',
    name: "Jarvey's Juggernauts",
    owner: 'David Jarvey',
    wins: 8,
    losses: 5,
    ties: 0,
    pointsFor: 1576.9,
    pointsAgainst: 1523.4,
    streak: 'L2',
    isPlayoffTeam: true,
    avatar: 'DJ',
    color: 'bg-red-500'
  },
  {
    id: '6',
    name: "Larry's Legends",
    owner: 'Larry McCaigue',
    wins: 7,
    losses: 6,
    ties: 0,
    pointsFor: 1498.3,
    pointsAgainst: 1512.6,
    streak: 'W1',
    isPlayoffTeam: true,
    avatar: 'LM',
    color: 'bg-purple-500'
  },
  {
    id: '7',
    name: 'Kornbeck Crushers',
    owner: 'Jon Kornbeck',
    wins: 6,
    losses: 7,
    ties: 0,
    pointsFor: 1467.5,
    pointsAgainst: 1478.9,
    streak: 'L3',
    avatar: 'JK',
    color: 'bg-indigo-500'
  },
  {
    id: '8',
    name: 'Bergum Blitz',
    owner: 'Brittany Bergum',
    wins: 6,
    losses: 7,
    ties: 0,
    pointsFor: 1445.2,
    pointsAgainst: 1492.1,
    streak: 'W2',
    avatar: 'BB',
    color: 'bg-orange-500'
  },
  {
    id: '9',
    name: 'Lorbecki Lions',
    owner: 'Kaity Lorbecki',
    wins: 5,
    losses: 8,
    ties: 0,
    pointsFor: 1423.8,
    pointsAgainst: 1534.7,
    streak: 'L1',
    avatar: 'KL',
    color: 'bg-yellow-500'
  },
  {
    id: '10',
    name: 'Minor Miracles',
    owner: 'Cason Minor',
    wins: 4,
    losses: 9,
    ties: 0,
    pointsFor: 1387.6,
    pointsAgainst: 1567.3,
    streak: 'L4',
    avatar: 'CM',
    color: 'bg-teal-500'
  }
];

export default function LeaguePage() {
  const router = useRouter();
  const [standings, setStandings] = useState<TeamStanding[]>(mockStandings);
  const [leagueInfo, setLeagueInfo] = useState<LeagueInfo>(mockLeagueInfo);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<'standings' | 'playoffs' | 'stats'>('standings');

  // Calculate win percentage
  const getWinPercentage = (team: TeamStanding) => {
    const totalGames = team.wins + team.losses + team.ties;
    if (totalGames === 0) return 0;
    return ((team.wins + team.ties * 0.5) / totalGames) * 100;
  };

  // Get streak color
  const getStreakColor = (streak: string) => {
    if (streak.startsWith('W')) return 'text-green-600 bg-green-100';
    if (streak.startsWith('L')) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Trophy className="h-10 w-10 text-yellow-500" />
                {leagueInfo.name}
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                {leagueInfo.season} Season • Week {leagueInfo.currentWeek} of {leagueInfo.totalWeeks}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-blue-100 text-blue-700">
                {leagueInfo.scoringType} Scoring
              </Badge>
              <Badge className="bg-green-100 text-green-700">
                {leagueInfo.waiverType} Waivers
              </Badge>
              {leagueInfo.currentWeek >= leagueInfo.playoffWeek && (
                <Badge className="bg-purple-100 text-purple-700">
                  PLAYOFFS
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Current Week</p>
                    <p className="text-2xl font-bold text-blue-900">Week {leagueInfo.currentWeek}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Playoff Teams</p>
                    <p className="text-2xl font-bold text-purple-900">6 of 10</p>
                  </div>
                  <Crown className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Highest Score</p>
                    <p className="text-2xl font-bold text-green-900">{safeToFixed(1654.8, 1)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-700">Trade Deadline</p>
                    <p className="text-2xl font-bold text-yellow-900">{leagueInfo.tradeDeadline}</p>
                  </div>
                  <Shield className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => setSelectedView('standings')}
              variant={selectedView === 'standings' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              Standings
            </Button>
            <Button
              onClick={() => setSelectedView('playoffs')}
              variant={selectedView === 'playoffs' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Crown className="h-4 w-4" />
              Playoff Picture
            </Button>
            <Button
              onClick={() => setSelectedView('stats')}
              variant={selectedView === 'stats' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              League Stats
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {selectedView === 'standings' && (
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
              <CardTitle className="text-xl">League Standings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-700">Rank</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Team</th>
                      <th className="text-center p-4 font-semibold text-gray-700">Record</th>
                      <th className="text-center p-4 font-semibold text-gray-700">Win %</th>
                      <th className="text-center p-4 font-semibold text-gray-700">PF</th>
                      <th className="text-center p-4 font-semibold text-gray-700">PA</th>
                      <th className="text-center p-4 font-semibold text-gray-700">Streak</th>
                      <th className="text-center p-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {standings.map((team, index) => (
                      <tr 
                        key={team.id} 
                        className={`hover:bg-gray-50 transition-colors ${
                          team.isPlayoffTeam ? 'bg-green-50/30' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{index + 1}</span>
                            {team.isChampion && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                            {index < 6 && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                PLAYOFF
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${team.color} rounded-full flex items-center justify-center text-white font-bold`}>
                              {team.avatar}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{team.name}</p>
                              <p className="text-sm text-gray-600">{team.owner}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold">
                            {team.wins}-{team.losses}{team.ties > 0 && `-${team.ties}`}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-gray-700">
                            {safeToFixed(getWinPercentage(team), 1)}%
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-medium text-green-700">
                            {safeToFixed(team.pointsFor, 1)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-gray-600">
                            {safeToFixed(team.pointsAgainst, 1)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge className={getStreakColor(team.streak)}>
                            {team.streak}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          <Link href={`/teams/${team.id}`}>
                            <Button variant="ghost" size="sm" className="hover:bg-blue-50">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedView === 'playoffs' && (
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <CardTitle className="text-xl">Playoff Bracket</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <Crown className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Playoffs Begin Week {leagueInfo.playoffWeek}</h3>
                <p className="text-gray-600">Top 6 teams make the playoffs</p>
                <p className="text-sm text-gray-500 mt-2">Championship game in Week {leagueInfo.championshipWeek}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedView === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Highest Score (Week)</span>
                    <span className="font-bold text-green-700">McCaigue Mayhem - 164.3</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Most Points For</span>
                    <span className="font-bold text-blue-700">McCaigue Mayhem - 1654.8</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Best Record</span>
                    <span className="font-bold text-purple-700">McCaigue Mayhem - 10-3</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-500" />
                  League Averages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Avg Points/Week</span>
                    <span className="font-bold">112.4</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Avg Margin of Victory</span>
                    <span className="font-bold">18.7</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Total Trades</span>
                    <span className="font-bold">23</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/leagues">
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Leagues
            </Button>
          </Link>
          <Link href="/commissioner">
            <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
              <Shield className="h-4 w-4" />
              Commissioner Tools
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}