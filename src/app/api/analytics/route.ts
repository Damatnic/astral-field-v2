import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    
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
    
    // Get league data
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      include: {
        teams: {
          include: {
            owner: true,
            homeMatchups: true,
            awayMatchups: true
          }
        },
        matchups: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }
    
    // Calculate team statistics
    const teamStats = await calculateTeamStats(league.teams);
    
    // Calculate league statistics
    const leagueStats = await calculateLeagueStats(league);
    
    // Get recent activity
    const recentActivity = await getRecentActivity(targetLeagueId);
    
    // Get player performance stats
    const topPlayers = await getTopPlayers(targetLeagueId);
    
    return NextResponse.json({
      success: true,
      data: {
        league: {
          id: league.id,
          name: league.name,
          season: league.season,
          currentWeek: league.currentWeek
        },
        teamStats,
        leagueStats,
        recentActivity,
        topPlayers
      }
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
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

async function calculateTeamStats(teams: any[]) {
  return teams.map((team, index) => {
    const allMatchups = [...team.homeMatchups, ...team.awayMatchups];
    const completedMatchups = allMatchups.filter(m => m.isComplete);
    
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    
    completedMatchups.forEach(matchup => {
      const isHome = matchup.homeTeamId === team.id;
      const teamScore = isHome ? Number(matchup.homeScore) : Number(matchup.awayScore);
      const oppScore = isHome ? Number(matchup.awayScore) : Number(matchup.homeScore);
      
      pointsFor += teamScore;
      pointsAgainst += oppScore;
      
      if (teamScore > oppScore) wins++;
      else if (teamScore < oppScore) losses++;
      else ties++;
    });
    
    const gamesPlayed = wins + losses + ties;
    const avgScore = gamesPlayed > 0 ? pointsFor / gamesPlayed : 0;
    
    // Calculate power ranking (simplified)
    const winPct = gamesPlayed > 0 ? wins / gamesPlayed : 0;
    const pointsDiff = pointsFor - pointsAgainst;
    const powerScore = (winPct * 100) + (pointsDiff / 10);
    
    // Calculate playoff chance (simplified)
    const remainingGames = 14 - gamesPlayed;
    const projectedWins = wins + (remainingGames * winPct);
    const playoffChance = projectedWins >= 8 ? Math.min(99, 50 + (projectedWins - 8) * 25) : projectedWins * 6;
    
    // Determine trend based on last 3 games
    const recentGames = allMatchups
      .filter(m => m.isComplete)
      .slice(-3);
    
    let recentWins = 0;
    recentGames.forEach(matchup => {
      const isHome = matchup.homeTeamId === team.id;
      const teamScore = isHome ? Number(matchup.homeScore) : Number(matchup.awayScore);
      const oppScore = isHome ? Number(matchup.awayScore) : Number(matchup.homeScore);
      if (teamScore > oppScore) recentWins++;
    });
    
    const trend = recentWins >= 2 ? 'up' : recentWins === 0 ? 'down' : 'stable';
    
    return {
      id: team.id,
      name: team.name,
      owner: team.owner.name,
      wins,
      losses,
      ties,
      pointsFor: Math.round(pointsFor * 10) / 10,
      pointsAgainst: Math.round(pointsAgainst * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
      powerRanking: index + 1, // Will be sorted later
      playoffChance: Math.round(playoffChance),
      championshipOdds: Math.round(playoffChance * 0.15), // Simplified
      trend,
      color: getTeamColor(index)
    };
  }).sort((a, b) => {
    // Sort by wins, then by points for
    if (a.wins !== b.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  }).map((team, index) => ({
    ...team,
    powerRanking: index + 1
  }));
}

async function calculateLeagueStats(league: any) {
  const allMatchups = league.matchups.filter((m: any) => m.isComplete);
  
  if (allMatchups.length === 0) {
    return {
      totalPoints: 0,
      avgWeeklyScore: 0,
      highestWeeklyScore: { score: 0, team: 'TBD', week: 0 },
      lowestWeeklyScore: { score: 0, team: 'TBD', week: 0 },
      mostConsistent: 'TBD',
      mostVolatile: 'TBD',
      tradeCount: 0,
      waiversClaimed: 0
    };
  }
  
  let totalPoints = 0;
  let highestScore = { score: 0, team: '', week: 0 };
  let lowestScore = { score: 999, team: '', week: 0 };
  
  allMatchups.forEach((matchup: any) => {
    const homeScore = Number(matchup.homeScore);
    const awayScore = Number(matchup.awayScore);
    
    totalPoints += homeScore + awayScore;
    
    if (homeScore > highestScore.score) {
      highestScore = { score: homeScore, team: matchup.homeTeam.name, week: matchup.week };
    }
    if (awayScore > highestScore.score) {
      highestScore = { score: awayScore, team: matchup.awayTeam.name, week: matchup.week };
    }
    
    if (homeScore < lowestScore.score && homeScore > 0) {
      lowestScore = { score: homeScore, team: matchup.homeTeam.name, week: matchup.week };
    }
    if (awayScore < lowestScore.score && awayScore > 0) {
      lowestScore = { score: awayScore, team: matchup.awayTeam.name, week: matchup.week };
    }
  });
  
  const avgWeeklyScore = totalPoints / (allMatchups.length * 2); // 2 teams per matchup
  
  // Get trade and waiver counts
  const trades = await prisma.trade.count({
    where: { 
      leagueId: league.id,
      status: 'ACCEPTED'
    }
  });
  
  const waivers = await prisma.waiverClaim.count({
    where: { 
      team: {
        leagueId: league.id
      },
      status: 'SUCCESSFUL'
    }
  });
  
  return {
    totalPoints: Math.round(totalPoints * 10) / 10,
    avgWeeklyScore: Math.round(avgWeeklyScore * 10) / 10,
    highestWeeklyScore: highestScore,
    lowestWeeklyScore: lowestScore,
    mostConsistent: league.teams[0]?.name || 'TBD', // Would need variance calculation
    mostVolatile: league.teams[league.teams.length - 1]?.name || 'TBD',
    tradeCount: trades,
    waiversClaimed: waivers
  };
}

async function getRecentActivity(leagueId: string) {
  // Get recent trades
  const trades = await prisma.trade.findMany({
    where: { 
      leagueId,
      status: 'ACCEPTED'
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      proposer: true,
      team: true
    }
  });
  
  // Get recent waiver claims
  const waivers = await prisma.waiverClaim.findMany({
    where: {
      team: {
        leagueId
      },
      status: 'SUCCESSFUL'
    },
    orderBy: { processedAt: 'desc' },
    take: 5,
    include: {
      team: true,
      player: true
    }
  });
  
  return {
    trades: trades.map(t => ({
      id: t.id,
      teams: [t.proposer.name, t.team?.name || 'Unknown'].filter(Boolean),
      date: t.createdAt
    })),
    waivers: waivers.map(w => ({
      id: w.id,
      team: w.team.name,
      player: w.player.name,
      date: w.processedAt
    }))
  };
}

async function getTopPlayers(leagueId: string) {
  // Get top players from rosters in this league
  // Since we don't have playerStats, we'll get the top rostered players
  const topPlayers = await prisma.player.findMany({
    where: {
      rosterPlayers: {
        some: {
          team: {
            leagueId
          }
        }
      },
      status: 'ACTIVE'
    },
    orderBy: {
      searchRank: 'asc' // Use searchRank as proxy for performance
    },
    take: 10,
    select: {
      id: true,
      name: true,
      position: true,
      nflTeam: true,
      searchRank: true
    }
  });
  
  // Mock points for now - in production this would come from external stats API
  return topPlayers.map((player, index) => ({
    id: player.id,
    name: player.name,
    position: player.position,
    team: player.nflTeam,
    points: Math.round((200 - index * 15) + Math.random() * 20), // Mock points based on rank
    week: 15 // Current week
  }));
}

function getTeamColor(index: number): string {
  const colors = [
    'bg-purple-600',
    'bg-green-500', 
    'bg-blue-600',
    'bg-red-500',
    'bg-yellow-500',
    'bg-indigo-600',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500'
  ];
  return colors[index % colors.length];
}