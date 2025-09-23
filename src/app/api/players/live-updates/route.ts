import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { redisCache, fantasyKeys } from '@/lib/redis-cache';
import { CACHE_TAGS } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// GET /api/players/live-updates - Get real-time player updates
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since'); // ISO timestamp
    const playerIds = searchParams.get('playerIds')?.split(',');
    const types = searchParams.get('types')?.split(',') || ['all'];

    // Build cache key
    const cacheKey = fantasyKeys.liveUpdates(since, playerIds, types);
    
    // Try cache first (very short TTL for live data)
    const cached = await redisCache.get(cacheKey, [CACHE_TAGS.LIVE_UPDATES]);
    
    if (cached) {
      return NextResponse.json(cached);
    }

    // Generate live updates (in production, this would come from real data sources)
    const liveUpdates = await generateLiveUpdates(since, playerIds, types);

    // Cache for 30 seconds only
    await redisCache.set(cacheKey, liveUpdates, 30, [CACHE_TAGS.LIVE_UPDATES]);

    return NextResponse.json(liveUpdates);

  } catch (error) {
    handleComponentError(error as Error, 'live-updates-api');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// SSE endpoint for real-time streaming
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { playerIds, updateTypes } = body;

    // In production, this would establish a WebSocket or SSE connection
    // For now, return subscription confirmation
    return NextResponse.json({
      success: true,
      subscribed: true,
      playerIds,
      updateTypes,
      endpoint: '/api/players/live-updates/stream'
    });

  } catch (error) {
    handleComponentError(error as Error, 'live-updates-subscribe');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateLiveUpdates(
  since?: string | null,
  playerIds?: string[],
  types?: string[]
) {
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
  const now = new Date();

  // Simulate different types of live updates
  const updates = [];

  // Injury updates
  if (!types || types.includes('all') || types.includes('injury')) {
    updates.push({
      id: `injury_${Date.now()}_1`,
      type: 'injury',
      playerId: '1',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000),
      data: {
        status: 'questionable',
        injuryDetails: 'Ankle - Limited in practice',
        impact: 'medium',
        source: 'Team Report'
      },
      priority: 'high'
    });
  }

  // Projection updates
  if (!types || types.includes('all') || types.includes('projection')) {
    updates.push({
      id: `projection_${Date.now()}_1`,
      type: 'projection',
      playerId: '2',
      timestamp: new Date(now.getTime() - 3 * 60 * 1000),
      data: {
        oldProjection: 19.3,
        newProjection: 21.1,
        change: 1.8,
        confidence: 85,
        source: 'Expert Analysis'
      },
      priority: 'medium'
    });

    updates.push({
      id: `projection_${Date.now()}_2`,
      type: 'projection',
      playerId: '3',
      timestamp: new Date(now.getTime() - 7 * 60 * 1000),
      data: {
        oldProjection: 23.5,
        newProjection: 22.2,
        change: -1.3,
        confidence: 78,
        source: 'Weather Update'
      },
      priority: 'medium'
    });
  }

  // Ownership updates
  if (!types || types.includes('all') || types.includes('ownership')) {
    updates.push({
      id: `ownership_${Date.now()}_1`,
      type: 'ownership',
      playerId: '4',
      timestamp: new Date(now.getTime() - 2 * 60 * 1000),
      data: {
        oldOwnership: 89.1,
        newOwnership: 91.5,
        change: 2.4,
        platform: 'DraftKings',
        trend: 'up'
      },
      priority: 'low'
    });
  }

  // News updates
  if (!types || types.includes('all') || types.includes('news')) {
    updates.push({
      id: `news_${Date.now()}_1`,
      type: 'news',
      playerId: '1',
      timestamp: new Date(now.getTime() - 10 * 60 * 1000),
      data: {
        headline: 'McCaffrey expected to play despite ankle concern',
        content: 'Sources indicate that Christian McCaffrey is expected to suit up for Sunday\'s game...',
        source: 'ESPN',
        impact: 'positive',
        severity: 'medium'
      },
      priority: 'high'
    });
  }

  // Social updates
  if (!types || types.includes('all') || types.includes('social')) {
    updates.push({
      id: `social_${Date.now()}_1`,
      type: 'social',
      playerId: '2',
      timestamp: new Date(now.getTime() - 1 * 60 * 1000),
      data: {
        action: 'trending_up',
        likes: 156,
        notes: 23,
        watchers: 89,
        recentActivity: 'High community interest'
      },
      priority: 'low'
    });
  }

  // Game updates (during games)
  if (!types || types.includes('all') || types.includes('game')) {
    const gameTime = new Date();
    const isGameTime = gameTime.getDay() === 0 && gameTime.getHours() >= 13; // Sunday afternoon

    if (isGameTime) {
      updates.push({
        id: `game_${Date.now()}_1`,
        type: 'game',
        playerId: '1',
        timestamp: new Date(now.getTime() - 30 * 1000),
        data: {
          event: 'touchdown',
          quarter: 2,
          timeRemaining: '3:42',
          stats: {
            carries: 12,
            rushingYards: 85,
            touchdowns: 2
          },
          fantasyPoints: 18.5
        },
        priority: 'urgent'
      });
    }
  }

  // Weather updates
  if (!types || types.includes('all') || types.includes('weather')) {
    updates.push({
      id: `weather_${Date.now()}_1`,
      type: 'weather',
      playerId: '3',
      timestamp: new Date(now.getTime() - 20 * 60 * 1000),
      data: {
        location: 'Buffalo, NY',
        conditions: 'Snow showers',
        temperature: 28,
        windSpeed: 15,
        impact: 'Decreased passing game expected',
        severity: 'high'
      },
      priority: 'medium'
    });
  }

  // Filter by playerIds if specified
  const filteredUpdates = playerIds 
    ? updates.filter(update => playerIds.includes(update.playerId))
    : updates;

  // Filter by timestamp
  const recentUpdates = filteredUpdates.filter(update => update.timestamp >= sinceDate);

  // Sort by timestamp (newest first)
  recentUpdates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    updates: recentUpdates,
    timestamp: now.toISOString(),
    hasMore: false,
    nextPoll: new Date(now.getTime() + 15 * 1000).toISOString() // Poll again in 15 seconds
  };
}

// Utility function to get update priority color
function getUpdatePriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'red';
    case 'high': return 'orange';
    case 'medium': return 'yellow';
    case 'low': return 'blue';
    default: return 'gray';
  }
}

// Utility function to format update message
function formatUpdateMessage(update: any): string {
  switch (update.type) {
    case 'injury':
      return `Injury Update: ${update.data.injuryDetails}`;
    case 'projection':
      const direction = update.data.change > 0 ? 'increased' : 'decreased';
      return `Projection ${direction} by ${Math.abs(update.data.change)} points`;
    case 'ownership':
      return `Ownership ${update.data.trend} to ${update.data.newOwnership}%`;
    case 'news':
      return update.data.headline;
    case 'social':
      return update.data.recentActivity;
    case 'game':
      return `${update.data.event.toUpperCase()}: Q${update.data.quarter} ${update.data.timeRemaining}`;
    case 'weather':
      return `Weather Alert: ${update.data.conditions} - ${update.data.impact}`;
    default:
      return 'Player update available';
  }
}