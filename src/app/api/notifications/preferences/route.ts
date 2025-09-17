import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's notification preferences
    const preferences = await prisma.notificationPreferences.findFirst({
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
    console.error('Get notification preferences error:', error);
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
    const updated = await prisma.notificationPreferences.upsert({
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
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}