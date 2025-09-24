import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { waiverScheduler } from '@/lib/cron/waiver-scheduler';

export const dynamic = 'force-dynamic';

// GET /api/admin/initialize-scheduler - Initialize waiver scheduler
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    // Require admin access or allow internal calls
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    const isAdmin = session?.user?.role === 'ADMIN';
    
    if (!isInternalCall && !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Initialize the scheduler
    await waiverScheduler.initialize();
    
    // Get current job status
    const activeJobs = waiverScheduler.getActiveJobs();
    
    return NextResponse.json({
      success: true,
      message: 'Waiver scheduler initialized successfully',
      data: {
        initialized: true,
        activeJobs: activeJobs.length,
        jobs: activeJobs
      }
    });

  } catch (error) {
    console.error('Scheduler initialization error:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize scheduler',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/admin/initialize-scheduler - Reinitialize scheduler
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Remove all existing jobs and reinitialize
    await waiverScheduler.removeAllJobs();
    await waiverScheduler.initialize();
    
    const activeJobs = waiverScheduler.getActiveJobs();
    
    return NextResponse.json({
      success: true,
      message: 'Waiver scheduler reinitialized successfully',
      data: {
        reinitialized: true,
        activeJobs: activeJobs.length,
        jobs: activeJobs
      }
    });

  } catch (error) {
    console.error('Scheduler reinitialization error:', error);
    return NextResponse.json({ 
      error: 'Failed to reinitialize scheduler',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}