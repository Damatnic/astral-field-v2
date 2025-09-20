import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/roster - Get current user's roster
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    // Get team roster
    const team = teamId 
      ? await prisma.team.findUnique({
          where: { id: teamId }
        })
      : await prisma.team.findFirst({
          where: { ownerId: session.userId }
        });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Get roster with player details
    const roster = await prisma.rosterPlayer.findMany({
      where: { teamId: team.id },
      include: {
        player: true
      },
      orderBy: [
        { position: 'asc' },
        { player: { name: 'asc' } }
      ]
    });
    
    // Group players by position
    const rosterByPosition = {
      QB: roster.filter(r => r.player.position === 'QB'),
      RB: roster.filter(r => r.player.position === 'RB'),
      WR: roster.filter(r => r.player.position === 'WR'),
      TE: roster.filter(r => r.player.position === 'TE'),
      K: roster.filter(r => r.player.position === 'K'),
      DST: roster.filter(r => r.player.position === 'DST'),
      BENCH: roster.filter(r => r.position === 'BENCH')
    };
    
    return NextResponse.json({
      success: true,
      roster: roster.map(rp => ({
        playerId: rp.playerId,
        name: rp.player.name,
        position: rp.player.position,
        team: rp.player.nflTeam,
        rosterSlot: rp.position,
        status: rp.player.status,
        injuryStatus: rp.player.injuryStatus,
        byeWeek: rp.player.byeWeek,
        acquisitionType: rp.acquisitionType,
        acquisitionDate: rp.acquisitionDate,
        isLocked: rp.isLocked,
        lastWeekPoints: 0
      })),
      rosterByPosition,
      teamId: team.id,
      teamName: team.name
    });
    
  } catch (error) {
    console.error('Roster fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roster' },
      { status: 500 }
    );
  }
}