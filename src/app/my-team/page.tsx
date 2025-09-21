'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Loader2, 
  ChevronRight,
  Target,
  Calendar,
  Star,
  Activity,
  AlertTriangle,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { handleComponentError } from '@/lib/error-handling';
import { safeToFixed } from '@/utils/numberUtils';

interface Player {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  position: string;
  nflTeam?: string;
  byeWeek?: number;
  status: string;
  injuryStatus?: string;
  isRookie: boolean;
  age?: number;
  height?: string;
  weight?: string;
  college?: string;
  seasonStats: {
    totalPoints: number;
    averagePoints: number;
    lastWeekPoints: number;
    gamesPlayed: number;
    trend: 'up' | 'down' | 'stable';
  };
  projection: {
    points: number;
    confidence: number;
    source: string;
  };
  recentGames: Array<{
    week: number;
    opponent?: string;
    points: number;
    stats: any;
    gameId?: string;
  }>;
  news: Array<{
    id: string;
    headline: string;
    content?: string;
    source: string;
    timestamp: string;
    impact: string;
    category?: string;
  }>;
}

interface RosterPlayer {
  id: string;
  playerId: string;
  rosterSlot: string;
  position: string;
  isLocked: boolean;
  acquisitionDate: string;
  acquisitionType: string;
  player: Player;
}

interface UserTeam {
  id: string;
  name: string;
  leagueId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  waiverPriority: number;
  faabBudget: number;
  faabSpent: number;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  league: {
    id: string;
    name: string;
    currentWeek: number;
    season: number;
  };
  roster: RosterPlayer[];
  lineup: {
    starters: RosterPlayer[];
    bench: RosterPlayer[];
    ir: RosterPlayer[];
    taxi: RosterPlayer[];
  };
  stats: {
    currentWeekProjection: number;
    lastWeekTotal: number;
    seasonAverage: number;
    totalSeasonPoints: number;
  };
  record: {
    wins: number;
    losses: number;
    ties: number;
    percentage: number;
  };
}

const positionOrder = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DST'];

export default function MyTeamPage() {
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lineup' | 'bench' | 'stats'>('lineup');
  const router = useRouter();

  const fetchUserTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-team', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTeam(data.data);
      } else if (response.status === 401) {
        router.push('/login');
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

  useEffect(() => {
    fetchUserTeam();
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string, injuryStatus?: string) => {
    if (injuryStatus && injuryStatus !== 'HEALTHY') {
      return 'text-red-600 bg-red-50';
    }
    if (status === 'ACTIVE') {
      return 'text-green-600 bg-green-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const PlayerCard = ({ rosterPlayer, showPosition = true }: { rosterPlayer: RosterPlayer; showPosition?: boolean }) => {
    const { player } = rosterPlayer;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{player.name}</h4>
              {showPosition && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {rosterPlayer.rosterSlot}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{player.position}</span>
              {player.nflTeam && (
                <>
                  <span>•</span>
                  <span>{player.nflTeam}</span>
                </>
              )}
              {player.byeWeek && (
                <>
                  <span>•</span>
                  <span>Bye: {player.byeWeek}</span>
                </>
              )}
            </div>
            {(player.injuryStatus && player.injuryStatus !== 'HEALTHY') && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-600">{player.injuryStatus}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              {getTrendIcon(player.seasonStats.trend)}
              <span className="text-sm font-medium">
                {safeToFixed(player.seasonStats.averagePoints, 1, '0.0')} avg
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {safeToFixed(player.projection.points, 1, '0.0')} proj
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-1 bg-gray-50 rounded">
            <div className="font-medium">{safeToFixed(player.seasonStats.lastWeekPoints, 1, '0.0')}</div>
            <div className="text-gray-500">Last Week</div>
          </div>
          <div className="text-center p-1 bg-gray-50 rounded">
            <div className="font-medium">{safeToFixed(player.seasonStats.totalPoints, 1, '0.0')}</div>
            <div className="text-gray-500">Total</div>
          </div>
          <div className="text-center p-1 bg-gray-50 rounded">
            <div className="font-medium">{player.seasonStats.gamesPlayed}</div>
            <div className="text-gray-500">Games</div>
          </div>
        </div>

        {player.news.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-600 line-clamp-2">
              <span className="font-medium">Latest:</span> {player.news[0].headline}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your team...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Team</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/leagues')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Leagues
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-gray-600">{team.league.name} • Week {team.league.currentWeek}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {team.record.wins}-{team.record.losses}
                {team.record.ties > 0 && `-${team.record.ties}`}
              </div>
              <div className="text-sm text-gray-600">
                {safeToFixed(team.record.percentage * 100, 1, '0.0')}% Win Rate
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Team Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">This Week Projection</p>
                <p className="text-2xl font-bold text-gray-900">
                  {safeToFixed(team.stats.currentWeekProjection, 1, '0.0')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Season Average</p>
                <p className="text-2xl font-bold text-gray-900">
                  {safeToFixed(team.stats.seasonAverage, 1, '0.0')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">FAAB Remaining</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${team.faabBudget - team.faabSpent}
                </p>
                <p className="text-xs text-gray-500">of ${team.faabBudget}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Waiver Priority</p>
                <p className="text-2xl font-bold text-gray-900">#{team.waiverPriority}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('lineup')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'lineup'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Starting Lineup ({team.lineup.starters.length})
              </button>
              <button
                onClick={() => setActiveTab('bench')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bench'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Bench ({team.lineup.bench.length})
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Team Stats
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'lineup' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Starting Lineup</h3>
                  <button
                    onClick={() => router.push(`/teams/${team.id}/lineup`)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Lineup
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
                
                {team.lineup.starters.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No starters set yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {positionOrder.map(position => {
                      const playersInPosition = team.lineup.starters.filter(p => p.rosterSlot === position);
                      return playersInPosition.map(rosterPlayer => (
                        <PlayerCard 
                          key={rosterPlayer.id} 
                          rosterPlayer={rosterPlayer} 
                          showPosition={true} 
                        />
                      ));
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bench' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Bench Players</h3>
                {team.lineup.bench.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No bench players</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {team.lineup.bench.map(rosterPlayer => (
                      <PlayerCard 
                        key={rosterPlayer.id} 
                        rosterPlayer={rosterPlayer} 
                        showPosition={false} 
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Team Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Scoring</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Points For:</span>
                          <span className="font-medium">{safeToFixed(team.pointsFor, 1, '0.0')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Points Against:</span>
                          <span className="font-medium">{safeToFixed(team.pointsAgainst, 1, '0.0')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Point Differential:</span>
                          <span className={`font-medium ${
                            team.pointsFor - team.pointsAgainst > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(team.pointsFor - team.pointsAgainst > 0 ? '+' : '')}
                            {safeToFixed(team.pointsFor - team.pointsAgainst, 1, '0.0')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Team Resources</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Roster Size:</span>
                          <span className="font-medium">{team.roster.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">FAAB Spent:</span>
                          <span className="font-medium">${team.faabSpent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">FAAB Remaining:</span>
                          <span className="font-medium">${team.faabBudget - team.faabSpent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/waivers')}
              className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Waiver Claims
            </button>
            <button
              onClick={() => router.push('/trade')}
              className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Users className="h-5 w-5 mr-2" />
              Trade Players
            </button>
            <button
              onClick={() => router.push('/players')}
              className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Activity className="h-5 w-5 mr-2" />
              Player Research
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}