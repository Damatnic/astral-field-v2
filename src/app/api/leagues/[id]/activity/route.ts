import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const leagueId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // trade, waiver, matchup, injury, milestone

    // Verify user is in this league
    const userTeam = await prisma.team.findFirst({
      where: {
        leagueId,
        userId: user.id
      }
    });

    if (!userTeam) {
      return NextResponse.json({ success: false, error: 'Not a member of this league' }, { status: 403 });
    }

    // Build activity feed from various sources
    const activities = [];

    // 1. Trade Activities
    if (!type || type === 'trade') {
      const trades = await prisma.trade.findMany({
        where: { leagueId },
        include: {
          proposingTeam: { include: { user: true } },
          receivingTeam: { include: { user: true } },
          tradeItems: {
            include: {
              player: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: type === 'trade' ? limit : 5
      });

      for (const trade of trades) {
        const players = trade.tradeItems.map(item => item.player?.name).filter(Boolean);
        
        activities.push({
          id: `trade-${trade.id}`,
          type: 'trade',
          title: trade.status === 'accepted' ? 'Trade Completed' : 'Trade Proposed',
          description: `${players.length} player${players.length > 1 ? 's' : ''} involved`,
          timestamp: formatTimestamp(trade.createdAt),
          user: {
            name: trade.proposingTeam.user.displayName || trade.proposingTeam.user.username,
            team: trade.proposingTeam.name,
            avatar: trade.proposingTeam.user.avatar
          },
          relatedUser: {
            name: trade.receivingTeam.user.displayName || trade.receivingTeam.user.username,
            team: trade.receivingTeam.name,
            avatar: trade.receivingTeam.user.avatar
          },
          metadata: {
            players: players as string[],
            status: trade.status
          },
          reactions: await getActivityReactions(`trade-${trade.id}`),
          createdAt: trade.createdAt
        });
      }
    }

    // 2. Waiver Activities
    if (!type || type === 'waiver') {
      const waivers = await prisma.waiverClaim.findMany({
        where: { 
          team: { leagueId },
          status: 'processed'
        },
        include: {
          team: { include: { user: true } },
          player: true
        },
        orderBy: { processedAt: 'desc' },
        take: type === 'waiver' ? limit : 5
      });

      for (const waiver of waivers) {
        if (waiver.processedAt) {
          activities.push({
            id: `waiver-${waiver.id}`,
            type: 'waiver',
            title: waiver.successful ? 'Waiver Claim Successful' : 'Waiver Claim Failed',
            description: `${waiver.successful ? 'Acquired' : 'Missed out on'} ${waiver.player.name}`,
            timestamp: formatTimestamp(waiver.processedAt),
            user: {
              name: waiver.team.user.displayName || waiver.team.user.username,
              team: waiver.team.name,
              avatar: waiver.team.user.avatar
            },
            metadata: {
              players: [waiver.player.name],
              priority: waiver.priority,
              successful: waiver.successful
            },
            reactions: await getActivityReactions(`waiver-${waiver.id}`),
            createdAt: waiver.processedAt
          });
        }
      }
    }

    // 3. Matchup Results
    if (!type || type === 'matchup') {
      const matchups = await prisma.matchup.findMany({
        where: { 
          week: getCurrentWeek() - 1, // Last week's results
          $or: [
            { team1: { leagueId } },
            { team2: { leagueId } }
          ]
        },
        include: {
          team1: { include: { user: true } },
          team2: { include: { user: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: type === 'matchup' ? limit : 5
      });

      for (const matchup of matchups) {
        if (matchup.team1Score !== null && matchup.team2Score !== null) {
          const winner = matchup.team1Score > matchup.team2Score ? matchup.team1 : matchup.team2;
          const loser = matchup.team1Score > matchup.team2Score ? matchup.team2 : matchup.team1;
          const winnerScore = matchup.team1Score > matchup.team2Score ? matchup.team1Score : matchup.team2Score;
          const loserScore = matchup.team1Score > matchup.team2Score ? matchup.team2Score : matchup.team1Score;
          
          activities.push({
            id: `matchup-${matchup.id}`,
            type: 'matchup',
            title: Math.abs(winnerScore - loserScore) > 20 ? 'Blowout Victory' : 'Close Victory',
            description: `Week ${matchup.week} matchup result`,
            timestamp: formatTimestamp(matchup.updatedAt),
            user: {
              name: winner.user.displayName || winner.user.username,
              team: winner.name,
              avatar: winner.user.avatar
            },
            relatedUser: {
              name: loser.user.displayName || loser.user.username,
              team: loser.name,
              avatar: loser.user.avatar
            },
            metadata: {
              score: `${winnerScore} - ${loserScore}`,
              week: matchup.week
            },
            reactions: await getActivityReactions(`matchup-${matchup.id}`),
            createdAt: matchup.updatedAt
          });
        }
      }
    }

    // 4. Milestones and Achievements
    if (!type || type === 'milestone') {
      // Check for weekly high scores
      const currentWeek = getCurrentWeek();
      const highScore = await prisma.weeklyScore.findFirst({
        where: {
          team: { leagueId },
          week: currentWeek - 1
        },
        include: {
          team: { include: { user: true } }
        },
        orderBy: { score: 'desc' },
        take: 1
      });

      if (highScore && highScore.score > 150) {
        activities.push({
          id: `milestone-high-score-${highScore.id}`,
          type: 'milestone',
          title: 'Weekly High Score',
          description: 'New weekly scoring record',
          timestamp: formatTimestamp(highScore.createdAt),
          user: {
            name: highScore.team.user.displayName || highScore.team.user.username,
            team: highScore.team.name,
            avatar: highScore.team.user.avatar
          },
          metadata: {
            achievement: `Highest Week ${highScore.week} score: ${highScore.score.toFixed(1)} points`
          },
          reactions: await getActivityReactions(`milestone-high-score-${highScore.id}`),
          createdAt: highScore.createdAt
        });
      }
    }

    // 5. Injury Updates (from external data)
    if (!type || type === 'injury') {
      // This would typically come from an external NFL API
      // For now, we'll check for recent player status changes
      const recentInjuries = await prisma.playerStats.findMany({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          },
          player: {
            rosterPlayers: {
              some: {
                team: { leagueId }
              }
            }
          }
        },
        include: {
          player: {
            include: {
              rosterPlayers: {
                where: {
                  team: { leagueId }
                },
                include: {
                  team: true
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: type === 'injury' ? limit : 3
      });

      // This would be enhanced with real injury status tracking
    }

    // Sort all activities by timestamp
    const sortedActivities = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      activities: sortedActivities,
      pagination: {
        total: activities.length,
        limit,
        offset,
        hasMore: activities.length > offset + limit
      }
    });

  } catch (error) {
    console.error('League activity feed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch league activity' },
      { status: 500 }
    );
  }
}

function getCurrentWeek(): number {
  const seasonStart = new Date('2025-09-04');
  const now = new Date();
  const diff = now.getTime() - seasonStart.getTime();
  const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, Math.min(weeks + 1, 18));
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

async function getActivityReactions(activityId: string) {
  // This would be implemented with a reactions table
  // For now, return mock data
  return {
    likes: Math.floor(Math.random() * 20),
    comments: Math.floor(Math.random() * 10),
    isLiked: Math.random() > 0.7
  };
}