/**
 * Jobs Dashboard API
 * 
 * Provides comprehensive dashboard data for job monitoring including: * - Real-time job statistics
 * - Performance metrics
 * - Historical data and trends
 * - System health indicators
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { QueueManager } from '@/lib/jobs/queue-manager';
import { JobScheduler } from '@/lib/jobs/scheduler';
import { AdminSchema, validateSecureRequest } from '@/lib/validation/api-schemas';
// Removed unused imports - RedisClusterManager and prisma are imported dynamically when needed

interface DashboardMetrics { overview: {
    totalQueues: number;
    totalScheduledJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    queuedJobs: number;

;
  queues: Array<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    health: 'healthy' | 'warning' | 'critical';

  }>;
  scheduledJobs: Array<{ id: string;
    name: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    runCount: number;
    errorCount: number;
    health: 'healthy' | 'warning' | 'critical';

>;
  performance: {
    averageProcessingTime: number;
    jobThroughput: number; // jobs per hour
    errorRate: number; // percentage
    systemLoad: number; // percentage

  };
  recentActivity: Array<{ timestamp: Date;
    event: string;
    details: any;
    level: 'info' | 'warning' | 'error';

>;
  alerts: Array<{
    id: string;
    type: 'queue_stalled' | 'high_error_rate' | 'job_failed' | 'system_overload';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    resolved: boolean;

  }>;

// Global instances
let queueManager: QueueManager | null = null;
let jobScheduler: JobScheduler | null = null;

async function getQueueManager(): Promise<QueueManager> { if (!queueManager) {

    const { createQueueManager ,
= await import('@/lib/jobs/queue-manager');
    
    // Use simplified Redis configuration
    const redisConfig = {

      host: process.env.REDIS_HOST || 'localhost' 

      port: parseInt(process.env.REDIS_PORT || '6379')

    };

    queueManager = await createQueueManager(redisConfig);

  return queueManager;

async function getJobScheduler(): Promise<JobScheduler> {
  if (!jobScheduler) {
    const qm = await getQueueManager();

    const { createJobScheduler } = await import('@/lib/jobs/scheduler');
    
    // Use simplified Redis configuration
    const redisConfig = { host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')

;

    jobScheduler = await createJobScheduler(qm, redisConfig);

  return jobScheduler;

// SECURITY: Use centralized admin permission check

async function checkAdminAccess(request: NextRequest): Promise<{ authorized: boolean; user?: any }> {
  try {
    const { checkAdminPermissions } = await import('@/lib/auth');
    const permissions = await checkAdminPermissions(request);
    
    if (!permissions.hasAdminAccess) { return { authorized: false  

;

    return { authorized: true, user: permissions.user }; catch (error) { logger.error('Error checking admin access', error instanceof Error ? error : new Error(String(error), 'JobsDashboardAPI');
    return { authorized: false   

async function generateDashboardMetrics(): Promise<DashboardMetrics> {
  const qm = await getQueueManager();
  const scheduler = await getJobScheduler();

  // Get queue statistics
  const queueStats = await qm.getQueueStats();
  const scheduledJobs = scheduler.getScheduledJobs();

  // Calculate overview metrics
  const overview = {
    totalQueues: Object.keys(queueStats).length,
    totalScheduledJobs: scheduledJobs.length,
    activeJobs: Object.values(queueStats).reduce((sum, stats) => {
      return sum + (typeof stats === 'object' && 'active' in stats ? stats.active : 0);, 0),
    completedJobs: Object.values(queueStats).reduce((sum, stats) => {
      return sum + (typeof stats === 'object' && 'completed' in stats ? stats.completed : 0);, 0),
    failedJobs: Object.values(queueStats).reduce((sum, stats) => {
      return sum + (typeof stats === 'object' && 'failed' in stats ? stats.failed : 0);, 0) }
    queuedJobs: Object.values(queueStats).reduce((sum, stats) => {
      return sum + (typeof stats === 'object' && 'waiting' in stats ? stats.waiting : 0);, 0)
  };

  // Process queue data
  const queues = Object.entries(queueStats).map(([name, stats]) => { if (typeof stats === 'object' && 'waiting' in stats) {
      const totalJobs = stats.waiting + stats.active + stats.completed + stats.failed;
      const errorRate = totalJobs > 0 ? (stats.failed / totalJobs) * 100 : 0;
      
      let health: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (errorRate > 10) health = 'critical';
      else if (errorRate > 5 || stats.waiting > 1000) health = 'warning';

      return {

        name,
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed 

        delayed: stats.delayed || 0 

        health
      }; else { return {
        name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        health: 'critical' as const

        });

  // Process scheduled jobs data
  const scheduledJobsData = scheduledJobs.map(job => {
    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (!job.enabled) {
      health = 'warning';


else if (job.errorCount > 5) {
      health = 'critical';

    } else if (job.errorCount > 2) { health = 'warning';

    return {
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      runCount: job.runCount 

      errorCount: job.errorCount 

      health
    };);

  // Calculate performance metrics
  const performance = await calculatePerformanceMetrics(queueStats, scheduledJobs);

  // Get recent activity
  const recentActivity = await getRecentActivity();

  // Generate alerts
  const alerts = await generateAlerts(queues, scheduledJobsData, performance);

  return { overview,
    queues,
    scheduledJobs: scheduledJobsData,
    performance,
    recentActivity }
    alerts
  };

async function calculatePerformanceMetrics(queueStats: any, _scheduledJobs: any[]): Promise<DashboardMetrics['performance']> { try {
    // Get performance data from the last hour - oneHourAgo would be used for database queries in production
    const _oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Mock calculations - in production, you'd track these metrics in Redis or a time-series DB
    const totalJobs = Object.values(queueStats).reduce((sum: number, stats: any) => {
      if (typeof stats === 'object' && 'completed' in stats) {
        return sum + stats.completed + stats.failed;


      return sum;
    , 0);

    const failedJobs = Object.values(queueStats).reduce((sum: number, stats: any) => {
      if (typeof stats === 'object' && 'failed' in stats) {
        return sum + stats.failed;


      return sum;, 0);

    return {
      averageProcessingTime: 2500, // Mock: 2.5 seconds average

      jobThroughput: Math.max(totalJobs, 0), // Jobs completed in the last hour
      errorRate: totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0,
      systemLoad: 35 // Mock: 35% system load

        } catch (error) {
    logger.error('Error calculating performance metrics', error instanceof Error ? error : new Error(String(error), 'JobsDashboardAPI');
    return {
      averageProcessingTime: 0,
      jobThroughput: 0,
      errorRate: 0,
      systemLoad: 0

async function getRecentActivity(): Promise<DashboardMetrics['recentActivity']> {
  try {
    // Get recent activity from audit logs or job logs
    // This is a mock implementation
    const activities: DashboardMetrics['recentActivity'] = [

        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        event: 'Job Completed' 

        details: { jobType: 'player-stats-sync', duration: '2.3s' },
        level: 'info'

        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        event: 'Scheduled Job Triggered',
        details: { jobName: 'Player News Update', triggeredBy: 'scheduler' },
        level: 'info'

        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        event: 'Job Failed',
        details: { jobType: 'injury-report-update', error: 'API timeout' },
        level: 'error'


    ];

    return activities;
      } catch (error) { logger.error('Error getting recent activity', error instanceof Error ? error : new Error(String(error), 'JobsDashboardAPI');
    return [];


async function generateAlerts(
  queues: DashboardMetrics['queues'],
  scheduledJobs: DashboardMetrics['scheduledJobs'] 

  performance: DashboardMetrics['performance']
): Promise<DashboardMetrics['alerts']> {
  const alerts: DashboardMetrics['alerts'] = [];

  // Check for queue issues
  queues.forEach(queue => {
    if (queue.health === 'critical') {
      alerts.push({

        id: `queue-critical-${queue.name}`,
        type: 'queue_stalled',
        message: `Queue "${ queue.name 

" has critical issues - ${queue.failed} failed jobs`,
        severity: 'critical',
        timestamp: new Date(),
        resolved: false


         });
    } else if (queue.waiting > 1000) { alerts.push({
        id: `queue-overload-${queue.name,
` }
        type: 'system_overload' 

        message: `Queue "${queue.name}" has ${queue.waiting} waiting jobs`,
        severity: 'medium',
        timestamp: new Date(),
        resolved: false


         });

  });

  // Check for scheduled job issues
  scheduledJobs.forEach(job => { if (job.health === 'critical') {
      alerts.push({
        id: `job-failing-${job.id,
` }
        type: 'job_failed' 

        message: `Scheduled job "${job.name}" has ${job.errorCount} recent errors`,
        severity: 'high',
        timestamp: new Date(),
        resolved: false


         });

  });

  // Check performance metrics
  if (performance.errorRate > 10) { alerts.push({
      id: 'high-error-rate',
      type: 'high_error_rate',
      message: `System error rate is ${performance.errorRate.toFixed(1),
%`,
      severity: 'high' 

      timestamp: new Date() 

      resolved: false


        });

  if (performance.systemLoad > 80) { alerts.push({
      id: 'system-overload',
      type: 'system_overload',
      message: `System load is ${performance.systemLoad,
%`,
      severity: 'medium' 

      timestamp: new Date() 

      resolved: false


        });

  return alerts;

// GET /api/admin/jobs/dashboard
export async function GET(req?: NextRequest) {
  try {
    try {

    const { authorized, user: _user  

= await checkAdminAccess(request);
    if (!authorized) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 ,
);

    const url = new URL(request.url);
    const view = url.searchParams.get('view');
    const timeRange = url.searchParams.get('timeRange') || '1h';

    switch (view) {
      case 'metrics':
        // Return just the metrics without full dashboard
        const metrics = await generateDashboardMetrics();
        return NextResponse.json({ success: true });
          data: {

            overview: metrics.overview,
            performance: metrics.performance 

            timestamp: new Date().toISOString()


        });


      case 'alerts':
        // Return just alerts
        const qm = await getQueueManager();
        const scheduler = await getJobScheduler();
        const queueStats = await qm.getQueueStats();
        const scheduledJobs = scheduler.getScheduledJobs();
        
        const queues = Object.entries(queueStats).map(([name, stats]) => { if (typeof stats === 'object' && 'waiting' in stats) {
            const totalJobs = stats.waiting + stats.active + stats.completed + stats.failed;
            const errorRate = totalJobs > 0 ? (stats.failed / totalJobs) * 100 : 0;
            
            let health: 'healthy' | 'warning' | 'critical' = 'healthy';
            if (errorRate > 10) health = 'critical';
            else if (errorRate > 5 || stats.waiting > 1000) health = 'warning';

            return {

              name,
              waiting: stats.waiting,
              active: stats.active,
              completed: stats.completed,
              failed: stats.failed 

              delayed: stats.delayed || 0 

              health
            }; else { return {
              name,
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
              health: 'critical' as const

              });
        const scheduledJobsData = scheduledJobs.map(job => {
          let health: 'healthy' | 'warning' | 'critical' = 'healthy';
          
          if (!job.enabled) {
            health = 'warning';


else if (job.errorCount > 5) {
            health = 'critical';

          } else if (job.errorCount > 2) { health = 'warning';

          return {
            id: job.id,
            name: job.name,
            enabled: job.enabled,
            lastRun: job.lastRun,
            nextRun: job.nextRun,
            runCount: job.runCount 

            errorCount: job.errorCount 

            health
          };);
        const performance = await calculatePerformanceMetrics(queueStats, scheduledJobs);
        
        const alerts = await generateAlerts(queues, scheduledJobsData, performance);
        
        return NextResponse.json({ success: true });
          data: {

            alerts,
            timestamp: new Date().toISOString()


         });

      case 'activity':
        // Return recent activity
        const activity = await getRecentActivity();
        return NextResponse.json({ success: true });
          data: {

            recentActivity: activity 

            timestamp: new Date().toISOString()


        });

      default: // Return full dashboard
        const dashboardData = await generateDashboardMetrics();
        return NextResponse.json({ success: true });
          data: {

            ...dashboardData,
            timestamp: new Date().toISOString() 

            timeRange
          })
        })); catch (error) { const err = error instanceof Error ? error : new Error(String(error);
    logger.error('Error in GET /api/admin/jobs/dashboard', err, 'JobsDashboardAPI');
    
    return NextResponse.json({ success: true });

      message: err.message

    , { status: 500 });


// POST /api/admin/jobs/dashboard - Handle dashboard actions
export async function POST(req?: NextRequest) {
  try {
    try {

    const { authorized, user } = await checkAdminAccess(request);
    if (!authorized) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    // Validate request data with security measures  
    const validation = await validateSecureRequest(request, AdminSchema.jobs.trigger, { maxSize: 50 * 1024, // 50KB limit for admin operations
      allowedMethods: ['POST']

);

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400  

);

      );

    const { jobType, data: actionData } = validation.data;
    const action = jobType;

    switch (action) { case 'CLEANUP':
        // Dismiss an alert
        const alertId = actionData?.alertId;
        
        // In production, you'd update the alert status in your database
        logger.info(`Admin dismissed alert: ${alertId 

`, 'JobsDashboardAPI', {
          userId: user.sub


        });

        return NextResponse.json({ success: true });
          data: {
            message: 'Alert dismissed successfully'


         });

      case 'STATS_UPDATE':
        // Export metrics data
        const metrics = await generateDashboardMetrics();
        
        // In production, you might generate a CSV or PDF report
        return NextResponse.json({ success: true });
          data: {

            metrics,
            exportedAt: new Date().toISOString() 

            exportedBy: user.sub


        });

      default: return NextResponse.json({ error: 'Invalid action' , { status: 400 }); catch (error) { const err = error instanceof Error ? error : new Error(String(error);
    logger.error('Error in POST /api/admin/jobs/dashboard', err, 'JobsDashboardAPI');
    
    return NextResponse.json({ success: true });

      message: err.message

    , { status: 500 });
