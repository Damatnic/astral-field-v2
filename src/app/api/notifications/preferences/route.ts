import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's notification preferences
    const preferences = await prisma.userPreferences.findFirst({
      where: { userId: user.id }
    });

    // Default preferences if none exist
    const defaultPrefs = {
      lineupReminders: true,
      tradeAlerts: true,
      waiverAlerts: true,
      injuryAlerts: true,
      draftReminders: true,
      matchupReminders: true,
      leagueAnnouncements: true,
      emailFrequency: 'immediate', // immediate, daily, weekly
      pushNotifications: true,
      textMessages: false
    };

    return NextResponse.json({
      success: true,
      preferences: preferences || defaultPrefs
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await request.json();

    // Upsert user notification preferences
    const updated = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {
        ...preferences,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        ...preferences
      }
    });

    return NextResponse.json({
      success: true,
      preferences: updated,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}