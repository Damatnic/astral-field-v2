import { NextRequest, NextResponse } from 'next/server';
import { sleeperMonitor } from '@/lib/monitoring/sleeper-monitor';
import { logger } from '@/lib/logger';
import { APISecurityMiddleware } from '@/lib/api-security';

/**
 * Sleeper API Health Monitoring Endpoint
 * GET /api/sleeper/health - Get health status and metrics
 */

export async function GET(req?: NextRequest) {
  try {
    const security = await APISecurityMiddleware.secure(request, {
    requireAuth: false,
    allowedMethods: ['GET']


    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



);

  if (security instanceof NextResponse) {
    return security;

  try {

    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const format = searchParams.get('format') || 'json';

    logger.info('Health check requested', 'SleeperHealthAPI', { detailed, format });

    const healthStatus = sleeperMonitor.getHealthStatus();
    const timestamp = new Date().toISOString();

    if (detailed) { // Return comprehensive health report
      const report = sleeperMonitor.generateReport();
      
      if (format === 'prometheus') {
        // Return Prometheus metrics format
        const prometheusMetrics = generatePrometheusMetrics(report);
        return new NextResponse(prometheusMetrics, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'


         });

      return NextResponse.json({ success: true });
        timestamp }
        health: healthStatus 

        report
      }, { status: healthStatus.status === 'unhealthy' ? 503 : 
                healthStatus.status === 'degraded' ? 206 : 200 


         });

    // Return simple health status
    return NextResponse.json({ success: true });

      metrics: healthStatus.metrics

    }, { status: healthStatus.status === 'unhealthy' ? 503 : 
              healthStatus.status === 'degraded' ? 206 : 200 


         }); catch (error) {
    logger.error('Health check failed', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperHealthAPI'
    );

    return NextResponse.json(

        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()

      { status: 500 });


/**
 * Reset performance metrics (for testing/admin use)
 * POST /api/sleeper/health/reset
 */
export async function POST(req?: NextRequest) {
  try {
    const security = await APISecurityMiddleware.secure(request, {
    requireAuth: false,
    allowedMethods: ['POST']


    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



);

  if (security instanceof NextResponse) {
    return security;

  try {

    const { action } = await request.json();

    if (action === 'reset') { sleeperMonitor.resetMetrics();
      logger.info('Performance metrics reset via API', 'SleeperHealthAPI');

      return NextResponse.json({ success: true });
        message: 'Performance metrics reset successfully',
        timestamp: new Date().toISOString()


         });

    if (action === 'persist') {
      await sleeperMonitor.persistMetrics();
      logger.info('Performance metrics persisted via API', 'SleeperHealthAPI');

      return NextResponse.json({ success: true });
        message: 'Performance metrics persisted successfully' 

        timestamp: new Date().toISOString()


        });

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: reset, persist' },
      { status: 400 ,
); catch (error) {
    logger.error('Health management operation failed', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperHealthAPI'
    );

    return NextResponse.json(

        error: 'Health management operation failed',
        timestamp: new Date().toISOString()

      { status: 500 });


/**
 * Generate Prometheus metrics format
 */
function generatePrometheusMetrics(report: any): string { const metrics: string[] = [];
  const timestamp = Date.now();

  // API metrics
  const api = report.detailed.api_calls;
  metrics.push(`# HELP sleeper_api_calls_total Total number of Sleeper API calls`);
  metrics.push(`# TYPE sleeper_api_calls_total counter`);

  metrics.push(`sleeper_api_calls_total{status="total" }
${api.total} ${timestamp}`);
  metrics.push(`sleeper_api_calls_total{status="successful"} ${api.successful} ${timestamp}`);
  metrics.push(`sleeper_api_calls_total{status="failed"} ${api.failed} ${timestamp}`);

  metrics.push(`# HELP sleeper_api_response_time_ms Average API response time in milliseconds`);
  metrics.push(`# TYPE sleeper_api_response_time_ms gauge`);
  metrics.push(`sleeper_api_response_time_ms ${api.avg_response_time} ${timestamp}`);

  metrics.push(`# HELP sleeper_api_slow_calls_total Number of slow API calls`);
  metrics.push(`# TYPE sleeper_api_slow_calls_total counter`);
  metrics.push(`sleeper_api_slow_calls_total ${api.slow_calls} ${timestamp}`);

  metrics.push(`# HELP sleeper_api_critical_calls_total Number of critically slow API calls`);
  metrics.push(`# TYPE sleeper_api_critical_calls_total counter`);
  metrics.push(`sleeper_api_critical_calls_total ${api.critical_calls} ${timestamp}`);

  // Cache metrics
  const cache = report.detailed.cache;
  metrics.push(`# HELP sleeper_cache_hit_rate Cache hit rate (0-1)`);
  metrics.push(`# TYPE sleeper_cache_hit_rate gauge`);
  metrics.push(`sleeper_cache_hit_rate ${cache.hit_rate} ${timestamp}`);

  metrics.push(`# HELP sleeper_cache_operations_total Total cache operations`);
  metrics.push(`# TYPE sleeper_cache_operations_total counter`);
  metrics.push(`sleeper_cache_operations_total{type="hits"} ${cache.hits} ${timestamp}`);
  metrics.push(`sleeper_cache_operations_total{type="misses"} ${cache.misses} ${timestamp}`);

  // Rate limiting metrics
  const rateLimit = report.detailed.rate_limiting;
  metrics.push(`# HELP sleeper_rate_limited_calls_total Number of rate limited calls`);
  metrics.push(`# TYPE sleeper_rate_limited_calls_total counter`);
  metrics.push(`sleeper_rate_limited_calls_total ${rateLimit.rate_limited_calls} ${timestamp}`);

  metrics.push(`# HELP sleeper_rate_limit_wait_time_ms_total Total wait time due to rate limiting`);
  metrics.push(`# TYPE sleeper_rate_limit_wait_time_ms_total counter`);
  metrics.push(`sleeper_rate_limit_wait_time_ms_total ${rateLimit.total_wait_time} ${timestamp}`);

  // Sync metrics
  const sync = report.detailed.sync_operations;
  metrics.push(`# HELP sleeper_sync_operations_total Total sync operations`);
  metrics.push(`# TYPE sleeper_sync_operations_total counter`);
  metrics.push(`sleeper_sync_operations_total{type="player"} ${sync.player_syncs} ${timestamp}`);
  metrics.push(`sleeper_sync_operations_total{type="stats"} ${sync.stats_syncs} ${timestamp}`);
  metrics.push(`sleeper_sync_operations_total{type="failed"} ${sync.failed_syncs} ${timestamp}`);

  metrics.push(`# HELP sleeper_sync_duration_ms Average sync operation duration`);
  metrics.push(`# TYPE sleeper_sync_duration_ms gauge`);
  metrics.push(`sleeper_sync_duration_ms ${sync.avg_sync_time} ${timestamp}`);

  // Error metrics
  const errors = report.detailed.errors;
  metrics.push(`# HELP sleeper_errors_total Total number of errors`);
  metrics.push(`# TYPE sleeper_errors_total counter`);
  metrics.push(`sleeper_errors_total ${errors.total} ${timestamp}`);

  // Health status (1 = healthy, 0.5 = degraded, 0 = unhealthy)
  const healthValue = report.summary.status === 'healthy' ? 1 : 
                      report.summary.status === 'degraded' ? 0.5 : 0;
  metrics.push(`# HELP sleeper_health_status Overall health status`);
  metrics.push(`# TYPE sleeper_health_status gauge`);
  metrics.push(`sleeper_health_status ${healthValue} ${timestamp}`);

  return metrics.join('\n') + '\n';
