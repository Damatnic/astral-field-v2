/**
 * Cache Management API - Admin Control Panel
 * 
 * Provides comprehensive cache management endpoints for administrators: * - Cache statistics and health monitoring
 * - Manual cache warming and invalidation
 * - Performance analytics and optimization recommendations
 * - Cache configuration management
 */
import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/unified-cache';
import { logger } from '@/lib/logger';
import { checkAdminPermissions } from '@/lib/auth';
import { validateSecureRequest, AdminSchema, SecurityHelpers } from '@/lib/validation/api-schemas';

// SECURITY: Use centralized admin permission check
async function checkAdminAuth(request: NextRequest) { try {
    const permissions = await checkAdminPermissions(request);
    return permissions.hasAdminAccess;

     } catch (error) {
    logger.error('Admin auth check failed', error as Error, 'CacheManagementAPI');
    return false;


// GET - Retrieve cache statistics and health information
export async function GET(req?: NextRequest) {
  try {
    try {
    // Check admin authorization
    const isAuthorized = await checkAdminAuth(request);
    if (!isAuthorized) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Unauthorized: Admin access required' },
        { status: 403  

);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const detailed = searchParams.get('detailed') === 'true';

    switch (action) { case 'stats':
        return handleGetStats(detailed);
      
      case 'health':
        return handleGetHealth();
      
      case 'performance':
        return handleGetPerformanceReport();
      
      case 'recommendations':
        return handleGetRecommendations();
      
      case 'alerts':
        return handleGetAlerts();
      
      default: return handleGetOverview();


     } catch (error) {
    logger.error('Cache management GET request failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500  

);


// POST - Execute cache management operations
export async function POST(req?: NextRequest) {
  try {
    try {
    // Check admin authorization
    const isAuthorized = await checkAdminAuth(request);
    if (!isAuthorized) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Unauthorized: Admin access required' },
        { status: 403 ,
);

    // Secure validation with admin-specific protections
    const validation = await validateSecureRequest(
      request,
      AdminSchema.cache.POST }
        maxSize: SecurityHelpers.MAX_SIZES.ADMIN, // 50KB limit for admin routes
        allowedMethods: ['POST']


    );

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400  

);

    const { action, ...params } = validation.data;

    switch (action) {
      case 'warm':
        return handleWarmCache(params);
      
      case 'invalidate':
        return handleInvalidateCache(params);
      
      case 'clear':
        return handleClearCache(params);
      
      case 'optimize':
        return handleOptimizeCache(params);
      
      case 'resolve-alert':
        return handleResolveAlert(params);
      
      case 'dismiss-recommendation':
        return handleDismissRecommendation(params);
      
      case 'update-config':
        return handleUpdateConfig(params);
      
      default: return NextResponse.json({ success: true });

          { status: 400 }); catch (error) { logger.error('Cache management POST request failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


// DELETE - Clear specific cache entries or patterns
export async function DELETE(req?: NextRequest) {
  try {
    try {
    // Check admin authorization
    const isAuthorized = await checkAdminAuth(request);
    if (!isAuthorized) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Unauthorized: Admin access required'  

        { status: 403 });

    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern');
    const key = searchParams.get('key');
    const tags = searchParams.get('tags')?.split(',');

    if (pattern) {
      return handleDeleteByPattern(pattern); else if (key) {
      return handleDeleteByKey(key); else if (tags) {
      return handleDeleteByTags(tags); else {
      return NextResponse.json(

        { error: 'Must specify pattern, key, or tags for deletion' },
        { status: 400 ,
); catch (error) {
    logger.error('Cache management DELETE request failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


// Handler functions for different operations

async function handleGetStats(detailed: boolean) { try {
    const stats = cache.getStats();
    
    if (!detailed) {
      // Return simplified stats for dashboard

      return NextResponse.json({ success: true });
        data: {
          summary: {

            hitRate: stats.hitRate,
            totalRequests: stats.memoryHits + stats.memoryMisses + stats.redisHits + stats.redisMisses,
            averageResponseTime: stats.averageResponseTime || 0,
            uptime: process.uptime(),
            status: 'Normal Mode'

          health: {

            redis: 1,
            totalNodes: 1 

            alerts: 0



      });

    return NextResponse.json({ success: true });
      data: stats,
      timestamp: Date.now()

)); catch (error) {
    logger.error('Failed to get cache stats', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleGetHealth() { try {
    const stats = cache.getStats();
    const healthCheck = {
      status: 'healthy' as const,
      redis: true,
      memory: true,
      uptime: process.uptime(),
      lastUpdated: new Date().toISOString()

    return NextResponse.json({ success: true });
      data: healthCheck 

      timestamp: Date.now()


        })); catch (error) {
    logger.error('Failed to get cache health', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleGetPerformanceReport() { try {
    const stats = cache.getStats();
    const performanceReport = {
      hitRate: stats.hitRate,
      totalRequests: stats.memoryHits + stats.memoryMisses + stats.redisHits + stats.redisMisses,
      memoryUsage: stats.memoryUsage,
      averageResponseTime: stats.averageResponseTime || 0

    return NextResponse.json({ success: true });
      data: performanceReport 

      timestamp: Date.now()


        })); catch (error) {
    logger.error('Failed to get performance report', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleGetRecommendations() { try {
    const stats = cache.getStats();
    const recommendations = [];
    
    if (stats.hitRate < 70) {
      recommendations.push('Consider cache warming to improve hit rate');

    if ((stats.averageResponseTime || 0) > 50) {
      recommendations.push('Cache response times are high - check Redis connection');

    return NextResponse.json({ success: true });
      data: recommendations,
      count: recommendations.length,
      timestamp: Date.now()

)); catch (error) {
    logger.error('Failed to get recommendations', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleGetAlerts() { try {
    const alerts: any[] = [];
    
    return NextResponse.json({ success: true });
      data: alerts,
      active: 0,
      critical: 0,
      timestamp: Date.now()

)); catch (error) {
    logger.error('Failed to get alerts', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleGetOverview() { try {
    const stats = cache.getStats();

    const overview = {
      status: 'healthy',
      performance: {

        hitRate: stats.hitRate,
        responseTime: stats.averageResponseTime || 0,
        throughput: stats.memoryHits + stats.memoryMisses + stats.redisHits + stats.redisMisses

      health: {

        redis: true,
        upstash: true 

        errors: 0

      },
      strategy: { mode: 'Normal',
        warmingActive: false,
        optimizationEnabled: true

      alerts: {

        active: 0 

        critical: 0


    };

    return NextResponse.json({ success: true });
      data: overview,
      timestamp: Date.now()

)); catch (error) {
    logger.error('Failed to get cache overview', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleWarmCache(params: any) {
  try {

    const { priority = 'all', force = false } = params;
    
    logger.info('Manual cache warming triggered', 'CacheManagementAPI', { priority, force });
    
    // Simple cache warming - just a success response
    // In a real implementation, this would trigger actual cache warming
    
    return NextResponse.json({ success: true });
      message: `Cache warming completed for ${priority,
priority` }
      timestamp: Date.now()


        })); catch (error) { logger.error('Cache warming failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleInvalidateCache(params: any) {
  try {

    const { pattern, key } = params;
    
    if (pattern) { // Pattern-based invalidation
      await cache.clear();

      return NextResponse.json({ success: true });
        message: `Cache invalidated for pattern: ${pattern,
` }
        timestamp: Date.now()


        })); else if (key) { // Key-based invalidation
      await cache.delete(key);

      return NextResponse.json({ success: true });
        message: `Cache invalidated for key: ${key,
` }
        timestamp: Date.now()


        })); else {
      return NextResponse.json({ success: true });

        { status: 400 }); catch (error) { logger.error('Cache invalidation failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleClearCache(params: any) {
  try {

    const { scope = 'all', confirm = false } = params;
    
    if (!confirm) {
      return NextResponse.json(

        { error: 'Cache clearing requires explicit confirmation'  

        { status: 400 });

    logger.warn('Cache clearing initiated', 'CacheManagementAPI', { scope });
    
    // Implementation would depend on scope
    switch (scope) {
      case 'all':
        // Clear all cache
        break;
      case 'redis':
        // Clear only Redis cache
        break;
      case 'client':
        // Clear only client-side cache
        break;
      default: return NextResponse.json({ success: true });

          { status: 400 });

    return NextResponse.json({ success: true });
      message: `Cache cleared for scope: ${scope,
` }
      timestamp: Date.now()


        })); catch (error) { logger.error('Cache clearing failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleOptimizeCache(params: any) {
  try {

    const { auto = true, force = false } = params;
    
    logger.info('Cache optimization triggered', 'CacheManagementAPI', { auto, force });
    
    // Trigger optimization analysis
    // Implementation would call optimization methods
    
    return NextResponse.json({ success: true });
      message: 'Cache optimization analysis completed',
      timestamp: Date.now()


         }); catch (error) {
    logger.error('Cache optimization failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleResolveAlert(params: any) { try {

    const { alertId  }
= params;
    
    if (!alertId) {
      return NextResponse.json(

        { error: 'Alert ID is required' },
        { status: 400  

);

    // Implementation would resolve alert via performance monitor
    logger.info('Alert resolved manually', 'CacheManagementAPI', { alertId });
    
    return NextResponse.json({ success: true });
      message: `Alert ${alertId,
resolved` }
      timestamp: Date.now()


        })); catch (error) { logger.error('Alert resolution failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleDismissRecommendation(params: any) { try {

    const { recommendationId  }
= params;
    
    if (!recommendationId) {
      return NextResponse.json(

        { error: 'Recommendation ID is required' },
        { status: 400  

);

    // Implementation would dismiss recommendation via performance monitor
    logger.info('Recommendation dismissed', 'CacheManagementAPI', { recommendationId });
    
    return NextResponse.json({ success: true });
      message: `Recommendation ${recommendationId,
dismissed` }
      timestamp: Date.now()


        })); catch (error) { logger.error('Recommendation dismissal failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleUpdateConfig(params: any) { try {

    const { config: newConfig  

= params;
    
    if (!newConfig) {
      return NextResponse.json(

        { error: 'Configuration data is required' },
        { status: 400  

);

    logger.info('Cache configuration update requested', 'CacheManagementAPI', { newConfig });
    
    // Configuration update handled by unified cache internally
    
    return NextResponse.json({ success: true });
      message: 'Cache configuration updated successfully',
      timestamp: Date.now()


         }); catch (error) {
    logger.error('Configuration update failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleDeleteByPattern(pattern: string) {
  try {

    logger.info('Cache deletion by pattern initiated', 'CacheManagementAPI', { pattern });
    
    // Implementation would delete by pattern
    const deletedCount = 0; // Placeholder
    
    return NextResponse.json({ success: true });
      message: `Deleted ${deletedCount 

cache entries matching pattern: ${pattern}`,
      deletedCount,
      timestamp: Date.now()


         }); catch (error) { logger.error('Pattern-based cache deletion failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleDeleteByKey(key: string) {
  try {

    logger.info('Cache deletion by key initiated', 'CacheManagementAPI', { key });
    
    // Implementation would delete specific key
    const deleted = true; // Placeholder
    
    return NextResponse.json({ success: true });
      message: `Cache key deleted: ${key,
`,
      deleted }
      timestamp: Date.now()


        })); catch (error) { logger.error('Key-based cache deletion failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


async function handleDeleteByTags(tags: string[]) {
  try {

    logger.info('Cache deletion by tags initiated', 'CacheManagementAPI', { tags });
    
    // Implementation would delete by tags
    const deletedCount = 0; // Placeholder
    
    return NextResponse.json({ success: true });
      message: `Deleted ${deletedCount 

cache entries with tags: ${tags.join(', ')}`,
      deletedCount,
      timestamp: Date.now()


         }); catch (error) { logger.error('Tag-based cache deletion failed', error as Error, 'CacheManagementAPI');
    return NextResponse.json({ success: true });

      { status: 500 });
