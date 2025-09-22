import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const week = searchParams.get('week');

    if (!teamId) {
      return NextResponse.json({
        success: false,
        message: 'Team ID is required'
      }, { status: 400 });
    }

    // Get team's roster
    const roster = await prisma.roster.findMany({
      where: { teamId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            status: true
          }
        }
      }
    });

    const lineup = {
      teamId,
      week: week || 'current',
      players: roster.map(r => ({
        id: r.player.id,
        name: r.player.name,
        position: r.player.position,
        nflTeam: r.player.nflTeam,
        rosterPosition: r.position,
        isStarter: r.isStarter
      }))
    };

    return NextResponse.json({
      success: true,
      data: lineup
    });

  } catch (error) {
    console.error('Error fetching lineup:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch lineup'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, lineup, week } = body;

    if (!teamId || !lineup) {
      return NextResponse.json({
        success: false,
        message: 'Team ID and lineup are required'
      }, { status: 400 });
    }

    // Validate lineup format
    if (!Array.isArray(lineup)) {
      return NextResponse.json({
        success: false,
        message: 'Lineup must be an array'
      }, { status: 400 });
    }

    // Update roster positions in transaction
    await prisma.$transaction(async (tx) => {
      for (const player of lineup) {
        await tx.roster.updateMany({
          where: {
            teamId,
            playerId: player.playerId
          },
          data: {
            isStarter: player.isStarter,
            position: player.position
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Lineup updated successfully'
    });

  } catch (error) {
    console.error('Error updating lineup:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update lineup'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Use the same logic as POST for lineup updates
  return POST(request);
}