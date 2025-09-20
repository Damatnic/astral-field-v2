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
        player: true
      },
      orderBy: usesFAAB 
        ? [
            { faabBid: 'desc' },
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
        if (usesFAAB && claim.faabBid) {
          const hasEnoughFAAB = await checkFAABBudget(claim.teamId, claim.faabBid);
          if (!hasEnoughFAAB) {
            await markClaimFailed(claim.id, 'Insufficient FAAB budget');
            failedClaims.push(claim);
            continue;
          }
        }
        
        // Process the claim
        try {
          await prisma.$transaction(async (tx) => {
            // Verify roster space and constraints before processing
            const currentRoster = await tx.rosterPlayer.findMany({
              where: { teamId: claim.teamId },
              include: { player: true }
            });
            
            const maxRosterSize = 16; // Could be from settings
            const wouldExceedRoster = !claim.dropPlayerId && currentRoster.length >= maxRosterSize;
            
            if (wouldExceedRoster) {
              throw new Error(`Roster would exceed maximum size (${maxRosterSize})`);
            }
            
            // Handle drop player with comprehensive validation
            if (claim.dropPlayerId) {
              const dropPlayerEntry = await tx.rosterPlayer.findFirst({
                where: {
                  teamId: claim.teamId,
                  playerId: claim.dropPlayerId
                },
                include: { player: true }
              });
              
              if (!dropPlayerEntry) {
                throw new Error('Drop player not found on roster');
              }
              
              if (dropPlayerEntry.isLocked) {
                throw new Error('Cannot drop locked player');
              }
              
              // Remove player from roster
              await tx.rosterPlayer.deleteMany({
                where: {
                  teamId: claim.teamId,
                  playerId: claim.dropPlayerId
                }
              });
              
              // Create transaction record for dropped player
              await tx.transaction.create({
                data: {
                  leagueId,
                  teamId: claim.teamId,
                  playerId: claim.dropPlayerId,
                  type: 'DROP',
                  metadata: {
                    viaWaiver: true,
                    claimId: claim.id,
                    playerName: dropPlayerEntry.player.name,
                    week: currentWeek
                  }
                }
              });
            }
            
            // Verify the claimed player is still available
            const existingRosterEntry = await tx.rosterPlayer.findFirst({
              where: {
                playerId: claim.playerId,
                team: { leagueId }
              }
            });
            
            if (existingRosterEntry) {
              throw new Error('Player is already rostered by another team');
            }
            
            // Add new player to roster
            await tx.rosterPlayer.create({
              data: {
                teamId: claim.teamId,
                playerId: claim.playerId,
                rosterSlot: 'BENCH',
                position: 'BENCH',
                acquisitionDate: new Date(),
                acquisitionType: 'WAIVER',
                week: currentWeek
              }
            });
            
            // Create transaction record for added player
            await tx.transaction.create({
              data: {
                leagueId,
                teamId: claim.teamId,
                playerId: claim.playerId,
                type: 'ADD',
                metadata: {
                  viaWaiver: true,
                  claimId: claim.id,
                  playerName: claim.player.name,
                  faabBid: claim.faabBid,
                  week: currentWeek
                }
              }
            });
            
            // Update FAAB if applicable with validation
            if (usesFAAB && claim.faabBid && claim.faabBid > 0) {
              // Double-check FAAB budget before spending
              const teamData = await tx.team.findUnique({
                where: { id: claim.teamId },
                select: { faabBudget: true, faabSpent: true }
              });
              
              if (!teamData) {
                throw new Error('Team not found');
              }
              
              const availableFAAB = teamData.faabBudget - teamData.faabSpent;
              if (claim.faabBid > availableFAAB) {
                throw new Error(`Insufficient FAAB: bid $${claim.faabBid}, available $${availableFAAB}`);
              }
              
              await tx.team.update({
                where: { id: claim.teamId },
                data: {
                  faabSpent: {
                    increment: claim.faabBid
                  }
                }
              });
            }
            
            // Mark claim as processed
            await tx.waiverClaim.update({
              where: { id: claim.id },
              data: {
                status: 'SUCCESSFUL',
                processedAt: new Date(),
                successful: true
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
                  bid: claim.faabBid,
                  dropped: claim.dropPlayerId ? 'Player dropped' : null
                }
              }
            });
            
            // Create success notification
            await tx.notification.create({
              data: {
                userId: claim.team.ownerId,
                type: 'WAIVER_PROCESSED',
                title: 'Waiver Claim Successful',
                content: `You successfully claimed ${claim.player.name} ${claim.faabBid ? `for $${claim.faabBid}` : ''}${claim.dropPlayerId ? ' (player dropped)' : ''}.`,
                metadata: {
                  leagueId,
                  playerId: claim.playerId,
                  playerName: claim.player.name,
                  teamId: claim.teamId,
                  teamName: claim.team.name,
                  bidAmount: claim.faabBid,
                  successful: true
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
          bid: c.faabBid
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
  const claim = await prisma.waiverClaim.findUnique({
    where: { id: claimId },
    include: {
      team: true,
      player: true
    }
  });
  
  if (!claim) return;
  
  await prisma.$transaction(async (tx) => {
    // Update claim status
    await tx.waiverClaim.update({
      where: { id: claimId },
      data: {
        status: 'FAILED',
        processedAt: new Date(),
        successful: false,
        failureReason: reason
      }
    });
    
    // Create failure notification
    await tx.notification.create({
      data: {
        userId: claim.team.ownerId,
        type: 'WAIVER_PROCESSED',
        title: 'Waiver Claim Failed',
        content: `Your waiver claim for ${claim.player.name} failed: ${reason}`,
        metadata: {
          leagueId: claim.leagueId,
          playerId: claim.playerId,
          playerName: claim.player.name,
          teamId: claim.teamId,
          teamName: claim.team.name,
          bidAmount: claim.faabBid,
          successful: false,
          failureReason: reason
        }
      }
    });
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