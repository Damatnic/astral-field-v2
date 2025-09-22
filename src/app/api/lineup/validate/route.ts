import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, lineup } = await request.json();

    if (!teamId || !Array.isArray(lineup)) {
      return NextResponse.json({
        success: false,
        message: 'Team ID and lineup array are required'
      }, { status: 400 });
    }

    // Verify team ownership
    const team = await prisma.team.findFirst({
      where: { 
        id: teamId,
        ownerId: session.user.id 
      },
      include: {
        league: {
          select: {
            rosterSettings: true
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({
        success: false,
        message: 'Team not found or access denied'
      }, { status: 404 });
    }

    // Get roster settings from league
    const rosterSettings = team.league.rosterSettings as any || {
      qb: 1,
      rb: 2,
      wr: 2,
      te: 1,
      flex: 1,
      k: 1,
      def: 1,
      bench: 6
    };

    // Validate lineup
    const validationErrors: string[] = [];
    const positionCounts: { [key: string]: number } = {};
    const starterCounts: { [key: string]: number } = {};

    // Count positions and starters
    for (const player of lineup) {
      const position = player.position?.toUpperCase() || 'UNKNOWN';
      const rosterPosition = player.rosterPosition?.toUpperCase() || 'BENCH';
      
      positionCounts[position] = (positionCounts[position] || 0) + 1;
      
      if (player.isStarter && rosterPosition !== 'BENCH') {
        starterCounts[rosterPosition] = (starterCounts[rosterPosition] || 0) + 1;
      }
    }

    // Validate starting lineup requirements
    const requiredStarters = {
      QB: rosterSettings.qb || 1,
      RB: rosterSettings.rb || 2,
      WR: rosterSettings.wr || 2,
      TE: rosterSettings.te || 1,
      FLEX: rosterSettings.flex || 1,
      K: rosterSettings.k || 1,
      DEF: rosterSettings.def || 1
    };

    Object.entries(requiredStarters).forEach(([position, required]) => {
      const actual = starterCounts[position] || 0;
      if (actual < required) {
        validationErrors.push(`Missing ${required - actual} ${position} starter(s)`);
      } else if (actual > required && position !== 'FLEX') {
        validationErrors.push(`Too many ${position} starters (${actual}/${required})`);
      }
    });

    // Validate FLEX eligibility (RB, WR, TE)
    const flexCount = starterCounts.FLEX || 0;
    if (flexCount > 0) {
      const flexEligible = lineup.filter(p => 
        p.isStarter && 
        p.rosterPosition === 'FLEX' && 
        ['RB', 'WR', 'TE'].includes(p.position?.toUpperCase())
      );
      
      if (flexEligible.length !== flexCount) {
        validationErrors.push('FLEX position must contain RB, WR, or TE');
      }
    }

    // Check for injured/bye week players in starting lineup
    const roster = await prisma.roster.findMany({
      where: { teamId },
      include: { player: true }
    });

    const injuredStarters = lineup.filter(lineupPlayer => {
      const rosterPlayer = roster.find(r => r.playerId === lineupPlayer.playerId);
      return lineupPlayer.isStarter && 
             rosterPlayer?.player?.injuryStatus && 
             rosterPlayer.player.injuryStatus !== 'HEALTHY';
    });

    if (injuredStarters.length > 0) {
      validationErrors.push(`Starting lineup contains ${injuredStarters.length} injured player(s)`);
    }

    const isValid = validationErrors.length === 0;

    return NextResponse.json({
      success: true,
      data: {
        isValid,
        errors: validationErrors,
        warnings: injuredStarters.length > 0 ? ['Injured players in starting lineup'] : [],
        positionCounts,
        starterCounts,
        rosterSettings
      }
    });

  } catch (error) {
    console.error('Lineup validation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to validate lineup'
    }, { status: 500 });
  }
}