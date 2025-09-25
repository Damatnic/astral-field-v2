import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's team and league
    const team = await prisma.team.findFirst({
      where: { ownerId: user.id },
      include: {
        league: true,
        transactions: {
          where: {
            type: 'waiver',
            status: 'pending'
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Format claims with player data
    const claimsWithPlayers = await Promise.all(team.transactions.map(async (transaction) => {
      const data = transaction.relatedData as any;
      const playerId = transaction.playerIds[0];
      const player = playerId ? await prisma.player.findUnique({
        where: { id: playerId }
      }) : null;
      
      return {
        id: transaction.id,
        player,
        faabBid: data?.faabBid,
        priority: data?.priority,
        status: transaction.status
      };
    }));

    return NextResponse.json({
      success: true,
      claims: claimsWithPlayers,
      faabBudget: team.faabBudget,
      waiverPriority: team.waiverPriority
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
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
      where: { ownerId: user.id },
      include: { league: true }
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Validate FAAB bid
    const availableFaab = team.faabBudget - team.faabSpent;
    if (bidAmount > availableFaab) {
      return NextResponse.json(
        { success: false, error: `Insufficient FAAB budget. Available: $${availableFaab}` },
        { status: 400 }
      );
    }

    if (bidAmount < 0) {
      return NextResponse.json(
        { success: false, error: 'Bid amount must be non-negative' },
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
    const existingRoster = await prisma.roster.findFirst({
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
    const claimsCount = await prisma.transaction.count({
      where: {
        teamId: team.id,
        type: 'waiver',
        status: 'pending'
      }
    });

    // Create waiver claim as a transaction
    const claim = await prisma.transaction.create({
      data: {
        leagueId: team.leagueId,
        teamId: team.id,
        type: 'waiver',
        status: 'pending',
        playerIds: [playerId],
        relatedData: {
          userId: user.id,
          dropPlayerId,
          faabBid: bidAmount,
          priority: claimsCount + 1,
          weekNumber: getCurrentWeek()
        }
      }
    });

    // Get player data for response
    const playerData = await prisma.player.findUnique({
      where: { id: playerId }
    });

    return NextResponse.json({
      success: true,
      claim: {
        ...claim,
        player: playerData
      },
      message: 'Waiver claim submitted successfully'
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
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
      where: { ownerId: user.id }
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Delete the claim (only if it belongs to the user's team)
    const deleted = await prisma.transaction.deleteMany({
      where: {
        id: claimId,
        teamId: team.id,
        type: 'waiver',
        status: 'pending'
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Claim not found or cannot be deleted' },
        { status: 404 }
      );
    }

    // Reorder remaining claims
    const remainingClaims = await prisma.transaction.findMany({
      where: {
        teamId: team.id,
        type: 'waiver',
        status: 'pending'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Update priorities in relatedData
    for (let i = 0; i < remainingClaims.length; i++) {
      const data = remainingClaims[i].relatedData as any;
      await prisma.transaction.update({
        where: { id: remainingClaims[i].id },
        data: { 
          relatedData: {
            ...data,
            priority: i + 1
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Waiver claim cancelled'
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
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