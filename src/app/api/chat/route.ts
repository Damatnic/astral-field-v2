import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/chat - Get chat messages for a channel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || 'general';
    const leagueId = searchParams.get('leagueId');
    const limit = parseInt(searchParams.get('limit') || '50');
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
    
    // Get user's league if not specified
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    // Fetch messages from database
    // Note: Channel filtering removed since Message model doesn't have metadata field
    const messages = await prisma.message.findMany({
      where: {
        leagueId: targetLeagueId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });
    
    // Get user's role in the league
    const userRole = await getUserRole(session.userId, targetLeagueId);
    const commissionerId = await getCommissionerId(targetLeagueId);
    
    // Format messages for response
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      author: {
        id: msg.userId || '',
        name: msg.user?.name || 'System',
        avatar: getInitials(msg.user?.name || 'System'),
        role: msg.userId === commissionerId ? 'COMMISSIONER' : 'PLAYER',
        teamName: 'League Member'
      },
      timestamp: msg.createdAt,
      channel: channel,
      type: 'message'
    }));
    
    // Reverse to show oldest first (chronological order)
    formattedMessages.reverse();
    
    // Get channel stats
    const channelStats = await getChannelStats(targetLeagueId);
    
    return NextResponse.json({
      success: true,
      data: {
        messages: formattedMessages,
        channelStats,
        userRole,
        total: messages.length,
        hasMore: messages.length === limit
      }
    });
    
  } catch (error) {
    console.error('Chat fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Send a new chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, channel = 'general', leagueId, messageType = 'message', metadata } = body;
    
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
    
    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }
    
    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long (max 1000 characters)' },
        { status: 400 }
      );
    }
    
    // Get user's league and team
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    // Get user's team in this league
    const team = await prisma.team.findFirst({
      where: {
        ownerId: session.userId,
        leagueId: targetLeagueId
      }
    });
    
    // Check if commissioner-only channel
    if (channel === 'commissioner') {
      const isCommissioner = await checkIfCommissioner(session.userId, targetLeagueId);
      if (!isCommissioner) {
        return NextResponse.json(
          { error: 'Only commissioners can post in this channel' },
          { status: 403 }
        );
      }
    }
    
    // Create the message
    const message = await prisma.message.create({
      data: {
        leagueId: targetLeagueId,
        userId: session.userId,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create notification for mentions
    const mentions = extractMentions(content);
    if (mentions.length > 0) {
      await createMentionNotifications(mentions, message.id, session.userId, targetLeagueId);
    }
    
    // Format response
    const isCommissioner = await checkIfCommissioner(session.userId, targetLeagueId);
    const formattedMessage = {
      id: message.id,
      content: message.content,
      author: {
        id: message.userId || '',
        name: message.user?.name || 'System',
        avatar: getInitials(message.user?.name || 'System'),
        role: isCommissioner ? 'COMMISSIONER' : 'PLAYER',
        teamName: 'League Member'
      },
      timestamp: message.createdAt,
      channel: channel,
      type: 'message'
    };
    
    return NextResponse.json({
      success: true,
      message: formattedMessage
    });
    
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat - Delete a chat message (owner or commissioner only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // Get the message
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Check permissions (owner or commissioner)
    const isOwner = message.userId === session.userId;
    const isCommissioner = await checkIfCommissioner(session.userId, message.leagueId);
    
    if (!isOwner && !isCommissioner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this message' },
        { status: 403 }
      );
    }
    
    // Delete the message
    await prisma.message.delete({
      where: { id: messageId }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });
    
  } catch (error) {
    console.error('Chat delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}

async function getCommissionerId(leagueId: string): Promise<string | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { commissionerId: true }
  });
  return league?.commissionerId || null;
}

async function checkIfCommissioner(userId: string, leagueId: string): Promise<boolean> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { commissionerId: true }
  });
  
  return league?.commissionerId === userId || false;
}

async function getUserRole(userId: string, leagueId: string): Promise<string> {
  const isCommissioner = await checkIfCommissioner(userId, leagueId);
  return isCommissioner ? 'COMMISSIONER' : 'PLAYER';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

async function getChannelStats(leagueId: string) {
  // Since Message model doesn't have metadata field, return total count for all channels
  const totalMessages = await prisma.message.count({
    where: { 
      leagueId
    }
  });
  
  return {
    general: totalMessages,
    trades: 0,
    'trash-talk': 0,
    commissioner: 0
  };
}

function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

async function createMentionNotifications(
  mentions: string[],
  messageId: string,
  senderId: string,
  leagueId: string
) {
  // Find users that match the mentions
  const users = await prisma.user.findMany({
    where: {
      OR: mentions.map(mention => ({
        name: {
          contains: mention,
          mode: 'insensitive' as const
        }
      }))
    }
  });
  
  // Create notifications for each mentioned user
  const notifications = users
    .filter(user => user.id !== senderId) // Don't notify self
    .map(user => ({
      userId: user.id,
      type: 'NEWS_UPDATE' as const,
      title: 'You were mentioned in chat',
      message: `You were mentioned in a chat message`,
      data: {
        messageId,
        senderId,
        leagueId
      }
    }));
  
  if (notifications.length > 0) {
    await prisma.notification.createMany({
      data: notifications
    });
  }
}