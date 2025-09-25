import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';
import { database } from '@/lib/database';
import { asyncHandler } from '@/lib/error-handling';

export const dynamic = 'force-dynamic';

const prisma = database.getClient();

async function getTeamsHandler(request: NextRequest) {
  try {
    // Fetch teams with their related data
    const teams = await prisma.team.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            season: true
          }
        }
      },
      orderBy: [
        { wins: 'desc' },
        { pointsFor: 'desc' }
      ]
    });

    // Transform data for response
    const teamsData = teams.map(team => ({
      id: team.id,
      name: team.name,
      logo: team.logo,
      owner: team.owner,
      league: team.league,
      record: {
        wins: team.wins,
        losses: team.losses,
        ties: team.ties
      },
      points: {
        for: team.pointsFor,
        against: team.pointsAgainst
      },
      standing: team.standing,
      playoffSeed: team.playoffSeed,
      waiverPriority: team.waiverPriority,
      faabBudget: team.faabBudget,
      faabSpent: team.faabSpent
    }));

    return NextResponse.json({
      success: true,
      teams: teamsData,
      total: teamsData.length
    });

  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch teams'
    }, { status: 500 });
  }
}

// Apply rate limiting to the teams endpoint
export const GET = asyncHandler(async (request: NextRequest) => {
  return withRateLimit(
    request,
    RATE_LIMIT_CONFIGS.read,
    () => getTeamsHandler(request)
  );
});

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}