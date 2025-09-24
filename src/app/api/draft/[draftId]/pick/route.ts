import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = params.id;
    const { playerId, teamId } = await request.json();

    if (!playerId || !teamId) {
      return NextResponse.json({
        error: 'Player ID and Team ID are required'
      }, { status: 400 });
    }

    // Extract league ID from draft ID (format: draft-{leagueId})
    const leagueId = draftId.replace('draft-', '');

    // Verify the team belongs to the user and league
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: session.user.id,
        leagueId: leagueId
      },
      include: {
        league: true
      }
    });

    if (!team) {
      return NextResponse.json({
        error: 'Team not found or access denied'
      }, { status: 404 });
    }

    // Check if player exists and is available
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return NextResponse.json({
        error: 'Player not found'
      }, { status: 404 });
    }

    // Check if player is already on a roster in this league
    const existingRoster = await prisma.roster.findFirst({
      where: {
        playerId: playerId,
        team: {
          leagueId: leagueId
        }
      }
    });

    if (existingRoster) {
      return NextResponse.json({
        error: 'Player is already drafted in this league'
      }, { status: 400 });
    }

    // Add player to roster
    const rosterEntry = await prisma.roster.create({
      data: {
        teamId: teamId,
        playerId: playerId,
        position: 'BENCH', // Default to bench, can be moved later
        acquisitionType: 'draft',
        acquisitionDate: new Date(),
        isStarter: false
      },
      include: {
        player: true,
        team: true
      }
    });

    // Create a transaction record for the draft pick
    await prisma.transaction.create({
      data: {
        type: 'draft',
        leagueId: leagueId,
        teamId: teamId,
        playerIds: [playerId],
        status: 'completed',
        processedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        pick: {
          id: `pick-${Date.now()}`,
          draftId: draftId,
          teamId: teamId,
          teamName: rosterEntry.team.name,
          playerId: playerId,
          playerName: rosterEntry.player.name,
          playerPosition: rosterEntry.player.position,
          playerTeam: rosterEntry.player.nflTeam,
          pickNumber: null, // Would need draft order logic
          round: null, // Would need draft round logic
          timestamp: new Date()
        }
      },
      message: `${rosterEntry.player.name} drafted successfully`
    });

  } catch (error) {
    console.error('Error processing draft pick:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process draft pick'
    }, { status: 500 });
  }
}