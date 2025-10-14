import { Metadata } from 'next'
import { prisma } from '@/lib/database/prisma'
import { ScheduleView } from '@/components/schedule/ScheduleView'

export const metadata: Metadata = {
  title: 'Schedule | AstralField',
  description: 'View full season schedule and upcoming matchups',
}

async function getScheduleData() {
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
        allMatchups: [],
        userTeam: null,
      }
    }

    // Get all matchups for the season
    const allMatchups = await prisma.matchup.findMany({
      where: {
        leagueId: league.id,
      },
      include: {
        team1: {
          select: {
            id: true,
            name: true,
            wins: true,
            losses: true,
            ties: true,
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
            ties: true,
            User: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { week: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    // For demo, use first team as user's team
    const userTeam = await prisma.team.findFirst({
      where: {
        leagueId: league.id,
      },
      select: {
        id: true,
        name: true,
        wins: true,
        losses: true,
        ties: true,
      },
    })

    return {
      league,
      allMatchups,
      userTeam,
    }
  } catch (error) {
    console.error('Error fetching schedule data:', error)
    return {
      league: null,
      allMatchups: [],
      userTeam: null,
    }
  }
}

export default async function SchedulePage() {
  const data = await getScheduleData()

  return <ScheduleView {...data} />
}

