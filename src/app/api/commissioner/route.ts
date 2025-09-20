import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/commissioner - Get commissioner dashboard data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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
    
    // Get user's league
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      include: {
        commissioner: true,
        teams: {
          include: {
            owner: true
          }
        }
      }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    if (league.commissionerId !== session.userId) {
      const leagueMember = await prisma.leagueMember.findFirst({
        where: {
          userId: session.userId,
          leagueId: targetLeagueId,
          role: 'COMMISSIONER'
        }
      });
      
      if (!leagueMember) {
        return NextResponse.json(
          { error: 'Only commissioners can access this data' },
          { status: 403 }
        );
      }
    }
    
    // Get league statistics
    const stats = await getLeagueStats(targetLeagueId);
    
    // Get pending actions
    const pendingActions = await getPendingActions(targetLeagueId);
    
    // Get recent activity
    const recentActivity = await getRecentActivity(targetLeagueId);
    
    return NextResponse.json({
      success: true,
      data: {
        league: {
          id: league.id,
          name: league.name,
          season: league.season,
          currentWeek: league.currentWeek,
          isActive: league.isActive
        },
        members: league.teams.map(team => ({
          id: team.id,
          teamName: team.name,
          ownerName: team.owner.name,
          ownerEmail: team.owner.email,
          wins: team.wins,
          losses: team.losses,
          ties: team.ties,
          pointsFor: Number(team.pointsFor),
          pointsAgainst: Number(team.pointsAgainst),
          waiverPriority: team.waiverPriority,
          faabBudget: team.faabBudget,
          faabSpent: team.faabSpent
        })),
        stats,
        pendingActions,
        recentActivity
      }
    });
    
  } catch (error) {
    console.error('Commissioner dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commissioner data' },
      { status: 500 }
    );
  }
}

// POST /api/commissioner - Perform commissioner actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, leagueId, data } = body;
    
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
    
    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { commissionerId: true }
    });
    
    if (!league || league.commissionerId !== session.userId) {
      return NextResponse.json(
        { error: 'Only the commissioner can perform this action' },
        { status: 403 }
      );
    }
    
    // Perform action based on type
    let result;
    switch (action) {
      case 'UPDATE_SETTINGS':
        result = await updateLeagueSettings(leagueId, data);
        break;
        
      case 'ADVANCE_WEEK':
        result = await advanceWeek(leagueId);
        break;
        
      case 'PROCESS_WAIVERS':
        result = await processWaivers(leagueId);
        break;
        
      case 'VETO_TRADE':
        result = await vetoTrade(data.tradeId, leagueId);
        break;
        
      case 'FORCE_TRADE':
        result = await forceTrade(data.tradeId, leagueId);
        break;
        
      case 'UPDATE_SCORING':
        result = await updateScoringSettings(leagueId, data.scoring);
        break;
        
      case 'RESET_WAIVER_ORDER':
        result = await resetWaiverOrder(leagueId);
        break;
        
      case 'LOCK_ROSTER':
        result = await lockRoster(data.teamId, data.locked);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        leagueId,
        userId: session.userId,
        action: `COMMISSIONER_${action}`,
        entityType: 'League',
        entityId: leagueId,
        after: data
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `Action ${action} completed successfully`,
      result
    });
    
  } catch (error) {
    console.error('Commissioner action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform commissioner action' },
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

async function getLeagueStats(leagueId: string) {
  const totalTrades = await prisma.trade.count({
    where: { leagueId }
  });
  
  const pendingTrades = await prisma.trade.count({
    where: { 
      leagueId,
      status: 'PENDING'
    }
  });
  
  const totalWaivers = await prisma.waiverClaim.count({
    where: {
      team: {
        leagueId
      }
    }
  });
  
  const pendingWaivers = await prisma.waiverClaim.count({
    where: {
      team: {
        leagueId
      },
      status: 'PENDING'
    }
  });
  
  const totalTransactions = await prisma.auditLog.count({
    where: { leagueId }
  });
  
  return {
    totalTrades,
    pendingTrades,
    totalWaivers,
    pendingWaivers,
    totalTransactions
  };
}

async function getPendingActions(leagueId: string) {
  const pendingTrades = await prisma.trade.findMany({
    where: {
      leagueId,
      status: 'PENDING'
    },
    include: {
      proposer: true,
      team: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });
  
  const pendingWaivers = await prisma.waiverClaim.count({
    where: {
      team: {
        leagueId
      },
      status: 'PENDING'
    }
  });
  
  return {
    trades: pendingTrades.map(t => ({
      id: t.id,
      teams: [t.proposer.name, t.team?.name || 'Unknown'].filter(Boolean),
      createdAt: t.createdAt,
      expiresAt: t.expiresAt
    })),
    waiverCount: pendingWaivers
  };
}

async function getRecentActivity(leagueId: string) {
  const recentLogs = await prisma.auditLog.findMany({
    where: { leagueId },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });
  
  // Get user names for the logs
  const userIds = recentLogs.map(log => log.userId).filter(Boolean);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds as string[] } },
    select: { id: true, name: true }
  });
  const userMap = new Map(users.map(u => [u.id, u.name]));
  
  return recentLogs.map(log => ({
    id: log.id,
    user: log.userId ? (userMap.get(log.userId) || 'Unknown') : 'System',
    action: log.action,
    entityType: log.entityType,
    timestamp: log.createdAt
  }));
}

async function updateLeagueSettings(leagueId: string, settings: any) {
  // Update the Settings model instead of League.settings
  const updated = await prisma.settings.upsert({
    where: { leagueId },
    update: settings,
    create: {
      leagueId,
      ...settings,
      rosterSlots: settings.rosterSlots || {},
      playoffWeeks: settings.playoffWeeks || {},
      scoringSystem: settings.scoringSystem || {}
    }
  });
  
  return updated;
}

async function advanceWeek(leagueId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId }
  });
  
  if (!league) throw new Error('League not found');
  
  const newWeek = (league.currentWeek || 15) + 1;
  
  if (newWeek > 17) {
    throw new Error('Season has ended');
  }
  
  const updated = await prisma.league.update({
    where: { id: leagueId },
    data: {
      currentWeek: newWeek
    }
  });
  
  return { newWeek };
}

async function processWaivers(leagueId: string) {
  // This would call the waiver processing logic
  // For now, return a simple response
  const pendingClaims = await prisma.waiverClaim.count({
    where: {
      team: {
        leagueId
      },
      status: 'PENDING'
    }
  });
  
  return { 
    message: `Processing ${pendingClaims} waiver claims`,
    count: pendingClaims
  };
}

async function vetoTrade(tradeId: string, leagueId: string) {
  const trade = await prisma.trade.update({
    where: { 
      id: tradeId,
      leagueId // Ensure trade belongs to this league
    },
    data: {
      status: 'VETOED'
    }
  });
  
  return trade;
}

async function forceTrade(tradeId: string, leagueId: string) {
  const trade = await prisma.trade.findUnique({
    where: { 
      id: tradeId,
      leagueId
    },
    include: {
      items: true
    }
  });
  
  if (!trade) throw new Error('Trade not found');
  
  // Process the trade
  await prisma.$transaction(async (tx) => {
    // Move players between teams
    for (const item of trade.items) {
      if (item.playerId) {
        // Remove from current team
        await tx.rosterPlayer.deleteMany({
          where: {
            teamId: item.fromTeamId,
            playerId: item.playerId
          }
        });
        
        // Add to new team
        await tx.rosterPlayer.create({
          data: {
            teamId: item.toTeamId,
            playerId: item.playerId,
            rosterSlot: 'BENCH',
            position: 'BENCH',
            acquisitionType: 'TRADE',
            acquisitionDate: new Date()
          }
        });
      }
    }
    
    // Update trade status
    await tx.trade.update({
      where: { id: tradeId },
      data: {
        status: 'ACCEPTED',
        processedAt: new Date()
      }
    });
  });
  
  return { success: true };
}

async function updateScoringSettings(leagueId: string, scoring: any) {
  const settings = await prisma.settings.upsert({
    where: { leagueId },
    update: {
      scoringSystem: scoring
    },
    create: {
      leagueId,
      scoringSystem: scoring,
      rosterSlots: {},
      playoffWeeks: {}
    }
  });
  
  return settings;
}

async function resetWaiverOrder(leagueId: string) {
  const teams = await prisma.team.findMany({
    where: { leagueId },
    orderBy: [
      { wins: 'asc' },
      { pointsFor: 'asc' }
    ]
  });
  
  // Update waiver priorities based on reverse standings
  for (let i = 0; i < teams.length; i++) {
    await prisma.team.update({
      where: { id: teams[i].id },
      data: { waiverPriority: i + 1 }
    });
  }
  
  return { updated: teams.length };
}

async function lockRoster(teamId: string, locked: boolean) {
  // Lock all roster players
  await prisma.rosterPlayer.updateMany({
    where: { teamId },
    data: { isLocked: locked }
  });
  
  return { teamId, locked };
}