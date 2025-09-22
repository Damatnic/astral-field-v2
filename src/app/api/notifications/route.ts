import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get user notifications (using existing Transaction model for now)
    const notifications = await prisma.transaction.findMany({
      where: {
        team: {
          ownerId: session.user.id
        }
      },
      include: {
        team: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    const formattedNotifications = notifications.map(transaction => ({
      id: transaction.id,
      type: 'transaction',
      title: `${transaction.type} Transaction`,
      message: `${transaction.type} transaction for ${transaction.team.name}`,
      timestamp: transaction.createdAt,
      isRead: transaction.status === 'completed',
      metadata: {
        transactionType: transaction.type,
        playerIds: transaction.playerIds,
        teamName: transaction.team.name
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        unreadCount: formattedNotifications.filter(n => !n.isRead).length
      }
    });

  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, title, message, targetUserId } = await request.json();

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For now, we'll use the Transaction model to store notifications
    const userTeam = await prisma.team.findFirst({
      where: { ownerId: targetUserId || session.user.id }
    });

    if (!userTeam) {
      return NextResponse.json({ error: 'User team not found' }, { status: 404 });
    }

    const notification = await prisma.transaction.create({
      data: {
        type: 'notification',
        leagueId: userTeam.leagueId,
        teamId: userTeam.id,
        status: 'PENDING',
        playerIds: []
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: notification.id,
        type,
        title,
        message,
        timestamp: notification.createdAt
      }
    });

  } catch (error) {
    console.error('Notification creation error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationIds, markAsRead } = await request.json();

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    // Mark notifications as read by updating status
    await prisma.transaction.updateMany({
      where: {
        id: { in: notificationIds },
        team: {
          ownerId: session.user.id
        }
      },
      data: {
        status: markAsRead ? 'completed' : 'PENDING'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Notifications marked as ${markAsRead ? 'read' : 'unread'}`
    });

  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}