import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/waivers/budget - Get FAAB budget information
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
    
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    // Get league settings to check if FAAB is enabled
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      include: { settings: true }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    const settings = league.settings as any;
    const usesFAAB = settings?.waiverMode === 'FAAB';
    
    if (!usesFAAB) {
      return NextResponse.json(
        { error: 'This league does not use FAAB bidding' },
        { status: 400 }
      );
    }
    
    // Get all teams in the league with their FAAB information
    const teams = await prisma.team.findMany({
      where: { leagueId: targetLeagueId },
      include: {
        owner: {
          select: {
            name: true,
            teamName: true
          }
        },
        waiverClaims: {
          where: {
            status: 'PENDING'
          },
          select: {
            faabBid: true,
            player: {
              select: {
                name: true,
                position: true
              }
            }
          }
        }
      },
      orderBy: {
        faabBudget: 'desc'
      }
    });
    
    // Calculate FAAB standings and pending bids
    const faabStandings = teams.map(team => {
      const pendingBids = team.waiverClaims.reduce((sum, claim) => sum + (claim.faabBid || 0), 0);
      const availableFAAB = team.faabBudget - team.faabSpent - pendingBids;
      const spentPercentage = team.faabBudget > 0 ? (team.faabSpent / team.faabBudget) * 100 : 0;
      
      return {
        teamId: team.id,
        teamName: team.name,
        ownerName: team.owner.name,
        totalBudget: team.faabBudget,
        spent: team.faabSpent,
        pending: pendingBids,
        available: availableFAAB,
        spentPercentage: Number(spentPercentage.toFixed(1)),
        pendingClaims: team.waiverClaims.map(claim => ({
          bid: claim.faabBid,
          player: claim.player.name,
          position: claim.player.position
        })),
        isUserTeam: team.ownerId === session.userId
      };
    });
    
    // Get league-wide FAAB statistics
    const totalBudget = teams.reduce((sum, team) => sum + team.faabBudget, 0);
    const totalSpent = teams.reduce((sum, team) => sum + team.faabSpent, 0);
    const totalPending = teams.reduce((sum, team) => sum + team.waiverClaims.reduce((claimSum, claim) => claimSum + (claim.faabBid || 0), 0), 0);
    const avgSpentPercentage = teams.length > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    // Get highest and lowest spenders
    const highestSpender = faabStandings[0];
    const lowestSpender = faabStandings[faabStandings.length - 1];
    
    // Get recent FAAB transactions
    const recentTransactions = await prisma.waiverClaim.findMany({
      where: {
        team: {
          leagueId: targetLeagueId
        },
        status: 'SUCCESSFUL',
        faabBid: {
          gt: 0
        }
      },
      include: {
        team: {
          select: {
            name: true
          }
        },
        player: {
          select: {
            name: true,
            position: true
          }
        }
      },
      orderBy: {
        processedAt: 'desc'
      },
      take: 10
    });
    
    return NextResponse.json({
      success: true,
      league: {
        id: league.id,
        name: league.name,
        usesFAAB,
        currentWeek: league.currentWeek
      },
      standings: faabStandings,
      statistics: {
        totalBudget,
        totalSpent,
        totalPending,
        totalAvailable: totalBudget - totalSpent - totalPending,
        avgSpentPercentage: Number(avgSpentPercentage.toFixed(1)),
        teamsCount: teams.length
      },
      insights: {
        highestSpender: {
          team: highestSpender?.teamName,
          spent: highestSpender?.spent,
          percentage: highestSpender?.spentPercentage
        },
        lowestSpender: {
          team: lowestSpender?.teamName,
          spent: lowestSpender?.spent,
          percentage: lowestSpender?.spentPercentage
        },
        mostActiveBidder: faabStandings.reduce((max, team) => 
          team.pendingClaims.length > (max?.pendingClaims.length || 0) ? team : max, null
        )
      },
      recentTransactions: recentTransactions.map(transaction => ({
        date: transaction.processedAt,
        team: transaction.team.name,
        player: transaction.player.name,
        position: transaction.player.position,
        amount: transaction.faabBid,
        week: transaction.weekNumber
      }))
    });
    
  } catch (error) {
    console.error('FAAB budget error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FAAB budget information' },
      { status: 500 }
    );
  }
}

// POST /api/waivers/budget - Update team FAAB budget (Commissioner only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leagueId, teamId, newBudget, adjustment, reason } = body;
    
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
      select: { commissionerId: true, name: true }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    if (league.commissionerId !== session.userId) {
      return NextResponse.json(
        { error: 'Only the commissioner can adjust FAAB budgets' },
        { status: 403 }
      );
    }
    
    // Get the team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { owner: true }
    });
    
    if (!team || team.leagueId !== leagueId) {
      return NextResponse.json(
        { error: 'Team not found in this league' },
        { status: 404 }
      );
    }
    
    const oldBudget = team.faabBudget;
    let finalBudget: number;
    
    if (newBudget !== undefined) {
      // Set new budget
      finalBudget = Math.max(0, newBudget);
    } else if (adjustment !== undefined) {
      // Adjust existing budget
      finalBudget = Math.max(0, team.faabBudget + adjustment);
    } else {
      return NextResponse.json(
        { error: 'Either newBudget or adjustment is required' },
        { status: 400 }
      );
    }
    
    // Validate that spent amount doesn't exceed new budget
    if (team.faabSpent > finalBudget) {
      return NextResponse.json(
        { error: `Cannot set budget below spent amount ($${team.faabSpent})` },
        { status: 400 }
      );
    }
    
    // Update team budget
    await prisma.$transaction(async (tx) => {
      // Update team budget
      await tx.team.update({
        where: { id: teamId },
        data: { faabBudget: finalBudget }
      });
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          leagueId,
          userId: session.userId,
          action: 'FAAB_BUDGET_ADJUSTED',
          entityType: 'Team',
          entityId: teamId,
          before: { faabBudget: oldBudget },
          after: { 
            faabBudget: finalBudget,
            adjustment: finalBudget - oldBudget,
            reason: reason || 'Commissioner adjustment'
          }
        }
      });
      
      // Create notification for team owner
      await tx.notification.create({
        data: {
          userId: team.ownerId,
          type: 'SCORE_UPDATE', // Using existing type, could add BUDGET_UPDATE
          title: 'FAAB Budget Adjusted',
          content: `Your FAAB budget has been ${finalBudget > oldBudget ? 'increased' : 'decreased'} from $${oldBudget} to $${finalBudget}${reason ? ` - ${reason}` : ''}.`,
          metadata: {
            leagueId,
            teamId,
            oldBudget,
            newBudget: finalBudget,
            adjustedBy: session.user.name,
            reason
          }
        }
      });
    });
    
    return NextResponse.json({
      success: true,
      message: 'FAAB budget updated successfully',
      budget: {
        teamName: team.name,
        oldBudget,
        newBudget: finalBudget,
        adjustment: finalBudget - oldBudget
      }
    });
    
  } catch (error) {
    console.error('FAAB budget adjustment error:', error);
    return NextResponse.json(
      { error: 'Failed to adjust FAAB budget' },
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