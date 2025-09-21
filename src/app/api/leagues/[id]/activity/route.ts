import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';
import { handleComponentError } from '@/lib/error-handling';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    const leagueId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // trade, waiver, matchup, injury, milestone

    // Verify league exists and user has access
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          where: { ownerId: user.id },
          take: 1
        }
      }
    });

    if (!league) {
      return NextResponse.json(
        { success: false, message: 'League not found' },
        { status: 404 }
      );
    }

    // Build activity query based on type filter
    const whereClause: any = { leagueId };
    if (type) {
      whereClause.type = type;
    }

    // Fetch real activity from database
    const activities = await prisma.leagueActivity.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        relatedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        relatedTeam: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Count total activities for pagination
    const totalCount = await prisma.leagueActivity.count({
      where: whereClause
    });

    // If no activities exist yet, create some initial ones based on existing data
    if (activities.length === 0 && offset === 0) {
      // Create activities from recent matchups
      const recentMatchups = await prisma.matchup.findMany({
        where: {
          leagueId,
          isComplete: true
        },
        include: {
          homeTeam: {
            include: { owner: true }
          },
          awayTeam: {
            include: { owner: true }
          }
        },
        orderBy: { week: 'desc' },
        take: 5
      });

      for (const matchup of recentMatchups) {
        const winner = matchup.homeScore > matchup.awayScore ? matchup.homeTeam : matchup.awayTeam;
        const loser = matchup.homeScore > matchup.awayScore ? matchup.awayTeam : matchup.homeTeam;
        
        await prisma.leagueActivity.create({
          data: {
            type: 'matchup',
            title: 'Matchup Result',
            description: `Week ${matchup.week} - ${winner.name} defeated ${loser.name}`,
            userId: winner.owner.id,
            relatedUserId: loser.owner.id,
            teamId: winner.id,
            relatedTeamId: loser.id,
            leagueId,
            metadata: {
              week: matchup.week,
              score: `${matchup.homeScore} - ${matchup.awayScore}`,
              homeTeam: matchup.homeTeam.name,
              awayTeam: matchup.awayTeam.name
            }
          }
        });
      }

      // Create activities from recent trades
      const recentTrades = await prisma.trade.findMany({
        where: { leagueId },
        include: {
          proposer: {
            include: { owner: true }
          },
          receiver: {
            include: { owner: true }
          },
          proposerPlayers: {
            include: { player: true }
          },
          receiverPlayers: {
            include: { player: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      for (const trade of recentTrades) {
        await prisma.leagueActivity.create({
          data: {
            type: 'trade',
            title: trade.status === 'accepted' ? 'Trade Completed' : 'Trade Proposal',
            description: `${trade.proposerPlayers.length + trade.receiverPlayers.length} players involved`,
            userId: trade.proposer.owner.id,
            relatedUserId: trade.receiver.owner.id,
            teamId: trade.proposerId,
            relatedTeamId: trade.receiverId,
            leagueId,
            metadata: {
              status: trade.status,
              proposerPlayers: trade.proposerPlayers.map(tp => tp.player.name),
              receiverPlayers: trade.receiverPlayers.map(tp => tp.player.name)
            }
          }
        });
      }

      // Create activities from waiver claims
      const recentWaivers = await prisma.waiverClaim.findMany({
        where: {
          team: {
            leagueId
          }
        },
        include: {
          team: {
            include: { owner: true }
          },
          player: true,
          droppedPlayer: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      for (const waiver of recentWaivers) {
        await prisma.leagueActivity.create({
          data: {
            type: 'waiver',
            title: waiver.status === 'successful' ? 'Waiver Claim Successful' : 'Waiver Claim',
            description: `Claimed ${waiver.player.name}`,
            userId: waiver.team.owner.id,
            teamId: waiver.teamId,
            leagueId,
            metadata: {
              status: waiver.status,
              player: waiver.player.name,
              droppedPlayer: waiver.droppedPlayer?.name,
              priority: waiver.priority
            }
          }
        });
      }

      // Re-fetch activities after creating them
      const newActivities = await prisma.leagueActivity.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          relatedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          },
          relatedTeam: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      // Format activities for response
      const formattedActivities = newActivities.map(activity => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        timestamp: formatTimestamp(activity.createdAt),
        user: activity.user ? {
          name: activity.user.name,
          team: activity.team?.name || 'Unknown Team',
          avatar: activity.user.avatar || getDefaultAvatar(activity.user.name)
        } : null,
        relatedUser: activity.relatedUser ? {
          name: activity.relatedUser.name,
          team: activity.relatedTeam?.name || 'Unknown Team',
          avatar: activity.relatedUser.avatar || getDefaultAvatar(activity.relatedUser.name)
        } : null,
        metadata: activity.metadata,
        reactions: {
          likes: 0,
          comments: 0,
          isLiked: false
        },
        createdAt: activity.createdAt
      }));

      return NextResponse.json({
        success: true,
        data: formattedActivities,
        pagination: {
          total: newActivities.length,
          limit,
          offset,
          hasMore: newActivities.length > offset + limit
        }
      });
    }

    // Format existing activities for response
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      timestamp: formatTimestamp(activity.createdAt),
      user: activity.user ? {
        name: activity.user.name,
        team: activity.team?.name || 'Unknown Team',
        avatar: activity.user.avatar || getDefaultAvatar(activity.user.name)
      } : null,
      relatedUser: activity.relatedUser ? {
        name: activity.relatedUser.name,
        team: activity.relatedTeam?.name || 'Unknown Team',
        avatar: activity.relatedUser.avatar || getDefaultAvatar(activity.relatedUser.name)
      } : null,
      metadata: activity.metadata,
      reactions: {
        likes: 0,
        comments: 0,
        isLiked: false
      },
      createdAt: activity.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: formattedActivities,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: totalCount > offset + limit
      }
    });

  } catch (error) {
    handleComponentError(error as Error, 'league-activity-api');
    return NextResponse.json(
      { success: false, message: 'Failed to fetch league activity' },
      { status: 500 }
    );
  }
}

// Helper function to format timestamps
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Helper function to get default avatar emoji
function getDefaultAvatar(name: string): string {
  const emojis = ['👑', '🦅', '💪', '💥', '🔨', '🏆', '⚡', '🎯', '🚀', '🔥'];
  const index = name.charCodeAt(0) % emojis.length;
  return emojis[index];
}