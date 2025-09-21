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
    const leagueId = searchParams.get('leagueId');
    
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
    
    // Get user's team for the specified league
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    const team = await prisma.team.findFirst({
      where: { 
        ownerId: session.userId,
        leagueId: targetLeagueId
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found in this league' },
        { status: 404 }
      );
    }
    
    // Build where clause
    const where: any = {
      teamId: team.id,
      type: 'waiver'
    };
    
    if (status) {
      where.status = status;
    }
    
    // Get waiver claims as transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format claims with player data
    const claims = await Promise.all(transactions.map(async (transaction) => {
      const data = transaction.relatedData as any;
      const playerId = transaction.playerIds[0];
      const player = playerId ? await prisma.player.findUnique({
        where: { id: playerId }
      }) : null;
      
      return {
        id: transaction.id,
        playerId,
        player,
        dropPlayerId: data?.dropPlayerId,
        priority: data?.priority,
        faabBid: data?.faabBid,
        status: transaction.status,
        createdAt: transaction.createdAt,
        processedAt: transaction.processedAt
      };
    }));
    
    return NextResponse.json({
      success: true,
      claims: claims.map(claim => ({
        id: claim.id,
        player: claim.player ? {
          id: claim.playerId,
          name: claim.player.name,
          position: claim.player.position,
          team: claim.player.nflTeam
        } : null,
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

async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}