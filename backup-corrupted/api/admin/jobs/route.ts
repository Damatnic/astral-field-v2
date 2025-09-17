/**
 * Admin Jobs Management API
 * 
 * Provides endpoints for managing background jobs including: * - Job queue status and statistics
 * - Manual job triggering
 * - Scheduled job management
 * - Job monitoring and health checks
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { JobType, QueueManager } from '@/lib/jobs/queue-manager';
import { JobScheduler } from '@/lib/jobs/scheduler';
// RedisClusterManager imported dynamically when needed
import { z } from 'zod';

// Validation schemas
const TriggerJobSchema = z.object({ jobType: z.nativeEnum(JobType),
  data: z.record(z.any()).optional(),
  priority: z.number().min(1).max(10).optional(),
  delay: z.number().min(0).optional()


         });

const ScheduleJobSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  jobType: z.nativeEnum(JobType),
  cronPattern: z.string().min(1),
  timezone: z.string().optional(),
  enabled: z.boolean(),
  data: z.record(z.any()),
  conditions: z.object({

    onlyDuringNFLSeason: z.boolean().optional(),
    onlyOnGameDays: z.boolean().optional() 

    onlyIfDataStale: z.boolean().optional()

  }).optional()
});

const UpdateScheduleSchema = z.object({ name: z.string().optional(),
  cronPattern: z.string().optional(),
  timezone: z.string().optional(),
  enabled: z.boolean().optional(),
  data: z.record(z.any()).optional(),
  conditions: z.object({

    onlyDuringNFLSeason: z.boolean().optional(),
    onlyOnGameDays: z.boolean().optional(),
    onlyIfDataStale: z.boolean().optional()

).optional()
});

// Global instances (in production, these would be injected via DI)
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

    return { authorized: true, user: permissions.user }; catch (error) { logger.error('Error checking admin access', error instanceof Error ? error : new Error(String(error), 'AdminJobsAPI');
    return { authorized: false  

;


// GET /api/admin/jobs - Get job status and statistics
export async function GET(req?: NextRequest) {
  try {
    try {

    const { authorized, user: _user } = await checkAdminAccess(request);
    if (!authorized) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const queueName = url.searchParams.get('queue');
    const jobId = url.searchParams.get('jobId');

    const qm = await getQueueManager();
    const scheduler = await getJobScheduler();

    switch (action) { case 'queues':
        // Get queue statistics
        const queueStats = await qm.getQueueStats(queueName || undefined);
        return NextResponse.json({ success: true });
          data: {

            queues: queueStats,
            timestamp: new Date().toISOString()


         });


      case 'schedules':
        // Get scheduled jobs
        const scheduledJobs = scheduler.getScheduledJobs();
        return NextResponse.json({ success: true });
          data: {

            scheduledJobs,
            total: scheduledJobs.length 

            enabled: scheduledJobs.filter(job => job.enabled).length


        });

      case 'schedule':
        // Get specific scheduled job
        if (!jobId) {

          return NextResponse.json({ error: 'Job ID required' , { status: 400 });

        const scheduledJob = scheduler.getScheduledJob(jobId);
        if (!scheduledJob) {

          return NextResponse.json({ error: 'Scheduled job not found' , { status: 404 });

        return NextResponse.json({ success: true });
          data: scheduledJob


         });

      case 'job-types':
        // Get available job types
        const availableJobTypes = qm.getAvailableJobTypes();
        return NextResponse.json({ success: true });
          data: {

            jobTypes: availableJobTypes 

            queueMapping: availableJobTypes.reduce((acc, jobType) => {
              acc[jobType] = qm.getQueueForJobType(jobType);
              return acc;, {} as Record<string, string | undefined>)

        });

      case 'health':
        // Get system health status
        const allQueueStats = await qm.getQueueStats();
        const allScheduledJobs = scheduler.getScheduledJobs();
        
        const health = { queues: {

            total: Object.keys(allQueueStats).length,
            healthy: Object.values(allQueueStats).filter(stats => !('error' in stats)).length,
            stats: allQueueStats

          scheduler: {

            totalJobs: allScheduledJobs.length,
            enabledJobs: allScheduledJobs.filter(job => job.enabled).length 

            recentErrors: allScheduledJobs.filter(job => job.errorCount > 0).length

          },
          timestamp: new Date().toISOString()

        return NextResponse.json({ success: true });

          data: health


        });

      default: // Default: return overview
        const overview = { queues: await qm.getQueueStats(),
          scheduledJobs: scheduler.getScheduledJobs().map(job => ({

            id: job.id,
            name: job.name,
            enabled: job.enabled,
            lastRun: job.lastRun,
            nextRun: job.nextRun,
            runCount: job.runCount,
            errorCount: job.errorCount

)) }
          timestamp: new Date().toISOString()

        };
        
        return NextResponse.json({ success: true });
          data: overview


         }); catch (error) {
    const err = error instanceof Error ? error : new Error(String(error);
    logger.error('Error in GET /api/admin/jobs', err, 'AdminJobsAPI');
    
    return NextResponse.json({ success: true });

      message: err.message

    , { status: 500 });


// POST /api/admin/jobs - Trigger jobs or create schedules
export async function POST(req?: NextRequest) {
  try {
    try {

    const { authorized, user } = await checkAdminAccess(request);
    if (!authorized) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const body = await request.json();

    const qm = await getQueueManager();
    const scheduler = await getJobScheduler();

    switch (action) { case 'trigger':
        // Trigger a one-time job
        const triggerData = TriggerJobSchema.parse(body);
        
        const job = await qm.addJob(triggerData.jobType, {
          id: `manual-${Date.now(),
`,
          type: triggerData.jobType 

          payload: triggerData.data || {},
          metadata: { userId: user.sub,
            createdAt: new Date(),
            source: 'admin-api'


        , {
          priority: triggerData.priority 

          delay: triggerData.delay


        });

        if (!job) { return NextResponse.json({ success: true });

            success: false 

            error: 'Failed to trigger job'

          , { status: 500 });

        logger.info(`Admin triggered job: ${ triggerData.jobType,
`, 'AdminJobsAPI', {
          jobId: job.id,
          userId: user.sub 

          data: triggerData.data


        });

        return NextResponse.json({ success: true });
          data: {

            jobId: job.id,
            jobType: triggerData.jobType,
            status: 'queued'


         });

      case 'schedule':
        // Create a new scheduled job
        const scheduleData = ScheduleJobSchema.parse(body);
        
        const success = await scheduler.addScheduledJob({
          ...scheduleData }
          timezone: scheduleData.timezone || 'America/New_York'


        });

        if (!success) { return NextResponse.json({ success: true });

            success: false 

            error: 'Failed to create scheduled job'

          , { status: 500 });

        logger.info(`Admin created scheduled job: ${ scheduleData.name,
`, 'AdminJobsAPI', {
          jobId: scheduleData.id,
          userId: user.sub 

          cronPattern: scheduleData.cronPattern


        });

        return NextResponse.json({ success: true });
          data: {

            jobId: scheduleData.id,
            message: 'Scheduled job created successfully'

);

      case 'trigger-schedule':
        // Manually trigger a scheduled job
        const { jobId } = body;
        
        if (!jobId || typeof jobId !== 'string') {

          return NextResponse.json({ error: 'Job ID required' , { status: 400 });

        const triggerSuccess = await scheduler.triggerJob(jobId);
        
        if (!triggerSuccess) { return NextResponse.json({ success: true });

            success: false 

            error: 'Failed to trigger scheduled job'

          , { status: 500 });

        logger.info(`Admin triggered scheduled job: ${ jobId 

`, 'AdminJobsAPI', {
          userId: user.sub


        });

        return NextResponse.json({ success: true });
          data: {
            message: 'Scheduled job triggered successfully'

);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 ,
); catch (error) {
    const err = error instanceof Error ? error : new Error(String(error);
    logger.error('Error in POST /api/admin/jobs', err, 'AdminJobsAPI');

    if (err.name === 'ZodError') {
      return NextResponse.json({ success: true });

        error: 'Validation error' 

        details: err.message

      , { status: 400 });

    return NextResponse.json({ success: true });

      message: err.message

    , { status: 500 });


// PUT /api/admin/jobs - Update scheduled jobs
export async function PUT(req?: NextRequest) {
  try {
    try {

    const { authorized, user } = await checkAdminAccess(request);
    if (!authorized) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const body = await request.json();

    if (!jobId) {

      return NextResponse.json({ error: 'Job ID required' , { status: 400 });

    const updateData = UpdateScheduleSchema.parse(body);
    const scheduler = await getJobScheduler();

    const success = await scheduler.updateScheduledJob(jobId, updateData);

    if (!success) { return NextResponse.json({ success: true });

        success: false 

        error: 'Failed to update scheduled job'

      , { status: 500 });

    logger.info(`Admin updated scheduled job: ${ jobId,
`, 'AdminJobsAPI', {
      userId: user.sub 

      updates: Object.keys(updateData)


        });

    return NextResponse.json({ success: true });
      data: {
        message: 'Scheduled job updated successfully'


         }); catch (error) {
    const err = error instanceof Error ? error : new Error(String(error);
    logger.error('Error in PUT /api/admin/jobs', err, 'AdminJobsAPI');

    if (err.name === 'ZodError') {
      return NextResponse.json({ success: true });

        error: 'Validation error' 

        details: err.message

      , { status: 400 });

    return NextResponse.json({ success: true });

      message: err.message

    , { status: 500 });


// DELETE /api/admin/jobs - Remove scheduled jobs
export async function DELETE(req?: NextRequest) {
  try {
    try {

    const { authorized, user } = await checkAdminAccess(request);
    if (!authorized) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const action = url.searchParams.get('action');

    if (!jobId) {

      return NextResponse.json({ error: 'Job ID required' , { status: 400 });

    const qm = await getQueueManager();
    const scheduler = await getJobScheduler();

    switch (action) { case 'schedule':
        // Remove scheduled job
        const success = await scheduler.removeScheduledJob(jobId);
        
        if (!success) {
          return NextResponse.json({ success: true });

            success: false 

            error: 'Failed to remove scheduled job'

          , { status: 500 });

        logger.info(`Admin removed scheduled job: ${ jobId 

`, 'AdminJobsAPI', {
          userId: user.sub


        });

        return NextResponse.json({ success: true });
          data: {
            message: 'Scheduled job removed successfully'

);

      case 'clean-queue':
        // Clean queue
        const queueName = url.searchParams.get('queue');
        const type = url.searchParams.get('type') as 'completed' | 'failed' | 'active' | 'waiting' || 'completed';
        const limit = parseInt(url.searchParams.get('limit') || '1000');
        
        if (!queueName) {

          return NextResponse.json({ error: 'Queue name required' }, { status: 400  

);

        const cleanedCount = await qm.cleanQueue(queueName, 0, limit, type);

        logger.info(`Admin cleaned queue: ${queueName}`, 'AdminJobsAPI', { userId: user.sub,
          type }
          cleanedCount
        });

        return NextResponse.json({ success: true });
          data: {

            cleanedCount,
            message: `Cleaned ${cleanedCount 

jobs from queue`

        });

      default: return NextResponse.json({ error: 'Invalid action' , { status: 400 }); catch (error) { const err = error instanceof Error ? error : new Error(String(error);
    logger.error('Error in DELETE /api/admin/jobs', err, 'AdminJobsAPI');
    
    return NextResponse.json({ success: true });

      message: err.message

    , { status: 500 });
