'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, User, TrendingUp, Activity, AlertCircle } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
  team: string;
  nflTeam?: string;
  adp: number;
  projectedPoints: number;
  byeWeek: number;
  injuryStatus?: 'Healthy' | 'Questionable' | 'Doubtful' | 'Out' | 'IR';
  drafted: boolean;
  draftedBy?: string;
}

interface PlayerListProps {
  players: Player[];
  selectedPlayer: Player | null;
  onSelectPlayer: (player: Player) => void;
  isMyTurn: boolean;
  currentPick: number;
  searchQuery?: string;
  positionFilter?: string;
  hideDrafted?: boolean;
  onDraftPlayer?: (player: Player) => void;
}

export function PlayerList({
  players,
  selectedPlayer,
  onSelectPlayer,
  isMyTurn,
  currentPick,
  searchQuery = '',
  positionFilter = 'ALL',
  hideDrafted = true,
  onDraftPlayer
}: PlayerListProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localPosition, setLocalPosition] = useState(positionFilter);
  const [sortBy, setSortBy] = useState<'adp' | 'projected' | 'name'>('adp');

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let filtered = players.filter(player => {
      // Hide drafted players if enabled
      if (hideDrafted && player.drafted) return false;
      
      // Search filter
      if (localSearch && !player.name.toLowerCase().includes(localSearch.toLowerCase()) &&
          !(player.team || player.nflTeam || '').toLowerCase().includes(localSearch.toLowerCase())) {
        return false;
      }
      
      // Position filter
      if (localPosition !== 'ALL' && player.position !== localPosition) {
        return false;
      }
      
      return true;
    });

    // Sort players
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'adp':
          return (a.adp || 999) - (b.adp || 999);
        case 'projected':
          return (b.projectedPoints || 0) - (a.projectedPoints || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [players, localSearch, localPosition, hideDrafted, sortBy]);

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      RB: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      WR: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      TE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      K: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      DEF: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return colors[position] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getInjuryIcon = (status?: string) => {
    if (!status || status === 'Healthy') return null;
    const colors: Record<string, string> = {
      Questionable: 'text-yellow-500',
      Doubtful: 'text-orange-500',
      Out: 'text-red-500',
      IR: 'text-red-700'
    };
    return <AlertCircle className={`w-4 h-4 ${colors[status] || 'text-gray-500'}`} />;
  };

  const handleQuickDraft = useCallback((player: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDraftPlayer && isMyTurn && !player.drafted) {
      onDraftPlayer(player);
    }
  }, [onDraftPlayer, isMyTurn]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Available Players</CardTitle>
          <Badge variant="outline">
            {filteredPlayers.length} players
          </Badge>
        </div>
        
        {/* Filters */}
        <div className="space-y-3 mt-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search players..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={localPosition}
              onChange={(e) => setLocalPosition(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="ALL">All Positions</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="K">K</option>
              <option value="DEF">DEF</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant={sortBy === 'adp' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSortBy('adp')}
            >
              ADP
            </Button>
            <Button
              variant={sortBy === 'projected' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSortBy('projected')}
            >
              Projected
            </Button>
            <Button
              variant={sortBy === 'name' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSortBy('name')}
            >
              Name
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[600px]">
          <div className="space-y-1 p-3">
            {filteredPlayers.map((player, index) => {
              const isSelected = selectedPlayer?.id === player.id;
              const adpDiff = (player.adp || 999) - currentPick;
              const isValue = adpDiff > 10;
              const isReach = adpDiff < -10;

              return (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer(player)}
                  className={`
                    relative p-3 rounded-lg border cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                    }
                    ${player.drafted ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {index + 1}. {player.name}
                        </span>
                        {getInjuryIcon(player.injuryStatus)}
                        {isValue && (
                          <Badge variant="default" className="text-xs">
                            Value
                          </Badge>
                        )}
                        {isReach && (
                          <Badge variant="outline" className="text-xs">
                            Reach
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className={`${getPositionColor(player.position)} text-xs`}>
                          {player.position}
                        </Badge>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {player.team || player.nflTeam || 'FA'}
                        </span>
                        {player.byeWeek && (
                          <span className="text-xs text-gray-500">Bye: {player.byeWeek}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>ADP: {player.adp || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          <span>{player.projectedPoints || 0} pts</span>
                        </div>
                      </div>
                    </div>

                    {isMyTurn && !player.drafted && (
                      <Button
                        size="sm"
                        onClick={() => handleQuickDraft(player, {} as React.MouseEvent)}
                        className="shrink-0"
                      >
                        Draft
                      </Button>
                    )}
                    
                    {player.drafted && (
                      <Badge variant="secondary" className="shrink-0">
                        Drafted
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredPlayers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No players found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default PlayerList;