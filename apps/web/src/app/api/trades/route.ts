import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'


// Trade API - Complete Trade Management System with Approval Workflow
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const teamId = searchParams.get('teamId')
    const status = searchParams.get('status')
    const action = searchParams.get('action')

    switch (action) {
      case 'proposals':
        return await getTradeProposals(session.user.id, leagueId, teamId, status)
      case 'history':
        return await getTradeHistory(session.user.id, leagueId, teamId)
      case 'analytics':
        return await getTradeAnalytics(leagueId, teamId)
      default:
        return await getTradeProposals(session.user.id, leagueId, teamId, status)
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Trade API error:', error);

    }
    return NextResponse.json(
      { error: 'Failed to fetch trade data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'propose':
        return await proposeTrade(data, session.user.id)
      case 'respond':
        return await respondToTrade(data, session.user.id)
      case 'cancel':
        return await cancelTrade(data.tradeId, session.user.id)
      case 'veto':
        return await vetoTrade(data.tradeId, session.user.id)
      case 'process':
        return await processTrade(data.tradeId, session.user.id)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Trade API error:', error);

    }
    return NextResponse.json(
      { error: 'Failed to process trade action' },
      { status: 500 }
    )
  }
}

async function getTradeProposals(userId: string, leagueId?: string | null, teamId?: string | null, status?: string | null) {
  const where: any = {}

  if (leagueId) {
    where.OR = [
      { proposingTeam: { leagueId } },
      { receivingTeam: { leagueId } }
    ]
  }

  if (teamId) {
    where.OR = [
      { proposingTeamId: teamId },
      { receivingTeamId: teamId }
    ]
  }

  if (status) {
    where.status = status
  }

  // If no specific filters, show trades involving user's teams
  if (!leagueId && !teamId) {
    const userTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      select: { id: true }
    })
    
    const userTeamIds = userTeams.map(t => t.id)
    where.OR = [
      { proposingTeamId: { in: userTeamIds } },
      { receivingTeamId: { in: userTeamIds } }
    ]
  }

  const trades = await prisma.tradeProposal.findMany({
    where,
    include: {
      proposingTeam: {
        include: {
          owner: { select: { name: true, email: true } },
          league: { select: { name: true } }
        }
      },
      receivingTeam: {
        include: {
          owner: { select: { name: true, email: true } },
          league: { select: { name: true } }
        }
      },
      tradeHistory: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Parse player IDs and get player details
  const tradesWithPlayers = await Promise.all(
    trades.map(async (trade) => {
      const givingPlayerIds = JSON.parse(trade.givingPlayerIds)
      const receivingPlayerIds = JSON.parse(trade.receivingPlayerIds)

      const givingPlayers = await prisma.player.findMany({
        where: { id: { in: givingPlayerIds } },
        include: {
          stats: {
            where: { week: 4, season: 2025 },
            take: 1
          },
          projections: {
            where: { week: null }, // Season projections
            take: 1
          }
        }
      })

      const receivingPlayers = await prisma.player.findMany({
        where: { id: { in: receivingPlayerIds } },
        include: {
          stats: {
            where: { week: 4, season: 2025 },
            take: 1
          },
          projections: {
            where: { week: null },
            take: 1
          }
        }
      })

      return {
        ...trade,
        givingPlayers,
        receivingPlayers,
        tradeValue: calculateTradeValue(givingPlayers, receivingPlayers),
        canRespond: trade.receivingTeam.ownerId === userId && trade.status === 'PENDING',
        canCancel: trade.proposingTeam.ownerId === userId && trade.status === 'PENDING'
      }
    })
  )

  return NextResponse.json({
    success: true,
    data: tradesWithPlayers
  })
}

async function getTradeHistory(userId: string, leagueId?: string | null, teamId?: string | null) {
  const where: any = {
    status: { in: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'VETOED'] }
  }

  if (leagueId) {
    where.OR = [
      { proposingTeam: { leagueId } },
      { receivingTeam: { leagueId } }
    ]
  }

  if (teamId) {
    where.OR = [
      { proposingTeamId: teamId },
      { receivingTeamId: teamId }
    ]
  }

  const trades = await prisma.tradeProposal.findMany({
    where,
    include: {
      proposingTeam: {
        include: {
          owner: { select: { name: true } },
          league: { select: { name: true } }
        }
      },
      receivingTeam: {
        include: {
          owner: { select: { name: true } },
          league: { select: { name: true } }
        }
      },
      tradeHistory: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 50
  })

  return NextResponse.json({
    success: true,
    data: trades
  })
}

async function getTradeAnalytics(leagueId?: string | null, teamId?: string | null) {
  // Get trade statistics
  const totalTrades = await prisma.tradeProposal.count({
    where: leagueId ? {
      OR: [
        { proposingTeam: { leagueId } },
        { receivingTeam: { leagueId } }
      ]
    } : undefined
  })

  const acceptedTrades = await prisma.tradeProposal.count({
    where: {
      status: 'ACCEPTED',
      ...(leagueId ? {
        OR: [
          { proposingTeam: { leagueId } },
          { receivingTeam: { leagueId } }
        ]
      } : {})
    }
  })

  const rejectedTrades = await prisma.tradeProposal.count({
    where: {
      status: 'REJECTED',
      ...(leagueId ? {
        OR: [
          { proposingTeam: { leagueId } },
          { receivingTeam: { leagueId } }
        ]
      } : {})
    }
  })

  const pendingTrades = await prisma.tradeProposal.count({
    where: {
      status: 'PENDING',
      ...(leagueId ? {
        OR: [
          { proposingTeam: { leagueId } },
          { receivingTeam: { leagueId } }
        ]
      } : {})
    }
  })

  return NextResponse.json({
    success: true,
    data: {
      totalTrades,
      acceptedTrades,
      rejectedTrades,
      pendingTrades,
      acceptanceRate: totalTrades > 0 ? (acceptedTrades / totalTrades * 100).toFixed(1) : 0
    }
  })
}

async function proposeTrade(data: any, userId: string) {
  const { 
    proposingTeamId, 
    receivingTeamId, 
    givingPlayers, 
    receivingPlayers, 
    message,
    leagueId 
  } = data

  // Verify user owns proposing team
  const proposingTeam = await prisma.team.findUnique({
    where: { id: proposingTeamId },
    include: { league: true }
  })

  if (!proposingTeam || proposingTeam.ownerId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Verify teams are in same league
  const receivingTeam = await prisma.team.findUnique({
    where: { id: receivingTeamId }
  })

  if (!receivingTeam || receivingTeam.leagueId !== proposingTeam.leagueId) {
    return NextResponse.json({ error: 'Teams must be in same league' }, { status: 400 })
  }

  // Verify players belong to respective teams
  const proposingTeamPlayers = await prisma.rosterPlayer.findMany({
    where: {
      teamId: proposingTeamId,
      playerId: { in: givingPlayers }
    }
  })

  const receivingTeamPlayers = await prisma.rosterPlayer.findMany({
    where: {
      teamId: receivingTeamId,
      playerId: { in: receivingPlayers }
    }
  })

  if (proposingTeamPlayers.length !== givingPlayers.length) {
    return NextResponse.json({ error: 'Some players not found on proposing team' }, { status: 400 })
  }

  if (receivingTeamPlayers.length !== receivingPlayers.length) {
    return NextResponse.json({ error: 'Some players not found on receiving team' }, { status: 400 })
  }

  // Create trade proposal
  const trade = await prisma.tradeProposal.create({
    data: {
      proposingTeamId,
      receivingTeamId,
      givingPlayerIds: JSON.stringify(givingPlayers),
      receivingPlayerIds: JSON.stringify(receivingPlayers),
      message,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
    },
    include: {
      proposingTeam: {
        include: {
          owner: { select: { name: true } }
        }
      },
      receivingTeam: {
        include: {
          owner: { select: { name: true } }
        }
      }
    }
  })

  // Create trade history entry
  await prisma.tradeHistory.create({
    data: {
      tradeId: trade.id,
      action: 'PROPOSED',
      userId,
      notes: message
    }
  })

  // Create notification for receiving team owner
  await prisma.notification.create({
    data: {
      userId: receivingTeam.ownerId,
      type: 'TRADE',
      title: 'New Trade Proposal',
      message: `${proposingTeam.owner.name} has proposed a trade`,
      data: JSON.stringify({
        tradeId: trade.id,
        proposingTeam: proposingTeam.name,
        playersCount: givingPlayers.length + receivingPlayers.length
      })
    }
  })

  return NextResponse.json({
    success: true,
    data: trade
  })
}

async function respondToTrade(data: any, userId: string) {
  const { tradeId, response, message } = data // response: 'ACCEPTED' or 'REJECTED'

  const trade = await prisma.tradeProposal.findUnique({
    where: { id: tradeId },
    include: {
      proposingTeam: {
        include: {
          owner: { select: { id: true, name: true } }
        }
      },
      receivingTeam: {
        include: {
          owner: { select: { id: true, name: true } }
        }
      }
    }
  })

  if (!trade) {
    return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
  }

  // Verify user owns receiving team
  if (trade.receivingTeam.ownerId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Verify trade is still pending
  if (trade.status !== 'PENDING') {
    return NextResponse.json({ error: 'Trade is no longer pending' }, { status: 400 })
  }

  // Update trade status
  const updatedTrade = await prisma.tradeProposal.update({
    where: { id: tradeId },
    data: {
      status: response,
      reviewedAt: new Date(),
      reviewedBy: userId
    }
  })

  // Create trade history entry
  await prisma.tradeHistory.create({
    data: {
      tradeId,
      action: response,
      userId,
      notes: message
    }
  })

  // If accepted, process the trade
  if (response === 'ACCEPTED') {
    await processTradeExchange(trade)
  }

  // Create notification for proposing team owner
  await prisma.notification.create({
    data: {
      userId: trade.proposingTeam.ownerId,
      type: 'TRADE',
      title: `Trade ${response}`,
      message: `${trade.receivingTeam.owner.name} has ${response.toLowerCase()} your trade proposal`,
      data: JSON.stringify({
        tradeId,
        response,
        receivingTeam: trade.receivingTeam.name
      })
    }
  })

  return NextResponse.json({
    success: true,
    data: updatedTrade
  })
}

async function cancelTrade(tradeId: string, userId: string) {
  const trade = await prisma.tradeProposal.findUnique({
    where: { id: tradeId },
    include: {
      proposingTeam: {
        include: {
          owner: { select: { id: true } }
        }
      }
    }
  })

  if (!trade) {
    return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
  }

  // Verify user owns proposing team
  if (trade.proposingTeam.ownerId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Verify trade is still pending
  if (trade.status !== 'PENDING') {
    return NextResponse.json({ error: 'Cannot cancel processed trade' }, { status: 400 })
  }

  // Update trade status
  const updatedTrade = await prisma.tradeProposal.update({
    where: { id: tradeId },
    data: {
      status: 'CANCELLED',
      reviewedAt: new Date(),
      reviewedBy: userId
    }
  })

  // Create trade history entry
  await prisma.tradeHistory.create({
    data: {
      tradeId,
      action: 'CANCELLED',
      userId
    }
  })

  return NextResponse.json({
    success: true,
    data: updatedTrade
  })
}

async function vetoTrade(tradeId: string, userId: string) {
  // Verify user is commissioner
  const trade = await prisma.tradeProposal.findUnique({
    where: { id: tradeId },
    include: {
      proposingTeam: {
        include: {
          league: {
            include: {
              settings: true
            }
          }
        }
      }
    }
  })

  if (!trade) {
    return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
  }

  if (!trade.proposingTeam.league.settings || trade.proposingTeam.league.settings.commissionerId !== userId) {
    return NextResponse.json({ error: 'Only commissioner can veto trades' }, { status: 403 })
  }

  // Update trade status
  const updatedTrade = await prisma.tradeProposal.update({
    where: { id: tradeId },
    data: {
      status: 'VETOED',
      reviewedAt: new Date(),
      reviewedBy: userId
    }
  })

  // Create trade history entry
  await prisma.tradeHistory.create({
    data: {
      tradeId,
      action: 'VETOED',
      userId,
      notes: 'Trade vetoed by commissioner'
    }
  })

  return NextResponse.json({
    success: true,
    data: updatedTrade
  })
}

async function processTrade(tradeId: string, userId: string) {
  const trade = await prisma.tradeProposal.findUnique({
    where: { id: tradeId, status: 'ACCEPTED' }
  })

  if (!trade) {
    return NextResponse.json({ error: 'Trade not found or not accepted' }, { status: 404 })
  }

  await processTradeExchange(trade)

  return NextResponse.json({
    success: true,
    message: 'Trade processed successfully'
  })
}

async function processTradeExchange(trade: any) {
  const givingPlayerIds = JSON.parse(trade.givingPlayerIds)
  const receivingPlayerIds = JSON.parse(trade.receivingPlayerIds)

  // Move players from proposing team to receiving team
  await prisma.rosterPlayer.updateMany({
    where: {
      teamId: trade.proposingTeamId,
      playerId: { in: givingPlayerIds }
    },
    data: {
      teamId: trade.receivingTeamId
    }
  })

  // Move players from receiving team to proposing team
  await prisma.rosterPlayer.updateMany({
    where: {
      teamId: trade.receivingTeamId,
      playerId: { in: receivingPlayerIds }
    },
    data: {
      teamId: trade.proposingTeamId
    }
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      leagueId: trade.proposingTeam?.leagueId,
      action: 'TRADE_PROCESSED',
      description: `Trade processed: ${givingPlayerIds.length} and ${receivingPlayerIds.length} players exchanged`,
      metadata: JSON.stringify({
        tradeId: trade.id,
        givingPlayerIds,
        receivingPlayerIds
      })
    }
  })
}

function calculateTradeValue(givingPlayers: any[], receivingPlayers: any[]) {
  const getValue = (players: any[]) => {
    return players.reduce((total, player) => {
      const seasonProjection = player.projections[0]?.projectedPoints || 0
      const recentStats = player.stats[0]?.fantasyPoints || 0
      return total + (seasonProjection * 0.7 + recentStats * 0.3)
    }, 0)
  }

  const givingValue = getValue(givingPlayers)
  const receivingValue = getValue(receivingPlayers)

  return {
    givingValue: Math.round(givingValue * 10) / 10,
    receivingValue: Math.round(receivingValue * 10) / 10,
    difference: Math.round((receivingValue - givingValue) * 10) / 10,
    fairness: Math.abs(receivingValue - givingValue) <= (givingValue * 0.15) ? 'FAIR' : 'UNBALANCED'
  }
}