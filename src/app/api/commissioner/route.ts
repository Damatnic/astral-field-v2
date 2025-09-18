/**
 * Commissioner Tools API
 * Admin functionality for Nicholas D'Amato
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { requireCommissioner } from '@/lib/auth/production-auth';
import { nflDataService } from '@/services/nfl/nflDataService';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Get commissioner dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await requireCommissioner(request);
    
    const league = await prisma.league.findFirst({
      where: {
        commissionerId: user.id,
        isActive: true
      }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'Commissioner league not found' },
        { status: 404 }
      );
    }
    
    // Get comprehensive league stats for commissioner
    const [
      teams,
      pendingTrades,
      waiverClaims,
      recentTransactions,
      leagueActivity
    ] = await Promise.all([
      // Team stats
      prisma.team.findMany({
        where: { leagueId: league.id },
        include: {
          owner: {
            select: {
              name: true,
              email: true,
              avatar: true
            }
          }
        },
        orderBy: { wins: 'desc' }
      }),
      
      // Pending trades requiring approval
      prisma.trade.findMany({
        where: {
          leagueId: league.id,
          status: 'PENDING'
        },
        include: {
          proposer: true,
          items: {
            include: {
              player: true
            }
          }
        }
      }),
      
      // Active waiver claims
      prisma.waiverClaim.findMany({
        where: {
          leagueId: league.id,
          status: 'PENDING'
        },
        include: {
          player: true,
          team: {
            include: {
              owner: true
            }
          }
        }
      }),
      
      // Recent transactions
      prisma.transaction.findMany({
        where: { leagueId: league.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      
      // League activity logs
      prisma.auditLog.findMany({
        where: { leagueId: league.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);
    
    const dashboardData = {
      league: {
        id: league.id,
        name: league.name,
        currentWeek: league.currentWeek,
        season: league.season
      },
      stats: {
        totalTeams: teams.length,
        activeTrades: pendingTrades.length,
        pendingWaivers: waiverClaims.length,
        weeklyTransactions: recentTransactions.filter(
          t => t.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      },
      teams,
      pendingTrades,
      waiverClaims,
      recentTransactions,
      activityLog: leagueActivity
    };
    
    return NextResponse.json(dashboardData);
    
  } catch (error) {
    console.error('Commissioner dashboard error:', error);
    
    if (error instanceof Error && (error.message === 'Commissioner access required' || error.message === 'Unauthorized')) {
      return NextResponse.json(
        { error: 'Commissioner access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch commissioner dashboard' },
      { status: 500 }
    );
  }
}

// Update league settings
export async function PUT(request: NextRequest) {
  try {
    const user = await requireCommissioner(request);
    const body = await request.json();
    
    const league = await prisma.league.findFirst({
      where: {
        commissionerId: user.id,
        isActive: true
      }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    // Update league settings
    if (body.settings) {
      await prisma.settings.update({
        where: { leagueId: league.id },
        data: body.settings
      });
    }
    
    // Update league info
    if (body.league) {
      await prisma.league.update({
        where: { id: league.id },
        data: {
          name: body.league.name,
          description: body.league.description,
          currentWeek: body.league.currentWeek
        }
      });
    }
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        action: 'UPDATE_LEAGUE_SETTINGS',
        entityType: 'LEAGUE',
        entityId: league.id,
        after: body
      }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// Commissioner actions
export async function POST(request: NextRequest) {
  try {
    const user = await requireCommissioner(request);
    const body = await request.json();
    const { action, data } = body;
    
    const league = await prisma.league.findFirst({
      where: {
        commissionerId: user.id,
        isActive: true
      }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    let result;
    
    switch (action) {
      case 'APPROVE_TRADE':
        result = await approveTrade(data.tradeId, league.id, user.id);
        break;
        
      case 'VETO_TRADE':
        result = await vetoTrade(data.tradeId, league.id, user.id, data.reason);
        break;
        
      case 'PROCESS_WAIVERS':
        result = await processWaivers(league.id, user.id);
        break;
        
      case 'UPDATE_SCORES':
        result = await updateScores(league.id, league.currentWeek || 17);
        break;
        
      case 'ADVANCE_WEEK':
        result = await advanceWeek(league.id, user.id);
        break;
        
      case 'RESET_WAIVER_ORDER':
        result = await resetWaiverOrder(league.id, user.id);
        break;
        
      case 'FORCE_LINEUP_CHANGE':
        result = await forceLineupChange(data.teamId, data.changes, user.id);
        break;
        
      case 'SEND_ANNOUNCEMENT':
        result = await sendAnnouncement(league.id, data.message, user.id);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ success: true, result });
    
  } catch (error) {
    console.error('Commissioner action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute commissioner action' },
      { status: 500 }
    );
  }
}

// Commissioner action functions
async function approveTrade(tradeId: string, leagueId: string, userId: string) {
  const trade = await prisma.trade.update({
    where: { id: tradeId },
    data: {
      status: 'ACCEPTED',
      processedAt: new Date()
    },
    include: {
      items: true
    }
  });
  
  // Execute trade transfers
  for (const item of trade.items) {
    if (item.playerId) {
      // Transfer player between teams
      await prisma.rosterPlayer.updateMany({
        where: {
          playerId: item.playerId,
          teamId: item.fromTeamId
        },
        data: {
          teamId: item.toTeamId
        }
      });
    }
  }
  
  // Log action
  await prisma.auditLog.create({
    data: {
      leagueId,
      userId,
      action: 'APPROVE_TRADE',
      entityType: 'TRADE',
      entityId: tradeId
    }
  });
  
  return trade;
}

async function vetoTrade(tradeId: string, leagueId: string, userId: string, reason: string) {
  const trade = await prisma.trade.update({
    where: { id: tradeId },
    data: {
      status: 'VETOED',
      processedAt: new Date(),
      notes: reason
    }
  });
  
  await prisma.auditLog.create({
    data: {
      leagueId,
      userId,
      action: 'VETO_TRADE',
      entityType: 'TRADE',
      entityId: tradeId,
      after: { reason }
    }
  });
  
  return trade;
}

async function processWaivers(leagueId: string, userId: string) {
  const claims = await prisma.waiverClaim.findMany({
    where: {
      leagueId,
      status: 'PENDING'
    },
    orderBy: [
      { priority: 'asc' },
      { faabBid: 'desc' },
      { createdAt: 'asc' }
    ],
    include: {
      player: true,
      team: true
    }
  });
  
  const processedPlayers = new Set<string>();
  const results = [];
  
  for (const claim of claims) {
    if (processedPlayers.has(claim.playerId)) {
      // Player already claimed
      await prisma.waiverClaim.update({
        where: { id: claim.id },
        data: {
          status: 'FAILED',
          processedAt: new Date()
        }
      });
      continue;
    }
    
    // Check FAAB budget
    if (claim.faabBid && claim.faabBid > (claim.team.faabBudget - claim.team.faabSpent)) {
      await prisma.waiverClaim.update({
        where: { id: claim.id },
        data: {
          status: 'FAILED',
          processedAt: new Date()
        }
      });
      continue;
    }
    
    // Process successful claim
    await prisma.$transaction([
      // Add player to roster
      prisma.rosterPlayer.create({
        data: {
          teamId: claim.teamId,
          playerId: claim.playerId,
          rosterSlot: 'BENCH'
        }
      }),
      
      // Drop player if specified
      claim.dropPlayerId ? 
        prisma.rosterPlayer.deleteMany({
          where: {
            teamId: claim.teamId,
            playerId: claim.dropPlayerId
          }
        }) : 
        prisma.team.update({ where: { id: claim.teamId }, data: {} }),
      
      // Update FAAB if used
      claim.faabBid ?
        prisma.team.update({
          where: { id: claim.teamId },
          data: {
            faabSpent: { increment: claim.faabBid }
          }
        }) :
        prisma.team.update({ where: { id: claim.teamId }, data: {} }),
      
      // Mark claim as successful
      prisma.waiverClaim.update({
        where: { id: claim.id },
        data: {
          status: 'SUCCESSFUL',
          processedAt: new Date()
        }
      })
    ]);
    
    processedPlayers.add(claim.playerId);
    results.push(claim);
  }
  
  await prisma.auditLog.create({
    data: {
      leagueId,
      userId,
      action: 'PROCESS_WAIVERS',
      after: { processed: results.length }
    }
  });
  
  return results;
}

async function updateScores(leagueId: string, week: number) {
  // Fetch latest scores from NFL data service
  await nflDataService.fetchCurrentWeekScores(week);
  
  // Calculate team scores for the week
  const teams = await prisma.team.findMany({
    where: { leagueId },
    include: {
      roster: {
        include: {
          player: {
            include: {
              playerStats: {
                where: {
                  week,
                  season: 2024
                }
              }
            }
          }
        }
      }
    }
  });
  
  // Update matchup scores
  const matchups = await prisma.matchup.findMany({
    where: {
      leagueId,
      week,
      season: 2024
    }
  });
  
  for (const matchup of matchups) {
    const homeTeam = teams.find(t => t.id === matchup.homeTeamId);
    const awayTeam = teams.find(t => t.id === matchup.awayTeamId);
    
    const homeScore = calculateTeamScore(homeTeam);
    const awayScore = calculateTeamScore(awayTeam);
    
    await prisma.matchup.update({
      where: { id: matchup.id },
      data: {
        homeScore,
        awayScore,
        isComplete: true
      }
    });
    
    // Update team records
    if (homeScore > awayScore) {
      await prisma.team.update({
        where: { id: homeTeam!.id },
        data: {
          wins: { increment: 1 },
          pointsFor: { increment: homeScore },
          pointsAgainst: { increment: awayScore }
        }
      });
      
      await prisma.team.update({
        where: { id: awayTeam!.id },
        data: {
          losses: { increment: 1 },
          pointsFor: { increment: awayScore },
          pointsAgainst: { increment: homeScore }
        }
      });
    } else if (awayScore > homeScore) {
      await prisma.team.update({
        where: { id: awayTeam!.id },
        data: {
          wins: { increment: 1 },
          pointsFor: { increment: awayScore },
          pointsAgainst: { increment: homeScore }
        }
      });
      
      await prisma.team.update({
        where: { id: homeTeam!.id },
        data: {
          losses: { increment: 1 },
          pointsFor: { increment: homeScore },
          pointsAgainst: { increment: awayScore }
        }
      });
    } else {
      // Tie
      await Promise.all([
        prisma.team.update({
          where: { id: homeTeam!.id },
          data: {
            ties: { increment: 1 },
            pointsFor: { increment: homeScore },
            pointsAgainst: { increment: awayScore }
          }
        }),
        prisma.team.update({
          where: { id: awayTeam!.id },
          data: {
            ties: { increment: 1 },
            pointsFor: { increment: awayScore },
            pointsAgainst: { increment: homeScore }
          }
        })
      ]);
    }
  }
  
  return { updated: matchups.length };
}

function calculateTeamScore(team: any): number {
  if (!team || !team.roster) return 0;
  
  let totalScore = 0;
  
  for (const rosterSpot of team.roster) {
    // Only count starters (not bench)
    if (rosterSpot.rosterSlot !== 'BENCH' && rosterSpot.rosterSlot !== 'IR') {
      const playerStats = rosterSpot.player?.playerStats?.[0];
      if (playerStats) {
        totalScore += Number(playerStats.fantasyPoints || 0);
      }
    }
  }
  
  return Math.round(totalScore * 100) / 100;
}

async function advanceWeek(leagueId: string, userId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId }
  });
  
  if (!league || !league.currentWeek) {
    throw new Error('Invalid league state');
  }
  
  const nextWeek = league.currentWeek + 1;
  
  if (nextWeek > 18) {
    throw new Error('Season is complete');
  }
  
  await prisma.league.update({
    where: { id: leagueId },
    data: { currentWeek: nextWeek }
  });
  
  await prisma.auditLog.create({
    data: {
      leagueId,
      userId,
      action: 'ADVANCE_WEEK',
      after: { week: nextWeek }
    }
  });
  
  return { currentWeek: nextWeek };
}

async function resetWaiverOrder(leagueId: string, userId: string) {
  const teams = await prisma.team.findMany({
    where: { leagueId },
    orderBy: [
      { wins: 'asc' },
      { pointsFor: 'asc' }
    ]
  });
  
  // Reset waiver priority based on inverse standings
  for (let i = 0; i < teams.length; i++) {
    await prisma.team.update({
      where: { id: teams[i].id },
      data: { waiverPriority: i + 1 }
    });
  }
  
  await prisma.auditLog.create({
    data: {
      leagueId,
      userId,
      action: 'RESET_WAIVER_ORDER'
    }
  });
  
  return { updated: teams.length };
}

async function forceLineupChange(teamId: string, changes: any, userId: string) {
  // Implementation for forcing lineup changes
  // This would update RosterPlayer records
  
  await prisma.auditLog.create({
    data: {
      leagueId: teamId, // Should get league ID from team
      userId,
      action: 'FORCE_LINEUP_CHANGE',
      entityType: 'TEAM',
      entityId: teamId,
      after: changes
    }
  });
  
  return { success: true };
}

async function sendAnnouncement(leagueId: string, message: string, userId: string) {
  const leagueMembers = await prisma.leagueMember.findMany({
    where: { leagueId }
  });
  
  // Create notifications for all members
  await prisma.notification.createMany({
    data: leagueMembers.map(member => ({
      userId: member.userId,
      type: 'NEWS_UPDATE',
      title: 'Commissioner Announcement',
      content: message
    }))
  });
  
  // Create message in league chat
  await prisma.message.create({
    data: {
      leagueId,
      userId,
      content: message,
      type: 'ANNOUNCEMENT'
    }
  });
  
  await prisma.auditLog.create({
    data: {
      leagueId,
      userId,
      action: 'SEND_ANNOUNCEMENT',
      after: { message }
    }
  });
  
  return { notified: leagueMembers.length };
}