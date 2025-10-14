import { Metadata } from 'next'
import { prisma } from '@/lib/database/prisma'
import { WaiversView } from '@/components/waivers/WaiversView'

export const metadata: Metadata = {
  title: 'Waiver Wire | AstralField',
  description: 'Manage waiver wire claims and available players',
}

async function getWaiversData() {
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
        availablePlayers: [],
        userTeam: null,
        waiverClaims: [],
      }
    }

    // Get user team (first team for demo)
    const userTeam = await prisma.team.findFirst({
      where: {
        leagueId: league.id,
      },
      select: {
        id: true,
        name: true,
        waiverPosition: true,
        faabBudget: true,
      },
    })

    // Get available players (not on any roster)
    const allPlayers = await prisma.player.findMany({
      take: 50,
      orderBy: {
        adp: 'asc',
      },
      select: {
        id: true,
        name: true,
        position: true,
        nflTeam: true,
        adp: true,
        rank: true,
      },
    })

    // Get pending waiver claims for user
    const waiverClaims = userTeam
      ? await prisma.waiverClaim.findMany({
          where: {
            teamId: userTeam.id,
            status: 'pending',
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true,
              },
            },
            dropPlayer: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true,
              },
            },
          },
          orderBy: {
            priority: 'asc',
          },
        })
      : []

    return {
      league,
      availablePlayers: allPlayers,
      userTeam,
      waiverClaims,
    }
  } catch (error) {
    console.error('Error fetching waivers data:', error)
    return {
      league: null,
      availablePlayers: [],
      userTeam: null,
      waiverClaims: [],
    }
  }
}

export default async function WaiversPage() {
  const data = await getWaiversData()

  return <WaiversView {...data} />
}

