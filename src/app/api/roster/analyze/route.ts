import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { 
  analyzeRoster, 
  generateStartSitRecommendations, 
  analyzeTradeImpact,
  getFlexOptions 
} from '@/lib/rosterUtils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/roster/analyze - Get comprehensive roster analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const week = parseInt(searchParams.get('week') || '15');
    const includeStartSit = searchParams.get('includeStartSit') === 'true';
    const includeFlexOptions = searchParams.get('includeFlexOptions') === 'true';
    
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
    
    // Get user's team
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    const team = await prisma.team.findFirst({
      where: {
        ownerId: session.userId,
        leagueId: targetLeagueId
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Get roster analysis
    const rosterAnalysis = await analyzeRoster(team.id, week);
    
    let startSitRecommendations = null;
    if (includeStartSit) {
      startSitRecommendations = await generateStartSitRecommendations(team.id, week);
    }
    
    let flexOptions = null;
    if (includeFlexOptions) {
      // Get current starters to exclude from FLEX options
      // Note: rosterPlayer model not yet implemented
      const currentStarters: any[] = [];
      /*
      const currentStarters = await prisma.rosterPlayer.findMany({
        where: {
          teamId: team.id,
          position: { notIn: ['BENCH', 'IR', 'TAXI'] }
        },
        select: { playerId: true }
      });
      */
      
      const starterIds = currentStarters.map(rp => rp.playerId);
      flexOptions = await getFlexOptions(team.id, week, starterIds);
    }
    
    // Get league context for comparison
    const leagueTeams = await prisma.team.findMany({
      where: { leagueId: targetLeagueId },
      include: {
        roster: {
          include: {
            player: {
              include: {
                projections: {
                  where: { week, season: "2024" },
                  take: 1,
                  orderBy: { confidence: 'desc' }
                }
              }
            }
          }
        }
      }
    });
    
    // Calculate league averages for comparison
    const leagueProjections = leagueTeams.map(t => {
      const starters = t.roster.filter(rp => 
        rp.position !== 'BENCH' && 
        rp.position !== 'IR'
      );
      return starters.reduce((sum, rp) => 
        sum + Number(rp.player.projections[0]?.projectedPoints || 0), 0
      );
    });
    
    const leagueAverage = leagueProjections.reduce((sum, proj) => sum + proj, 0) / leagueProjections.length;
    const teamRank = leagueProjections
      .sort((a, b) => b - a)
      .findIndex(proj => Math.abs(proj - rosterAnalysis.totalProjected) < 0.1) + 1;
    
    return NextResponse.json({
      success: true,
      data: {
        teamInfo: {
          teamId: team.id,
          teamName: team.name,
          week,
          season: 2024
        },
        rosterAnalysis,
        startSitRecommendations,
        flexOptions,
        leagueComparison: {
          teamProjected: rosterAnalysis.totalProjected,
          leagueAverage: Math.round(leagueAverage * 10) / 10,
          teamRank,
          totalTeams: leagueTeams.length,
          percentile: Math.round(((leagueTeams.length - teamRank + 1) / leagueTeams.length) * 100)
        }
      }
    });
    
  } catch (error) {
    console.error('Roster analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze roster' },
      { status: 500 }
    );
  }
}

// POST /api/roster/analyze - Analyze specific aspects or trade scenarios
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, 
      leagueId, 
      week = 15,
      givingUpPlayerIds,
      receivingPlayerIds,
      specificPlayerIds 
    } = body;
    
    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
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
    
    // Get user's team
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    const team = await prisma.team.findFirst({
      where: {
        ownerId: session.userId,
        leagueId: targetLeagueId
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    let result: any = {};
    
    switch (action) {
      case 'trade-analysis':
        if (!givingUpPlayerIds || !receivingPlayerIds) {
          return NextResponse.json(
            { error: 'givingUpPlayerIds and receivingPlayerIds are required for trade analysis' },
            { status: 400 }
          );
        }
        
        result = await analyzeTradeImpact(
          team.id,
          givingUpPlayerIds,
          receivingPlayerIds,
          week
        );
        break;
        
      case 'start-sit':
        result = await generateStartSitRecommendations(team.id, week);
        break;
        
      case 'flex-options':
        const starterIds = specificPlayerIds || [];
        result = await getFlexOptions(team.id, week, starterIds);
        break;
        
      case 'position-analysis':
        const fullAnalysis = await analyzeRoster(team.id, week);
        result = {
          strengthByPosition: fullAnalysis.strengthByPosition,
          depthChart: fullAnalysis.depthChart,
          weaknesses: fullAnalysis.weaknesses.filter(w => 
            specificPlayerIds ? 
            specificPlayerIds.some(id => w.includes(id)) : 
            true
          )
        };
        break;
        
      case 'bye-week-planning':
        const byeAnalysis = await analyzeRoster(team.id, week);
        result = {
          byeWeekIssues: byeAnalysis.byeWeekIssues,
          recommendations: byeAnalysis.recommendations.filter(r => 
            r.includes('bye') || r.includes('Week')
          )
        };
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        action,
        week,
        teamId: team.id,
        result
      }
    });
    
  } catch (error) {
    console.error('Roster analysis POST error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze roster' },
      { status: 500 }
    );
  }
}

// Helper Functions

async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}