import { Metadata } from 'next'
import { prisma } from '@/lib/database/prisma'
import { TradesView } from '@/components/trades/TradesView'

export const metadata: Metadata = {
  title: 'Trading Center | AstralField',
  description: 'Propose trades, manage offers, and view trade history',
}

async function getTradesData() {
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
        userTeam: null,
        pendingTrades: [],
        tradeHistory: [],
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

    // For demo, use first team as user's team
    const userTeam = teams[0] || null

    // Get pending trades
    const pendingTrades = await prisma.tradeProposal.findMany({
      where: {
        leagueId: league.id,
        status: 'PENDING',
      },
      include: {
        proposingTeam: {
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
        receivingTeam: {
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
        offeredPlayers: {
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
        requestedPlayers: {
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get trade history
    const tradeHistory = await prisma.tradeProposal.findMany({
      where: {
        leagueId: league.id,
        status: {
          in: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
        },
      },
      include: {
        proposingTeam: {
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
        receivingTeam: {
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
        offeredPlayers: {
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
        requestedPlayers: {
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
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
    })

    return {
      league,
      teams,
      userTeam,
      pendingTrades,
      tradeHistory,
    }
  } catch (error) {
    console.error('Error fetching trades data:', error)
    return {
      league: null,
      teams: [],
      userTeam: null,
      pendingTrades: [],
      tradeHistory: [],
    }
  }
}

export default async function TradesRedesignPage() {
  const data = await getTradesData()

  return <TradesView {...data} />
}

