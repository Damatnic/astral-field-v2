import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// This endpoint processes all pending waiver claims
// Should be called by a cron job every Wednesday at 3am ET
export async function POST(request: NextRequest) {
  try {
    // Verify this is an authorized request (from cron job)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get all leagues
    const leagues = await prisma.league.findMany({
      where: { isActive: true }
    });

    const results = [];

    for (const league of leagues) {
      const leagueResult = await processLeagueWaivers(league.id);
      results.push({
        leagueId: league.id,
        leagueName: league.name,
        ...leagueResult
      });
    }

    return NextResponse.json({
      success: true,
      results,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Process waivers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process waivers' },
      { status: 500 }
    );
  }
}

async function processLeagueWaivers(leagueId: string) {
  const processedClaims = [];
  const failedClaims = [];

  try {
    // Get all pending claims for this league, grouped by player
    const claims = await prisma.waiverClaim.findMany({
      where: {
        team: { leagueId },
        status: 'PENDING'
      },
      include: {
        team: true,
        player: true,
        dropPlayer: true
      },
      orderBy: [
        { bidAmount: 'desc' }, // Highest bid first
        { team: { waiverPriority: 'asc' } } // Then by waiver priority
      ]
    });

    // Group claims by player
    const claimsByPlayer = new Map<string, typeof claims>();
    claims.forEach(claim => {
      const playerId = claim.playerId;
      if (!claimsByPlayer.has(playerId)) {
        claimsByPlayer.set(playerId, []);
      }
      claimsByPlayer.get(playerId)!.push(claim);
    });

    // Process each player's claims
    for (const [playerId, playerClaims] of claimsByPlayer.entries()) {
      // Sort by bid amount (highest first), then waiver priority
      const sortedClaims = playerClaims.sort((a, b) => {
        if (b.bidAmount !== a.bidAmount) {
          return b.bidAmount - a.bidAmount;
        }
        return a.team.waiverPriority - b.team.waiverPriority;
      });

      // Try to process the highest bid
      for (const claim of sortedClaims) {
        const success = await processSingleClaim(claim);
        
        if (success) {
          processedClaims.push(claim.id);
          // Mark all other claims for this player as outbid
          const otherClaims = sortedClaims.filter(c => c.id !== claim.id);
          for (const other of otherClaims) {
            await prisma.waiverClaim.update({
              where: { id: other.id },
              data: { 
                status: 'FAILED',
                processedAt: new Date(),
                failureReason: 'Outbid'
              }
            });
            failedClaims.push(other.id);
          }
          break; // Move to next player
        } else {
          failedClaims.push(claim.id);
        }
      }
    }

    // Update waiver priorities (teams that got players go to end)
    const successfulTeams = new Set(
      processedClaims.map(claimId => 
        claims.find(c => c.id === claimId)?.teamId
      ).filter(Boolean)
    );

    await updateWaiverPriorities(leagueId, successfulTeams as Set<string>);

    return {
      processedClaims: processedClaims.length,
      failedClaims: failedClaims.length,
      success: true
    };

  } catch (error) {
    console.error(`Error processing waivers for league ${leagueId}:`, error);
    return {
      processedClaims: processedClaims.length,
      failedClaims: failedClaims.length,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function processSingleClaim(claim: any): Promise<boolean> {
  try {
    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check roster size limit
      const rosterCount = await tx.rosterPlayer.count({
        where: { teamId: claim.teamId }
      });

      if (rosterCount >= 16 && !claim.dropPlayerId) {
        await tx.waiverClaim.update({
          where: { id: claim.id },
          data: {
            status: 'FAILED',
            processedAt: new Date(),
            failureReason: 'Roster full - must drop a player'
          }
        });
        return false;
      }

      // Check FAAB budget
      const team = await tx.team.findUnique({
        where: { id: claim.teamId }
      });

      if (!team || team.faabBudget < claim.bidAmount) {
        await tx.waiverClaim.update({
          where: { id: claim.id },
          data: {
            status: 'FAILED',
            processedAt: new Date(),
            failureReason: 'Insufficient FAAB budget'
          }
        });
        return false;
      }

      // Drop player if specified
      if (claim.dropPlayerId) {
        await tx.rosterPlayer.deleteMany({
          where: {
            teamId: claim.teamId,
            playerId: claim.dropPlayerId
          }
        });
      }

      // Add new player to roster
      await tx.rosterPlayer.create({
        data: {
          teamId: claim.teamId,
          playerId: claim.playerId,
          rosterSlot: 'BENCH',
          position: 'BENCH',
          acquisitionType: 'WAIVER',
          acquisitionDate: new Date()
        }
      });

      // Update team's FAAB budget
      await tx.team.update({
        where: { id: claim.teamId },
        data: {
          faabBudget: team.faabBudget - claim.bidAmount
        }
      });

      // Mark claim as successful
      await tx.waiverClaim.update({
        where: { id: claim.id },
        data: {
          status: 'SUCCESSFUL',
          processedAt: new Date()
        }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          type: 'WAIVER_CLAIM',
          teamId: claim.teamId,
          playerId: claim.playerId,
          dropPlayerId: claim.dropPlayerId,
          faabAmount: claim.bidAmount,
          status: 'COMPLETED'
        }
      });

      return true;
    });

    return result;
  } catch (error) {
    console.error('Error processing claim:', error);
    return false;
  }
}

async function updateWaiverPriorities(leagueId: string, successfulTeams: Set<string>) {
  // Get all teams in league
  const teams = await prisma.team.findMany({
    where: { leagueId },
    orderBy: { waiverPriority: 'asc' }
  });

  // Separate successful and unsuccessful teams
  const unsuccessfulTeams = teams.filter(t => !successfulTeams.has(t.id));
  const successfulTeamsList = teams.filter(t => successfulTeams.has(t.id));

  // Reassign priorities: unsuccessful teams get 1-N, successful teams get N+1 onwards
  let priority = 1;
  
  for (const team of unsuccessfulTeams) {
    await prisma.team.update({
      where: { id: team.id },
      data: { waiverPriority: priority++ }
    });
  }

  for (const team of successfulTeamsList) {
    await prisma.team.update({
      where: { id: team.id },
      data: { waiverPriority: priority++ }
    });
  }
}