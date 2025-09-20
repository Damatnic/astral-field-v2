import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/lineup/optimize - Get optimized lineup suggestions
export async function GET(request: NextRequest) {
  try {
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
    
    // Get user's team
    const team = await prisma.team.findFirst({
      where: { ownerId: session.userId },
      include: {
        roster: {
          include: {
            player: true
          }
        }
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Sort players by name for now (would use projections in real app)
    const playersWithProjections = team.roster
      .map(rp => ({
        ...rp,
        projectedPoints: Math.random() * 20 // Mock projection
      }))
      .sort((a, b) => b.projectedPoints - a.projectedPoints);
    
    // Build optimal lineup based on roster requirements
    const optimalLineup = {
      QB: playersWithProjections
        .filter(p => p.player.position === 'QB')
        .slice(0, 1),
      RB: playersWithProjections
        .filter(p => p.player.position === 'RB')
        .slice(0, 2),
      WR: playersWithProjections
        .filter(p => p.player.position === 'WR')
        .slice(0, 2),
      TE: playersWithProjections
        .filter(p => p.player.position === 'TE')
        .slice(0, 1),
      FLEX: playersWithProjections
        .filter(p => ['RB', 'WR', 'TE'].includes(p.player.position))
        .filter(p => {
          // Exclude players already in starting positions
          const starters = [
            ...optimalLineup.RB,
            ...optimalLineup.WR,
            ...optimalLineup.TE
          ];
          return !starters.some(s => s.playerId === p.playerId);
        })
        .slice(0, 1),
      K: playersWithProjections
        .filter(p => p.player.position === 'K')
        .slice(0, 1),
      DST: playersWithProjections
        .filter(p => p.player.position === 'DST')
        .slice(0, 1)
    };
    
    // Calculate total projected points
    const totalProjectedPoints = Object.values(optimalLineup)
      .flat()
      .reduce((sum, player) => sum + player.projectedPoints, 0);
    
    return NextResponse.json({
      success: true,
      lineup: optimalLineup,
      totalProjectedPoints,
      recommendations: [
        'Start your highest projected players',
        'Check injury reports before game time',
        'Consider matchups against weak defenses',
        'Monitor weather conditions for outdoor games'
      ]
    });
    
  } catch (error) {
    console.error('Lineup optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize lineup' },
      { status: 500 }
    );
  }
}