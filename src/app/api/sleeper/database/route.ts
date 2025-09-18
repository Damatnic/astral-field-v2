// API Route: Sleeper Database Integration
// Handles syncing Sleeper data with our database

import { NextRequest, NextResponse } from 'next/server';
import { sleeperPlayerDatabaseService } from '@/services/sleeper/playerDatabaseService';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        const stats = await sleeperPlayerDatabaseService.getSyncStats();
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });
      
      case 'health':
        const health = await sleeperPlayerDatabaseService.getSyncStats();
        return NextResponse.json({
          success: true,
          data: {
            healthy: health.totalPlayers > 0,
            needsSync: health.needsSync,
            stats: health,
          },
          timestamp: new Date().toISOString(),
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: stats or health' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[API] Database GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get database info',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, options = {} } = body;

    let result;

    switch (action) {
      case 'sync_fantasy':
        console.log('[API] Starting fantasy player database sync...');
        result = await sleeperPlayerDatabaseService.syncFantasyPlayersToDatabase(
          options.batchSize || 100
        );
        break;
      
      case 'sync_dynasty':
        console.log('[API] Starting dynasty targets sync...');
        result = await sleeperPlayerDatabaseService.syncDynastyTargets();
        break;
      
      case 'cleanup':
        console.log('[API] Starting player cleanup...');
        result = await sleeperPlayerDatabaseService.cleanupInactivePlayers();
        break;
      
      case 'full_resync':
        console.log('[API] Starting FULL database resync...');
        result = await sleeperPlayerDatabaseService.fullResync();
        break;
      
      case 'complete_sync':
        console.log('[API] Starting complete database sync (fantasy + dynasty + cleanup)...');
        
        // Run all sync operations in sequence
        const fantasyResult = await sleeperPlayerDatabaseService.syncFantasyPlayersToDatabase();
        const dynastyResult = await sleeperPlayerDatabaseService.syncDynastyTargets();
        const cleanupResult = await sleeperPlayerDatabaseService.cleanupInactivePlayers();
        
        result = {
          fantasy: fantasyResult,
          dynasty: dynastyResult,
          cleanup: cleanupResult,
          summary: {
            totalProcessed: fantasyResult.playersProcessed,
            totalCreated: fantasyResult.playersCreated,
            totalUpdated: fantasyResult.playersUpdated + dynastyResult.playersUpdated,
            dynastyTargets: dynastyResult.playersUpdated,
            cleaned: cleanupResult.deactivated + cleanupResult.removed,
            totalErrors: fantasyResult.errors.length + dynastyResult.errors.length,
          },
        };
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: sync_fantasy, sync_dynasty, cleanup, full_resync, or complete_sync' },
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
    console.error('[API] Database sync error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Database sync failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}