import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/waivers - Get waiver claims
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
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
      where: { ownerId: session.userId }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Build where clause
    const where: any = {
      teamId: team.id
    };
    
    if (status) {
      where.status = status;
    }
    
    // Get waiver claims
    const claims = await prisma.waiverClaim.findMany({
      where,
      include: {
        player: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({
      success: true,
      claims: claims.map(claim => ({
        id: claim.id,
        player: {
          id: claim.playerId,
          name: claim.player.name,
          position: claim.player.position,
          team: claim.player.nflTeam
        },
        dropPlayerId: claim.dropPlayerId,
        priority: claim.priority,
        bidAmount: claim.faabBid,
        status: claim.status,
        createdAt: claim.createdAt,
        processedAt: claim.processedAt
      })),
      waiverPosition: team.waiverPriority,
      faabRemaining: team.faabBudget - team.faabSpent
    });
    
  } catch (error) {
    console.error('Waivers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waivers' },
      { status: 500 }
    );
  }
}