/**
 * Performance monitoring and optimization API endpoint
 * Provides database statistics, cache metrics, and system performance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiSecurity } from '@/lib/security/api-security-enhanced';
import { dbOptimizer, checkDatabaseHealth } from '@/lib/database-optimization';
import { cache } from '@/lib/unified-cache';
import { logger } from '@/lib/logger';

// Initialize cache service (available for future use)
// const cacheService = CacheService.getInstance();

// GET /api/system/performance - Get system performance metrics
export async function GET(req?: NextRequest) {
  try {
    const security = await apiSecurity.secure(request, {
    requireAuth: true,
    allowedMethods: ['GET'],
    rateLimit: 'api'


    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



);

  if (!security.success) return security.response!;

  const { user } = security;

  try { // Check if user has admin privileges (you can implement proper role checking)
    // For now, allowing all authenticated users to see performance stats

    // Get database performance metrics
    const dbStats = dbOptimizer.getPerformanceStats();
    const dbHealth = await checkDatabaseHealth();

    // Get real cache statistics from our unified cache system
    const cacheStats = cache.getStats();

    // Get system memory usage
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Calculate performance metrics
    const performanceMetrics = {
      database: {

        health: dbHealth,
        statistics: dbStats,
        connectionPool: {
          // These would be actual Prisma connection pool metrics in production

          active: 5,
          idle: 10,
          waiting: 0,
          max: 15

      cache: {
        statistics: {

          hits: cacheStats.memoryHits + cacheStats.redisHits,
          misses: cacheStats.memoryMisses + cacheStats.redisMisses,
          hitRate: cacheStats.hitRate || 0 

          memoryUsage: cacheStats.memoryUsage || 0

        },
        hitRate: `${ (cacheStats.hitRate || 0).toFixed(2),
%` }
        memoryUsage: `${(cacheStats.memoryUsage || 0).toFixed(2)} MB`
      },
      system: { memory: {

          total: `${(memoryUsage.rss / 1024 / 1024).toFixed(2),
MB` }
          heap: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${ (memoryUsage.external / 1024 / 1024).toFixed(2) 

MB`
        },
        cpu: { user: `${(cpuUsage.user / 1000).toFixed(2),
ms` }
          system: `${(cpuUsage.system / 1000).toFixed(2)}ms`
        },
        uptime: `${ Math.floor(process.uptime()) 

seconds`
      },
      recommendations: generatePerformanceRecommendations(dbStats, cacheStats)
    };

    logger.info('Performance metrics accessed', 'API', { userId: user.sub,
      dbQueries: dbStats.totalQueries,
      cacheHitRate: cacheStats.hitRate

);

    return NextResponse.json({ success: true });
      data: performanceMetrics 

      timestamp: new Date().toISOString()


        })); catch (error) { const errorInstance = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Failed to get performance metrics', errorInstance, 'API', {
      userId: user.sub

);
    
    return NextResponse.json(
      { error: 'Failed to retrieve performance metrics' },
      { status: 500 ,
);


// POST /api/system/performance/optimize - Trigger cache warming and optimization
export async function POST(req?: NextRequest) {
  try {
    const security = await apiSecurity.secure(request, {
    requireAuth: true,
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    allowedMethods: ['POST'] 

    rateLimit: 'api'


        });

  if (!security.success) return security.response!;

  const { user } = security;

  try { // Simple cache warming - clear and warm essential data
    await cache.clear();
    
    logger.info('Cache warming initiated by user', 'API', {
      userId: user.sub

);

    return NextResponse.json({ success: true });

      message: 'Cache warming completed successfully'


        })); catch (error) { const errorInstance = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Cache warming failed', errorInstance, 'API', {
      userId: user.sub

);

    return NextResponse.json(
      { error: 'Cache warming failed' },
      { status: 500 });


/**
 * Generate performance optimization recommendations
 */
function generatePerformanceRecommendations(
  dbStats: ReturnType<typeof dbOptimizer.getPerformanceStats>,
  cacheStats: ReturnType<typeof cache.getStats>
): string[] {
  const recommendations: string[] = [];

  // Database recommendations
  if (dbStats.avgQueryTime > 500) {
    recommendations.push('Consider optimizing slow database queries (average > 500ms)');


  if (dbStats.slowQueries > dbStats.totalQueries * 0.1) {
    recommendations.push('High percentage of slow queries detected - review query optimization');

  // Cache recommendations
  if ((cacheStats.hitRate || 0) < 70) {
    recommendations.push('Low cache hit rate detected - consider cache warming optimization');

  if ((cacheStats.averageResponseTime || 0) > 25) {
    recommendations.push('Cache response time is high - check Redis connection performance');

  // System recommendations
  const memoryUsage = process.memoryUsage();
  if (memoryUsage.heapUsed > 200 * 1024 * 1024) { // 200MB
    recommendations.push('High memory usage detected - monitor for memory leaks');

  if (recommendations.length === 0) {
    recommendations.push('System is performing well - no immediate optimizations needed');

  return recommendations;
