import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
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
    
    // Build query conditions
    const where: any = {
      userId: session.userId
    };
    
    if (unreadOnly) {
      where.isRead = false;
    }
    
    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });
    
    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.userId,
        isRead: false
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          content: n.content,
          isRead: n.isRead,
          createdAt: n.createdAt,
          metadata: n.metadata
        })),
        unreadCount,
        total: notifications.length,
        hasMore: notifications.length === limit
      }
    });
    
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, content, leagueId, metadata } = body;
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session
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
    
    // Validate required fields
    if (!userId || !type || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        leagueId: leagueId || await getDefaultLeagueId(userId),
        type,
        title,
        content,
        metadata: metadata || {}
      }
    });
    
    return NextResponse.json({
      success: true,
      notification
    });
    
  } catch (error) {
    console.error('Notification create error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, markAllRead } = body;
    
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
    
    if (markAllRead) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: session.userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: {
            in: notificationIds
          },
          userId: session.userId
        },
        data: {
          isRead: true
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `${notificationIds.length} notifications marked as read`
      });
    } else {
      return NextResponse.json(
        { error: 'Must provide notificationIds array or markAllRead flag' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');
    const deleteAll = searchParams.get('deleteAll') === 'true';
    const deleteRead = searchParams.get('deleteRead') === 'true';
    
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
    
    if (notificationId) {
      // Delete specific notification
      await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId: session.userId
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Notification deleted'
      });
    } else if (deleteAll) {
      // Delete all notifications
      const result = await prisma.notification.deleteMany({
        where: {
          userId: session.userId
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `${result.count} notifications deleted`
      });
    } else if (deleteRead) {
      // Delete read notifications
      const result = await prisma.notification.deleteMany({
        where: {
          userId: session.userId,
          isRead: true
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `${result.count} read notifications deleted`
      });
    } else {
      return NextResponse.json(
        { error: 'Must provide notificationId or delete flag' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Notification delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}

// Helper function to get default league ID
async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}

// Helper function to create system notifications (not a route handler)
async function createSystemNotification(
  userId: string,
  type: 'TRADE' | 'WAIVER' | 'LINEUP' | 'DRAFT' | 'SYSTEM' | 'MENTION',
  title: string,
  content: string,
  metadata?: any
) {
  try {
    const leagueId = await getDefaultLeagueId(userId);
    
    await prisma.notification.create({
      data: {
        userId,
        leagueId,
        type,
        title,
        content,
        metadata: metadata || {}
      }
    });
  } catch (error) {
    console.error('Failed to create system notification:', error);
  }
}

// Helper function to notify trade participants
async function notifyTradeParticipants(tradeId: string) {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        proposer: true,
        team: {
          include: { owner: true }
        }
      }
    });
    
    if (!trade) return;
    
    // Notify target team owner
    if (trade.team) {
      await createSystemNotification(
        trade.team.ownerId,
        'TRADE',
        'New Trade Proposal',
        `You have received a trade proposal from ${trade.proposer.name}`,
        { tradeId }
      );
    }
  } catch (error) {
    console.error('Failed to notify trade participants:', error);
  }
}

// Helper function to notify waiver processed
async function notifyWaiverProcessed(waiverClaimId: string) {
  try {
    const claim = await prisma.waiverClaim.findUnique({
      where: { id: waiverClaimId },
      include: {
        team: {
          include: { owner: true }
        },
        player: true
      }
    });
    
    if (!claim) return;
    
    const status = claim.status === 'PROCESSED' ? 'successful' : 'failed';
    
    await createSystemNotification(
      claim.team.ownerId,
      'WAIVER',
      `Waiver Claim ${status}`,
      `Your waiver claim for ${claim.player.name} was ${status}`,
      { waiverClaimId }
    );
  } catch (error) {
    console.error('Failed to notify waiver processed:', error);
  }
}