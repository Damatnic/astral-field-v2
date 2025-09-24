import React, { useState, useEffect } from 'react';
import { useLiveScoring } from '@/lib/socket/client';
import { ChartBarIcon, ClockIcon, FireIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

interface LiveScoreboardProps {
  leagueId: string;
  week?: number;
}

interface PlayerScore {
  playerId: string;
  actualPoints: number;
  projectedPoints: number;
  position: string;
  isLocked: boolean;
  player?: {
    id: string;
    name: string;
    position: string;
    team: string;
    imageUrl?: string;
  };
}

interface TeamScore {
  id: string;
  name: string;
  owner: string;
  score: number;
  projectedScore: number;
  lineup: PlayerScore[];
}

interface Matchup {
  id: string;
  team1: TeamScore;
  team2: TeamScore;
  status: 'UPCOMING' | 'LIVE' | 'FINAL';
  lastUpdated: Date;
}

export default function LiveScoreboard({ leagueId, week }: LiveScoreboardProps) {
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(week || getCurrentWeek());
  const [expandedMatchup, setExpandedMatchup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { scores } = useLiveScoring(leagueId, selectedWeek);

  useEffect(() => {
    fetchMatchups();
  }, [leagueId, selectedWeek]);

  useEffect(() => {
    if (scores) {
      setLastUpdate(new Date());
    }
  }, [scores]);

  const fetchMatchups = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/matchups/${selectedWeek}`);
      if (response.ok) {
        const data = await response.json();
        setMatchups(data.matchups);
      }
    } catch (error) {
      console.error('Error fetching matchups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchupStatus = (matchup: Matchup) => {
    switch (matchup.status) {
      case 'LIVE':
        return (
          <div className="flex items-center text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></div>
            LIVE
          </div>
        );
      case 'FINAL':
        return <span className="text-gray-600">FINAL</span>;
      default:
        return <span className="text-blue-600">UPCOMING</span>;
    }
  };

  const getWinningTeam = (matchup: Matchup) => {
    if (matchup.team1.score > matchup.team2.score) return matchup.team1.id;
    if (matchup.team2.score > matchup.team1.score) return matchup.team2.id;
    return null;
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getTopPerformers = () => {
    const allPlayers: (PlayerScore & { teamName: string })[] = [];
    
    matchups.forEach(matchup => {
      matchup.team1.lineup.forEach(player => {
        if (player.actualPoints > 0) {
          allPlayers.push({ ...player, teamName: matchup.team1.name });
        }
      });
      matchup.team2.lineup.forEach(player => {
        if (player.actualPoints > 0) {
          allPlayers.push({ ...player, teamName: matchup.team2.name });
        }
      });
    });

    return allPlayers
      .sort((a, b) => b.actualPoints - a.actualPoints)
      .slice(0, 5);
  };

  const getCloseGames = () => {
    return matchups
      .filter(matchup => {
        const diff = Math.abs(matchup.team1.score - matchup.team2.score);
        return diff <= 15 && matchup.status === 'LIVE';
      })
      .sort((a, b) => {
        const diffA = Math.abs(a.team1.score - a.team2.score);
        const diffB = Math.abs(b.team1.score - b.team2.score);
        return diffA - diffB;
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading live scores...</p>
        </div>
      </div>
    );
  }

  const topPerformers = getTopPerformers();
  const closeGames = getCloseGames();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Live Scoreboard</h2>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <ClockIcon className="h-4 w-4" />
          <span>Last updated: {formatTime(lastUpdate)}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Close Games */}
        {closeGames.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FireIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="font-semibold text-yellow-800">Close Games</h3>
            </div>
            <div className="space-y-2">
              {closeGames.slice(0, 2).map(matchup => {
                const diff = Math.abs(matchup.team1.score - matchup.team2.score);
                return (
                  <div key={matchup.id} className="text-sm">
                    <div className="font-medium">
                      {matchup.team1.name} vs {matchup.team2.name}
                    </div>
                    <div className="text-yellow-700">
                      {diff.toFixed(1)} point difference
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <TrophyIcon className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="font-semibold text-green-800">Top Performers</h3>
            </div>
            <div className="space-y-2">
              {topPerformers.slice(0, 3).map((player, index) => (
                <div key={player.playerId} className="text-sm flex justify-between">
                  <span className="font-medium">
                    {index + 1}. {player.player?.name}
                  </span>
                  <span className="text-green-700 font-bold">
                    {player.actualPoints.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* League Average */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-blue-800">League Stats</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Avg Score:</span>
              <span className="font-medium">
                {matchups.length > 0 
                  ? (matchups.reduce((sum, m) => sum + m.team1.score + m.team2.score, 0) / (matchups.length * 2)).toFixed(1)
                  : '0.0'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>High Score:</span>
              <span className="font-medium text-green-600">
                {matchups.length > 0
                  ? Math.max(...matchups.flatMap(m => [m.team1.score, m.team2.score])).toFixed(1)
                  : '0.0'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Matchups */}
      <div className="space-y-4">
        {matchups.map(matchup => {
          const winningTeam = getWinningTeam(matchup);
          const isExpanded = expandedMatchup === matchup.id;
          
          return (
            <div key={matchup.id} className="bg-white border rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-4">
                    {getMatchupStatus(matchup)}
                  </div>
                  <button
                    onClick={() => setExpandedMatchup(isExpanded ? null : matchup.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Team 1 */}
                  <div className={`text-center ${winningTeam === matchup.team1.id ? 'bg-green-50 rounded-lg p-3' : ''}`}>
                    <div className="font-semibold text-lg">{matchup.team1.name}</div>
                    <div className="text-sm text-gray-600 mb-2">{matchup.team1.owner}</div>
                    <div className="text-3xl font-bold text-gray-900">
                      {matchup.team1.score.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Proj: {matchup.team1.projectedScore.toFixed(1)}
                    </div>
                  </div>

                  {/* VS */}
                  <div className="flex items-center justify-center">
                    <span className="text-gray-400 font-medium">VS</span>
                  </div>

                  {/* Team 2 */}
                  <div className={`text-center ${winningTeam === matchup.team2.id ? 'bg-green-50 rounded-lg p-3' : ''}`}>
                    <div className="font-semibold text-lg">{matchup.team2.name}</div>
                    <div className="text-sm text-gray-600 mb-2">{matchup.team2.owner}</div>
                    <div className="text-3xl font-bold text-gray-900">
                      {matchup.team2.score.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Proj: {matchup.team2.projectedScore.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Lineup Details */}
              {isExpanded && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-8">
                    {/* Team 1 Lineup */}
                    <div>
                      <h4 className="font-semibold mb-3">{matchup.team1.name} Lineup</h4>
                      <div className="space-y-2">
                        {matchup.team1.lineup.map(player => (
                          <div key={player.playerId} className="flex justify-between items-center py-1 px-2 bg-white rounded text-sm">
                            <div>
                              <span className="font-medium">{player.player?.name || 'Unknown'}</span>
                              <span className="ml-2 text-gray-500">
                                {player.position} - {player.player?.team}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">
                                {player.actualPoints.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {player.projectedPoints.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Team 2 Lineup */}
                    <div>
                      <h4 className="font-semibold mb-3">{matchup.team2.name} Lineup</h4>
                      <div className="space-y-2">
                        {matchup.team2.lineup.map(player => (
                          <div key={player.playerId} className="flex justify-between items-center py-1 px-2 bg-white rounded text-sm">
                            <div>
                              <span className="font-medium">{player.player?.name || 'Unknown'}</span>
                              <span className="ml-2 text-gray-500">
                                {player.position} - {player.player?.team}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">
                                {player.actualPoints.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {player.projectedPoints.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCurrentWeek(): number {
  // Simplified calculation - in production would use NFL schedule API
  const now = new Date();
  const seasonStart = new Date('2024-09-05');
  const diffTime = Math.abs(now.getTime() - seasonStart.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  
  return Math.min(18, Math.max(1, diffWeeks));
}