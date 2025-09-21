import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive') === 'true';
    const season = searchParams.get('season');

    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (season) {
      whereClause.season = season;
    }

    const leagues = await prisma.league.findMany({
      where: whereClause,
      include: {
        commissioner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        teams: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const transformedLeagues = leagues.map(league => ({
      id: league.id,
      name: league.name,
      season: league.season,
      currentWeek: league.currentWeek,
      isActive: league.isActive,
      commissioner: {
        id: league.commissioner.id,
        name: league.commissioner.name,
        email: league.commissioner.email
      },
      teamCount: league.teams.length,
      members: league.teams.map(team => ({
        id: team.owner.id,
        name: team.owner.name,
        teamName: team.name
      }))
    }));

    return NextResponse.json({
      success: true,
      data: transformedLeagues
    });

  } catch (error) {
    console.error('Error fetching leagues:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leagues' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, season = "2024" } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'League name is required' },
        { status: 400 }
      );
    }

    // For now, return not implemented
    return NextResponse.json(
      { success: false, message: 'League creation not implemented yet' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Error creating league:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create league' },
      { status: 500 }
    );
  }
}