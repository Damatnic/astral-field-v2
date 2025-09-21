import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required'
      }, { status: 400 });
    }

    // Get user's team
    const team = await prisma.team.findFirst({
      where: { ownerId: userId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            season: true,
            currentWeek: true
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({
        success: false,
        message: 'No team found for user'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          wins: team.wins,
          losses: team.losses,
          ties: team.ties,
          pointsFor: Number(team.pointsFor),
          pointsAgainst: Number(team.pointsAgainst),
          league: team.league
        }
      }
    });

  } catch (error) {
    console.error('Error fetching my team:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch team data'
    }, { status: 500 });
  }
}