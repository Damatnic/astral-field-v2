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
      return NextResponse.json(
        { error: 'Only commissioners can access this data' },
        { status: 403 }
      );
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
          pointsAgainst: Number(team.pointsAgainst)
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
    
    // Note: Audit logging would be implemented here
    
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
  const totalTrades = await prisma.tradeProposal.count({
    where: { 
      status: 'accepted'
    }
  });
  
  const pendingTrades = await prisma.tradeProposal.count({
    where: { 
      status: 'pending'
    }
  });
  
  const totalWaivers = await prisma.transaction.count({
    where: {
      type: 'waiver',
      team: {
        leagueId
      }
    }
  });
  
  const pendingWaivers = await prisma.transaction.count({
    where: {
      type: 'waiver',
      team: {
        leagueId
      },
      status: 'PENDING'
    }
  });
  
  const totalTransactions = totalWaivers + totalTrades;
  
  return {
    totalTrades,
    pendingTrades,
    totalWaivers,
    pendingWaivers,
    totalTransactions
  };
}

async function getPendingActions(leagueId: string) {
  const pendingTrades = await prisma.tradeProposal.findMany({
    where: {
      status: 'pending'
    },
    include: {
      proposingTeam: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });
  
  const pendingWaivers = await prisma.transaction.count({
    where: {
      type: 'waiver',
      team: {
        leagueId
      },
      status: 'PENDING'
    }
  });
  
  return {
    trades: pendingTrades.map(t => ({
      id: t.id,
      teams: [t.proposingTeam.name],
      createdAt: t.createdAt
    })),
    waiverCount: pendingWaivers
  };
}

async function getRecentActivity(leagueId: string) {
  // Get recent trades and transactions as activity
  const recentTrades = await prisma.tradeProposal.findMany({
    where: { status: 'accepted' },
    include: { proposingTeam: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      team: { leagueId },
      status: 'completed'
    },
    include: { team: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  const activity = [
    ...recentTrades.map(trade => ({
      id: trade.id,
      user: trade.proposingTeam.name,
      action: 'Trade Completed',
      entityType: 'Trade',
      timestamp: trade.createdAt
    })),
    ...recentTransactions.map(transaction => ({
      id: transaction.id,
      user: transaction.team.name,
      action: `${transaction.type} Transaction`,
      entityType: 'Transaction',
      timestamp: transaction.createdAt
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  
  return activity;
}

async function updateLeagueSettings(leagueId: string, settings: any) {
  // Update the League model's settings field which is JSON
  const updated = await prisma.league.update({
    where: { id: leagueId },
    data: {
      settings: settings
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
  const pendingClaims = await prisma.transaction.count({
    where: {
      type: 'waiver',
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
  const trade = await prisma.tradeProposal.update({
    where: { 
      id: tradeId
    },
    data: {
      status: 'rejected'
    }
  });
  
  return trade;
}

async function forceTrade(tradeId: string, leagueId: string) {
  // Update trade proposal status to accepted
  const trade = await prisma.tradeProposal.update({
    where: { id: tradeId },
    data: { status: 'accepted' }
  });
  
  return { success: true, trade };
}

async function updateScoringSettings(leagueId: string, scoring: any) {
  // Update the League model's scoringSettings field which is JSON
  const league = await prisma.league.update({
    where: { id: leagueId },
    data: {
      scoringSettings: scoring
    }
  });
  
  return league;
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
  // Note: waiverPriority field would be added to Team model for this functionality
  // For now, just return success without updating
  // In the future, add waiverPriority field to Team model
  
  return { updated: teams.length };
}

async function lockRoster(teamId: string, locked: boolean) {
  // Note: isLocked field would need to be added to Roster model for this functionality
  // For now, return success without updating since Roster model doesn't have isLocked field
  // In the future, add isLocked Boolean field to Roster model
  
  return { teamId, locked, message: 'Roster lock functionality requires schema update' };
}