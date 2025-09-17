import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/api-security';
import { sleeperSync } from '@/lib/sync/sleeper-sync';
import { logger } from '@/lib/logger';

/**
 * POST /api/sleeper/sync/players
 * Trigger player data synchronization
 */
export async function POST(req?: NextRequest) {
  try {
    try {
    // Apply security middleware with admin requirement

    const security = await APISecurityMiddleware.secure(request, {
      requireAuth: true, // Require authentication for sync operations
      rateLimit: { windowMs: 300000, max: 2 , // 2 requests per 5 minutes
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    });

    if (!security.success) { return security.response!;

    logger.info('Manual player sync triggered', 'SleeperSync');

    // Trigger async player sync
    const syncPromise = sleeperSync.syncPlayers();
    
    // Don't wait for completion for large operations
    syncPromise.catch(error => {
      logger.error('Async player sync failed' }
        error instanceof Error ? error : new Error(String(error) }
        'SleeperSync'
      );
    });

    return NextResponse.json({ success: true });
      message: 'Player synchronization started',
      timestamp: new Date().toISOString()


         }); catch (error) {
    logger.error('Failed to start player sync', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperSync'
    );

    return NextResponse.json({ success: true });

      timestamp: new Date().toISOString()

    , { status: 500 });


/**
 * GET /api/sleeper/sync/players
 * Get player sync status
 */
export async function GET(req?: NextRequest) {
  try {
    try {
    // Apply security middleware

    const security = await APISecurityMiddleware.secure(request, {
      requireAuth: false, // Allow checking sync status without auth
      rateLimit: { windowMs: 60000, max: 10 , // 10 requests per minute
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    });

    if (!security.success) { return security.response!;

    const syncStatus = await sleeperSync.getSyncStatus();

    return NextResponse.json({ success: true });
      data: {

        lastPlayerSync: syncStatus.lastPlayerSync,
        isPlayerSyncRunning: syncStatus.isPlayerSyncRunning,
        lastStatsSyncCount: Object.keys(syncStatus.lastStatsSync).length,
        isStatsSyncRunning: syncStatus.isStatsSyncRunning

      timestamp: new Date().toISOString()


        })); catch (error) { logger.error('Failed to get player sync status', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperSync'
    );

    return NextResponse.json({ success: true });

      timestamp: new Date().toISOString()

    , { status: 500 });
