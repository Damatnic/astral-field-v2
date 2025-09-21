'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock,
  Users,
  BarChart3,
  Activity
} from 'lucide-react';
import { useSleeperScoring, useSleeperScoringUpdates } from '@/lib/sleeper/hooks';
import { MatchupScoring } from '@/lib/sleeper/types';
import { cn } from '@/lib/utils';

interface SleeperScoreboardProps {
  leagueId: string;
  week?: number;
  className?: string;
}

export function SleeperScoreboard({ leagueId, week, className }: SleeperScoreboardProps) {
  const [selectedWeek, setSelectedWeek] = useState(week || getCurrentWeek());
  
  const {
    scoring,
    loading,
    error,
    lastUpdated,
    isLive,
    startLiveScoring,
    stopLiveScoring,
    syncScoring,
    refresh
  } = useSleeperScoring(leagueId, selectedWeek);

  const { scoreUpdates, matchupUpdates } = useSleeperScoringUpdates(leagueId, selectedWeek);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !scoring.length) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading scoreboard...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={refresh}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedScoring = [...scoring].sort((a, b) => b.points - a.points);
  const maxPoints = Math.max(...scoring.map(s => s.points), 1);
  const getProgressPercentage = (points: number) => (points / maxPoints) * 100;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTimeSince = (date: Date) => {
    const diff = Math.floor((currentTime.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Week {selectedWeek} Scoreboard
              </CardTitle>
              <CardDescription>
                {lastUpdated && (
                  <>Last updated: {getTimeSince(lastUpdated)}</>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isLive ? 'default' : 'secondary'}>
                {isLive ? 'Live' : 'Static'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button
                variant={isLive ? 'destructive' : 'default'}
                size="sm"
                onClick={isLive ? stopLiveScoring : startLiveScoring}
              >
                {isLive ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Live
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Go Live
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Scoreboard */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="matchups" className="space-y-4">
            <TabsList>
              <TabsTrigger value="matchups">Matchups</TabsTrigger>
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="matchups">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Live Matchups</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {/* Group matchups by matchup ID */}
                      {Object.entries(
                        sortedScoring.reduce((acc, team) => {
                          // Simple pairing based on roster order for demo
                          const matchupGroup = Math.floor((team.rosterId - 1) / 2);
                          if (!acc[matchupGroup]) acc[matchupGroup] = [];
                          acc[matchupGroup].push(team);
                          return acc;
                        }, {} as Record<number, MatchupScoring[]>)
                      ).map(([matchupId, teams]) => (
                        <div key={matchupId} className="border rounded-lg p-4">
                          <div className="space-y-3">
                            {teams.map((team, index) => (
                              <div key={team.rosterId}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback>
                                        {team.owner?.displayName?.[0] || 'T'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">
                                        {team.owner?.displayName || `Team ${team.rosterId}`}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {team.projectedPoints && (
                                          <>Proj: {team.projectedPoints.toFixed(1)}</>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold">
                                      {team.points.toFixed(1)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {team.starters?.length || 0} starters
                                    </p>
                                  </div>
                                </div>
                                {index === 0 && teams.length > 1 && (
                                  <div className="my-2">
                                    <Progress 
                                      value={getProgressPercentage(team.points)} 
                                      className="h-2"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {teams.length === 2 && (
                            <div className="mt-3 pt-3 border-t text-center">
                              <p className="text-sm text-muted-foreground">
                                {teams[0].points > teams[1].points 
                                  ? `${teams[0].owner?.displayName || `Team ${teams[0].rosterId}`} leading by ${(teams[0].points - teams[1].points).toFixed(1)}`
                                  : teams[1].points > teams[0].points
                                  ? `${teams[1].owner?.displayName || `Team ${teams[1].rosterId}`} leading by ${(teams[1].points - teams[0].points).toFixed(1)}`
                                  : 'Tied'
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="standings">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Weekly Standings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {sortedScoring.map((team, index) => (
                        <div
                          key={team.rosterId}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg",
                            index === 0 && "bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800",
                            index < 3 && index > 0 && "bg-green-100 dark:bg-green-900/20",
                            index >= sortedScoring.length - 3 && "bg-red-100 dark:bg-red-900/20"
                          )}
                        >
                          <div className="text-center min-w-[32px]">
                            <Badge 
                              variant={index === 0 ? 'default' : 'outline'}
                              className="w-6 h-6 p-0 text-xs font-bold"
                            >
                              {index + 1}
                            </Badge>
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {team.owner?.displayName?.[0] || 'T'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">
                              {team.owner?.displayName || `Team ${team.rosterId}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress 
                                value={getProgressPercentage(team.points)} 
                                className="h-1 flex-1"
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{team.points.toFixed(1)}</p>
                            {team.projectedPoints && (
                              <p className="text-xs text-muted-foreground">
                                Proj: {team.projectedPoints.toFixed(1)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Position Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {sortedScoring.slice(0, 5).map((team) => (
                        <div key={team.rosterId} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {team.owner?.displayName?.[0] || 'T'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {team.owner?.displayName || `Team ${team.rosterId}`}
                              </span>
                            </div>
                            <span className="font-bold">{team.points.toFixed(1)}</span>
                          </div>
                          <div className="space-y-1">
                            {team.startersPoints?.map((points, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Starter {index + 1}
                                </span>
                                <span>{points?.toFixed(1) || '0.0'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live Updates */}
          {isLive && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Live Updates
                  <Badge variant="outline" className="text-xs">
                    {scoreUpdates.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {scoreUpdates.slice(0, 10).map((update, index) => (
                      <div key={index} className="text-sm p-2 bg-muted rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Score Update</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(new Date(update.timestamp))}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Player {update.player_id?.slice(-4)} updated
                        </p>
                      </div>
                    ))}
                    {scoreUpdates.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No live updates yet
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">High Score</p>
                  <p className="font-bold text-lg">
                    {Math.max(...scoring.map(s => s.points)).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Low Score</p>
                  <p className="font-bold text-lg">
                    {Math.min(...scoring.map(s => s.points)).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Average</p>
                  <p className="font-bold text-lg">
                    {(scoring.reduce((sum, s) => sum + s.points, 0) / scoring.length).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teams</p>
                  <p className="font-bold text-lg">{scoring.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Week Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Week Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 18 }, (_, i) => i + 1).map(weekNum => (
                  <Button
                    key={weekNum}
                    variant={selectedWeek === weekNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedWeek(weekNum)}
                    className="text-xs"
                  >
                    W{weekNum}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper function to get current NFL week
function getCurrentWeek(): number {
  // Simplified implementation - you should replace with actual NFL week calculation
  const now = new Date();
  const start = new Date(now.getFullYear(), 8, 1); // September 1st
  const diff = now.getTime() - start.getTime();
  const week = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, week)); // NFL weeks 1-18
}