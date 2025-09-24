import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const controlActionSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'cancel']),
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
    const { action } = controlActionSchema.parse(body);

    // Get draft and verify permissions
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        league: {
          select: { id: true, commissionerId: true }
        },
        draftOrder: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Only commissioner can control draft
    if (draft.league.commissionerId !== session.user.id) {
      return NextResponse.json({ error: 'Only commissioners can control drafts' }, { status: 403 });
    }

    let updatedDraft;

    switch (action) {
      case 'start':
        if (draft.status !== 'SCHEDULED') {
          return NextResponse.json({ error: 'Draft cannot be started' }, { status: 400 });
        }

        const firstTeam = draft.draftOrder[0];
        if (!firstTeam) {
          return NextResponse.json({ error: 'No draft order found' }, { status: 400 });
        }

        updatedDraft = await prisma.draft.update({
          where: { id: draftId },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            currentRound: 1,
            currentPick: 1,
            currentTeamId: firstTeam.teamId,
            timeRemaining: draft.timePerPick
          }
        });
        break;

      case 'pause':
        if (draft.status !== 'IN_PROGRESS') {
          return NextResponse.json({ error: 'Draft is not in progress' }, { status: 400 });
        }

        updatedDraft = await prisma.draft.update({
          where: { id: draftId },
          data: {
            status: 'PAUSED'
          }
        });
        break;

      case 'resume':
        if (draft.status !== 'PAUSED') {
          return NextResponse.json({ error: 'Draft is not paused' }, { status: 400 });
        }

        updatedDraft = await prisma.draft.update({
          where: { id: draftId },
          data: {
            status: 'IN_PROGRESS',
            timeRemaining: draft.timePerPick // Reset timer
          }
        });
        break;

      case 'cancel':
        if (!['SCHEDULED', 'IN_PROGRESS', 'PAUSED'].includes(draft.status)) {
          return NextResponse.json({ error: 'Draft cannot be cancelled' }, { status: 400 });
        }

        updatedDraft = await prisma.draft.update({
          where: { id: draftId },
          data: {
            status: 'CANCELLED',
            completedAt: new Date()
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        draft: {
          id: updatedDraft.id,
          status: updatedDraft.status,
          currentRound: updatedDraft.currentRound,
          currentPick: updatedDraft.currentPick,
          currentTeamId: updatedDraft.currentTeamId,
          timeRemaining: updatedDraft.timeRemaining,
          startedAt: updatedDraft.startedAt,
          completedAt: updatedDraft.completedAt
        },
        message: `Draft ${action}${action.endsWith('e') ? 'd' : 'ed'} successfully`
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 });
    }
    
    console.error('Draft control error:', error);
    return NextResponse.json({ error: 'Failed to control draft' }, { status: 500 });
  }
}