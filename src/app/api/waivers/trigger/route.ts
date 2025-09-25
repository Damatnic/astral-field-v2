import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';
import { processWaiverClaims } from '@/lib/waivers/processor';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const triggerSchema = z.object({
  leagueId: z.string().min(1, 'League ID is required'),
  week: z.number().optional(),
  dryRun: z.boolean().default(false)
});

// POST /api/waivers/trigger - Manually trigger waiver processing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leagueId, week, dryRun } = triggerSchema.parse(body);

    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        commissionerId: true,
        currentWeek: true,
        settings: true
      }
    });

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    if (league.commissionerId !== session.user.id) {
      return NextResponse.json({ error: 'Only commissioners can trigger waiver processing' }, { status: 403 });
    }

    // Check if there are pending waiver claims
    const pendingClaims = await prisma.transaction.count({
      where: {
        leagueId,
        type: 'waiver',
        status: 'pending'
      }
    });

    if (pendingClaims === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending waiver claims to process',
        data: {
          leagueId,
          leagueName: league.name,
          processed: 0,
          failed: 0,
          pendingClaims: 0
        }
      });
    }

    const processingWeek = week || league.currentWeek || 15;

    // If dry run, simulate processing without making changes
    if (dryRun) {
      const preview = await previewWaiverProcessing(leagueId, processingWeek);
      
      return NextResponse.json({
        success: true,
        message: `Waiver processing preview for week ${processingWeek}`,
        data: {
          leagueId,
          leagueName: league.name,
          dryRun: true,
          week: processingWeek,
          pendingClaims,
          preview
        }
      });
    }

    // Start processing
    console.log(`Manual waiver processing triggered for league ${leagueId} by user ${session.user.id}`);

    const startTime = Date.now();
    const result = await processWaiverClaims(leagueId, processingWeek);
    const duration = Date.now() - startTime;

    // Log the manual processing
    // TODO: Implement jobExecution model or use alternative tracking
    /* await prisma.jobExecution.create({
      data: {
        jobId: `manual-waiver-${leagueId}-${Date.now()}`,
        jobType: 'WAIVER_PROCESSING',
        queueName: 'manual',
        status: 'COMPLETED',
        data: { leagueId, week: processingWeek },
        result,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        triggeredBy: session.user.id,
        metadata: {
          leagueId,
          week: processingWeek,
          triggeredBy: 'MANUAL',
          userId: session.user.id,
          processedClaims: result.processed,
          failedClaims: result.failed
        }
      }
    }); */

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MANUAL_WAIVER_PROCESSING',
        details: {
          leagueId,
          entityType: 'League',
          entityId: leagueId,
          after: {
            week: processingWeek,
            processed: result.processed,
            failed: result.failed,
            triggeredAt: new Date().toISOString()
          }
        }
      }
    });

    // Send notification to commissioner
    const commissionerNotification = await prisma.notification.create({
      data: {
        type: 'WAIVER_PROCESSED',
        title: 'Manual Waiver Processing Complete',
        body: `Waiver processing completed for week ${processingWeek}: ${result.processed} successful, ${result.failed} failed.`,
        data: {
          leagueId,
          leagueName: league.name,
          week: processingWeek,
          processed: result.processed,
          failed: result.failed,
          triggeredBy: 'manual',
          duration
        }
      }
    });

    // Create notification target for commissioner
    await prisma.notificationTarget.create({
      data: {
        notificationId: commissionerNotification.id,
        userId: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: `Manual waiver processing completed for week ${processingWeek}`,
      data: {
        leagueId,
        leagueName: league.name,
        week: processingWeek,
        processed: result.processed,
        failed: result.failed,
        duration,
        triggeredBy: session.user.id,
        triggeredAt: new Date().toISOString(),
        details: result.details
      }
    });

  } catch (error) {
    console.error('Manual waiver processing error:', error);
    
    // Log the error
    const { leagueId } = await request.json().catch(() => ({}));
    if (leagueId) {
      // TODO: Implement jobExecution model or use alternative tracking
      /* await prisma.jobExecution.create({
        data: {
          jobId: `manual-waiver-error-${leagueId}-${Date.now()}`,
          jobType: 'WAIVER_PROCESSING',
          queueName: 'manual',
          status: 'FAILED',
          data: { leagueId },
          error: error instanceof Error ? error.message : 'Unknown error',
          stackTrace: error instanceof Error ? error.stack : undefined,
          startedAt: new Date(),
          completedAt: new Date(),
          triggeredBy: session?.user?.id || 'unknown',
          metadata: { triggeredBy: 'MANUAL', error: true }
        }
      }).catch(console.error); */
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to process waivers',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function previewWaiverProcessing(leagueId: string, week: number) {
  // Get league settings
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true }
  });

  if (!league) {
    throw new Error('League not found');
  }

  const settings = league.settings as any;
  const usesFAAB = settings?.waiverType === 'FAAB';

  // Get pending claims
  const pendingTransactions = await prisma.transaction.findMany({
    where: {
      leagueId,
      type: 'waiver',
      status: 'pending'
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          faabBudget: true,
          faabSpent: true,
          waiverPriority: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Transform and enrich with player data
  const claims = await Promise.all(pendingTransactions.map(async (transaction) => {
    const data = transaction.relatedData as any;
    const playerId = transaction.playerIds[0];
    const player = playerId ? await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, position: true, nflTeam: true }
    }) : null;
    
    // Check if player is still available
    const isAvailable = await prisma.roster.findFirst({
      where: {
        playerId,
        team: { leagueId }
      }
    });

    // Check FAAB budget if applicable
    const availableFAAB = usesFAAB 
      ? transaction.team.faabBudget - transaction.team.faabSpent
      : null;
    
    const hasEnoughFAAB = !usesFAAB || !data?.faabBid || data.faabBid <= availableFAAB;

    return {
      id: transaction.id,
      team: transaction.team,
      player,
      faabBid: data?.faabBid,
      priority: data?.priority || 0,
      dropPlayerId: data?.dropPlayerId,
      isPlayerAvailable: !isAvailable,
      hasEnoughFAAB,
      estimatedOutcome: !isAvailable 
        ? 'FAIL_UNAVAILABLE'
        : !hasEnoughFAAB 
        ? 'FAIL_INSUFFICIENT_FAAB'
        : 'SUCCESS',
      createdAt: transaction.createdAt
    };
  }));

  // Sort claims by priority/FAAB
  claims.sort((a, b) => {
    if (usesFAAB) {
      if (b.faabBid !== a.faabBid) return (b.faabBid || 0) - (a.faabBid || 0);
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.createdAt.getTime() - b.createdAt.getTime();
    } else {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
  });

  // Simulate processing
  const claimedPlayers = new Set<string>();
  const usedTeams = new Set<string>();
  const expectedSuccessful = [];
  const expectedFailed = [];

  for (const claim of claims) {
    if (!claim.player) {
      expectedFailed.push({
        team: claim.team.name,
        player: 'Unknown Player',
        reason: 'Player not found'
      });
      continue;
    }

    if (claimedPlayers.has(claim.player.id)) {
      expectedFailed.push({
        team: claim.team.name,
        player: claim.player.name,
        reason: 'Player claimed by higher priority'
      });
      continue;
    }

    if (!usesFAAB && usedTeams.has(claim.team.id)) {
      expectedFailed.push({
        team: claim.team.name,
        player: claim.player.name,
        reason: 'Team already claimed a player this round'
      });
      continue;
    }

    if (claim.estimatedOutcome === 'SUCCESS') {
      expectedSuccessful.push({
        team: claim.team.name,
        player: claim.player.name,
        bid: claim.faabBid
      });
      claimedPlayers.add(claim.player.id);
      usedTeams.add(claim.team.id);
    } else {
      const reason = claim.estimatedOutcome === 'FAIL_UNAVAILABLE' 
        ? 'Player no longer available'
        : 'Insufficient FAAB budget';
      expectedFailed.push({
        team: claim.team.name,
        player: claim.player.name,
        reason
      });
    }
  }

  return {
    totalClaims: claims.length,
    expectedSuccessful: expectedSuccessful.length,
    expectedFailed: expectedFailed.length,
    waiverType: usesFAAB ? 'FAAB' : 'Priority',
    claims: claims.map(claim => ({
      team: claim.team.name,
      player: claim.player?.name || 'Unknown',
      bid: claim.faabBid,
      priority: claim.priority,
      estimatedOutcome: claim.estimatedOutcome
    })),
    details: {
      successful: expectedSuccessful,
      failed: expectedFailed
    }
  };
}