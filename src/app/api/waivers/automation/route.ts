import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/db';
import { waiverScheduler } from '@/lib/cron/waiver-scheduler';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const automationSettingsSchema = z.object({
  leagueId: z.string().min(1, 'League ID is required'),
  autoProcess: z.boolean(),
  waiverDay: z.number().min(0).max(6), // 0-6 for Sunday-Saturday
  waiverTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'Invalid time format (use HH:MM)'),
  timezone: z.string().default('America/New_York'),
  notifications: z.object({
    beforeProcessing: z.boolean().default(true),
    afterProcessing: z.boolean().default(true),
    onFailure: z.boolean().default(true)
  }).optional()
});

// GET /api/waivers/automation - Get automation settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        commissionerId: true,
        settings: true
      }
    });

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    if (league.commissionerId !== session.user.id) {
      return NextResponse.json({ error: 'Only commissioners can view automation settings' }, { status: 403 });
    }

    const settings = league.settings as any;
    const waiverSettings = settings?.waiverSettings || {};

    // Get job status from scheduler
    const jobStatus = await waiverScheduler.getJobStatus(leagueId);

    // Get recent processing history
    // TODO: Implement jobExecution model or use alternative tracking
    const recentProcessing: any[] = []; /* await prisma.jobExecution.findMany({
      where: {
        jobType: 'WAIVER_PROCESSING',
        metadata: {
          path: ['leagueId'],
          equals: leagueId
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        result: true,
        error: true,
        startedAt: true,
        completedAt: true,
        duration: true
      }
    }); */

    return NextResponse.json({
      success: true,
      data: {
        leagueId: league.id,
        leagueName: league.name,
        automation: {
          enabled: waiverSettings.autoProcess || false,
          waiverDay: waiverSettings.waiverDay || 3,
          waiverTime: waiverSettings.waiverTime || '12:00',
          timezone: waiverSettings.timezone || 'America/New_York',
          notifications: waiverSettings.notifications || {
            beforeProcessing: true,
            afterProcessing: true,
            onFailure: true
          }
        },
        jobStatus: {
          isScheduled: jobStatus.exists,
          nextExecution: jobStatus.nextExecution,
          status: jobStatus.status || 'inactive'
        },
        recentProcessing: recentProcessing.map(job => ({
          id: job.id,
          status: job.status,
          processed: job.result?.processed || 0,
          failed: job.result?.failed || 0,
          error: job.error,
          executedAt: job.startedAt,
          duration: job.duration
        }))
      }
    });

  } catch (error) {
    console.error('Automation settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch automation settings' }, { status: 500 });
  }
}

// POST /api/waivers/automation - Update automation settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = automationSettingsSchema.parse(body);

    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: validatedData.leagueId },
      select: {
        id: true,
        name: true,
        commissionerId: true,
        settings: true
      }
    });

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    if (league.commissionerId !== session.user.id) {
      return NextResponse.json({ error: 'Only commissioners can update automation settings' }, { status: 403 });
    }

    // Update league settings
    const currentSettings = league.settings as any || {};
    const updatedSettings = {
      ...currentSettings,
      waiverSettings: {
        ...currentSettings.waiverSettings,
        autoProcess: validatedData.autoProcess,
        waiverDay: validatedData.waiverDay,
        waiverTime: validatedData.waiverTime,
        timezone: validatedData.timezone,
        notifications: validatedData.notifications || {
          beforeProcessing: true,
          afterProcessing: true,
          onFailure: true
        }
      }
    };

    await prisma.league.update({
      where: { id: validatedData.leagueId },
      data: { settings: updatedSettings }
    });

    // Update scheduler
    if (validatedData.autoProcess) {
      await waiverScheduler.updateSchedule(validatedData.leagueId, updatedSettings.waiverSettings);
    } else {
      waiverScheduler.removeJob(validatedData.leagueId);
    }

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_WAIVER_AUTOMATION',
        details: {
          leagueId: validatedData.leagueId,
          entityType: 'League',
          entityId: validatedData.leagueId,
          after: {
            autoProcess: validatedData.autoProcess,
            waiverDay: validatedData.waiverDay,
            waiverTime: validatedData.waiverTime,
            timezone: validatedData.timezone
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Waiver automation ${validatedData.autoProcess ? 'enabled' : 'disabled'} successfully`,
      data: {
        leagueId: validatedData.leagueId,
        leagueName: league.name,
        automation: {
          enabled: validatedData.autoProcess,
          waiverDay: validatedData.waiverDay,
          waiverTime: validatedData.waiverTime,
          timezone: validatedData.timezone,
          nextProcessing: validatedData.autoProcess 
            ? calculateNextWaiverDate(validatedData.waiverDay, validatedData.waiverTime, validatedData.timezone)
            : null
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Automation settings update error:', error);
    return NextResponse.json({ error: 'Failed to update automation settings' }, { status: 500 });
  }
}

// DELETE /api/waivers/automation - Disable automation
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        commissionerId: true,
        settings: true
      }
    });

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    if (league.commissionerId !== session.user.id) {
      return NextResponse.json({ error: 'Only commissioners can disable automation' }, { status: 403 });
    }

    // Update league settings to disable automation
    const currentSettings = league.settings as any || {};
    const updatedSettings = {
      ...currentSettings,
      waiverSettings: {
        ...currentSettings.waiverSettings,
        autoProcess: false
      }
    };

    await prisma.league.update({
      where: { id: leagueId },
      data: { settings: updatedSettings }
    });

    // Remove scheduled job
    waiverScheduler.removeJob(leagueId);

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DISABLE_WAIVER_AUTOMATION',
        details: {
          leagueId,
          entityType: 'League',
          entityId: leagueId,
          after: { autoProcess: false }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Waiver automation disabled successfully',
      data: {
        leagueId,
        leagueName: league.name,
        automation: {
          enabled: false
        }
      }
    });

  } catch (error) {
    console.error('Automation disable error:', error);
    return NextResponse.json({ error: 'Failed to disable automation' }, { status: 500 });
  }
}

function calculateNextWaiverDate(waiverDay: number, waiverTime: string, timezone: string): string {
  const [hour, minute] = waiverTime.split(':').map(Number);
  const now = new Date();
  
  // Calculate next occurrence of the waiver day
  const daysUntilWaiverDay = (waiverDay - now.getDay() + 7) % 7;
  const nextWaiverDate = new Date(now);
  nextWaiverDate.setDate(now.getDate() + (daysUntilWaiverDay === 0 ? 7 : daysUntilWaiverDay));
  nextWaiverDate.setHours(hour, minute, 0, 0);
  
  return nextWaiverDate.toISOString();
}