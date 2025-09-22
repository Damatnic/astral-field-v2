'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  User, 
  Trophy, 
  Activity,
  RefreshCw,
  Star,
  BarChart3
} from 'lucide-react';
import { useSleeperPlayers, useSleeperPlayer } from '@/lib/sleeper/hooks';
import { SleeperPlayer } from '@/lib/sleeper/types';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';

interface SleeperPlayerSearchProps {
  className?: string;
  onPlayerSelect?: (player: SleeperPlayer) => void;
  selectedPlayerId?: string;
}

export function SleeperPlayerSearch({ 
  className, 
  onPlayerSelect, 
  selectedPlayerId 
}: SleeperPlayerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [showTrending, setShowTrending] = useState(false);

  const { 
    players, 
    total, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    search, 
    syncTrending 
  } = useSleeperPlayers(
    { 
      position: selectedPosition || undefined,
      team: selectedTeam || undefined,
      trending: showTrending 
    },
    50
  );

  const { 
    player: selectedPlayer, 
    stats, 
    projections, 
    news 
  } = useSleeperPlayer(
    selectedPlayerId || '', 
    { 
      includeStats: true, 
      includeProjections: true, 
      includeNews: true 
    }
  );

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      search(query, {
        position: selectedPosition || undefined,
        team: selectedTeam || undefined,
        trending: showTrending
      });
    }, 300),
    [search, selectedPosition, selectedTeam, showTrending]
  );

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    search('', {
      position: selectedPosition || undefined,
      team: selectedTeam || undefined,
      trending: showTrending
    });
  }, [selectedPosition, selectedTeam, showTrending, search]);

  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const teams = [
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 
    'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 
    'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 
    'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'
  ];

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      RB: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      WR: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      TE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      K: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      DEF: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[position] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getInjuryColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'out':
        return 'bg-red-100 text-red-800';
      case 'doubtful':
        return 'bg-orange-100 text-orange-800';
      case 'questionable':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6', className)}>
      {/* Search and Filters */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Player Search
            </CardTitle>
            <CardDescription>
              Search and filter Sleeper players
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {positions.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={showTrending ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setShowTrending(!showTrending)}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={syncTrending}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Player Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {showTrending ? 'Trending Players' : 'Search Results'}
              </CardTitle>
              {total > 0 && (
                <Badge variant="secondary">{total} players</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-center py-8">
                <p className="text-destructive">{error}</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                        selectedPlayerId === player.id && "bg-primary/10 border-primary/20"
                      )}
                      onClick={() => onPlayerSelect?.(player)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {player.firstName?.[0]}{player.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{player.fullName}</p>
                          {player.searchRank && player.searchRank <= 100 && (
                            <Star className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getPositionColor(player.position))}
                          >
                            {player.position}
                          </Badge>
                          {player.team && (
                            <Badge variant="outline" className="text-xs">
                              {player.team}
                            </Badge>
                          )}
                          {player.injuryStatus && player.injuryStatus !== 'Healthy' && (
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getInjuryColor(player.injuryStatus))}
                            >
                              {player.injuryStatus}
                            </Badge>
                          )}
                        </div>
                        {player.injuryNotes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {player.injuryNotes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {player.searchRank && (
                          <p className="text-sm font-medium">#{player.searchRank}</p>
                        )}
                        {player.age && (
                          <p className="text-xs text-muted-foreground">Age {player.age}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Load More
                    </Button>
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Player Details */}
      <div className="space-y-4">
        {selectedPlayer ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {selectedPlayer.firstName?.[0]}{selectedPlayer.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedPlayer.fullName}</CardTitle>
                    <CardDescription>
                      {selectedPlayer.position} • {selectedPlayer.team}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Player Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedPlayer.age && (
                    <div>
                      <p className="text-muted-foreground">Age</p>
                      <p className="font-medium">{selectedPlayer.age}</p>
                    </div>
                  )}
                  {selectedPlayer.yearsExp !== undefined && (
                    <div>
                      <p className="text-muted-foreground">Experience</p>
                      <p className="font-medium">{selectedPlayer.yearsExp} years</p>
                    </div>
                  )}
                  {selectedPlayer.college && (
                    <div>
                      <p className="text-muted-foreground">College</p>
                      <p className="font-medium">{selectedPlayer.college}</p>
                    </div>
                  )}
                  {selectedPlayer.height && (
                    <div>
                      <p className="text-muted-foreground">Height</p>
                      <p className="font-medium">{selectedPlayer.height}</p>
                    </div>
                  )}
                </div>

                {selectedPlayer.injuryStatus && (
                  <div>
                    <Badge 
                      variant="outline" 
                      className={getInjuryColor(selectedPlayer.injuryStatus)}
                    >
                      {selectedPlayer.injuryStatus}
                    </Badge>
                    {selectedPlayer.injuryNotes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedPlayer.injuryNotes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats & Projections */}
            <Tabs defaultValue="stats" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="projections">Projections</TabsTrigger>
                <TabsTrigger value="news">News</TabsTrigger>
              </TabsList>

              <TabsContent value="stats">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Season Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(stats) && stats.length > 0 ? (
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {stats.slice(0, 5).map((stat) => (
                            <div key={stat.id} className="flex justify-between text-sm">
                              <span>Week {stat.week}</span>
                              <span className="font-medium">{stat.fantasyPointsDefault.toFixed(1)} pts</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">No stats available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projections">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Projections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(projections) && projections.length > 0 ? (
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {projections.slice(0, 5).map((proj) => (
                            <div key={proj.id} className="flex justify-between text-sm">
                              <span>Week {proj.week}</span>
                              <span className="font-medium">{proj.projectedPointsDefault.toFixed(1)} pts</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">No projections available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="news">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Recent News
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {news.length > 0 ? (
                      <ScrollArea className="h-32">
                        <div className="space-y-3">
                          {news.slice(0, 3).map((item) => (
                            <div key={item.id} className="space-y-1">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.publishedAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent news</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a player to view details</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}