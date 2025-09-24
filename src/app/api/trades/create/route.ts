import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      proposingTeamId,
      receivingTeamId,
      givingPlayerIds,
      receivingPlayerIds,
      message
    } = body;

    // Basic validation
    if (!proposingTeamId || !receivingTeamId) {
      return NextResponse.json(
        { success: false, message: 'Both teams are required' },
        { status: 400 }
      );
    }

    if ((!givingPlayerIds || givingPlayerIds.length === 0) && 
        (!receivingPlayerIds || receivingPlayerIds.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'At least one player must be involved in the trade' },
        { status: 400 }
      );
    }

    // Verify both teams exist and are in the same league
    const [proposingTeam, receivingTeam] = await Promise.all([
      prisma.team.findUnique({
        where: { id: proposingTeamId },
        include: { league: true }
      }),
      prisma.team.findUnique({
        where: { id: receivingTeamId },
        include: { league: true }
      })
    ]);

    if (!proposingTeam || !receivingTeam) {
      return NextResponse.json(
        { success: false, message: 'One or both teams not found' },
        { status: 404 }
      );
    }

    if (proposingTeam.leagueId !== receivingTeam.leagueId) {
      return NextResponse.json(
        { success: false, message: 'Teams must be in the same league' },
        { status: 400 }
      );
    }

    // Verify all players exist
    const allPlayerIds = [...(givingPlayerIds || []), ...(receivingPlayerIds || [])];
    const players = await prisma.player.findMany({
      where: { id: { in: allPlayerIds } },
      select: { id: true, name: true }
    });

    if (players.length !== allPlayerIds.length) {
      return NextResponse.json(
        { success: false, message: 'One or more players not found' },
        { status: 404 }
      );
    }

    // Create the trade proposal
    const trade = await prisma.tradeProposal.create({
      data: {
        proposingTeamId,
        receivingTeamId,
        givingPlayerIds: givingPlayerIds || [],
        receivingPlayerIds: receivingPlayerIds || [],
        message: message || null,
        status: 'pending'
      },
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

    // Create notifications for the receiving team owner
    if (receivingTeam.ownerId) {
      const notification = await prisma.notification.create({
        data: {
          type: 'trade_proposal',
          title: 'New Trade Proposal',
          body: `${proposingTeam.name} has proposed a trade`,
          data: {
            tradeId: trade.id,
            proposingTeam: proposingTeam.name,
            receivingTeam: receivingTeam.name
          }
        }
      });

      // Create notification target
      await prisma.notificationTarget.create({
        data: {
          notificationId: notification.id,
          userId: receivingTeam.ownerId
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Trade proposal created successfully',
      trade: {
        id: trade.id,
        status: trade.status,
        proposingTeam: {
          id: proposingTeam.id,
          name: proposingTeam.name
        },
        receivingTeam: {
          id: receivingTeam.id,
          name: receivingTeam.name
        },
        givingPlayers: players.filter(p => givingPlayerIds?.includes(p.id)),
        receivingPlayers: players.filter(p => receivingPlayerIds?.includes(p.id))
      }
    });

  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}