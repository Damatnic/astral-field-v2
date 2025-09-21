import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { CreateTradeRequest, ApiResponse, Trade } from '@/types/fantasy';
import { validateCompleteTrade, analyzeRosterImpact, calculateTradeFairness } from '@/lib/trade-validation';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/trades/create - Create a new trade proposal
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateTradeRequest = await request.json();

    // Validate required fields
    if (!body.leagueId || !body.proposedToTeamIds?.length || !body.tradeItems?.length) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: leagueId, proposedToTeamIds, or tradeItems' },
        { status: 400 }
      );
    }

    // Validate user is in the league
    const userLeagueMember = await prisma.team.findFirst({
      where: {
        userId: user.id,
        leagueId: body.leagueId
      }
    });

    if (!userLeagueMember) {
      return NextResponse.json(
        { success: false, message: 'User is not a member of this league' },
        { status: 403 }
      );
    }

    // Get user's team in the league
    const userTeam = await prisma.team.findFirst({
      where: {
        ownerId: user.id,
        leagueId: body.leagueId
      }
    });

    if (!userTeam) {
      return NextResponse.json(
        { success: false, message: 'User does not have a team in this league' },
        { status: 403 }
      );
    }

    // Check league settings for trade deadline
    const leagueSettings = await prisma.settings.findUnique({
      where: { leagueId: body.leagueId }
    });

    if (leagueSettings?.tradeDeadline && new Date() > leagueSettings.tradeDeadline) {
      return NextResponse.json(
        { success: false, message: 'Trade deadline has passed' },
        { status: 400 }
      );
    }

    // Validate that all teams exist and are in the league
    const targetTeams = await prisma.team.findMany({
      where: {
        id: { in: body.proposedToTeamIds },
        leagueId: body.leagueId
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (targetTeams.length !== body.proposedToTeamIds.length) {
      return NextResponse.json(
        { success: false, message: 'One or more target teams not found in league' },
        { status: 400 }
      );
    }

    // Comprehensive trade validation
    const validationResults = await validateCompleteTrade(body.tradeItems, body.leagueId, user.id);
    if (!validationResults.isValid) {
      return NextResponse.json(
        { success: false, message: validationResults.error },
        { status: 400 }
      );
    }

    // Analyze roster impact for all teams
    const rosterImpacts = await analyzeRosterImpact(body.tradeItems, body.leagueId);
    
    // Calculate trade fairness
    const fairnessAnalysis = await calculateTradeFairness(body.tradeItems);

    // Set expiration time (default 48 hours)
    const expirationHours = body.expirationHours || 48;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Create trade in a transaction
    const trade = await prisma.$transaction(async (tx) => {
      // Create the trade
      const newTrade = await tx.trade.create({
        data: {
          leagueId: body.leagueId,
          proposerId: user.id,
          teamId: userTeam.id,
          status: 'PENDING',
          expiresAt,
          notes: body.notes
        }
      });

      // Create trade items
      await tx.tradeItem.createMany({
        data: body.tradeItems.map(item => ({
          tradeId: newTrade.id,
          fromTeamId: item.fromTeamId,
          toTeamId: item.toTeamId,
          playerId: item.playerId || null,
          itemType: item.itemType,
          metadata: item.draftPick ? JSON.parse(JSON.stringify({
            draftPick: item.draftPick
          })) : item.faabAmount ? JSON.parse(JSON.stringify({
            faabAmount: item.faabAmount
          })) : undefined
        }))
      });

      return newTrade;
    });

    // Fetch complete trade with all relationships
    const completeTrade = await prisma.tradeProposal.findUnique({
      where: { id: trade.id },
      include: {
        proposer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        },
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true
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

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        leagueId: body.leagueId,
        userId: user.id,
        action: 'TRADE_CREATED',
        entityType: 'Trade',
        entityId: trade.id,
        after: {
          tradeId: trade.id,
          proposer: user.name,
          targetTeams: targetTeams.map(t => t.name),
          itemCount: body.tradeItems.length,
          fairnessScore: fairnessAnalysis.fairnessScore,
          rosterImpacts: rosterImpacts.map(impact => ({
            teamName: impact.teamName,
            playersAdded: impact.playersAdded,
            playersRemoved: impact.playersRemoved,
            warnings: impact.warnings
          })),
          validationWarnings: validationResults.warnings
        }
      }
    });

    // Send notifications to target team owners
    const notificationPromises = targetTeams.map(async (team) => {
      try {
        await prisma.notification.create({
          data: {
            userId: team.ownerId,
            type: 'TRADE_PROPOSAL',
            title: 'New Trade Proposal',
            content: `You have received a trade proposal from ${user.name || 'another manager'}`,
            metadata: {
              tradeId: trade.id,
              proposerName: user.name,
              leagueId: body.leagueId,
              itemCount: body.tradeItems.length
            }
          }
        });
      } catch (error) {
        console.error(`Failed to notify team owner ${team.ownerId}:`, error);
      }
    });

    // Execute all notifications (non-blocking)
    await Promise.allSettled(notificationPromises);

    const response: ApiResponse<Trade> = {
      success: true,
      data: completeTrade as any,
      message: 'Trade proposal created successfully'
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validation functions moved to /lib/trade-validation.ts for reusability