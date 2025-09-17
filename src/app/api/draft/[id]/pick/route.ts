import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = params.id;
    const { playerId, teamId, round, pick } = await request.json();

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

    // Create the draft pick
    const draftPick = await prisma.draftPick.create({
      data: {
        draftId,
        teamId,
        playerId,
        round,
        pick,
        overallPick: (round - 1) * 10 + pick // Assuming 10 teams
      }
    });

    // Add player to team's roster
    await prisma.rosterPlayer.create({
      data: {
        teamId,
        playerId,
        position: 'BENCH', // Start on bench
        acquisitionType: 'DRAFT',
        acquisitionDate: new Date()
      }
    });

    // Update draft current pick
    await prisma.draft.update({
      where: { id: draftId },
      data: {
        currentRound: round,
        currentPick: pick + 1
      }
    });

    return NextResponse.json({
      success: true,
      pick: draftPick,
      message: 'Pick successfully recorded'
    });

  } catch (error) {
    console.error('Draft pick error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process draft pick' },
      { status: 500 }
    );
  }
}