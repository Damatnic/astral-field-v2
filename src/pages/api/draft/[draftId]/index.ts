import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';
import { draftStateManager } from '@/lib/draft/draft-state';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { draftId } = req.query;
  if (!draftId || typeof draftId !== 'string') {
    return res.status(400).json({ error: 'Invalid draft ID' });
  }

  // Verify user has access to this draft
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      league: {
        teams: {
          some: {
            ownerId: session.user.id
          }
        }
      }
    },
    include: {
      league: {
        include: {
          teams: {
            include: {
              owner: true,
              roster: {
                include: {
                  player: true
                }
              }
            }
          },
          settings: true
        }
      },
      picks: {
        include: {
          player: true,
          team: true
        },
        orderBy: {
          pickNumber: 'asc'
        }
      }
    }
  });

  if (!draft) {
    return res.status(404).json({ error: 'Draft not found or access denied' });
  }

  switch (req.method) {
    case 'GET':
      // Get draft details and current state
      const state = draftStateManager.getState(draftId);
      return res.status(200).json({
        draft,
        state: state || null,
        userTeam: draft.league.teams.find(t => t.ownerId === session.user.id)
      });

    case 'PUT':
      // Update draft settings (commissioner only)
      if (draft.league.commissionerId !== session.user.id) {
        return res.status(403).json({ error: 'Only commissioner can update draft settings' });
      }

      const { status, settings } = req.body;

      if (status) {
        await prisma.draft.update({
          where: { id: draftId },
          data: { status }
        });

        // Handle status changes
        if (status === 'IN_PROGRESS') {
          await draftStateManager.initializeDraft(draftId);
        } else if (status === 'PAUSED') {
          await draftStateManager.pauseDraft(draftId);
        }
      }

      if (settings) {
        await prisma.league.update({
          where: { id: draft.leagueId },
          data: {
            settings: {
              update: settings
            }
          }
        });
      }

      return res.status(200).json({ success: true });

    case 'DELETE':
      // Delete draft (commissioner only, and only if not started)
      if (draft.league.commissionerId !== session.user.id) {
        return res.status(403).json({ error: 'Only commissioner can delete draft' });
      }

      if (draft.status !== 'WAITING') {
        return res.status(400).json({ error: 'Cannot delete a draft that has started' });
      }

      await prisma.draft.delete({
        where: { id: draftId }
      });

      return res.status(200).json({ success: true });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}