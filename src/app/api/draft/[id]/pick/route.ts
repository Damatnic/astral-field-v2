import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For testing purposes, allow unauthenticated access
    const user = await authenticateFromRequest(request);
    // if (!user) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

    const draftId = params.id;
    const body = await request.json();
    const { playerId, teamId, round, pick } = body;
    
    // Validate required parameters
    if (!playerId || !teamId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: playerId and teamId are required' 
      }, { status: 400 });
    }

    // Validate the draft exists and is active
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: { league: true }
    });

    if (!draft) {
      return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
    }

    if (draft.status !== 'IN_PROGRESS') {
      return NextResponse.json({ success: false, error: 'Draft is not active' }, { status: 400 });
    }

    // Check if player is already drafted
    const existingPick = await prisma.draftPick.findFirst({
      where: {
        draftId,
        playerId
      }
    });

    if (existingPick) {
      return NextResponse.json({ success: false, error: 'Player already drafted' }, { status: 400 });
    }

    // Use draft's current round/pick if not provided
    const actualRound = round || draft.currentRound || 1;
    const actualPick = pick || draft.currentPick || 1;
    
    // Create the draft pick
    const draftPick = await prisma.draftPick.create({
      data: {
        draftId,
        teamId,
        playerId,
        round: actualRound,
        pick: actualPick,
        overallPick: (actualRound - 1) * 10 + actualPick // Assuming 10 teams
      }
    });

    // Add player to team's roster (skip if already exists)
    try {
      await prisma.rosterPlayer.create({
        data: {
          teamId,
          playerId,
          rosterSlot: 'BENCH', // Start on bench
          position: 'BENCH',
          acquisitionType: 'DRAFT',
          acquisitionDate: new Date()
        }
      });
    } catch (rosterError: any) {
      // If player already on roster, that's okay
      if (rosterError.code !== 'P2002') {
        throw rosterError;
      }
    }

    // Update draft current pick
    await prisma.draft.update({
      where: { id: draftId },
      data: {
        currentRound: actualRound,
        currentPick: actualPick + 1
      }
    });

    return NextResponse.json({
      success: true,
      pick: draftPick,
      message: 'Pick successfully recorded'
    });

  } catch (error) {
    console.error('Error processing draft pick:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process draft pick' },
      { status: 500 }
    );
  }
}