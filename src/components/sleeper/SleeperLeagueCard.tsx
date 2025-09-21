'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Settings, 
  RefreshCw, 
  ExternalLink,
  TrendingUp,
  Clock
} from 'lucide-react';
import { SleeperLeague } from '@/lib/sleeper/types';

interface SleeperLeagueCardProps {
  league: SleeperLeague;
  className?: string;
  onViewDetails?: (leagueId: string) => void;
  onSync?: (leagueId: string) => void;
  loading?: boolean;
}

export function SleeperLeagueCard({ 
  league, 
  className, 
  onViewDetails, 
  onSync,
  loading = false 
}: SleeperLeagueCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_season':
        return 'success';
      case 'post_season':
        return 'secondary';
      case 'complete':
        return 'outline';
      case 'drafting':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_season':
        return 'In Season';
      case 'post_season':
        return 'Playoffs';
      case 'complete':
        return 'Complete';
      case 'drafting':
        return 'Drafting';
      case 'pre_draft':
        return 'Pre-Draft';
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };

  const getScoringType = (settings: Record<string, any>) => {
    const rec = settings?.rec || 0;
    if (rec === 1) return 'PPR';
    if (rec === 0.5) return 'Half PPR';
    return 'Standard';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-none">{league.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{league.season} {league.seasonType}</span>
              <Separator orientation="vertical" className="h-3" />
              <span className="capitalize">{league.sport}</span>
            </div>
          </div>
          <Badge variant={getStatusColor(league.status)}>
            {getStatusLabel(league.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* League Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{league.totalRosters} Teams</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{getScoringType(league.scoringSettings)}</span>
          </div>
        </div>

        {/* Roster Positions */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">ROSTER FORMAT</p>
          <div className="flex flex-wrap gap-1">
            {league.rosterPositions.slice(0, 6).map((position, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {position}
              </Badge>
            ))}
            {league.rosterPositions.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{league.rosterPositions.length - 6}
              </Badge>
            )}
          </div>
        </div>

        {/* Last Sync */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Last synced: {formatDate(league.syncedAt)}</span>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onViewDetails?.(league.id)}
            className="flex-1"
          >
            <Trophy className="h-4 w-4 mr-2" />
            View League
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSync?.(league.id)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <a 
            href={`https://sleeper.app/leagues/${league.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}