'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, TrendingUp, Trophy, Target } from 'lucide-react';

interface RosterSlot {
  position: string;
  player?: {
    id: string;
    name: string;
    team?: string;
    nflTeam?: string;
    projectedPoints: number;
    pickNumber?: number;
    position?: string;
  };
  required: boolean;
}

interface TeamRosterProps {
  team: {
    id: string;
    name: string;
    owner?: string;
    ownerId?: string;
  };
  roster?: RosterSlot[];
  draftPicks?: any[];
  isMyTeam?: boolean;
}

export function TeamRoster({ 
  team, 
  roster = [],
  draftPicks = [],
  isMyTeam = false 
}: TeamRosterProps) {
  // If roster is not properly structured, create a default roster structure
  const defaultRosterStructure = [
    { position: 'QB', required: true },
    { position: 'RB', required: true },
    { position: 'RB', required: true },
    { position: 'WR', required: true },
    { position: 'WR', required: true },
    { position: 'TE', required: true },
    { position: 'FLEX', required: true },
    { position: 'K', required: true },
    { position: 'DEF', required: true },
    { position: 'BENCH', required: false },
    { position: 'BENCH', required: false },
    { position: 'BENCH', required: false },
    { position: 'BENCH', required: false },
    { position: 'BENCH', required: false },
    { position: 'BENCH', required: false },
  ];

  const rosterToUse = roster.length > 0 ? roster : defaultRosterStructure;
  
  // Group roster by position type
  const starters = rosterToUse.filter(slot => slot.required);
  const bench = rosterToUse.filter(slot => !slot.required);
  
  // Calculate team stats
  const filledSlots = rosterToUse.filter(slot => slot.player).length;
  const totalSlots = rosterToUse.length;
  const projectedPoints = rosterToUse.reduce((sum, slot) => 
    sum + (slot.player?.projectedPoints || 0), 0
  );

  const positionCounts = rosterToUse.reduce((acc, slot) => {
    if (slot.player) {
      const pos = slot.player.position || slot.position;
      acc[pos] = (acc[pos] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {isMyTeam && <Trophy className="w-4 h-4 text-yellow-500" />}
                {team.name}
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{team.owner}</p>
            </div>
            <Badge variant={isMyTeam ? 'default' : 'outline'}>
              {filledSlots}/{totalSlots}
            </Badge>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Roster</p>
                <p className="text-sm font-semibold">{filledSlots} Players</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Projected</p>
                <p className="text-sm font-semibold">{projectedPoints.toFixed(1)} pts</p>
              </div>
            </div>
          </div>

          {/* Position Summary */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(positionCounts).map(([pos, count]) => (
              <Badge key={pos} variant="secondary" className="text-xs">
                {pos}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-3 space-y-4">
            {/* Starters */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Starters</h3>
              <div className="space-y-1">
                {starters.map((slot, index) => (
                  <RosterSlot key={`starter-${index}`} slot={slot} />
                ))}
                {starters.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No starters drafted yet</p>
                )}
              </div>
            </div>

            {/* Bench */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bench</h3>
              <div className="space-y-1">
                {bench.map((slot, index) => (
                  <RosterSlot key={`bench-${index}`} slot={slot} />
                ))}
                {bench.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No bench players drafted yet</p>
                )}
              </div>
            </div>

            {/* Recent Picks */}
            {draftPicks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recent Picks</h3>
                <div className="space-y-1">
                  {draftPicks.slice(-5).reverse().map((pick, index) => (
                    <div key={pick.id || index} className="text-sm text-gray-600 dark:text-gray-400">
                      Round {pick.round || 1}.{pick.pickInRound || 1} - {pick.player?.name || 'Unknown Player'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function RosterSlot({ slot }: { slot: RosterSlot }) {
  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      RB: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      WR: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      TE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      K: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      DEF: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      FLEX: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'W/R/T': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      BENCH: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[slot.position] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  return (
    <div className={`
      flex items-center justify-between p-2 rounded-lg border
      ${slot.player 
        ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800' 
        : 'border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
      }
    `}>
      <div className="flex items-center gap-2">
        <Badge className={`${getPositionColor(slot.position)} text-xs`}>
          {slot.position}
        </Badge>
        {slot.player ? (
          <div>
            <span className="text-sm font-medium">{slot.player.name}</span>
            <span className="text-xs text-gray-500 ml-2">
              {slot.player.team || slot.player.nflTeam || 'FA'}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-500 italic">Empty</span>
        )}
      </div>
      
      {slot.player && (
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
          {slot.player.pickNumber && (
            <Badge variant="outline" className="text-xs">
              Pick {slot.player.pickNumber}
            </Badge>
          )}
          <span>{slot.player.projectedPoints || 0} pts</span>
        </div>
      )}
    </div>
  );
}

export default TeamRoster;