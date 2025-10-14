import { Metadata } from 'next'
import { prisma } from '@/lib/database/prisma'
import { MatchupsView } from '@/components/matchups/MatchupsView'

export const metadata: Metadata = {
  title: 'Matchups | AstralField',
  description: 'View all fantasy football matchups and live scores',
}

async function getMatchupsData() {
  try {
    // Get current league (first active league for now)
    const league = await prisma.league.findFirst({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        season: true,
        currentWeek: true,
        settings: true,
      },
    })

    if (!league) {
      return {
        league: null,
        matchups: [],
        teams: [],
      }
    }

    // Get all teams in the league
    const teams = await prisma.team.findMany({
      where: {
        leagueId: league.id,
      },
      select: {
        id: true,
        name: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        pointsAgainst: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Get current week matchups
    const matchups = await prisma.matchup.findMany({
      where: {
        leagueId: league.id,
        week: league.currentWeek,
      },
      include: {
        team1: {
          select: {
            id: true,
            name: true,
            User: {
              select: {
                name: true,
              },
            },
          },
        },
        team2: {
          select: {
            id: true,
            name: true,
            User: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return {
      league,
      matchups,
      teams,
    }
  } catch (error) {
    console.error('Error fetching matchups data:', error)
    return {
      league: null,
      matchups: [],
      teams: [],
    }
  }
}

export default async function MatchupsPage() {
  const data = await getMatchupsData()

  return <MatchupsView {...data} />
}

