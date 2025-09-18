import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { CreateTradeRequest, ApiResponse, Trade } from '@/types/fantasy';


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
    const userLeagueMember = await prisma.leagueMember.findFirst({
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

    // Validate trade items
    const validationResults = await validateTradeItems(body.tradeItems, body.leagueId, userTeam.id);
    if (!validationResults.isValid) {
      return NextResponse.json(
        { success: false, message: validationResults.error },
        { status: 400 }
      );
    }

    // Check roster size limits after trade
    const rosterValidation = await validateRosterLimits(body.tradeItems, body.leagueId);
    if (!rosterValidation.isValid) {
      return NextResponse.json(
        { success: false, message: rosterValidation.error },
        { status: 400 }
      );
    }

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
    const completeTrade = await prisma.trade.findUnique({
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
          itemCount: body.tradeItems.length
        }
      }
    });

    // TODO: Send notifications to target team owners
    // This would integrate with a notification service

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

async function validateTradeItems(tradeItems: any[], leagueId: string, proposerTeamId: string) {
  try {
    // Check that proposer owns all players they're trading away
    const proposerItems = tradeItems.filter(item => item.fromTeamId === proposerTeamId && item.playerId);
    
    if (proposerItems.length > 0) {
      const proposerPlayerIds = proposerItems.map(item => item.playerId);
      const ownedPlayers = await prisma.rosterPlayer.findMany({
        where: {
          teamId: proposerTeamId,
          playerId: { in: proposerPlayerIds }
        }
      });

      if (ownedPlayers.length !== proposerPlayerIds.length) {
        return { isValid: false, error: 'You can only trade players you own' };
      }
    }

    // Validate all players exist and are not injured reserve (if that's a league rule)
    const allPlayerIds = tradeItems
      .filter(item => item.playerId)
      .map(item => item.playerId);

    if (allPlayerIds.length > 0) {
      const players = await prisma.player.findMany({
        where: { id: { in: allPlayerIds } },
        select: { id: true, status: true, position: true }
      });

      if (players.length !== allPlayerIds.length) {
        return { isValid: false, error: 'One or more players not found' };
      }

      // Check for suspended or retired players
      const invalidPlayers = players.filter(p => 
        p.status === 'SUSPENDED' || p.status === 'RETIRED'
      );

      if (invalidPlayers.length > 0) {
        return { isValid: false, error: 'Cannot trade suspended or retired players' };
      }
    }

    // Validate team ownership of all items
    for (const item of tradeItems) {
      const team = await prisma.team.findFirst({
        where: {
          id: item.fromTeamId,
          leagueId
        }
      });

      if (!team) {
        return { isValid: false, error: `Team ${item.fromTeamId} not found in league` };
      }

      // If trading a player, verify ownership
      if (item.playerId) {
        const rosterPlayer = await prisma.rosterPlayer.findFirst({
          where: {
            teamId: item.fromTeamId,
            playerId: item.playerId
          }
        });

        if (!rosterPlayer) {
          return { isValid: false, error: `Player not owned by team ${item.fromTeamId}` };
        }
      }
    }

    return { isValid: true };
  } catch (error) {
    handleComponentError(error as Error, 'route');
    return { isValid: false, error: 'Validation error occurred' };
  }
}

async function validateRosterLimits(tradeItems: any[], leagueId: string) {
  try {
    // Get league roster requirements
    const settings = await prisma.settings.findUnique({
      where: { leagueId },
      select: { rosterSlots: true }
    });

    if (!settings) {
      return { isValid: false, error: 'League settings not found' };
    }

    const rosterSlots = settings.rosterSlots as any;
    const maxRosterSize = Object.values(rosterSlots).reduce((sum: number, count: any) => sum + count, 0);

    // Group items by team
    const teamItems = new Map<string, { adding: string[], removing: string[] }>();

    for (const item of tradeItems) {
      if (!item.playerId) continue; // Skip non-player items

      // Initialize team entries
      if (!teamItems.has(item.fromTeamId)) {
        teamItems.set(item.fromTeamId, { adding: [], removing: [] });
      }
      if (!teamItems.has(item.toTeamId)) {
        teamItems.set(item.toTeamId, { adding: [], removing: [] });
      }

      // Add to removing for fromTeam and adding for toTeam
      teamItems.get(item.fromTeamId)!.removing.push(item.playerId);
      teamItems.get(item.toTeamId)!.adding.push(item.playerId);
    }

    // Validate each team's roster size after trade
    for (const [teamId, changes] of teamItems) {
      const currentRosterCount = await prisma.rosterPlayer.count({
        where: { teamId }
      });

      const netChange = changes.adding.length - changes.removing.length;
      const newRosterSize = currentRosterCount + netChange;

      if (newRosterSize > maxRosterSize) {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { name: true }
        });
        return { 
          isValid: false, 
          error: `Trade would exceed roster limit for ${team?.name}. Max: ${maxRosterSize}, After trade: ${newRosterSize}` 
        };
      }

      // Ensure minimum roster size (e.g., at least starting lineup)
      const minStarterSlots = (rosterSlots.QB || 0) + (rosterSlots.RB || 0) + 
                             (rosterSlots.WR || 0) + (rosterSlots.TE || 0) + 
                             (rosterSlots.FLEX || 0) + (rosterSlots.K || 0) + 
                             (rosterSlots.DST || 0);

      if (newRosterSize < minStarterSlots) {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { name: true }
        });
        return { 
          isValid: false, 
          error: `Trade would leave ${team?.name} with insufficient players to field a starting lineup` 
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    handleComponentError(error as Error, 'route');
    return { isValid: false, error: 'Roster validation error occurred' };
  }
}