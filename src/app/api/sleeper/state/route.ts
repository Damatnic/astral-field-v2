/**
 * Sleeper NFL State API Endpoint
 * Provides current NFL season and week information from Sleeper API
 * 
 * Routes:
 * GET /api/sleeper/state - Get current NFL state
 * POST /api/sleeper/state/refresh - Force refresh state cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { nflStateService } from '@/services/sleeper/nflStateService';
import { sleeperClient } from '@/services/sleeper/core/sleeperClient';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    if (detailed) {
      // Return comprehensive state information
      const state = await nflStateService.getCurrentState();
      const seasonInfo = await nflStateService.getSeasonInfo();
      const gameSchedule = await nflStateService.getCurrentGameSchedule();
      const isGameDay = await nflStateService.isGameDay();
      const isScoringPeriod = await nflStateService.isScoringPeriod();
      const nextGameDay = await nflStateService.getNextGameDay();
      const timingRecommendations = await nflStateService.getTimingRecommendations();

      return NextResponse.json({
        success: true,
        data: {
          state,
          seasonInfo,
          gameSchedule,
          status: {
            isGameDay,
            isScoringPeriod,
            nextGameDay
          },
          recommendations: timingRecommendations
        }
      });
    } else {
      // Return basic state information
      const state = await nflStateService.getCurrentState();
      
      return NextResponse.json({
        success: true,
        data: {
          season: state.season,
          week: state.week,
          seasonType: state.season_type,
          weekStartDate: state.week_start_date,
          weekEndDate: state.week_end_date
        }
      });
    }

  } catch (error) {
    console.error('❌ Error fetching NFL state:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch NFL state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Refreshing NFL state cache...');
    
    const state = await nflStateService.refreshState();
    
    return NextResponse.json({
      success: true,
      message: 'NFL state refreshed successfully',
      data: {
        season: state.season,
        week: state.week,
        seasonType: state.season_type,
        refreshedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error refreshing NFL state:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh NFL state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}