import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { teamId } = req.query;
  if (!teamId || typeof teamId !== 'string') {
    return res.status(400).json({ error: 'Invalid team ID' });
  }

  try {
    // Get team and verify user has access
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        league: {
          include: {
            teams: {
              where: {
                ownerId: session.user.id
              }
            }
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user is in the same league
    if (team.league.teams.length === 0) {
      return res.status(403).json({ error: 'You do not have access to this team' });
    }

    // Get roster with player details
    const roster = await prisma.roster.findMany({
      where: { teamId },
      include: {
        player: {
          include: {
            stats: {
              where: {
                season: new Date().getFullYear(),
                week: 0 // Season total
              },
              take: 1
            }
          }
        }
      },
      orderBy: [
        { position: 'asc' },
        { player: { projectedPoints: 'desc' } }
      ]
    });

    // Format roster for response
    const formattedRoster = roster.map(entry => ({
      id: entry.player.id,
      name: entry.player.name,
      position: entry.player.position,
      team: entry.player.team || 'FA',
      imageUrl: entry.player.imageUrl,
      projectedPoints: entry.player.projectedPoints || 0,
      adp: entry.player.adp || 999,
      positionRank: entry.player.positionRank || 999,
      rosterPosition: entry.position,
      isLocked: entry.isLocked,
      acquisitionType: entry.acquisitionType,
      acquisitionDate: entry.acquisitionDate,
      stats: entry.player.stats[0] || null
    }));

    return res.status(200).json({ 
      roster: formattedRoster,
      team: {
        id: team.id,
        name: team.name,
        leagueId: team.leagueId
      }
    });
  } catch (error) {
    console.error('Error fetching team roster:', error);
    return res.status(500).json({ error: 'Failed to fetch roster' });
  }
}