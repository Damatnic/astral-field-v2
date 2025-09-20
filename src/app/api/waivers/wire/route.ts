import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/waivers/wire - Get available players on waiver wire
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');
    const limit = parseInt(searchParams.get('limit') || '50');
    
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
    
    // Get user's team to find league
    const team = await prisma.team.findFirst({
      where: { ownerId: session.userId }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Get all rostered players in the league
    const rosteredPlayers = await prisma.rosterPlayer.findMany({
      where: {
        team: {
          leagueId: team.leagueId
        }
      },
      select: {
        playerId: true
      }
    });
    
    const rosteredPlayerIds = rosteredPlayers.map(rp => rp.playerId);
    
    // Build query for available players
    const where: any = {
      id: {
        notIn: rosteredPlayerIds
      },
      status: {
        in: ['ACTIVE', 'OUT']
      }
    };
    
    if (position) {
      where.position = position;
    }
    
    // Get available players
    const availablePlayers = await prisma.player.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      take: limit
    });
    
    // Format players for response
    const playersWithPoints = availablePlayers.map(player => {
      return {
        id: player.id,
        name: player.name,
        position: player.position,
        team: player.nflTeam,
        status: player.status,
        injuryStatus: player.injuryStatus,
        byeWeek: player.byeWeek,
        totalPoints: 0,
        avgPoints: 0,
        projectedPoints: 0,
        recentGames: []
      };
    });
    
    // Sort by average points
    playersWithPoints.sort((a, b) => b.avgPoints - a.avgPoints);
    
    return NextResponse.json({
      success: true,
      players: playersWithPoints,
      total: playersWithPoints.length
    });
    
  } catch (error) {
    console.error('Waiver wire error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waiver wire' },
      { status: 500 }
    );
  }
}