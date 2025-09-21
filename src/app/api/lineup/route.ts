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
  return NextResponse.json({
    success: false,
    message: 'Lineup updates not implemented yet'
  }, { status: 501 });
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Lineup updates not implemented yet'
  }, { status: 501 });
}