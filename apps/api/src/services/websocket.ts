import { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma, redis, logger } from '../server'

interface AuthenticatedSocket extends Socket {
  userId?: string
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
}

interface DraftRoom {
  draftId: string
  leagueId: string
  participants: Set<string>
  currentPick: {
    teamId: string
    timeRemaining: number
    pickNumber: number
    round: number
  }
  picks: Array<{
    playerId: string
    teamId: string
    round: number
    pickNumber: number
    timestamp: Date
  }>
}

interface LiveGame {
  gameId: string
  leagueId: string
  participants: Set<string>
  scores: Map<string, number>
  lastUpdate: Date
}

// In-memory storage for active rooms (in production, use Redis)
const draftRooms = new Map<string, DraftRoom>()
const liveGames = new Map<string, LiveGame>()
const userSockets = new Map<string, Set<string>>() // userId -> Set of socketIds

export function setupWebSocket(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      // Verify session in Redis
      const session = await redis.get(`session:${decoded.userId}`)
      if (!session) {
        return next(new Error('Invalid or expired session'))
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true
        }
      })

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'))
      }

      socket.userId = user.id
      socket.user = user
      
      // Track user socket connections
      if (!userSockets.has(user.id)) {
        userSockets.set(user.id, new Set())
      }
      userSockets.get(user.id)!.add(socket.id)

      logger.info('WebSocket authenticated', {
        userId: user.id,
        socketId: socket.id
      })

      next()
    } catch (error) {
      logger.error('WebSocket authentication failed', error)
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('WebSocket connected', {
      userId: socket.userId,
      socketId: socket.id
    })

    // Join Draft Room
    socket.on('draft:join', async (data: { draftId: string }) => {
      try {
        const { draftId } = data

        // Verify user has access to this draft
        const draft = await prisma.draft.findFirst({
          where: { 
            id: draftId,
            league: {
              teams: {
                some: { userId: socket.userId }
              }
            }
          },
          include: {
            league: {
              include: {
                teams: true
              }
            }
          }
        })

        if (!draft) {
          socket.emit('draft:error', { message: 'Draft not found or access denied' })
          return
        }

        // Join the draft room
        socket.join(`draft:${draftId}`)
        
        // Initialize or update draft room
        if (!draftRooms.has(draftId)) {
          draftRooms.set(draftId, {
            draftId,
            leagueId: draft.leagueId,
            participants: new Set(),
            currentPick: {
              teamId: '', // Will be determined by draft order
              timeRemaining: draft.timePerPick,
              pickNumber: 1,
              round: 1
            },
            picks: []
          })
        }

        const room = draftRooms.get(draftId)!
        room.participants.add(socket.userId!)

        // Get current draft state
        const picks = await prisma.draftPick.findMany({
          where: { draftId },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                team: true
              }
            },
            team: {
              select: {
                id: true,
                name: true,
                userId: true
              }
            }
          },
          orderBy: { pickNumber: 'asc' }
        })

        // Send draft state to joining user
        socket.emit('draft:joined', {
          draftId,
          league: draft.league,
          picks,
          participants: Array.from(room.participants),
          currentPick: room.currentPick,
          status: draft.status
        })

        // Notify other participants
        socket.to(`draft:${draftId}`).emit('draft:participant-joined', {
          userId: socket.userId,
          user: socket.user
        })

        logger.info('User joined draft room', {
          userId: socket.userId,
          draftId,
          participantCount: room.participants.size
        })

      } catch (error) {
        logger.error('Failed to join draft room', error)
        socket.emit('draft:error', { message: 'Failed to join draft' })
      }
    })

    // Make Draft Pick
    socket.on('draft:pick', async (data: { draftId: string, playerId: string }) => {
      try {
        const { draftId, playerId } = data
        
        const room = draftRooms.get(draftId)
        if (!room) {
          socket.emit('draft:error', { message: 'Draft room not found' })
          return
        }

        // Verify it's this user's turn
        const draft = await prisma.draft.findUnique({
          where: { id: draftId },
          include: {
            league: {
              include: {
                teams: {
                  orderBy: { draftOrder: 'asc' }
                }
              }
            }
          }
        })

        if (!draft) {
          socket.emit('draft:error', { message: 'Draft not found' })
          return
        }

        // Calculate current pick team
        const currentPickNumber = room.picks.length + 1
        const currentRound = Math.ceil(currentPickNumber / draft.league.teams.length)
        let teamIndex: number

        if (currentRound % 2 === 1) {
          // Odd rounds: 1, 3, 5... (normal order)
          teamIndex = (currentPickNumber - 1) % draft.league.teams.length
        } else {
          // Even rounds: 2, 4, 6... (snake/reverse order)
          teamIndex = draft.league.teams.length - 1 - ((currentPickNumber - 1) % draft.league.teams.length)
        }

        const currentTeam = draft.league.teams[teamIndex]
        
        if (currentTeam.userId !== socket.userId) {
          socket.emit('draft:error', { message: 'Not your turn to pick' })
          return
        }

        // Verify player is available
        const existingPick = await prisma.draftPick.findFirst({
          where: {
            draftId,
            playerId
          }
        })

        if (existingPick) {
          socket.emit('draft:error', { message: 'Player already drafted' })
          return
        }

        // Create the draft pick
        const pick = await prisma.draftPick.create({
          data: {
            draftId,
            playerId,
            teamId: currentTeam.id,
            round: currentRound,
            pickNumber: currentPickNumber,
            timestamp: new Date()
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                team: true
              }
            },
            team: {
              select: {
                id: true,
                name: true,
                userId: true
              }
            }
          }
        })

        // Update room state
        room.picks.push({
          playerId,
          teamId: currentTeam.id,
          round: currentRound,
          pickNumber: currentPickNumber,
          timestamp: new Date()
        })

        // Update current pick for next turn
        if (currentPickNumber < draft.league.teams.length * (draft.league.settings.rosterSize || 16)) {
          const nextPickNumber = currentPickNumber + 1
          const nextRound = Math.ceil(nextPickNumber / draft.league.teams.length)
          let nextTeamIndex: number

          if (nextRound % 2 === 1) {
            nextTeamIndex = (nextPickNumber - 1) % draft.league.teams.length
          } else {
            nextTeamIndex = draft.league.teams.length - 1 - ((nextPickNumber - 1) % draft.league.teams.length)
          }

          room.currentPick = {
            teamId: draft.league.teams[nextTeamIndex].id,
            timeRemaining: draft.timePerPick,
            pickNumber: nextPickNumber,
            round: nextRound
          }
        }

        // Broadcast pick to all participants
        io.to(`draft:${draftId}`).emit('draft:pick-made', {
          pick,
          currentPick: room.currentPick,
          totalPicks: room.picks.length
        })

        logger.info('Draft pick made', {
          userId: socket.userId,
          draftId,
          playerId,
          pickNumber: currentPickNumber,
          round: currentRound
        })

      } catch (error) {
        logger.error('Failed to make draft pick', error)
        socket.emit('draft:error', { message: 'Failed to make pick' })
      }
    })

    // Join Live Scoring
    socket.on('live:join', async (data: { leagueId: string, week: number }) => {
      try {
        const { leagueId, week } = data

        // Verify user has access to this league
        const userTeam = await prisma.team.findFirst({
          where: {
            leagueId,
            userId: socket.userId
          },
          include: {
            league: {
              select: {
                id: true,
                name: true,
                season: true
              }
            }
          }
        })

        if (!userTeam) {
          socket.emit('live:error', { message: 'League not found or access denied' })
          return
        }

        const gameId = `${leagueId}:${week}`
        socket.join(`live:${gameId}`)

        // Initialize or update live game
        if (!liveGames.has(gameId)) {
          liveGames.set(gameId, {
            gameId,
            leagueId,
            participants: new Set(),
            scores: new Map(),
            lastUpdate: new Date()
          })
        }

        const game = liveGames.get(gameId)!
        game.participants.add(socket.userId!)

        // Get current matchup and scores
        const matchup = await prisma.matchup.findFirst({
          where: {
            leagueId,
            week,
            OR: [
              { homeTeamId: userTeam.id },
              { awayTeamId: userTeam.id }
            ]
          },
          include: {
            homeTeam: {
              include: {
                roster: {
                  include: {
                    player: {
                      include: {
                        stats: {
                          where: { week, season: userTeam.league.season }
                        }
                      }
                    }
                  }
                }
              }
            },
            awayTeam: {
              include: {
                roster: {
                  include: {
                    player: {
                      include: {
                        stats: {
                          where: { week, season: userTeam.league.season }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        })

        socket.emit('live:joined', {
          gameId,
          leagueId,
          week,
          matchup,
          participants: Array.from(game.participants)
        })

        socket.to(`live:${gameId}`).emit('live:participant-joined', {
          userId: socket.userId,
          user: socket.user
        })

        logger.info('User joined live scoring', {
          userId: socket.userId,
          leagueId,
          week,
          participantCount: game.participants.size
        })

      } catch (error) {
        logger.error('Failed to join live scoring', error)
        socket.emit('live:error', { message: 'Failed to join live scoring' })
      }
    })

    // Activity Feed
    socket.on('activity:join', async (data: { leagueId: string }) => {
      try {
        const { leagueId } = data

        // Verify user has access to this league
        const userTeam = await prisma.team.findFirst({
          where: {
            leagueId,
            userId: socket.userId
          }
        })

        if (!userTeam) {
          socket.emit('activity:error', { message: 'League not found or access denied' })
          return
        }

        socket.join(`activity:${leagueId}`)

        // Send recent activity
        const recentActivity = await prisma.transaction.findMany({
          where: { leagueId },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            player: {
              select: {
                name: true,
                position: true,
                team: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })

        socket.emit('activity:joined', {
          leagueId,
          recentActivity
        })

        logger.info('User joined activity feed', {
          userId: socket.userId,
          leagueId
        })

      } catch (error) {
        logger.error('Failed to join activity feed', error)
        socket.emit('activity:error', { message: 'Failed to join activity feed' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('WebSocket disconnected', {
        userId: socket.userId,
        socketId: socket.id
      })

      if (socket.userId) {
        // Remove from user socket tracking
        const userSocketSet = userSockets.get(socket.userId)
        if (userSocketSet) {
          userSocketSet.delete(socket.id)
          if (userSocketSet.size === 0) {
            userSockets.delete(socket.userId)
          }
        }

        // Remove from draft rooms
        for (const [draftId, room] of draftRooms.entries()) {
          if (room.participants.has(socket.userId)) {
            room.participants.delete(socket.userId)
            socket.to(`draft:${draftId}`).emit('draft:participant-left', {
              userId: socket.userId
            })
            
            // Clean up empty rooms
            if (room.participants.size === 0) {
              draftRooms.delete(draftId)
            }
          }
        }

        // Remove from live games
        for (const [gameId, game] of liveGames.entries()) {
          if (game.participants.has(socket.userId)) {
            game.participants.delete(socket.userId)
            socket.to(`live:${gameId}`).emit('live:participant-left', {
              userId: socket.userId
            })
            
            // Clean up empty games
            if (game.participants.size === 0) {
              liveGames.delete(gameId)
            }
          }
        }
      }
    })
  })

  // Server-side functions for triggering events
  return {
    // Broadcast score updates
    broadcastScoreUpdate: (leagueId: string, week: number, playerStats: any[]) => {
      const gameId = `${leagueId}:${week}`
      io.to(`live:${gameId}`).emit('live:score-update', {
        timestamp: new Date(),
        stats: playerStats
      })
    },

    // Broadcast activity
    broadcastActivity: (leagueId: string, activity: any) => {
      io.to(`activity:${leagueId}`).emit('activity:new', {
        timestamp: new Date(),
        activity
      })
    },

    // Send notification to specific user
    sendNotification: (userId: string, notification: any) => {
      const userSocketSet = userSockets.get(userId)
      if (userSocketSet) {
        for (const socketId of userSocketSet) {
          io.to(socketId).emit('notification', {
            timestamp: new Date(),
            ...notification
          })
        }
      }
    },

    // Draft timer tick
    broadcastDraftTimer: (draftId: string, timeRemaining: number) => {
      const room = draftRooms.get(draftId)
      if (room) {
        room.currentPick.timeRemaining = timeRemaining
        io.to(`draft:${draftId}`).emit('draft:timer-tick', {
          timeRemaining,
          currentPick: room.currentPick
        })
      }
    }
  }
}