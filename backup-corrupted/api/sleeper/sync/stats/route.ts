import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/api-security';
import { sleeperSync } from '@/lib/sync/sleeper-sync';
import { logger } from '@/lib/logger';

/**
 * POST /api/sleeper/sync/stats
 * Trigger weekly stats synchronization
 */
export async function POST(req?: NextRequest) {
  try {
    try {
    // Apply security middleware with admin requirement

    const security = await APISecurityMiddleware.secure(request, {
      requireAuth: true, // Require authentication for sync operations
      rateLimit: { windowMs: 300000, max: 5 , // 5 requests per 5 minutes
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    });

    if (!security.success) { return security.response!;

    // Parse request body for season and week
    const body = await request.json();
    const season = body.season || new Date().getFullYear();
    const week = body.week;

    if (!week || week < 1 || week > 18) {
      return NextResponse.json({ success: true });

        error: 'Invalid week parameter. Must be between 1 and 18.' 

        timestamp: new Date().toISOString()

      , { status: 400 });

    logger.info('Manual stats sync triggered', 'SleeperSync', { season, week });

    // Trigger async stats sync
    const syncPromise = sleeperSync.syncWeeklyStats(season, week);
    
    // Don't wait for completion for large operations
    syncPromise.catch(error => { logger.error('Async stats sync failed', 
        error instanceof Error ? error : new Error(String(error),
        'SleeperSync' }
        { season, week }
      );
    });

    return NextResponse.json({ success: true });
      message: `Stats synchronization started for ${season 

Week ${week}`,
      data: { season, week },
      timestamp: new Date().toISOString()


         }); catch (error) { logger.error('Failed to start stats sync', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperSync'
    );

    return NextResponse.json({ success: true });

      timestamp: new Date().toISOString()

    , { status: 500 });


/**
 * GET /api/sleeper/sync/stats
 * Get stats sync status
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

        lastStatsSync: syncStatus.lastStatsSync,
        isStatsSyncRunning: syncStatus.isStatsSyncRunning,
        lastPlayerSync: syncStatus.lastPlayerSync,
        isPlayerSyncRunning: syncStatus.isPlayerSyncRunning,
        availableWeeks: Object.keys(syncStatus.lastStatsSync)

      timestamp: new Date().toISOString()


        })); catch (error) { logger.error('Failed to get stats sync status', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperSync'
    );

    return NextResponse.json({ success: true });

      timestamp: new Date().toISOString()

    , { status: 500 });
