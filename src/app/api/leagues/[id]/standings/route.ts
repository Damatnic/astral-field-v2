import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = params.id;

    // Get basic team standings
    const teams = await prisma.team.findMany({
      where: { leagueId: leagueId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: [
        { wins: 'desc' },
        { pointsFor: 'desc' }
      ]
    });

    const standings = teams.map((team, index) => ({
      rank: index + 1,
      teamId: team.id,
      teamName: team.name,
      ownerName: team.owner.name,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      pointsFor: Number(team.pointsFor),
      pointsAgainst: Number(team.pointsAgainst),
      winPercentage: team.wins + team.losses > 0 
        ? Number((team.wins / (team.wins + team.losses)).toFixed(3))
        : 0
    }));

    return NextResponse.json({
      success: true,
      data: { standings }
    });

  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch standings' },
      { status: 500 }
    );
  }
}