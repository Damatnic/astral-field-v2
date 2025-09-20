import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/draft - Get drafts for current league
export async function GET(request: NextRequest) {
  try {
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
    
    // Get user's league through team
    const team = await prisma.team.findFirst({
      where: { ownerId: session.userId },
      select: { leagueId: true }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Get drafts for the league
    const drafts = await prisma.draft.findMany({
      where: { leagueId: team.leagueId },
      include: {
        picks: {
          include: {
            team: true,
            player: true
          },
          orderBy: {
            overallPick: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({
      success: true,
      drafts: drafts.map(draft => ({
        id: draft.id,
        type: draft.type,
        status: draft.status,
        rounds: draft.rounds,
        currentRound: draft.currentRound,
        currentPick: draft.currentPick,
        timePerPick: draft.pickTimeLimit,
        scheduledAt: draft.scheduledStart,
        startedAt: draft.startedAt,
        completedAt: draft.completedAt,
        totalPicks: draft.picks.length,
        myPicks: draft.picks.filter(p => p.teamId === team.leagueId).length
      }))
    });
    
  } catch (error) {
    console.error('Draft fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}