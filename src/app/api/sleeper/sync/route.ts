/**
 * Sleeper API Sync Endpoint
 * Provides API endpoints for triggering Sleeper data synchronization
 * 
 * Routes:
 * GET /api/sleeper/sync - Get player data and health status
 * POST /api/sleeper/sync - Trigger player sync operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { sleeperPlayerService } from '@/services/sleeper/playerService';
import { sleeperClient } from '@/services/sleeper/core/sleeperClient';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'fantasy';
    const forceRefresh = searchParams.get('force') === 'true';

    let data;
    let metadata: any = {
      endpoint: '/api/sleeper/sync',
      timestamp: new Date().toISOString(),
      forceRefresh,
    };

    switch (type) {
      case 'all':
        data = await sleeperPlayerService.getAllPlayers(forceRefresh);
        metadata = { ...metadata, type: 'all_players', count: data.length };
        break;
      
      case 'fantasy':
        data = await sleeperPlayerService.getFantasyPlayers(forceRefresh);
        metadata = { ...metadata, type: 'fantasy_players', count: data.length };
        break;
      
      case 'trending':
        const trendType = searchParams.get('trend') as 'add' | 'drop' || 'add';
        data = await sleeperPlayerService.getTrendingPlayers(trendType);
        metadata = { ...metadata, type: `trending_${trendType}`, count: data.length };
        break;
      
      case 'dynasty':
        data = await sleeperPlayerService.getDynastyTargets();
        metadata = { ...metadata, type: 'dynasty_targets', count: data.length };
        break;
      
      case 'health':
        data = await sleeperPlayerService.getHealthStats();
        metadata = { ...metadata, type: 'health_check' };
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid sync type. Use: all, fantasy, trending, dynasty, or health' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data,
      metadata,
    });

  } catch (error: any) {
    console.error('[API] Sleeper sync error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync with Sleeper API',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      // Handle empty or invalid JSON body
      body = {};
    }
    
    const { action, options = {} } = body;

    let result;

    switch (action) {
      case 'clear_cache':
        await sleeperPlayerService.clearCache();
        result = { message: 'Cache cleared successfully' };
        break;
      
      case 'search':
        const searchResults = await sleeperPlayerService.searchPlayers(options);
        result = searchResults;
        break;
      
      case 'sync_all':
        console.log('[API] Starting full Sleeper data sync...');
        const [allPlayers, fantasyPlayers, trendingAdds, dynastyTargets] = await Promise.all([
          sleeperPlayerService.getAllPlayers(true),
          sleeperPlayerService.getFantasyPlayers(true),
          sleeperPlayerService.getTrendingPlayers('add'),
          sleeperPlayerService.getDynastyTargets(),
        ]);
        
        result = {
          message: 'Full sync completed',
          counts: {
            allPlayers: allPlayers.length,
            fantasyPlayers: fantasyPlayers.length,
            trendingAdds: trendingAdds.length,
            dynastyTargets: dynastyTargets.length,
          },
        };
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: clear_cache, search, or sync_all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] Sleeper sync POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process sync request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}