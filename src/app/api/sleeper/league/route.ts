// API Route: Sleeper League Synchronization
// Handles syncing league rosters with Sleeper player data

import { NextRequest, NextResponse } from 'next/server';
import { sleeperLeagueSyncService } from '@/services/sleeper/leagueSyncService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId parameter required for status check' },
            { status: 400 }
          );
        }
        
        const status = await sleeperLeagueSyncService.getLeagueSyncStatus(leagueId);
        return NextResponse.json({
          success: true,
          data: status,
          timestamp: new Date().toISOString(),
        });
      
      case 'mappings':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId parameter required for mappings' },
            { status: 400 }
          );
        }
        
        const mappings = await sleeperLeagueSyncService.getPlayerMappings(leagueId);
        return NextResponse.json({
          success: true,
          data: {
            leagueId,
            mappings,
            summary: {
              total: mappings.length,
              mapped: mappings.filter(m => m.sleeperPlayerId).length,
              unmapped: mappings.filter(m => !m.sleeperPlayerId).length,
            },
          },
          timestamp: new Date().toISOString(),
        });
      
      case 'health':
        // Get health status for all active leagues
        const leagues = await sleeperLeagueSyncService.syncAllLeagues();
        const healthSummary = {
          totalLeagues: leagues.length,
          successfulSyncs: leagues.filter(l => l.errors.length === 0).length,
          failedSyncs: leagues.filter(l => l.errors.length > 0).length,
          totalPlayersMapped: leagues.reduce((sum, l) => sum + l.playersMapped, 0),
          totalPlayersNotFound: leagues.reduce((sum, l) => sum + l.playersNotFound, 0),
        };
        
        return NextResponse.json({
          success: true,
          data: {
            health: healthSummary,
            leagues: leagues,
          },
          timestamp: new Date().toISOString(),
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: status, mappings, or health' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[API] League sync GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get league sync info',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, leagueId, options = {} } = body;

    let result;

    switch (action) {
      case 'sync_league':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId required for league sync' },
            { status: 400 }
          );
        }
        
        console.log(`[API] Starting sync for league: ${leagueId}`);
        result = await sleeperLeagueSyncService.syncLeague(leagueId);
        break;
      
      case 'sync_all_leagues':
        console.log('[API] Starting sync for all active leagues...');
        result = await sleeperLeagueSyncService.syncAllLeagues();
        
        // Create summary for all leagues
        const summary = {
          totalLeagues: result.length,
          successfulSyncs: result.filter(r => r.errors.length === 0).length,
          failedSyncs: result.filter(r => r.errors.length > 0).length,
          totalPlayersMapped: result.reduce((sum, r) => sum + r.playersMapped, 0),
          totalPlayersNotFound: result.reduce((sum, r) => sum + r.playersNotFound, 0),
          totalRostersUpdated: result.reduce((sum, r) => sum + r.rostersUpdated, 0),
          totalErrors: result.reduce((sum, r) => sum + r.errors.length, 0),
          totalDuration: result.reduce((sum, r) => sum + r.duration, 0),
        };
        
        result = {
          summary,
          leagues: result,
        };
        break;
      
      case 'force_resync':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId required for force resync' },
            { status: 400 }
          );
        }
        
        console.log(`[API] Force resyncing league: ${leagueId}`);
        // Force resync by clearing Sleeper IDs first (if option enabled)
        if (options.clearMappings) {
          // This would clear existing mappings to force remapping
          console.log(`[API] Clearing existing mappings for league: ${leagueId}`);
          // Implementation would go here
        }
        
        result = await sleeperLeagueSyncService.syncLeague(leagueId);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: sync_league, sync_all_leagues, or force_resync' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] League sync POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'League sync operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}