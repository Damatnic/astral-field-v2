import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    // Get user's leagues or specific league
    const whereClause = leagueId 
      ? { id: leagueId }
      : { teams: { some: { ownerId: session.user.id } } };

    const leagues = await prisma.league.findMany({
      where: whereClause,
      include: {
        teams: {
          include: {
            owner: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { waiverPriority: 'asc' }
        }
      }
    });

    // Create draft information from league data
    const drafts = leagues.map(league => {
      const draftDate = league.draftDate;
      const isCompleted = league.teams.every(team => {
        // Check if team has a full roster (basic heuristic)
        return true; // For now, assume drafts are completed if league exists
      });

      return {
        id: `draft-${league.id}`,
        leagueId: league.id,
        leagueName: league.name,
        season: league.season,
        status: isCompleted ? 'completed' : 'scheduled',
        draftDate: draftDate,
        draftType: 'snake', // Default to snake draft
        teams: league.teams.length,
        rounds: 16, // Standard fantasy football draft
        currentPick: isCompleted ? null : 1,
        currentRound: isCompleted ? null : 1,
        participants: league.teams.map((team, index) => ({
          id: team.id,
          teamName: team.name,
          ownerName: team.owner.name,
          draftOrder: index + 1,
          pickCount: 0 // Would need to calculate from roster
        })),
        settings: {
          timePerPick: 90, // 90 seconds
          allowTrades: false,
          autopickEnabled: true
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        drafts,
        count: drafts.length
      }
    });

  } catch (error) {
    console.error('Draft fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leagueId, draftDate, draftType = 'snake', settings = {} } = await request.json();

    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    // Verify user is commissioner of the league
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { teams: true }
    });

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    if (league.commissionerId !== session.user.id) {
      return NextResponse.json({ error: 'Only commissioners can schedule drafts' }, { status: 403 });
    }

    // Update league with draft information
    const updatedLeague = await prisma.league.update({
      where: { id: leagueId },
      data: {
        draftDate: draftDate ? new Date(draftDate) : null,
        settings: {
          ...league.settings as any,
          draftType,
          draftSettings: settings
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: `draft-${leagueId}`,
        leagueId,
        draftDate: updatedLeague.draftDate,
        draftType,
        settings,
        message: 'Draft scheduled successfully'
      }
    });

  } catch (error) {
    console.error('Draft creation error:', error);
    return NextResponse.json({ error: 'Failed to schedule draft' }, { status: 500 });
  }
}