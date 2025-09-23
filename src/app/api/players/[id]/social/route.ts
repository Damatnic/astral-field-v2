import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/lib/error-handling';
import { authenticateFromRequest } from '@/lib/auth';
import { redisCache, fantasyKeys } from '@/lib/redis-cache';
import { CACHE_TAGS } from '@/lib/cache';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/players/[id]/social - Update player social interactions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const playerId = params.id;
    const body = await request.json();
    const { action, content } = body;

    // Validate action
    const validActions = ['like', 'unlike', 'watch', 'unwatch', 'note', 'share'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }

    let result;

    try {
      switch (action) {
        case 'like':
          result = await handleLikePlayer(playerId, user.id);
          break;
        case 'unlike':
          result = await handleUnlikePlayer(playerId, user.id);
          break;
        case 'watch':
          result = await handleWatchPlayer(playerId, user.id);
          break;
        case 'unwatch':
          result = await handleUnwatchPlayer(playerId, user.id);
          break;
        case 'note':
          result = await handleAddNote(playerId, user.id, content);
          break;
        case 'share':
          result = await handleSharePlayer(playerId, user.id);
          break;
        default:
          throw new Error('Unhandled action');
      }

      // Invalidate relevant caches
      await redisCache.invalidateByTag([CACHE_TAGS.PLAYERS]);
      await redisCache.delete(fantasyKeys.player(playerId));

      return NextResponse.json({
        success: true,
        action,
        playerId,
        userId: user.id,
        result
      });

    } catch (dbError) {
      console.error('Database error in social action:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    handleComponentError(error as Error, 'player-social-api');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/players/[id]/social - Get social data for player
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const playerId = params.id;
    
    // Try cache first
    const cacheKey = fantasyKeys.playerSocial(playerId, user.id);
    const cached = await redisCache.get(cacheKey, [CACHE_TAGS.PLAYERS]);

    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch social data from database
    const socialData = await getSocialData(playerId, user.id);

    // Cache for 5 minutes
    await redisCache.set(cacheKey, socialData, 300, [CACHE_TAGS.PLAYERS]);

    return NextResponse.json(socialData);

  } catch (error) {
    handleComponentError(error as Error, 'player-social-get');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for social actions
async function handleLikePlayer(playerId: string, userId: string) {
  // Check if already liked
  const existingLike = await prisma.playerLike.findUnique({
    where: {
      playerId_userId: {
        playerId,
        userId
      }
    }
  });

  if (existingLike) {
    return { alreadyLiked: true, likes: await getTotalLikes(playerId) };
  }

  // Create like
  await prisma.playerLike.create({
    data: {
      playerId,
      userId,
      createdAt: new Date()
    }
  });

  const totalLikes = await getTotalLikes(playerId);

  // Log activity
  await logSocialActivity(playerId, userId, 'like');

  return { liked: true, likes: totalLikes };
}

async function handleUnlikePlayer(playerId: string, userId: string) {
  // Remove like
  const deleted = await prisma.playerLike.deleteMany({
    where: {
      playerId,
      userId
    }
  });

  const totalLikes = await getTotalLikes(playerId);

  if (deleted.count > 0) {
    await logSocialActivity(playerId, userId, 'unlike');
  }

  return { unliked: deleted.count > 0, likes: totalLikes };
}

async function handleWatchPlayer(playerId: string, userId: string) {
  // Check if already watching
  const existingWatch = await prisma.playerWatch.findUnique({
    where: {
      playerId_userId: {
        playerId,
        userId
      }
    }
  });

  if (existingWatch) {
    return { alreadyWatching: true };
  }

  // Create watch
  await prisma.playerWatch.create({
    data: {
      playerId,
      userId,
      createdAt: new Date()
    }
  });

  await logSocialActivity(playerId, userId, 'watch');

  return { watching: true };
}

async function handleUnwatchPlayer(playerId: string, userId: string) {
  // Remove watch
  const deleted = await prisma.playerWatch.deleteMany({
    where: {
      playerId,
      userId
    }
  });

  if (deleted.count > 0) {
    await logSocialActivity(playerId, userId, 'unwatch');
  }

  return { unwatched: deleted.count > 0 };
}

async function handleAddNote(playerId: string, userId: string, content: string) {
  if (!content || content.trim().length === 0) {
    throw new Error('Note content is required');
  }

  // Create note
  const note = await prisma.playerNote.create({
    data: {
      playerId,
      userId,
      content: content.trim(),
      createdAt: new Date()
    }
  });

  const totalNotes = await getTotalNotes(playerId);

  await logSocialActivity(playerId, userId, 'note', content);

  return { noteId: note.id, notes: totalNotes };
}

async function handleSharePlayer(playerId: string, userId: string) {
  // Log share activity
  await logSocialActivity(playerId, userId, 'share');

  // TODO: Generate shareable link or content
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/players/${playerId}`;

  return { shared: true, shareUrl };
}

async function getTotalLikes(playerId: string): Promise<number> {
  return await prisma.playerLike.count({
    where: { playerId }
  });
}

async function getTotalNotes(playerId: string): Promise<number> {
  return await prisma.playerNote.count({
    where: { playerId }
  });
}

async function getSocialData(playerId: string, userId: string) {
  const [
    totalLikes,
    totalNotes,
    userLike,
    userWatch,
    recentNotes,
    recentActivity
  ] = await Promise.all([
    getTotalLikes(playerId),
    getTotalNotes(playerId),
    prisma.playerLike.findUnique({
      where: { playerId_userId: { playerId, userId } }
    }),
    prisma.playerWatch.findUnique({
      where: { playerId_userId: { playerId, userId } }
    }),
    prisma.playerNote.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    }),
    prisma.playerActivity.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })
  ]);

  return {
    likes: totalLikes,
    notes: totalNotes,
    isLiked: !!userLike,
    isWatched: !!userWatch,
    recentNotes: recentNotes.map(note => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      user: note.user
    })),
    recentActivity: recentActivity.map(activity => ({
      id: activity.id,
      type: activity.type,
      createdAt: activity.createdAt,
      user: activity.user,
      content: activity.content
    }))
  };
}

async function logSocialActivity(
  playerId: string, 
  userId: string, 
  type: string, 
  content?: string
) {
  try {
    await prisma.playerActivity.create({
      data: {
        playerId,
        userId,
        type,
        content,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error logging social activity:', error);
    // Don't throw - this is non-critical
  }
}