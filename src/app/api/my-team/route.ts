import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { handleComponentError } from '@/lib/error-handling';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// GET /api/my-team - Get current user's team
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user's team in the current league
    const userTeam = await prisma.team.findFirst({
      where: {
        ownerId: user.id
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            season: true
          }
        },
        roster: {
          select: {
            id: true,
            position: true
          }
        }
      }
    });

    if (!userTeam) {
      return NextResponse.json(
        { success: false, message: 'No team found for current user' },
        { status: 404 }
      );
    }

    const teamData = {
      id: userTeam.id,
      name: userTeam.name,
      leagueId: userTeam.leagueId,
      wins: userTeam.wins,
      losses: userTeam.losses,
      ties: userTeam.ties,
      pointsFor: userTeam.pointsFor,
      pointsAgainst: userTeam.pointsAgainst,
      owner: userTeam.owner,
      league: userTeam.league,
      rosterCount: userTeam.roster.length
    };

    return NextResponse.json({
      success: true,
      data: teamData
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}