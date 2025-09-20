import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/waivers/process - Process pending waiver claims (Commissioner only)
export async function POST(request: NextRequest) {
  try {
    const { leagueId, week } = await request.json();
    
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
      select: { 
        commissionerId: true,
        settings: true,
        currentWeek: true
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
        { error: 'Only the commissioner can process waivers' },
        { status: 403 }
      );
    }
    
    const settings = league.settings as any;
    const usesFAAB = settings?.waiverType === 'FAAB';
    const currentWeek = week || league.currentWeek || 15;
    
    // Get all pending claims for this league
    const pendingClaims = await prisma.waiverClaim.findMany({
      where: {
        status: 'PENDING',
        team: {
          leagueId
        }
      },
      include: {
        team: true,
        player: true,
        dropPlayer: true
      },
      orderBy: usesFAAB 
        ? [
            { bidAmount: 'desc' },
            { priority: 'asc' },
            { createdAt: 'asc' }
          ]
        : [
            { priority: 'asc' },
            { createdAt: 'asc' }
          ]
    });
    
    if (pendingClaims.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending waiver claims to process',
        processed: 0
      });
    }
    
    // Group claims by player
    const claimsByPlayer = new Map<string, typeof pendingClaims>();
    pendingClaims.forEach(claim => {
      const playerId = claim.playerId;
      if (!claimsByPlayer.has(playerId)) {
        claimsByPlayer.set(playerId, []);
      }
      claimsByPlayer.get(playerId)!.push(claim);
    });
    
    // Process claims for each player
    const processedClaims = [];
    const failedClaims = [];
    const claimedPlayers = new Set<string>();
    const usedTeams = new Set<string>();
    
    for (const [playerId, claims] of claimsByPlayer) {
      // Skip if player already claimed
      if (claimedPlayers.has(playerId)) continue;
      
      // Sort claims by priority (already sorted from query)
      const sortedClaims = [...claims];
      
      for (const claim of sortedClaims) {
        // Skip if team already got a player this round (if using priority)
        if (!usesFAAB && usedTeams.has(claim.teamId)) continue;
        
        // Check if player is still available
        const isAvailable = await checkPlayerAvailable(playerId, leagueId);
        if (!isAvailable) {
          await markClaimFailed(claim.id, 'Player no longer available');
          failedClaims.push(claim);
          continue;
        }
        
        // Check FAAB budget if applicable
        if (usesFAAB) {
          const hasEnoughFAAB = await checkFAABBudget(claim.teamId, claim.bidAmount);
          if (!hasEnoughFAAB) {
            await markClaimFailed(claim.id, 'Insufficient FAAB budget');
            failedClaims.push(claim);
            continue;
          }
        }
        
        // Process the claim
        try {
          await prisma.$transaction(async (tx) => {
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
                position: 'BENCH',
                acquisitionDate: new Date(),
                acquisitionType: 'WAIVER'
              }
            });
            
            // Update FAAB if applicable
            if (usesFAAB && claim.bidAmount > 0) {
              await tx.team.update({
                where: { id: claim.teamId },
                data: {
                  faabSpent: {
                    increment: claim.bidAmount
                  }
                }
              });
            }
            
            // Mark claim as processed
            await tx.waiverClaim.update({
              where: { id: claim.id },
              data: {
                status: 'PROCESSED',
                processedAt: new Date()
              }
            });
            
            // Create audit log
            await tx.auditLog.create({
              data: {
                leagueId,
                userId: claim.team.ownerId,
                action: 'WAIVER_CLAIMED',
                entityType: 'Player',
                entityId: claim.playerId,
                after: {
                  player: claim.player.name,
                  team: claim.team.name,
                  bid: claim.bidAmount,
                  dropped: claim.dropPlayer?.name
                }
              }
            });
          });
          
          processedClaims.push(claim);
          claimedPlayers.add(playerId);
          usedTeams.add(claim.teamId);
          
          // Mark all other claims for this player as failed
          const otherClaims = claims.filter(c => c.id !== claim.id);
          for (const otherClaim of otherClaims) {
            await markClaimFailed(otherClaim.id, 'Player claimed by higher priority');
            failedClaims.push(otherClaim);
          }
          
          break; // Move to next player
          
        } catch (error) {
          console.error(`Failed to process claim ${claim.id}:`, error);
          await markClaimFailed(claim.id, 'Processing error');
          failedClaims.push(claim);
        }
      }
    }
    
    // Update waiver priorities if using rolling waivers
    if (!usesFAAB && settings?.waiverMode === 'ROLLING') {
      await updateWaiverPriorities(leagueId, processedClaims);
    }
    
    return NextResponse.json({
      success: true,
      message: `Waiver processing complete for week ${currentWeek}`,
      processed: processedClaims.length,
      failed: failedClaims.length,
      details: {
        successful: processedClaims.map(c => ({
          team: c.team.name,
          player: c.player.name,
          bid: c.bidAmount
        })),
        failed: failedClaims.map(c => ({
          team: c.team.name,
          player: c.player.name,
          reason: c.status
        }))
      }
    });
    
  } catch (error) {
    console.error('Waiver processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process waivers' },
      { status: 500 }
    );
  }
}

async function checkPlayerAvailable(playerId: string, leagueId: string): Promise<boolean> {
  const rosterPlayer = await prisma.rosterPlayer.findFirst({
    where: {
      playerId,
      team: {
        leagueId
      }
    }
  });
  
  return !rosterPlayer;
}

async function checkFAABBudget(teamId: string, bidAmount: number): Promise<boolean> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      faabBudget: true,
      faabSpent: true
    }
  });
  
  if (!team) return false;
  
  const availableFAAB = team.faabBudget - team.faabSpent;
  return bidAmount <= availableFAAB;
}

async function markClaimFailed(claimId: string, reason: string) {
  await prisma.waiverClaim.update({
    where: { id: claimId },
    data: {
      status: 'FAILED',
      processedAt: new Date()
    }
  });
}

async function updateWaiverPriorities(leagueId: string, processedClaims: any[]) {
  // Get all teams in the league
  const teams = await prisma.team.findMany({
    where: { leagueId },
    orderBy: { waiverPriority: 'asc' }
  });
  
  // Teams that got players go to the back
  const claimedTeamIds = new Set(processedClaims.map(c => c.teamId));
  const nonClaimingTeams = teams.filter(t => !claimedTeamIds.has(t.id));
  const claimingTeams = teams.filter(t => claimedTeamIds.has(t.id));
  
  // Update priorities
  let priority = 1;
  
  // Non-claiming teams keep their relative order and move up
  for (const team of nonClaimingTeams) {
    await prisma.team.update({
      where: { id: team.id },
      data: { waiverPriority: priority++ }
    });
  }
  
  // Claiming teams go to the back in the order they claimed
  for (const team of claimingTeams) {
    await prisma.team.update({
      where: { id: team.id },
      data: { waiverPriority: priority++ }
    });
  }
}