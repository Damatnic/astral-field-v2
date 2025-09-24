import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const makePickSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  teamId: z.string().min(1, 'Team ID is required')
});

export async function POST(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { draftId } = params;
    const body = await request.json();
    const { playerId, teamId } = makePickSchema.parse(body);

    // Get draft with current state and validate access
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        league: {
          include: {
            teams: {
              include: {
                owner: { select: { id: true } }
              }
            }
          }
        },
        draftOrder: {
          include: {
            team: true
          },
          orderBy: { pickOrder: 'asc' }
        },
        picks: {
          select: { pickNumber: true, playerId: true }
        }
      }
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (draft.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Draft is not in progress' }, { status: 400 });
    }

    // Verify user owns the team that's currently picking
    const currentTeam = draft.draftOrder.find(order => order.teamId === draft.currentTeamId);
    const userTeam = draft.league.teams.find(team => team.ownerId === session.user.id);
    
    if (!userTeam || userTeam.id !== teamId) {
      return NextResponse.json({ error: 'You can only make picks for your own team' }, { status: 403 });
    }

    if (draft.currentTeamId !== teamId) {
      return NextResponse.json({ error: 'It is not your turn to pick' }, { status: 400 });
    }

    // Check if player is available
    const playerAlreadyDrafted = draft.picks.find(pick => pick.playerId === playerId);
    if (playerAlreadyDrafted) {
      return NextResponse.json({ error: 'Player has already been drafted' }, { status: 400 });
    }

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, position: true, nflTeam: true }
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Calculate overall pick number and next pick
    const totalTeams = draft.draftOrder.length;
    const pickNumber = (draft.currentRound - 1) * totalTeams + draft.currentPick;
    
    // Determine next pick using snake draft logic
    let nextRound = draft.currentRound;
    let nextPickInRound = draft.currentPick;
    let nextTeamId = draft.currentTeamId;

    if (draft.currentPick < totalTeams) {
      // Still in current round
      if (draft.type === 'SNAKE' && draft.currentRound % 2 === 0) {
        // Even round - reverse order
        nextPickInRound = draft.currentPick - 1;
        const nextOrderPosition = totalTeams - nextPickInRound + 1;
        nextTeamId = draft.draftOrder.find(order => order.pickOrder === nextOrderPosition)?.teamId || null;
      } else {
        // Odd round or linear - normal order
        nextPickInRound = draft.currentPick + 1;
        nextTeamId = draft.draftOrder.find(order => order.pickOrder === nextPickInRound)?.teamId || null;
      }
    } else {
      // Move to next round
      nextRound = draft.currentRound + 1;
      if (nextRound <= draft.totalRounds) {
        nextPickInRound = 1;
        if (draft.type === 'SNAKE' && nextRound % 2 === 0) {
          // Even round starts with last position
          nextTeamId = draft.draftOrder.find(order => order.pickOrder === totalTeams)?.teamId || null;
        } else {
          // Odd round starts with first position
          nextTeamId = draft.draftOrder.find(order => order.pickOrder === 1)?.teamId || null;
        }
      } else {
        // Draft is complete
        nextTeamId = null;
      }
    }

    // Create the pick and update draft state in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the draft pick
      const draftPick = await tx.draftPick.create({
        data: {
          draftId,
          teamId,
          playerId,
          round: draft.currentRound,
          pickInRound: draft.currentPick,
          pickNumber,
          pickMadeAt: new Date()
        },
        include: {
          team: {
            include: {
              owner: { select: { id: true, name: true } }
            }
          },
          player: {
            select: { id: true, name: true, position: true, nflTeam: true }
          }
        }
      });

      // Add player to team roster
      await tx.roster.create({
        data: {
          teamId,
          playerId,
          position: 'BENCH', // Default to bench, user can set lineup later
          isStarter: false,
          acquisitionType: 'draft'
        }
      });

      // Update draft state
      const isComplete = nextRound > draft.totalRounds;
      await tx.draft.update({
        where: { id: draftId },
        data: {
          currentRound: isComplete ? draft.totalRounds : nextRound,
          currentPick: isComplete ? totalTeams : nextPickInRound,
          currentTeamId: nextTeamId,
          status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: isComplete ? new Date() : null,
          timeRemaining: isComplete ? 0 : draft.timePerPick // Reset timer
        }
      });

      return { draftPick, isComplete, nextTeamId, nextRound, nextPickInRound };
    });

    return NextResponse.json({
      success: true,
      data: {
        pick: {
          id: result.draftPick.id,
          round: result.draftPick.round,
          pickInRound: result.draftPick.pickInRound,
          pickNumber: result.draftPick.pickNumber,
          teamId: result.draftPick.teamId,
          teamName: result.draftPick.team.name,
          ownerName: result.draftPick.team.owner.name,
          player: result.draftPick.player,
          pickMadeAt: result.draftPick.pickMadeAt
        },
        draftState: {
          isComplete: result.isComplete,
          currentRound: result.nextRound,
          currentPick: result.nextPickInRound,
          currentTeamId: result.nextTeamId,
          nextUp: result.nextTeamId ? {
            teamId: result.nextTeamId,
            teamName: draft.draftOrder.find(order => order.teamId === result.nextTeamId)?.team.name,
            round: result.nextRound,
            pick: result.nextPickInRound
          } : null
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Draft pick error:', error);
    return NextResponse.json({ error: 'Failed to process draft pick' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { draftId } = params;

    const picks = await prisma.draftPick.findMany({
      where: { draftId },
      include: {
        team: {
          include: {
            owner: { select: { id: true, name: true } }
          }
        },
        player: {
          select: { id: true, name: true, position: true, nflTeam: true }
        }
      },
      orderBy: { pickNumber: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        picks: picks.map(pick => ({
          id: pick.id,
          round: pick.round,
          pickInRound: pick.pickInRound,
          pickNumber: pick.pickNumber,
          teamId: pick.teamId,
          teamName: pick.team.name,
          ownerName: pick.team.owner.name,
          player: pick.player,
          pickMadeAt: pick.pickMadeAt
        })),
        count: picks.length
      }
    });

  } catch (error) {
    console.error('Draft picks fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch draft picks' }, { status: 500 });
  }
}