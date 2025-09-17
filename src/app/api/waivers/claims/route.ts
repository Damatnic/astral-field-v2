import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's team and league
    const team = await prisma.team.findFirst({
      where: { userId: user.id },
      include: {
        league: true,
        waiverClaims: {
          include: {
            player: true,
            dropPlayer: true
          },
          where: {
            status: 'PENDING'
          },
          orderBy: {
            priority: 'asc'
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      claims: team.waiverClaims,
      faabBudget: team.faabBudget,
      waiverPriority: team.waiverPriority
    });

  } catch (error) {
    console.error('Get waiver claims error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch waiver claims' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId, dropPlayerId, bidAmount } = await request.json();

    // Get user's team
    const team = await prisma.team.findFirst({
      where: { userId: user.id },
      include: { league: true }
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Validate FAAB bid
    if (bidAmount > team.faabBudget) {
      return NextResponse.json(
        { success: false, error: 'Insufficient FAAB budget' },
        { status: 400 }
      );
    }

    // Check if player is available
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 });
    }

    // Check if player is already on a roster
    const existingRoster = await prisma.rosterPlayer.findFirst({
      where: {
        playerId,
        team: {
          leagueId: team.leagueId
        }
      }
    });

    if (existingRoster) {
      return NextResponse.json(
        { success: false, error: 'Player is not available' },
        { status: 400 }
      );
    }

    // Get current claims count to set priority
    const claimsCount = await prisma.waiverClaim.count({
      where: {
        teamId: team.id,
        status: 'PENDING'
      }
    });

    // Create waiver claim
    const claim = await prisma.waiverClaim.create({
      data: {
        teamId: team.id,
        playerId,
        dropPlayerId,
        bidAmount,
        priority: claimsCount + 1,
        status: 'PENDING',
        weekNumber: getCurrentWeek()
      },
      include: {
        player: true,
        dropPlayer: true
      }
    });

    return NextResponse.json({
      success: true,
      claim,
      message: 'Waiver claim submitted successfully'
    });

  } catch (error) {
    console.error('Submit waiver claim error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit waiver claim' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { claimId } = await request.json();

    // Get user's team
    const team = await prisma.team.findFirst({
      where: { userId: user.id }
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Delete the claim (only if it belongs to the user's team)
    const deleted = await prisma.waiverClaim.deleteMany({
      where: {
        id: claimId,
        teamId: team.id,
        status: 'PENDING'
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Claim not found or cannot be deleted' },
        { status: 404 }
      );
    }

    // Reorder remaining claims
    const remainingClaims = await prisma.waiverClaim.findMany({
      where: {
        teamId: team.id,
        status: 'PENDING'
      },
      orderBy: {
        priority: 'asc'
      }
    });

    // Update priorities
    for (let i = 0; i < remainingClaims.length; i++) {
      await prisma.waiverClaim.update({
        where: { id: remainingClaims[i].id },
        data: { priority: i + 1 }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Waiver claim cancelled'
    });

  } catch (error) {
    console.error('Cancel waiver claim error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel waiver claim' },
      { status: 500 }
    );
  }
}

function getCurrentWeek(): number {
  // Calculate current NFL week based on date
  const seasonStart = new Date('2025-09-04'); // 2025 NFL season start
  const now = new Date();
  const diff = now.getTime() - seasonStart.getTime();
  const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, Math.min(weeks + 1, 18)); // NFL regular season weeks 1-18
}