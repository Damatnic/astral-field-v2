import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tradeId = params.id;
    const body = await request.json();
    const { action, reason } = body;

    // Basic validation
    if (!action || !['accept', 'reject', 'cancel', 'counter'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get the trade proposal
    const trade = await prisma.tradeProposal.findUnique({
      where: { id: tradeId },
      include: {
        proposingTeam: {
          include: {
            league: true
          }
        }
      }
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: 'Trade not found' },
        { status: 404 }
      );
    }

    // Check if trade is still pending
    if (trade.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: `Trade is already ${trade.status}` },
        { status: 400 }
      );
    }

    // For testing purposes, allow any action without auth
    const user = await authenticateFromRequest(request);
    
    // Execute action
    switch (action) {
      case 'accept':
        await prisma.tradeProposal.update({
          where: { id: tradeId },
          data: {
            status: 'accepted',
            respondedAt: new Date()
          }
        });

        // In a real implementation, you would:
        // 1. Transfer players between teams
        // 2. Update rosters
        // 3. Create transaction logs
        // 4. Send notifications

        return NextResponse.json({
          success: true,
          message: 'Trade accepted successfully',
          trade: {
            id: tradeId,
            status: 'accepted'
          }
        });

      case 'reject':
        await prisma.tradeProposal.update({
          where: { id: tradeId },
          data: {
            status: 'rejected',
            respondedAt: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Trade rejected',
          trade: {
            id: tradeId,
            status: 'rejected'
          }
        });

      case 'cancel':
        await prisma.tradeProposal.update({
          where: { id: tradeId },
          data: {
            status: 'cancelled',
            respondedAt: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Trade cancelled',
          trade: {
            id: tradeId,
            status: 'cancelled'
          }
        });

      case 'counter':
        // In a real implementation, this would create a new trade proposal
        // For now, just return a mock response
        return NextResponse.json({
          success: true,
          message: 'Counter offer functionality not yet implemented',
          trade: {
            id: tradeId,
            status: 'pending'
          }
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error responding to trade:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch trade details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tradeId = params.id;

    const trade = await prisma.tradeProposal.findUnique({
      where: { id: tradeId },
      include: {
        proposingTeam: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: 'Trade not found' },
        { status: 404 }
      );
    }

    // Get players involved in the trade (from the stored IDs)
    const givingPlayers = trade.givingPlayerIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: trade.givingPlayerIds } },
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            status: true
          }
        })
      : [];

    const receivingPlayers = trade.receivingPlayerIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: trade.receivingPlayerIds } },
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            status: true
          }
        })
      : [];

    return NextResponse.json({
      success: true,
      trade: {
        ...trade,
        givingPlayers,
        receivingPlayers
      }
    });
  } catch (error) {
    console.error('Error fetching trade:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}