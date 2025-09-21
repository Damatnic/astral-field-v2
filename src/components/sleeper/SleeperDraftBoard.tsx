'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Clock, 
  Trophy, 
  Users, 
  TrendingUp,
  User,
  Timer,
  Target
} from 'lucide-react';
import { useSleeperDraft, useSleeperDraftRecommendations, useSleeperDraftUpdates } from '@/lib/sleeper/hooks';
import { cn } from '@/lib/utils';

interface SleeperDraftBoardProps {
  draftId: string;
  className?: string;
}

export function SleeperDraftBoard({ draftId, className }: SleeperDraftBoardProps) {
  const { 
    draft, 
    draftBoard, 
    loading, 
    error, 
    isLive, 
    startLiveDraft, 
    stopLiveDraft 
  } = useSleeperDraft(draftId, { 
    includePicks: true, 
    includeBoard: true 
  });

  const { recommendations } = useSleeperDraftRecommendations(draftId, 10);
  const { latestPick, draftUpdates } = useSleeperDraftUpdates(draftId);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading draft board...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !draft) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-destructive">{error || 'Draft not found'}</p>
        </CardContent>
      </Card>
    );
  }

  const currentPick = draftBoard?.currentPick;
  const picks = draftBoard?.picks || [];
  const availablePlayers = draftBoard?.availablePlayers || [];
  const rosterComposition = draftBoard?.rosterComposition || {};

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: 'bg-red-100 text-red-800',
      RB: 'bg-green-100 text-green-800',
      WR: 'bg-blue-100 text-blue-800',
      TE: 'bg-yellow-100 text-yellow-800',
      K: 'bg-purple-100 text-purple-800',
      DEF: 'bg-gray-100 text-gray-800'
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Draft Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Draft Board
              </CardTitle>
              <CardDescription>
                {draft.type.toUpperCase()} Draft • {draft.settings.teams} Teams • {draft.settings.rounds} Rounds
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={draft.status === 'complete' ? 'default' : 'secondary'}>
                {draft.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {draft.status === 'in_progress' && (
                <Button
                  variant={isLive ? 'destructive' : 'default'}
                  size="sm"
                  onClick={isLive ? stopLiveDraft : startLiveDraft}
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
              )}
            </div>
          </div>
        </CardHeader>

        {currentPick && draft.status === 'in_progress' && (
          <CardContent>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Pick</p>
                  <p className="text-sm text-muted-foreground">
                    Round {currentPick.round}, Pick {currentPick.pickNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Roster {currentPick.rosterId}</p>
                  {currentPick.timeRemaining && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      <span>{Math.floor(currentPick.timeRemaining / 60)}:{(currentPick.timeRemaining % 60).toString().padStart(2, '0')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Draft Board */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="picks" className="space-y-4">
            <TabsList>
              <TabsTrigger value="picks">Recent Picks</TabsTrigger>
              <TabsTrigger value="board">Draft Board</TabsTrigger>
              <TabsTrigger value="rosters">Team Rosters</TabsTrigger>
            </TabsList>

            <TabsContent value="picks">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Picks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {picks.slice().reverse().map((pick, index) => (
                        <div
                          key={pick.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border",
                            index === 0 && latestPick?.pick_no === pick.pickNo
                              ? "bg-primary/10 border-primary/20"
                              : "bg-muted/50"
                          )}
                        >
                          <div className="text-center min-w-[60px]">
                            <p className="text-sm font-medium">{pick.round}.{pick.pickNo - (pick.round - 1) * draft.settings.teams}</p>
                            <p className="text-xs text-muted-foreground">#{pick.pickNo}</p>
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {pick.player?.firstName?.[0]}{pick.player?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{pick.player?.fullName}</p>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getPositionColor(pick.player?.position || ''))}
                              >
                                {pick.player?.position}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{pick.player?.team}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Team {pick.rosterId}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="board">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Draft Grid</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="grid grid-cols-1 gap-2">
                      {Array.from({ length: draft.settings.rounds }).map((_, round) => (
                        <div key={round} className="grid grid-cols-12 gap-1 text-xs">
                          <div className="font-medium p-2 bg-muted rounded text-center">
                            R{round + 1}
                          </div>
                          {Array.from({ length: draft.settings.teams }).map((_, team) => {
                            const pickNumber = round * draft.settings.teams + team + 1;
                            const pick = picks.find(p => p.pickNo === pickNumber);
                            const isCurrentPick = currentPick?.pickNumber === pickNumber;
                            
                            return (
                              <div
                                key={team}
                                className={cn(
                                  "p-1 border rounded text-center min-h-[40px] flex items-center justify-center",
                                  isCurrentPick && "bg-primary text-primary-foreground",
                                  pick && !isCurrentPick && "bg-muted",
                                  !pick && !isCurrentPick && "bg-background"
                                )}
                              >
                                {pick ? (
                                  <div className="truncate">
                                    <p className="font-medium">{pick.player?.lastName}</p>
                                    <p className="text-xs opacity-75">{pick.player?.position}</p>
                                  </div>
                                ) : isCurrentPick ? (
                                  <Clock className="h-3 w-3" />
                                ) : (
                                  <span className="text-xs text-muted-foreground">{pickNumber}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rosters">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Team Rosters</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.values(rosterComposition).map((roster: any) => (
                        <div key={roster.rosterId} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Team {roster.rosterId}</h4>
                            <Badge variant="outline">{roster.picks.length} picks</Badge>
                          </div>
                          <div className="space-y-1">
                            {roster.picks.map((pick: any) => (
                              <div key={pick.pickNo} className="flex items-center gap-2 text-sm">
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs w-8 justify-center", getPositionColor(pick.player?.position || ''))}
                                >
                                  {pick.player?.position}
                                </Badge>
                                <span className="truncate">{pick.player?.fullName}</span>
                              </div>
                            ))}
                          </div>
                          {roster.needsAssessment.length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-1">Needs:</p>
                              <div className="flex flex-wrap gap-1">
                                {roster.needsAssessment.map((need: string) => (
                                  <Badge key={need} variant="outline" className="text-xs">
                                    {need}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
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
          {/* Player Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-4 w-4" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {recommendations.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-center min-w-[24px]">
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{player.fullName}</p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getPositionColor(player.position))}
                          >
                            {player.position}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{player.team}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {player.recommendationReason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Live Updates */}
          {isLive && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Live Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {draftUpdates.map((update, index) => (
                      <div key={index} className="text-sm p-2 bg-muted rounded">
                        <p className="font-medium">{update.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(update.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}