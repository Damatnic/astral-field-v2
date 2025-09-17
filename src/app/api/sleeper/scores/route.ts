// API Route: Real-Time Scoring
// Handles live scoring updates and matchup scores

import { NextRequest, NextResponse } from 'next/server';
import { sleeperRealTimeScoringService } from '@/services/sleeper/realTimeScoringService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const action = searchParams.get('action') || 'live';

    switch (action) {
      case 'live':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId parameter required for live scores' },
            { status: 400 }
          );
        }
        
        const liveScores = await sleeperRealTimeScoringService.getLiveScores(leagueId);
        
        if (!liveScores) {
          return NextResponse.json(
            { error: 'Failed to get live scores for league' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          data: liveScores,
          timestamp: new Date().toISOString(),
        });
      
      case 'status':
        // Get scoring service status
        const isLive = await sleeperRealTimeScoringService['isCurrentlyLive']();
        
        return NextResponse.json({
          success: true,
          data: {
            isLive,
            updateInterval: isLive ? '1 minute' : '5 minutes',
            description: isLive ? 'Live scoring active during games' : 'Standard scoring updates',
            lastUpdated: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      
      case 'health':
        // Get health status for scoring service
        try {
          const healthData = {
            service: 'Real-Time Scoring Service',
            healthy: true,
            isUpdating: sleeperRealTimeScoringService['isUpdating'] || false,
            hasActiveInterval: !!sleeperRealTimeScoringService['updateInterval'],
            lastChecked: new Date().toISOString(),
          };
          
          return NextResponse.json({
            success: true,
            data: healthData,
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            data: {
              service: 'Real-Time Scoring Service',
              healthy: false,
              error: error.message,
              lastChecked: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          });
        }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: live, status, or health' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[API] Scoring GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get scoring info',
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
      case 'update_league':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId required for league score update' },
            { status: 400 }
          );
        }
        
        console.log(`[API] Updating scores for league: ${leagueId}`);
        result = await sleeperRealTimeScoringService.updateLeagueScores(leagueId);
        break;
      
      case 'update_all':
        console.log('[API] Updating scores for all leagues...');
        await sleeperRealTimeScoringService.updateAllLeagueScores();
        result = {
          message: 'All league scores updated successfully',
          timestamp: new Date().toISOString(),
        };
        break;
      
      case 'start_live_updates':
        const intervalMs = options.intervalMs || 60000; // Default 1 minute
        
        console.log(`[API] Starting live updates with ${intervalMs}ms interval...`);
        await sleeperRealTimeScoringService.startRealTimeUpdates(intervalMs);
        
        result = {
          message: 'Live updates started',
          interval: `${intervalMs}ms`,
          description: 'Real-time scoring updates are now active',
        };
        break;
      
      case 'stop_live_updates':
        console.log('[API] Stopping live updates...');
        sleeperRealTimeScoringService.stopRealTimeUpdates();
        
        result = {
          message: 'Live updates stopped',
          description: 'Real-time scoring updates have been stopped',
        };
        break;
      
      case 'force_update':
        if (!leagueId) {
          return NextResponse.json(
            { error: 'leagueId required for force update' },
            { status: 400 }
          );
        }
        
        console.log(`[API] Force updating scores for league: ${leagueId}`);
        // Clear cache first to force fresh calculation
        const currentWeek = options.week || 1;
        // sleeperCache.delete(`live_scores:${leagueId}:${currentWeek}`);
        
        result = await sleeperRealTimeScoringService.updateLeagueScores(leagueId);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: update_league, update_all, start_live_updates, stop_live_updates, or force_update' },
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
    console.error('[API] Scoring POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Scoring operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}