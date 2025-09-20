import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/lineup/history - Get lineup history for a team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const teamId = searchParams.get('teamId');
    const week = searchParams.get('week');
    const limit = parseInt(searchParams.get('limit') || '20');
    
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
    
    // Get user's team if not specified
    let targetTeamId = teamId;
    if (!targetTeamId) {
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
      
      targetTeamId = team.id;
    }
    
    // Build where clause
    const whereClause: any = {
      teamId: targetTeamId
    };
    
    if (week) {
      whereClause.week = parseInt(week);
    }
    
    // Get lineup history
    const history = await prisma.lineupHistory.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        team: {
          select: {
            name: true
          }
        }
      }
    });
    
    // Process history for better display
    const processedHistory = history.map(entry => {
      const changes = entry.changes as any;
      return {
        id: entry.id,
        week: entry.week,
        season: entry.season,
        timestamp: entry.createdAt,
        user: {
          name: entry.user.name,
          email: entry.user.email
        },
        team: {
          name: entry.team.name
        },
        changeType: changes.type || 'MANUAL',
        strategy: changes.strategy,
        modificationsCount: changes.modifications?.length || 0,
        modifications: changes.modifications || [],
        summary: generateChangeSummary(changes)
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        history: processedHistory,
        total: history.length
      }
    });
    
  } catch (error) {
    console.error('Get lineup history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lineup history' },
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

function generateChangeSummary(changes: any): string {
  if (!changes.modifications || changes.modifications.length === 0) {
    return 'No changes made';
  }
  
  const modCount = changes.modifications.length;
  
  if (changes.type === 'OPTIMIZATION') {
    return `Auto-optimized lineup using ${changes.strategy} strategy (${modCount} changes)`;
  }
  
  if (modCount === 1) {
    const mod = changes.modifications[0];
    return `Moved ${mod.playerName} from ${mod.oldPosition} to ${mod.newPosition}`;
  }
  
  return `Made ${modCount} lineup changes`;
}