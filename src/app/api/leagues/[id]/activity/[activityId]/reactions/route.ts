import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Activity Reactions API
 * GET /api/leagues/[id]/activity/[activityId]/reactions - Get reactions for an activity
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; activityId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUsers = searchParams.get('includeUsers') === 'true';

    const leagueId = params.id;
    const activityId = params.activityId;

    // For now, simulate reactions since we don't have a reactions table yet
    // In production, this would query a reactions table
    const mockReactions = await getMockReactions(activityId, includeUsers);

    return NextResponse.json({
      success: true,
      data: {
        activityId: activityId,
        leagueId: leagueId,
        reactions: mockReactions.reactions,
        summary: mockReactions.summary,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Activity reactions API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch activity reactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Add reaction to activity
 * POST /api/leagues/[id]/activity/[activityId]/reactions - Add a reaction
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; activityId: string } }
) {
  try {
    const { userId, reaction, emoji = '👍' } = await request.json();
    const leagueId = params.id;
    const activityId = params.activityId;

    if (!userId || !reaction) {
      return NextResponse.json(
        { success: false, error: 'User ID and reaction are required' },
        { status: 400 }
      );
    }

    // Validate user is in the league
    const userInLeague = await prisma.team.findFirst({
      where: {
        leagueId: leagueId,
        ownerId: userId
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    if (!userInLeague) {
      return NextResponse.json(
        { success: false, error: 'User not found in this league' },
        { status: 403 }
      );
    }

    // For now, simulate adding a reaction
    // In production, this would insert into a reactions table
    const newReaction = {
      id: `reaction_${Date.now()}`,
      activityId: activityId,
      userId: userId,
      user: userInLeague.owner,
      reaction: reaction,
      emoji: emoji,
      createdAt: new Date().toISOString()
    };

    // Create audit log for the reaction
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: 'activity_reaction',
          details: {
            leagueId: leagueId,
            activityId: activityId,
            reaction: reaction,
            emoji: emoji
          }
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for reaction:', auditError);
      // Don't fail the main operation
    }

    console.log(`User ${userInLeague.owner.name} reacted to activity ${activityId} with ${emoji}`);

    return NextResponse.json({
      success: true,
      message: 'Reaction added successfully',
      data: newReaction
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add reaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Remove reaction from activity
 * DELETE /api/leagues/[id]/activity/[activityId]/reactions - Remove a reaction
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; activityId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reactionId = searchParams.get('reactionId');

    const leagueId = params.id;
    const activityId = params.activityId;

    if (!userId && !reactionId) {
      return NextResponse.json(
        { success: false, error: 'Either user ID or reaction ID is required' },
        { status: 400 }
      );
    }

    // Validate user is in the league
    const userInLeague = await prisma.team.findFirst({
      where: {
        leagueId: leagueId,
        ownerId: userId || 'unknown'
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!userInLeague && userId) {
      return NextResponse.json(
        { success: false, error: 'User not found in this league' },
        { status: 403 }
      );
    }

    // For now, simulate removing a reaction
    // In production, this would delete from reactions table
    console.log(`Reaction removed from activity ${activityId} by user ${userId || 'unknown'}`);

    // Create audit log for the reaction removal
    if (userId) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: userId,
            action: 'activity_reaction_remove',
            details: {
              leagueId: leagueId,
              activityId: activityId,
              reactionId: reactionId
            }
          }
        });
      } catch (auditError) {
        console.error('Failed to create audit log for reaction removal:', auditError);
        // Don't fail the main operation
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reaction removed successfully',
      data: {
        activityId: activityId,
        userId: userId,
        reactionId: reactionId,
        removedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove reaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function getMockReactions(activityId: string, includeUsers: boolean) {
  // Generate mock reactions for demonstration
  // In production, this would query the reactions table
  
  const mockReactionTypes = [
    { emoji: '👍', name: 'like', count: Math.floor(Math.random() * 10) },
    { emoji: '❤️', name: 'love', count: Math.floor(Math.random() * 5) },
    { emoji: '😂', name: 'laugh', count: Math.floor(Math.random() * 3) },
    { emoji: '😮', name: 'wow', count: Math.floor(Math.random() * 2) },
    { emoji: '😢', name: 'sad', count: Math.floor(Math.random() * 1) },
    { emoji: '😡', name: 'angry', count: Math.floor(Math.random() * 1) }
  ].filter(reaction => reaction.count > 0);

  const reactions = [];
  let totalReactions = 0;

  if (includeUsers) {
    // Generate mock user reactions
    const mockUsers = await getMockLeagueUsers(activityId);
    
    for (const reactionType of mockReactionTypes) {
      for (let i = 0; i < reactionType.count; i++) {
        const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        reactions.push({
          id: `reaction_${activityId}_${user.id}_${reactionType.name}_${i}`,
          activityId: activityId,
          userId: user.id,
          user: user,
          reaction: reactionType.name,
          emoji: reactionType.emoji,
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString() // Random time in last week
        });
        totalReactions++;
      }
    }
  } else {
    totalReactions = mockReactionTypes.reduce((sum, reaction) => sum + reaction.count, 0);
  }

  const summary = {
    total: totalReactions,
    byType: mockReactionTypes.reduce((acc, reaction) => {
      acc[reaction.name] = {
        emoji: reaction.emoji,
        count: reaction.count
      };
      return acc;
    }, {} as { [key: string]: { emoji: string; count: number } }),
    topReaction: mockReactionTypes.length > 0 
      ? mockReactionTypes.reduce((max, reaction) => reaction.count > max.count ? reaction : max)
      : null
  };

  return {
    reactions: includeUsers ? reactions : [],
    summary: summary
  };
}

async function getMockLeagueUsers(activityId: string) {
  // Get some real users from the database for more realistic mock data
  try {
    const users = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        avatar: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (users.length > 0) {
      return users;
    }
  } catch (error) {
    console.error('Error fetching users for mock reactions:', error);
  }

  // Fallback to completely mock users
  return [
    {
      id: 'user1',
      name: 'John Doe',
      avatar: null
    },
    {
      id: 'user2', 
      name: 'Jane Smith',
      avatar: null
    },
    {
      id: 'user3',
      name: 'Mike Johnson',
      avatar: null
    },
    {
      id: 'user4',
      name: 'Sarah Wilson',
      avatar: null
    }
  ];
}