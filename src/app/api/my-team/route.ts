import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await authenticateFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Get user's team
    const team = await prisma.team.findFirst({
      where: { ownerId: currentUser.id },
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
        record: { wins: team.wins, losses: team.losses, ties: team.ties },
        standing: team.standing || 1,
        playoffChance: 75, // Calculate based on standings
        pointsFor: Number(team.pointsFor),
        pointsAgainst: Number(team.pointsAgainst),
        projectedTotal: 125, // Default projection
        weeklyRank: team.standing || 1,
        powerRanking: team.standing || 1,
        transactions: 5, // Default transaction count
        team: {
          id: team.id,
          name: team.name,
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