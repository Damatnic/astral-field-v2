import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sleeperAPI } from '@/lib/sleeper/api';
import { getServerSession } from '@/lib/auth/get-session';
import { withErrorHandling, validateSession, createApiError } from '@/lib/api/error-handler';

async function getSleeperHandler(request: NextRequest) {
  const session = await getServerSession();
  const user = validateSession(session);

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'trending':
      return await getTrendingPlayers();
    case 'state':
      return await getNFLState();
    case 'status':
      return await getSleeperStatus();
    default:
      throw createApiError.badRequest('Invalid action. Supported actions: trending, state, status');
  }
}

async function syncPlayers() {
  try {
    const sleeperPlayers = await sleeperAPI.getAllPlayers();
    const playerArray = Object.values(sleeperPlayers)
      .filter(p => p.fantasy_positions?.length > 0)
      .slice(0, 100); // Limit for demo

    let synced = 0;
    let errors = 0;

    for (const sleeperPlayer of playerArray) {
      try {
        const playerData = sleeperAPI.convertToDbPlayer(sleeperPlayer);
        
        await prisma.player.upsert({
          where: { 
            sleeperPlayerId: sleeperPlayer.player_id 
          },
          update: {
            ...playerData,
            lastUpdated: new Date()
          },
          create: {
            ...playerData,
            espnId: `sleeper_${sleeperPlayer.player_id}`, // Required field
            createdAt: new Date()
          }
        });
        
        synced++;
      } catch (err) {
        // Log sync failure without exposing internal details
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} players from Sleeper`,
      synced,
      errors,
      total: playerArray.length
    });
  } catch (error) {
    throw error;
  }
}

async function getTrendingPlayers() {
  const [adds, drops] = await Promise.all([
    sleeperAPI.getTrendingPlayers('add', 24, 10),
    sleeperAPI.getTrendingPlayers('drop', 24, 10)
  ]);

  const allPlayers = await sleeperAPI.getAllPlayers();

  const enrichedAdds = adds.map(t => ({
    ...t,
    player: allPlayers[t.player_id],
    type: 'add'
  }));

  const enrichedDrops = drops.map(t => ({
    ...t,
    player: allPlayers[t.player_id],
    type: 'drop'
  }));

  return NextResponse.json({
    success: true,
    data: {
      adds: enrichedAdds,
      drops: enrichedDrops
    }
  });
}

async function getSleeperStatus() {
  // Get recent job executions
  const recentJobs = await prisma.jobExecution.findMany({
    where: {
      jobType: 'sleeper_sync'
    },
    orderBy: {
      startedAt: 'desc'
    },
    take: 10
  });

  // Get player count from our database
  const playerCount = await prisma.player.count({
    where: {
      sleeperPlayerId: { not: null }
    }
  });

  // Get cache stats
  const cacheStats = sleeperAPI.getCacheStats();

  return NextResponse.json({
    success: true,
    data: {
      playerCount,
      recentJobs: recentJobs.map(job => ({
        id: job.id,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        duration: job.duration,
        result: job.result,
        error: job.error
      })),
      cache: cacheStats
    }
  });
}

async function getNFLState() {
  const state = await sleeperAPI.getNflState();
  
  return NextResponse.json({
    success: true,
    data: state
  });
}

async function postSleeperHandler(request: NextRequest) {
  const session = await getServerSession();
  const user = validateSession(session);

  // Only allow admins to trigger sync
  if (!(user as any).isAdmin) {
    throw createApiError.forbidden('Admin access required');
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  // Check if sync is already running
  const runningJob = await prisma.jobExecution.findFirst({
    where: {
      jobType: 'sleeper_sync',
      status: 'running'
    }
  });

  if (runningJob && !force) {
    throw createApiError.conflict('Sleeper sync is already running');
  }

  // Create job execution record
  const job = await prisma.jobExecution.create({
    data: {
      jobName: 'Sleeper Player Sync',
      jobType: 'sleeper_sync',
      status: 'running',
      metadata: {
        triggeredBy: user.id,
        force
      }
    }
  });

  // Run sync in background
  syncSleeperData(job.id).catch((error) => {
    // Background sync failure will be logged in job execution record
  });

  return NextResponse.json({
    success: true,
    data: {
      jobId: job.id,
      message: 'Sleeper sync started'
    }
  });
}

async function syncSleeperData(jobId: string) {
  const startTime = Date.now();
  
  try {
    // Update job status
    await prisma.jobExecution.update({
      where: { id: jobId },
      data: { status: 'running' }
    });

    // Sync players using our new API
    const syncResults = await sleeperAPI.syncPlayersToDatabase();
    
    const duration = Date.now() - startTime;

    // Update job as completed
    await prisma.jobExecution.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        duration,
        result: syncResults
      }
    });

    // Job completion logged in database record

  } catch (error) {
    const duration = Date.now() - startTime;
    
    await prisma.jobExecution.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        duration,
        error: error instanceof Error ? error.message : String(error)
      }
    });

    // Job failure logged in database record
    throw error;
  }
}

export const GET = withErrorHandling(getSleeperHandler);
export const POST = withErrorHandling(postSleeperHandler);