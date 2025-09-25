import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/waivers/schedule - Get waiver processing schedule
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    // Get league settings and current status
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    // Calculate waiver processing schedule
    const currentDate = new Date();
    const currentWeek = league.currentWeek || 15;
    const settings = league.settings as any;
    const waiverSettings = settings?.waiverSettings || {};
    
    // Default waiver schedule: Wednesdays at 12:00 PM ET
    const waiverDay = waiverSettings?.waiverDay || 3; // Wednesday = 3
    const waiverTime = waiverSettings?.waiverTime || '12:00'; // 12:00 PM
    
    const schedule = calculateWaiverSchedule(currentDate, currentWeek, waiverDay, waiverTime);
    
    // Get pending claims count
    const pendingClaims = await prisma.transaction.count({
      where: {
        leagueId: targetLeagueId,
        type: 'waiver',
        status: 'PENDING'
      }
    });
    
    return NextResponse.json({
      success: true,
      schedule: {
        nextProcessing: schedule.nextProcessing,
        nextDeadline: schedule.nextDeadline,
        waiverDay: getDayName(waiverDay),
        waiverTime,
        timezone: 'America/New_York',
        isWaiverPeriod: schedule.isWaiverPeriod,
        timeUntilDeadline: schedule.timeUntilDeadline,
        timeUntilProcessing: schedule.timeUntilProcessing
      },
      league: {
        id: league.id,
        name: league.name,
        currentWeek,
        waiverMode: settings?.waiverMode || 'ROLLING',
        pendingClaims
      }
    });
    
  } catch (error) {
    console.error('Waiver schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waiver schedule' },
      { status: 500 }
    );
  }
}

// POST /api/waivers/schedule - Update waiver schedule (Commissioner only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leagueId, waiverDay, waiverTime, autoProcess } = body;
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { commissionerId: true, settings: true }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    if (league.commissionerId !== session.userId) {
      return NextResponse.json(
        { error: 'Only the commissioner can update waiver schedule' },
        { status: 403 }
      );
    }
    
    // Update league settings
    const currentSettings = league.settings as any || {
      rosterSlots: {},
      scoringSystem: {},
      waiverMode: 'ROLLING',
      playoffWeeks: {}
    };
    
    await prisma.league.update({
      where: { id: leagueId },
      data: {
        settings: {
          ...currentSettings,
          waiverSettings: {
            waiverDay,
            waiverTime,
            autoProcess: autoProcess || false
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Waiver schedule updated successfully',
      schedule: {
        waiverDay: getDayName(waiverDay),
        waiverTime,
        autoProcess
      }
    });
    
  } catch (error) {
    console.error('Update waiver schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to update waiver schedule' },
      { status: 500 }
    );
  }
}

function calculateWaiverSchedule(currentDate: Date, currentWeek: number, waiverDay: number, waiverTime: string) {
  const now = new Date();
  
  // Calculate next waiver processing time
  const nextProcessing = getNextWaiverDate(now, waiverDay, waiverTime);
  
  // Waiver deadline is typically 24 hours before processing
  const nextDeadline = new Date(nextProcessing.getTime() - 24 * 60 * 60 * 1000);
  
  // Check if we're currently in waiver period
  const isWaiverPeriod = now >= nextDeadline && now < nextProcessing;
  
  // Calculate time remaining
  const timeUntilDeadline = Math.max(0, nextDeadline.getTime() - now.getTime());
  const timeUntilProcessing = Math.max(0, nextProcessing.getTime() - now.getTime());
  
  return {
    nextProcessing: nextProcessing.toISOString(),
    nextDeadline: nextDeadline.toISOString(),
    isWaiverPeriod,
    timeUntilDeadline,
    timeUntilProcessing
  };
}

function getNextWaiverDate(currentDate: Date, waiverDay: number, waiverTime: string): Date {
  const [hour, minute] = waiverTime.split(':').map(Number);
  
  // Start with today
  const nextDate = new Date(currentDate);
  nextDate.setHours(hour, minute, 0, 0);
  
  // If today is waiver day and time hasn't passed, use today
  if (nextDate.getDay() === waiverDay && nextDate > currentDate) {
    return nextDate;
  }
  
  // Otherwise, find next occurrence of waiver day
  const daysUntilWaiverDay = (waiverDay - nextDate.getDay() + 7) % 7;
  if (daysUntilWaiverDay === 0) {
    // Same day but time has passed, move to next week
    nextDate.setDate(nextDate.getDate() + 7);
  } else {
    nextDate.setDate(nextDate.getDate() + daysUntilWaiverDay);
  }
  
  return nextDate;
}

function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Wednesday';
}

async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}