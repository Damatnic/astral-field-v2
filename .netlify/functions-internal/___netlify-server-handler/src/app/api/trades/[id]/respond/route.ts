import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { TradeResponse, ApiResponse, Trade } from '@/types/fantasy';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/trades/[id]/respond - Accept/reject/counter trade proposals
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tradeId = params.id;
    const body: TradeResponse = await request.json();

    // Validate required fields
    if (!body.action || !['ACCEPT', 'REJECT', 'COUNTER'].includes(body.action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be ACCEPT, REJECT, or COUNTER' },
        { status: 400 }
      );
    }

    // Get the trade with all necessary data
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            settings: {
              select: {
                tradeDeadline: true
              }
            }
          }
        },
        proposer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true,
                status: true
              }
            }
          }
        },
        votes: true
      }
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: 'Trade not found' },
        { status: 404 }
      );
    }

    // Check if trade is still active
    if (trade.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: `Trade is already ${trade.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Check if trade has expired
    if (trade.expiresAt && new Date() > trade.expiresAt) {
      await prisma.trade.update({
        where: { id: tradeId },
        data: { status: 'EXPIRED' }
      });

      return NextResponse.json(
        { success: false, message: 'Trade has expired' },
        { status: 400 }
      );
    }

    // Check trade deadline
    if (trade.league.settings?.tradeDeadline && new Date() > trade.league.settings.tradeDeadline) {
      return NextResponse.json(
        { success: false, message: 'Trade deadline has passed' },
        { status: 400 }
      );
    }

    // Verify user is involved in the trade
    const userTeam = await prisma.team.findFirst({
      where: {
        ownerId: user.id,
        leagueId: trade.leagueId
      }
    });

    if (!userTeam) {
      return NextResponse.json(
        { success: false, message: 'User does not have a team in this league' },
        { status: 403 }
      );
    }

    // Check if user is involved in this trade (either as proposer or recipient)
    const userIsProposer = trade.proposerId === user.id;
    const userIsRecipient = trade.items.some(item => 
      item.toTeamId === userTeam.id || item.fromTeamId === userTeam.id
    );

    if (!userIsProposer && !userIsRecipient) {
      return NextResponse.json(
        { success: false, message: 'User is not involved in this trade' },
        { status: 403 }
      );
    }

    // Proposer can only cancel their own trade
    if (userIsProposer && body.action !== 'REJECT') {
      return NextResponse.json(
        { success: false, message: 'Proposer can only cancel (reject) their own trade' },
        { status: 400 }
      );
    }

    let updatedTrade;

    if (body.action === 'ACCEPT') {
      updatedTrade = await handleTradeAcceptance(tradeId, user.id, trade);
    } else if (body.action === 'REJECT') {
      updatedTrade = await handleTradeRejection(tradeId, user.id, body.notes, userIsProposer);
    } else if (body.action === 'COUNTER') {
      if (!body.counterOffer) {
        return NextResponse.json(
          { success: false, message: 'Counter offer details required for COUNTER action' },
          { status: 400 }
        );
      }
      updatedTrade = await handleTradeCounter(tradeId, user.id, body.counterOffer, body.notes);
    }

    const response: ApiResponse<Trade> = {
      success: true,
      data: updatedTrade as any,
      message: `Trade ${body.action.toLowerCase()}${body.action === 'ACCEPT' ? 'ed' : body.action === 'REJECT' ? 'ed' : 'ered'} successfully`
    };

    return NextResponse.json(response);
  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleTradeAcceptance(tradeId: string, userId: string, trade: any) {
  return await prisma.$transaction(async (tx) => {
    // Check if league requires voting
    const leagueMembers = await tx.leagueMember.count({
      where: { leagueId: trade.leagueId }
    });

    const requiresVoting = leagueMembers > 2; // Trades require voting in leagues with more than 2 teams
    const votesRequired = Math.ceil(leagueMembers * 0.5); // Majority vote

    if (requiresVoting) {
      // Create or update vote
      await tx.tradeVote.upsert({
        where: {
          tradeId_userId: {
            tradeId,
            userId
          }
        },
        update: {
          vote: 'APPROVE',
          reason: 'Trade accepted by involved party'
        },
        create: {
          tradeId,
          userId,
          vote: 'APPROVE',
          reason: 'Trade accepted by involved party'
        }
      });

      // Check if we have enough votes to approve
      const approveVotes = await tx.tradeVote.count({
        where: {
          tradeId,
          vote: 'APPROVE'
        }
      });

      if (approveVotes >= votesRequired) {
        // Execute the trade
        await executeTrade(tx, tradeId, trade);
        
        // Update trade status
        await tx.trade.update({
          where: { id: tradeId },
          data: {
            status: 'ACCEPTED',
            processedAt: new Date()
          }
        });
      } else {
        // Trade is accepted but pending more votes
        await tx.trade.update({
          where: { id: tradeId },
          data: {
            status: 'PENDING' // Status remains pending until enough votes
          }
        });
      }
    } else {
      // No voting required, execute immediately
      await executeTrade(tx, tradeId, trade);
      
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: 'ACCEPTED',
          processedAt: new Date()
        }
      });
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        leagueId: trade.leagueId,
        userId,
        action: 'TRADE_ACCEPTED',
        entityType: 'Trade',
        entityId: tradeId,
        after: {
          tradeId,
          action: 'ACCEPT',
          requiresVoting,
          timestamp: new Date()
        }
      }
    });

    // Return updated trade
    return await tx.trade.findUnique({
      where: { id: tradeId },
      include: {
        proposer: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        items: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true,
                status: true
              }
            }
          }
        },
        votes: true
      }
    });
  });
}

async function handleTradeRejection(tradeId: string, userId: string, notes?: string, isProposer: boolean = false) {
  return await prisma.$transaction(async (tx) => {
    // Update trade status
    await tx.trade.update({
      where: { id: tradeId },
      data: {
        status: 'REJECTED', // Both proposer cancellation and recipient rejection result in REJECTED status
        processedAt: new Date(),
        notes: notes ? `${notes}\n\nRejected by user` : 'Trade rejected'
      }
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        leagueId: (await tx.trade.findUnique({ where: { id: tradeId }, select: { leagueId: true } }))!.leagueId,
        userId,
        action: isProposer ? 'TRADE_CANCELLED' : 'TRADE_REJECTED',
        entityType: 'Trade',
        entityId: tradeId,
        after: {
          tradeId,
          action: isProposer ? 'CANCEL' : 'REJECT',
          notes,
          timestamp: new Date()
        }
      }
    });

    // Return updated trade
    return await tx.trade.findUnique({
      where: { id: tradeId },
      include: {
        proposer: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        items: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true,
                status: true
              }
            }
          }
        },
        votes: true
      }
    });
  });
}

async function handleTradeCounter(tradeId: string, userId: string, counterOffer: any, notes?: string) {
  return await prisma.$transaction(async (tx) => {
    // Mark original trade as rejected
    await tx.trade.update({
      where: { id: tradeId },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        notes: notes ? `${notes}\n\nCountered with new offer` : 'Trade countered'
      }
    });

    // Create new trade with counter offer
    const newTrade = await tx.trade.create({
      data: {
        leagueId: counterOffer.leagueId,
        proposerId: userId,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + (counterOffer.expirationHours || 48) * 60 * 60 * 1000),
        notes: `Counter offer to trade ${tradeId}${notes ? `\n${notes}` : ''}`
      }
    });

    // Create new trade items
    await tx.tradeItem.createMany({
      data: counterOffer.tradeItems.map((item: any) => ({
        tradeId: newTrade.id,
        fromTeamId: item.fromTeamId,
        toTeamId: item.toTeamId,
        playerId: item.playerId || null,
        itemType: item.itemType,
        metadata: item.draftPick ? {
          draftPick: item.draftPick
        } : item.faabAmount ? {
          faabAmount: item.faabAmount
        } : null
      }))
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        leagueId: counterOffer.leagueId,
        userId,
        action: 'TRADE_COUNTERED',
        entityType: 'Trade',
        entityId: tradeId,
        after: {
          originalTradeId: tradeId,
          newTradeId: newTrade.id,
          action: 'COUNTER',
          timestamp: new Date()
        }
      }
    });

    // Return new trade
    return await tx.trade.findUnique({
      where: { id: newTrade.id },
      include: {
        proposer: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        items: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true,
                status: true
              }
            }
          }
        },
        votes: true
      }
    });
  });
}

async function executeTrade(tx: any, tradeId: string, trade: any) {
  // Move players between teams
  for (const item of trade.items) {
    if (item.itemType === 'PLAYER' && item.playerId) {
      // Remove player from current team
      await tx.rosterPlayer.delete({
        where: {
          teamId_playerId: {
            teamId: item.fromTeamId,
            playerId: item.playerId
          }
        }
      });

      // Add player to new team
      await tx.rosterPlayer.create({
        data: {
          teamId: item.toTeamId,
          playerId: item.playerId,
          rosterSlot: 'BENCH', // New players go to bench by default
          acquisitionDate: new Date()
        }
      });

      // Create transaction records
      await tx.transaction.createMany({
        data: [
          {
            leagueId: trade.leagueId,
            teamId: item.fromTeamId,
            playerId: item.playerId,
            type: 'TRADE',
            metadata: {
              tradeId,
              action: 'TRADED_AWAY',
              toTeamId: item.toTeamId
            }
          },
          {
            leagueId: trade.leagueId,
            teamId: item.toTeamId,
            playerId: item.playerId,
            type: 'TRADE',
            metadata: {
              tradeId,
              action: 'TRADED_FOR',
              fromTeamId: item.fromTeamId
            }
          }
        ]
      });
    }

    // Handle FAAB money transfers
    if (item.itemType === 'FAAB_MONEY' && item.metadata?.faabAmount) {
      const faabAmount = item.metadata.faabAmount;
      
      // Subtract from giving team
      await tx.team.update({
        where: { id: item.fromTeamId },
        data: {
          faabBudget: {
            decrement: faabAmount
          }
        }
      });

      // Add to receiving team
      await tx.team.update({
        where: { id: item.toTeamId },
        data: {
          faabBudget: {
            increment: faabAmount
          }
        }
      });
    }

    // TODO: Handle draft picks when that feature is implemented
  }
}