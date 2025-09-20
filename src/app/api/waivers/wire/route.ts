import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/waivers/wire - Get available players on waiver wire
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');
    const search = searchParams.get('search');
    const team = searchParams.get('team');
    const leagueId = searchParams.get('leagueId');
    const sortBy = searchParams.get('sortBy') || 'projectedPoints';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '100');
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
    
    // Get user's team to find league
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    const userTeam = await prisma.team.findFirst({
      where: { 
        ownerId: session.userId,
        leagueId: targetLeagueId
      }
    });
    
    if (!userTeam) {
      return NextResponse.json(
        { error: 'Team not found in this league' },
        { status: 404 }
      );
    }
    
    // Get all rostered players in the league
    const rosteredPlayers = await prisma.rosterPlayer.findMany({
      where: {
        team: {
          leagueId: targetLeagueId
        }
      },
      select: {
        playerId: true
      }
    });
    
    const rosteredPlayerIds = rosteredPlayers.map(rp => rp.playerId);
    
    // Build query for available players
    const where: any = {
      id: {
        notIn: rosteredPlayerIds
      },
      status: {
        in: ['ACTIVE', 'OUT', 'QUESTIONABLE', 'DOUBTFUL']
      },
      isFantasyRelevant: true
    };
    
    if (position && position !== 'ALL') {
      where.position = position;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (team && team !== 'ALL') {
      where.nflTeam = team;
    }
    
    // Get current week for stats
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      select: { currentWeek: true, season: true }
    });
    
    const currentWeek = league?.currentWeek || 15;
    const season = league?.season || 2024;
    
    // Get available players with stats and projections
    const availablePlayers = await prisma.player.findMany({
      where,
      include: {
        playerStats: {
          where: {
            season,
            week: {
              lte: currentWeek
            }
          },
          orderBy: {
            week: 'desc'
          },
          take: 5 // Last 5 games
        },
        projections: {
          where: {
            season,
            week: currentWeek + 1 // Next week projection
          },
          orderBy: {
            confidence: 'desc'
          },
          take: 1
        },
        waiverClaims: {
          where: {
            leagueId: targetLeagueId,
            status: 'PENDING'
          },
          select: {
            team: {
              select: {
                name: true
              }
            },
            faabBid: true,
            priority: true
          }
        }
      },
      skip: offset,
      take: limit
    });
    
    // Calculate stats and format players for response
    const playersWithStats = availablePlayers.map(player => {
      // Calculate season stats
      const seasonStats = player.playerStats || [];
      const totalPoints = seasonStats.reduce((sum, stat) => sum + (Number(stat.fantasyPoints) || 0), 0);
      const avgPoints = seasonStats.length > 0 ? totalPoints / seasonStats.length : 0;
      
      // Get recent games (last 3 weeks)
      const recentGames = seasonStats.slice(0, 3).map(stat => ({
        week: stat.week,
        points: Number(stat.fantasyPoints) || 0,
        opponent: stat.opponent || 'Unknown'
      }));
      
      // Get projection for next week
      const nextWeekProjection = player.projections?.[0];
      const projectedPoints = nextWeekProjection ? Number(nextWeekProjection.projectedPoints) : 0;
      
      // Get pending claims info
      const pendingClaims = player.waiverClaims || [];
      const highestBid = pendingClaims.reduce((max, claim) => 
        Math.max(max, claim.faabBid || 0), 0
      );
      
      return {
        id: player.id,
        name: player.name,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        nflTeam: player.nflTeam,
        status: player.status,
        injuryStatus: player.injuryStatus,
        byeWeek: player.byeWeek,
        age: player.age,
        yearsExperience: player.yearsExperience,
        height: player.height,
        weight: player.weight,
        college: player.college,
        totalPoints: Number(totalPoints.toFixed(1)),
        avgPoints: Number(avgPoints.toFixed(1)),
        projectedPoints: Number(projectedPoints.toFixed(1)),
        recentGames,
        gamesPlayed: seasonStats.length,
        pendingClaims: pendingClaims.length,
        highestBid,
        ownedPercentage: 0, // Could calculate this across multiple leagues
        trendingUp: recentGames.length >= 2 ? 
          recentGames[0].points > recentGames[1].points : false,
        adp: player.adp,
        searchRank: player.searchRank,
        isRookie: player.isRookie,
        isDynastyTarget: player.isDynastyTarget
      };
    });
    
    // Sort players based on sortBy parameter
    playersWithStats.sort((a, b) => {
      let aVal = a[sortBy as keyof typeof a] as number;
      let bVal = b[sortBy as keyof typeof b] as number;
      
      // Handle null/undefined values
      aVal = aVal || 0;
      bVal = bVal || 0;
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // Get total count for pagination
    const totalCount = await prisma.player.count({ where });
    
    return NextResponse.json({
      success: true,
      players: playersWithStats,
      pagination: {
        total: totalCount,
        offset,
        limit,
        hasMore: offset + limit < totalCount
      },
      filters: {
        position,
        search,
        team,
        sortBy,
        sortOrder
      },
      metadata: {
        currentWeek,
        season,
        leagueId: targetLeagueId,
        userTeam: {
          id: userTeam.id,
          name: userTeam.name,
          waiverPriority: userTeam.waiverPriority,
          faabRemaining: userTeam.faabBudget - userTeam.faabSpent
        }
      }
    });
    
  } catch (error) {
    console.error('Waiver wire error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waiver wire' },
      { status: 500 }
    );
  }
}

async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}