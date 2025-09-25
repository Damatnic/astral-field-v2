import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
        roster: {
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
    
    if (player.roster.length > 0) {
      return NextResponse.json(
        { error: 'Player is already on a roster' },
        { status: 400 }
      );
    }
    
    // Check FAAB budget if using FAAB
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { settings: true, currentWeek: true }
    });
    
    const settings = league?.settings as any;
    const usesFAAB = settings?.waiverMode === 'FAAB';
    
    if (usesFAAB) {
      if (bidAmount === undefined || bidAmount === null || bidAmount < 0) {
        return NextResponse.json(
          { error: 'Valid bid amount required for FAAB waivers (minimum $0)' },
          { status: 400 }
        );
      }
      
      // FAAB budget limits
      const maxBidAllowed = team.faabBudget; // Can't bid more than total budget
      if (bidAmount > maxBidAllowed) {
        return NextResponse.json(
          { error: `Bid amount cannot exceed total FAAB budget of $${maxBidAllowed}` },
          { status: 400 }
        );
      }
      
      // Check available FAAB budget (current + pending bids)
      const existingBids = await prisma.transaction.findMany({
        where: {
          teamId: team.id,
          status: 'pending',
          type: 'waiver'
        }
      });
      
      const pendingBids = existingBids.reduce((sum, bid) => {
        const data = bid.relatedData as any;
        return sum + (data?.faabBid || 0);
      }, 0);
      const availableFAAB = team.faabBudget - team.faabSpent - pendingBids;
      
      if (bidAmount > availableFAAB) {
        return NextResponse.json(
          { error: `Insufficient FAAB budget. Available: $${availableFAAB} (Total: $${team.faabBudget}, Spent: $${team.faabSpent}, Pending: $${pendingBids})` },
          { status: 400 }
        );
      }
      
      // Check minimum bid requirements (optional)
      const minBidRequired = settings?.waiverSettings?.minimumBid || 0;
      if (bidAmount < minBidRequired) {
        return NextResponse.json(
          { error: `Minimum bid amount is $${minBidRequired}` },
          { status: 400 }
        );
      }
    } else {
      // For non-FAAB leagues, bidAmount should be null or 0
      if (bidAmount && bidAmount > 0) {
        return NextResponse.json(
          { error: 'This league does not use FAAB bidding' },
          { status: 400 }
        );
      }
    }
    
    // Duplicate validation removed - handled above in enhanced roster validation
    
    // Enhanced roster validation
    const currentRoster = await prisma.roster.findMany({
      where: { teamId: team.id },
      include: {
        player: {
          select: {
            position: true,
            status: true,
            name: true
          }
        }
      }
    });
    
    const rosterSettings = settings?.rosterSlots || {
      QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DST: 1, BENCH: 6
    };
    const maxRosterSize = settings?.maxRosterSize || 16;
    
    // Check total roster size
    if (!dropPlayerId && currentRoster.length >= maxRosterSize) {
      return NextResponse.json(
        { error: `Roster is full (${currentRoster.length}/${maxRosterSize}). You must drop a player to make this claim.` },
        { status: 400 }
      );
    }
    
    // Check position limits (if enforced)
    const enforcePositionLimits = settings?.enforcePositionLimits || false;
    if (enforcePositionLimits && !dropPlayerId) {
      const positionCount = currentRoster.filter(rp => rp.player.position === player.position).length;
      const maxForPosition = rosterSettings[player.position] || 0;
      
      if (positionCount >= maxForPosition) {
        return NextResponse.json(
          { error: `Cannot add more ${player.position} players. Current: ${positionCount}/${maxForPosition}. Drop a ${player.position} first.` },
          { status: 400 }
        );
      }
    }
    
    // Validate drop player is droppable
    if (dropPlayerId) {
      const dropPlayer = await prisma.roster.findFirst({
        where: {
          playerId: dropPlayerId,
          teamId: team.id
        },
        include: {
          player: {
            select: {
              name: true,
              position: true,
              status: true
            }
          }
        }
      });
      
      if (!dropPlayer) {
        return NextResponse.json(
          { error: 'You do not own the player you want to drop' },
          { status: 400 }
        );
      }
      
      // Check if player is locked (in lineup during games)
      if (dropPlayer.isLocked) {
        return NextResponse.json(
          { error: `Cannot drop ${dropPlayer.player.name} - player is locked in lineup` },
          { status: 400 }
        );
      }
      
      // Check if player is on IR and can't be dropped during season
      const preventIRDrops = settings?.preventIRDrops || false;
      if (preventIRDrops && dropPlayer.position === 'IR') {
        return NextResponse.json(
          { error: `Cannot drop ${dropPlayer.player.name} from IR during the season` },
          { status: 400 }
        );
      }
    }
    
    // Check for duplicate claim
    const existingClaim = await prisma.transaction.findFirst({
      where: {
        teamId: team.id,
        playerIds: {
          has: playerId
        },
        status: 'pending',
        type: 'waiver'
      }
    });
    
    if (existingClaim) {
      return NextResponse.json(
        { error: 'You already have a pending claim for this player' },
        { status: 400 }
      );
    }
    
    // Get player details for response
    const playerDetails = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
        position: true,
        nflTeam: true
      }
    });

    // Create waiver claim as a transaction
    const claim = await prisma.transaction.create({
      data: {
        leagueId,
        teamId: team.id,
        type: 'waiver',
        status: 'pending',
        playerIds: [playerId],
        relatedData: {
          userId: session.userId,
          dropPlayerId: dropPlayerId || null,
          faabBid: usesFAAB ? bidAmount : null,
          priority: team.waiverPriority,
          weekNumber: league?.currentWeek || 1,
          playerName: playerDetails?.name,
          playerPosition: playerDetails?.position,
          playerNflTeam: playerDetails?.nflTeam
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: claim.id,
        playerId,
        player: playerDetails,
        faabBid: usesFAAB ? bidAmount : null,
        status: claim.status,
        createdAt: claim.createdAt
      },
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
    const claims = await prisma.transaction.findMany({
      where: {
        ...where,
        type: 'waiver'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format claims with player data
    const formattedClaims = await Promise.all(claims.map(async (claim) => {
      const data = claim.relatedData as any;
      const playerId = claim.playerIds[0];
      const player = playerId ? await prisma.player.findUnique({
        where: { id: playerId },
        select: {
          id: true,
          name: true,
          position: true,
          nflTeam: true,
          status: true
        }
      }) : null;
      
      return {
        id: claim.id,
        teamId: claim.teamId,
        playerId,
        player,
        faabBid: data?.faabBid,
        priority: data?.priority,
        status: claim.status,
        weekNumber: data?.weekNumber,
        createdAt: claim.createdAt,
        processedAt: claim.processedAt
      };
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedClaims
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
    const claim = await prisma.transaction.findUnique({
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
    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending claims can be cancelled' },
        { status: 400 }
      );
    }
    
    // Delete the claim
    await prisma.transaction.delete({
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