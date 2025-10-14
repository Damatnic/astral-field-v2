import { Metadata } from 'next'
import { prisma } from '@/lib/database/prisma'
import { PlayoffsView } from '@/components/playoffs/PlayoffsView'

export const metadata: Metadata = {
  title: 'Playoff Picture | AstralField',
  description: 'View playoff seeding and bracket',
}

async function getPlayoffsData() {
  try {
    // Get current league
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
        teams: [],
        playoffMatchups: [],
      }
    }

    // Get all teams sorted by wins
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
          },
        },
      },
      orderBy: [
        { wins: 'desc' },
        { pointsFor: 'desc' },
      ],
    })

    // Get playoff matchups
    const regularSeasonWeeks = league.settings?.regularSeasonWeeks || 14
    const playoffMatchups = await prisma.matchup.findMany({
      where: {
        leagueId: league.id,
        week: {
          gt: regularSeasonWeeks,
        },
      },
      include: {
        team1: {
          select: {
            id: true,
            name: true,
            wins: true,
            losses: true,
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
            wins: true,
            losses: true,
            User: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        week: 'asc',
      },
    })

    return {
      league,
      teams,
      playoffMatchups,
    }
  } catch (error) {
    console.error('Error fetching playoffs data:', error)
    return {
      league: null,
      teams: [],
      playoffMatchups: [],
    }
  }
}

export default async function PlayoffsPage() {
  const data = await getPlayoffsData()

  return <PlayoffsView {...data} />
}

