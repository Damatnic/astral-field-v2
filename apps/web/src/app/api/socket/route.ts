import { NextRequest, NextResponse } from 'next/server'
import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'


// Global variable to store the socket server instance
let io: SocketIOServer | null = null

// Initialize Socket.IO server
const initSocketServer = (server: NetServer) => {
  if (io) return io

  io = new SocketIOServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  })

  // Handle client connections
  io.on('connection', (socket) => {
    let authenticatedUser: any = null

    // Authentication
    socket.on('authenticate', async (data: { userId: string }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: data.userId },
          select: { id: true, name: true, email: true }
        })

        if (user) {
          authenticatedUser = user
          socket.join(`user:${user.id}`)
          socket.emit('authenticated', { success: true, user })
        } else {
          socket.emit('authentication_error', { message: 'User not found' })
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.error('Authentication error:', error);

        }
        socket.emit('authentication_error', { message: 'Authentication failed' })
      }
    })

    // Join draft room
    socket.on('join_draft', async (data: { leagueId: string }) => {
      if (!authenticatedUser) return

      socket.join(`draft:${data.leagueId}`)
      // Send current draft state
      const draftState = {
        leagueId: data.leagueId,
        currentPick: 1,
        currentRound: 1,
        currentTeamId: null,
        timeRemaining: 120,
        isActive: false
      }
      
      socket.emit('draft_state', draftState)
    })

    // Handle draft picks
    socket.on('draft_player', async (data: {
      leagueId: string
      playerId: string
      teamId: string
      pick: number
      round: number
    }) => {
      if (!authenticatedUser) return

      try {
        // In a real implementation, this would validate and save the pick
        const draftEvent = {
          type: 'PLAYER_DRAFTED',
          leagueId: data.leagueId,
          playerId: data.playerId,
          teamId: data.teamId,
          pick: data.pick,
          round: data.round,
          timestamp: new Date(),
          nextTeamId: 'next-team-id', // Would be calculated
          timeRemaining: 120
        }

        // Broadcast to all clients in the draft room
        socket.to(`draft:${data.leagueId}`).emit('draft_event', draftEvent)
        socket.emit('draft_event', draftEvent)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.error('Draft error:', error);

        }
        socket.emit('draft_error', { message: 'Failed to draft player' })
      }
    })

    // Join live scoring
    socket.on('join_scoring', (data: { leagueId: string, week: number }) => {
      if (!authenticatedUser) return

      socket.join(`scoring:${data.leagueId}:${data.week}`)
      // Send initial scoring data
      const mockScoreUpdate = {
        type: 'SCORE_UPDATE',
        matchupId: 'matchup-1',
        gameInfo: {
          quarter: 3,
          timeRemaining: '8:42',
          lastUpdate: new Date()
        },
        timestamp: new Date()
      }

      socket.emit('score_update', mockScoreUpdate)
    })

    // Join chat
    socket.on('join_chat', (data: { leagueId: string }) => {
      if (!authenticatedUser) return

      socket.join(`chat:${data.leagueId}`)
      // Send recent messages (mock data)
      const recentMessages = [
        {
          id: '1',
          userId: 'other-user',
          userName: 'John Doe',
          message: 'Good luck this week everyone!',
          type: 'TEXT',
          timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
        },
        {
          id: '2',
          userId: 'another-user',
          userName: 'Jane Smith',
          message: 'Anyone want to trade for a running back?',
          type: 'TEXT',
          timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
        }
      ]

      recentMessages.forEach(msg => socket.emit('chat_message', msg))
    })

    // Send chat message
    socket.on('send_message', (data: { 
      leagueId: string
      message: string
      type?: 'TRADE' | 'ANNOUNCEMENT'
    }) => {
      if (!authenticatedUser) return

      const chatMessage = {
        id: Date.now().toString(),
        userId: authenticatedUser.id,
        userName: authenticatedUser.name || authenticatedUser.email,
        message: data.message,
        type: data.type || 'TEXT',
        timestamp: new Date()
      }

      // Broadcast to all clients in the chat room
      socket.to(`chat:${data.leagueId}`).emit('chat_message', chatMessage)
      socket.emit('chat_message', chatMessage)
    })

    // Handle typing indicators
    socket.on('typing', (data: { leagueId: string, typing: boolean }) => {
      if (!authenticatedUser) return

      socket.to(`chat:${data.leagueId}`).emit('user_typing', {
        userId: authenticatedUser.id,
        userName: authenticatedUser.name || authenticatedUser.email,
        typing: data.typing
      })
    })

    // Handle trade proposals
    socket.on('propose_trade', async (data: {
      fromTeamId: string
      toTeamId: string
      leagueId: string
      offeredPlayers: string[]
      requestedPlayers: string[]
      message?: string
    }) => {
      if (!authenticatedUser) return

      try {
        // In a real implementation, this would save to database
        const tradeProposal = {
          tradeId: Date.now().toString(),
          fromTeamId: data.fromTeamId,
          toTeamId: data.toTeamId,
          leagueId: data.leagueId,
          fromOwner: authenticatedUser.name || authenticatedUser.email,
          offeredPlayers: data.offeredPlayers,
          requestedPlayers: data.requestedPlayers,
          message: data.message,
          status: 'PENDING',
          timestamp: new Date()
        }

        // Send to the target team owner
        socket.to(`user:${data.toTeamId}`).emit('trade_proposal', tradeProposal)
        socket.emit('trade_proposal', tradeProposal)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.error('Trade proposal error:', error);

        }
        socket.emit('trade_error', { message: 'Failed to propose trade' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      if (authenticatedUser) {
        console.log('User disconnected:', authenticatedUser.id)
      }
    })
  })

  // Simulate live score updates every 30 seconds
  setInterval(() => {
    if (io) {
      const mockScoreUpdate = {
        type: 'SCORE_UPDATE',
        matchupId: Math.random() > 0.5 ? 'matchup-1' : 'matchup-2',
        gameInfo: {
          quarter: Math.floor(Math.random() * 4) + 1,
          timeRemaining: `${Math.floor(Math.random() * 15)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          lastUpdate: new Date()
        },
        timestamp: new Date()
      }

      io.emit('score_update', mockScoreUpdate)
    }
  }, 30000)

  return io
}

export async function GET(req: NextRequest) {
  try {
    if (!global.process.server) {
      return NextResponse.json({ message: 'Socket.IO server can only be initialized on the server' })
    }

    // @ts-ignore - Access the underlying HTTP server
    const server = req.nextUrl.searchParams.get('init') === 'true'
      ? require('http').createServer()
      : null

    if (server) {
      initSocketServer(server)
    }

    return NextResponse.json({ message: 'Socket.IO server initialized' })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Socket.IO initialization error:', error);

    }
    return NextResponse.json(
      { error: 'Failed to initialize Socket.IO server' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  // For initializing the socket server in development
  return GET(req)
}