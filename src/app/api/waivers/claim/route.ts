import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/waivers/claim - Create a new waiver claim
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, dropPlayerId, bidAmount, leagueId } = body;
    
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
    
    // Validate required fields
    if (!playerId || !leagueId) {
      return NextResponse.json(
        { error: 'playerId and leagueId are required' },
        { status: 400 }
      );
    }
    
    // Get user's team in the league
    const team = await prisma.team.findFirst({
      where: {
        ownerId: session.userId,
        leagueId
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'You do not have a team in this league' },
        { status: 403 }
      );
    }
    
    // Verify player is available
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        rosterPlayers: {
          where: {
            team: {
              leagueId
            }
          }
        }
      }
    });
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    if (player.rosterPlayers.length > 0) {
      return NextResponse.json(
        { error: 'Player is already on a roster' },
        { status: 400 }
      );
    }
    
    // Check FAAB budget if using FAAB
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { settings: true }
    });
    
    const settings = league?.settings as any;
    const usesFAAB = settings?.waiverType === 'FAAB';
    
    if (usesFAAB) {
      if (!bidAmount || bidAmount < 0) {
        return NextResponse.json(
          { error: 'Valid bid amount required for FAAB waivers' },
          { status: 400 }
        );
      }
      
      // Check available FAAB budget
      const existingBids = await prisma.waiverClaim.aggregate({
        where: {
          teamId: team.id,
          status: 'PENDING'
        },
        _sum: {
          bidAmount: true
        }
      });
      
      const pendingBids = existingBids._sum.bidAmount || 0;
      const availableFAAB = team.faabBudget - team.faabSpent - pendingBids;
      
      if (bidAmount > availableFAAB) {
        return NextResponse.json(
          { error: `Insufficient FAAB budget. Available: $${availableFAAB}` },
          { status: 400 }
        );
      }
    }
    
    // Verify drop player if specified
    if (dropPlayerId) {
      const dropPlayer = await prisma.rosterPlayer.findFirst({
        where: {
          playerId: dropPlayerId,
          teamId: team.id
        }
      });
      
      if (!dropPlayer) {
        return NextResponse.json(
          { error: 'You do not own the player you want to drop' },
          { status: 400 }
        );
      }
    }
    
    // Check roster size limits
    const currentRosterSize = await prisma.rosterPlayer.count({
      where: { teamId: team.id }
    });
    
    const maxRosterSize = settings?.maxRosterSize || 16;
    
    if (!dropPlayerId && currentRosterSize >= maxRosterSize) {
      return NextResponse.json(
        { error: 'Roster is full. You must drop a player to make this claim.' },
        { status: 400 }
      );
    }
    
    // Check for duplicate claim
    const existingClaim = await prisma.waiverClaim.findFirst({
      where: {
        teamId: team.id,
        playerId,
        status: 'PENDING'
      }
    });
    
    if (existingClaim) {
      return NextResponse.json(
        { error: 'You already have a pending claim for this player' },
        { status: 400 }
      );
    }
    
    // Create waiver claim
    const claim = await prisma.waiverClaim.create({
      data: {
        teamId: team.id,
        playerId,
        dropPlayerId: dropPlayerId || null,
        bidAmount: usesFAAB ? bidAmount : 0,
        priority: team.waiverPriority,
        status: 'PENDING',
        createdAt: new Date()
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true
          }
        },
        dropPlayer: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: claim,
      message: 'Waiver claim submitted successfully'
    });
    
  } catch (error) {
    console.error('Waiver claim error:', error);
    return NextResponse.json(
      { error: 'Failed to submit waiver claim' },
      { status: 500 }
    );
  }
}

// GET /api/waivers/claim - Get user's waiver claims
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
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
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
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
        { error: 'No team found in this league' },
        { status: 404 }
      );
    }
    
    // Build query
    const where: any = {
      teamId: team.id
    };
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    // Get claims
    const claims = await prisma.waiverClaim.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            status: true
          }
        },
        dropPlayer: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({
      success: true,
      data: claims
    });
    
  } catch (error) {
    console.error('Get waiver claims error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waiver claims' },
      { status: 500 }
    );
  }
}

// DELETE /api/waivers/claim - Cancel a waiver claim
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('claimId');
    
    if (!claimId) {
      return NextResponse.json(
        { error: 'claimId is required' },
        { status: 400 }
      );
    }
    
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
    
    // Get the claim
    const claim = await prisma.waiverClaim.findUnique({
      where: { id: claimId },
      include: {
        team: true
      }
    });
    
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (claim.team.ownerId !== session.userId) {
      return NextResponse.json(
        { error: 'You can only cancel your own claims' },
        { status: 403 }
      );
    }
    
    // Check if claim can be cancelled
    if (claim.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending claims can be cancelled' },
        { status: 400 }
      );
    }
    
    // Delete the claim
    await prisma.waiverClaim.delete({
      where: { id: claimId }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Waiver claim cancelled successfully'
    });
    
  } catch (error) {
    console.error('Cancel waiver claim error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel waiver claim' },
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