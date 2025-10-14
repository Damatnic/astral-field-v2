import { Metadata } from 'next'
import { prisma } from '@/lib/database/prisma'
import { LeagueStatsView } from '@/components/league-stats/LeagueStatsView'

export const metadata: Metadata = {
  title: 'League Statistics | AstralField',
  description: 'View league-wide statistics and records',
}

async function getLeagueStatsData() {
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
        weeklyHighScores: [],
      }
    }

    // Get all teams with their stats
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
      orderBy: {
        pointsFor: 'desc',
      },
    })

    // Get weekly high scores (mock for now - would query matchup results)
    const weeklyHighScores = Array.from({ length: league.currentWeek }, (_, i) => {
      const randomTeam = teams[Math.floor(Math.random() * teams.length)]
      return {
        week: i + 1,
        team: randomTeam,
        score: 150 + Math.random() * 50,
      }
    })

    return {
      league,
      teams,
      weeklyHighScores,
    }
  } catch (error) {
    console.error('Error fetching league stats data:', error)
    return {
      league: null,
      teams: [],
      weeklyHighScores: [],
    }
  }
}

export default async function LeagueStatsPage() {
  const data = await getLeagueStatsData()

  return <LeagueStatsView {...data} />
}

