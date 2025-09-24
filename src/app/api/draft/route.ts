import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withErrorHandling, validateSession, createApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

async function getDraftHandler(request: NextRequest) {
  const session = await getServerSession();
  const user = validateSession(session);

  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const draftId = searchParams.get('draftId');

  if (draftId) {
    // Get specific draft
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        league: {
          include: {
            teams: {
              include: {
                owner: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        },
        picks: {
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
        },
        draftOrder: {
          include: {
            team: {
              include: {
                owner: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { pickOrder: 'asc' }
        }
      }
    });

    if (!draft) {
      throw createApiError.notFound('Draft');
    }

    // Check if user has access to this draft
    const userTeam = draft.league.teams.find(team => team.ownerId === user.id);
    if (!userTeam && draft.league.commissionerId !== user.id) {
      throw createApiError.forbidden('You do not have access to this draft');
    }

    return NextResponse.json({
      success: true,
      data: {
        draft: {
          id: draft.id,
          leagueId: draft.leagueId,
          leagueName: draft.league.name,
          status: draft.status,
          type: draft.type,
          currentRound: draft.currentRound,
          currentPick: draft.currentPick,
          currentTeamId: draft.currentTeamId,
          timePerPick: draft.timePerPick,
          timeRemaining: draft.timeRemaining,
          startedAt: draft.startedAt,
          completedAt: draft.completedAt,
          picks: draft.picks,
          draftOrder: draft.draftOrder,
          participants: draft.league.teams.map(team => ({
            teamId: team.id,
            teamName: team.name,
            ownerName: team.owner.name,
            ownerId: team.ownerId
          }))
        }
      }
    });
  }

  // Get drafts for user's leagues
  const whereClause = leagueId 
    ? { leagueId }
    : { 
        league: {
          OR: [
            { commissionerId: user.id },
            { teams: { some: { ownerId: user.id } } }
          ]
        }
      };

  const drafts = await prisma.draft.findMany({
    where: whereClause,
    include: {
      league: {
        include: {
          teams: {
            include: {
              owner: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      },
      picks: {
        select: { id: true, pickNumber: true }
      },
      draftOrder: {
        include: {
          team: {
            include: {
              owner: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { pickOrder: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    success: true,
    data: {
      drafts: drafts.map(draft => ({
        id: draft.id,
        leagueId: draft.leagueId,
        leagueName: draft.league.name,
        season: draft.league.season,
        status: draft.status,
        type: draft.type,
        currentRound: draft.currentRound,
        currentPick: draft.currentPick,
        timePerPick: draft.timePerPick,
        startedAt: draft.startedAt,
        completedAt: draft.completedAt,
        totalPicks: draft.picks.length,
        totalRounds: draft.totalRounds,
        participants: draft.draftOrder.map(order => ({
          position: order.pickOrder,
          teamId: order.teamId,
          teamName: order.team.name,
          ownerName: order.team.owner.name
        }))
      })),
      count: drafts.length
    }
  });
}

export const GET = withErrorHandling(getDraftHandler);

const createDraftSchema = z.object({
  leagueId: z.string().min(1, 'League ID is required'),
  type: z.enum(['SNAKE', 'LINEAR']).default('SNAKE'),
  timePerPick: z.number().min(30).max(300).default(90),
  totalRounds: z.number().min(1).max(25).default(16),
  autostart: z.boolean().default(false)
});

async function createDraftHandler(request: NextRequest) {
  const session = await getServerSession();
  const user = validateSession(session);

  const body = await request.json();
  const validatedData = createDraftSchema.parse(body);

  // Verify user is commissioner of the league
  const league = await prisma.league.findUnique({
    where: { id: validatedData.leagueId },
    include: { 
      teams: {
        include: {
          owner: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!league) {
    throw createApiError.notFound('League');
  }

  if (league.commissionerId !== user.id) {
    throw createApiError.forbidden('Only commissioners can create drafts');
  }

  if (league.teams.length < 2) {
    throw createApiError.badRequest('League must have at least 2 teams');
  }

  // Check if draft already exists for this league
  const existingDraft = await prisma.draft.findFirst({
    where: { 
      leagueId: validatedData.leagueId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS', 'PAUSED'] }
    }
  });

  if (existingDraft) {
    throw createApiError.conflict('League already has an active draft');
  }

  // Create draft with transaction to ensure data integrity
  const draft = await prisma.$transaction(async (tx) => {
    // Create the draft
    const newDraft = await tx.draft.create({
      data: {
        league: { connect: { id: validatedData.leagueId } },
        type: validatedData.type,
        status: validatedData.autostart ? 'IN_PROGRESS' : 'SCHEDULED',
        settings: {
          rounds: validatedData.totalRounds,
          timePerPick: validatedData.timePerPick,
          startTime: validatedData.autostart ? new Date() : null,
          autopickSettings: {}
        },
        timePerPick: validatedData.timePerPick,
        totalRounds: validatedData.totalRounds,
        startedAt: validatedData.autostart ? new Date() : null,
        currentRound: validatedData.autostart ? 1 : 0,
        currentPick: validatedData.autostart ? 1 : 0,
        ...(validatedData.autostart && league.teams[0] ? {
          currentTeam: { connect: { id: league.teams[0].id } }
        } : {})
      }
    });

    // Create draft order - randomize team order
    const shuffledTeams = [...league.teams].sort(() => Math.random() - 0.5);
    
    const draftOrderPromises = shuffledTeams.map((team, index) => 
      tx.draftOrder.create({
        data: {
          draftId: newDraft.id,
          teamId: team.id,
          pickOrder: index + 1
        }
      })
    );

    await Promise.all(draftOrderPromises);

    return newDraft;
  });

  // Fetch the complete draft data to return
  const completeDraft = await prisma.draft.findUnique({
    where: { id: draft.id },
    include: {
      league: {
        select: { id: true, name: true, season: true }
      },
      draftOrder: {
        include: {
          team: {
            include: {
              owner: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { pickOrder: 'asc' }
      }
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      draft: {
        id: completeDraft!.id,
        leagueId: completeDraft!.leagueId,
        leagueName: completeDraft!.league.name,
        season: completeDraft!.league.season,
        status: completeDraft!.status,
        type: completeDraft!.type,
        timePerPick: completeDraft!.timePerPick,
        totalRounds: completeDraft!.totalRounds,
        currentRound: completeDraft!.currentRound,
        currentPick: completeDraft!.currentPick,
        draftOrder: completeDraft!.draftOrder.map(order => ({
          position: order.pickOrder,
          teamId: order.teamId,
          teamName: order.team.name,
          ownerName: order.team.owner.name
        }))
      },
      message: 'Draft created successfully'
    }
  }, { status: 201 });
}

export const POST = withErrorHandling(createDraftHandler);