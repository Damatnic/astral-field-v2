import { Metadata } from 'next'
import { prisma } from '@/lib/database/prisma'
import { TeamOverviewView } from '@/components/team-overview/TeamOverviewView'

export const metadata: Metadata = {
  title: 'Team Overview | AstralField',
  description: 'View your team performance and analytics',
}

async function getTeamOverviewData() {
  try {
    // Get current league
    const league = await prisma.league.findFirst({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        currentWeek: true,
      },
    })

    if (!league) {
      return {
        league: null,
        userTeam: null,
        weeklyScores: [],
        upcomingMatchups: [],
      }
    }

    // Get user team (first team for demo)
    const userTeam = await prisma.team.findFirst({
      where: {
        leagueId: league.id,
      },
      include: {
        User: {
          select: {
            name: true,
          },
        },
        roster: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true,
              },
            },
          },
        },
      },
    })

    if (!userTeam) {
      return {
        league,
        userTeam: null,
        weeklyScores: [],
        upcomingMatchups: [],
      }
    }

    // Mock weekly scores for chart (in real app would query matchup results)
    const weeklyScores = Array.from({ length: league.currentWeek }, (_, i) => ({
      week: i + 1,
      score: 100 + Math.random() * 60,
      opponentScore: 100 + Math.random() * 60,
    }))

    // Get upcoming matchups
    const upcomingMatchups = await prisma.matchup.findMany({
      where: {
        leagueId: league.id,
        week: {
          gte: league.currentWeek,
          lte: league.currentWeek + 2,
        },
        OR: [
          { team1Id: userTeam.id },
          { team2Id: userTeam.id },
        ],
      },
      include: {
        team1: {
          select: {
            id: true,
            name: true,
            wins: true,
            losses: true,
          },
        },
        team2: {
          select: {
            id: true,
            name: true,
            wins: true,
            losses: true,
          },
        },
      },
      take: 3,
    })

    return {
      league,
      userTeam,
      weeklyScores,
      upcomingMatchups,
    }
  } catch (error) {
    console.error('Error fetching team overview data:', error)
    return {
      league: null,
      userTeam: null,
      weeklyScores: [],
      upcomingMatchups: [],
    }
  }
}

export default async function TeamOverviewPage() {
  const data = await getTeamOverviewData()

  return <TeamOverviewView {...data} />
}

