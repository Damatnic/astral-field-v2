import { Server } from 'socket.io'
import { createServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from './prisma'

export interface SocketUser {
  id: string
  name: string
  teamId?: string
  leagueId?: string
}

export interface DraftEvent {
  type: 'PLAYER_DRAFTED' | 'TURN_CHANGE' | 'DRAFT_STARTED' | 'DRAFT_PAUSED' | 'DRAFT_COMPLETED'
  leagueId: string
  playerId?: string
  teamId?: string
  pick?: number
  round?: number
  timeRemaining?: number
  nextTeamId?: string
  data?: any
}

export interface LiveScoreEvent {
  type: 'SCORE_UPDATE' | 'PLAYER_STAT_UPDATE' | 'GAME_STARTED' | 'GAME_COMPLETED'
  matchupId?: string
  leagueId: string
  playerId?: string
  stats?: {
    passingYards?: number
    rushingYards?: number
    receivingYards?: number
    touchdowns?: number
    fieldGoals?: number
    fantasyPoints: number
  }
  gameInfo?: {
    homeScore: number
    awayScore: number
    quarter: number
    timeRemaining: string
    isComplete: boolean
  }
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: Date
  leagueId: string
  type: 'TEXT' | 'TRADE' | 'ANNOUNCEMENT'
}

class WebSocketManager {
  private io: Server | null = null
  private connectedUsers: Map<string, SocketUser> = new Map()
  private draftTimers: Map<string, NodeJS.Timeout> = new Map()

  initialize(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'development' 
          ? ['http://localhost:3000', 'http://127.0.0.1:3000']
          : [process.env.NEXTAUTH_URL!],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.io.on('connection', (socket) => {

      // Handle user authentication and join rooms
      socket.on('authenticate', async (data: { userId: string, token?: string }) => {
        try {
          // Validate user (in production, verify JWT token)
          const user = await prisma.user.findUnique({
            where: { id: data.userId },
            include: {
              teams: {
                include: {
                  league: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          })

          if (user) {
            const socketUser: SocketUser = {
              id: user.id,
              name: user.name || user.email
            }

            this.connectedUsers.set(socket.id, socketUser)
            socket.emit('authenticated', { success: true, user: socketUser })

            // Join league rooms for real-time updates
            for (const team of user.teams) {
              socket.join(`league:${team.league.id}`)
              socket.join(`team:${team.id}`)
            }
          } else {
            socket.emit('authentication_error', { message: 'Invalid user' })
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Authentication error:', error);
          }
          socket.emit('authentication_error', { message: 'Authentication failed' })
        }
      })

      // Draft room functionality
      socket.on('join_draft', async (data: { leagueId: string }) => {
        socket.join(`draft:${data.leagueId}`)
        
        // Get current draft state
        const draftState = await this.getDraftState(data.leagueId)
        socket.emit('draft_state', draftState)
      })

      socket.on('draft_player', async (data: { 
        leagueId: string
        playerId: string
        teamId: string
        pick: number
        round: number 
      }) => {
        try {
          // Validate it's the correct team's turn and execute draft
          const draftResult = await this.executeDraft(data)
          
          if (draftResult.success) {
            // Broadcast to all draft participants
            const draftEvent: DraftEvent = {
              type: 'PLAYER_DRAFTED',
              leagueId: data.leagueId,
              playerId: data.playerId,
              teamId: data.teamId,
              pick: data.pick,
              round: data.round,
              nextTeamId: draftResult.nextTeamId,
              timeRemaining: draftResult.timeRemaining
            }

            this.io!.to(`draft:${data.leagueId}`).emit('draft_event', draftEvent)
            
            // Start timer for next pick
            this.startDraftTimer(data.leagueId, draftResult.nextTeamId!)
          } else {
            socket.emit('draft_error', { message: draftResult.error })
          }
        } catch (error) {
          socket.emit('draft_error', { message: 'Draft execution failed' })
        }
      })

      // Live scoring updates
      socket.on('join_scoring', (data: { leagueId: string, week: number }) => {
        socket.join(`scoring:${data.leagueId}:${data.week}`)
      })

      // League chat
      socket.on('join_chat', (data: { leagueId: string }) => {
        socket.join(`chat:${data.leagueId}`)
      })

      socket.on('send_message', async (data: {
        leagueId: string
        message: string
        type?: 'TEXT' | 'TRADE'
      }) => {
        const user = this.connectedUsers.get(socket.id)
        if (!user) return

        try {
          // Save message to database
          const chatMessage = await prisma.chatMessage.create({
            data: {
              userId: user.id,
              leagueId: data.leagueId,
              content: data.message,
              type: data.type || 'TEXT'
            },
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          })

          const messageEvent: ChatMessage = {
            id: chatMessage.id,
            userId: user.id,
            userName: chatMessage.user.name || chatMessage.user.email,
            message: data.message,
            timestamp: chatMessage.createdAt,
            leagueId: data.leagueId,
            type: data.type || 'TEXT'
          }

          // Broadcast to league chat
          this.io!.to(`chat:${data.leagueId}`).emit('chat_message', messageEvent)
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Chat message error:', error);
          }
        }
      })

      // Trade notifications
      socket.on('propose_trade', async (data: {
        fromTeamId: string
        toTeamId: string
        leagueId: string
        offeredPlayers: string[]
        requestedPlayers: string[]
        message?: string
      }) => {
        try {
          // Create trade proposal in database
          const trade = await prisma.tradeProposal.create({
            data: {
              proposingTeamId: data.fromTeamId,
              receivingTeamId: data.toTeamId,
              givingPlayerIds: JSON.stringify(data.offeredPlayers),
              receivingPlayerIds: JSON.stringify(data.requestedPlayers),
              message: data.message,
              status: 'pending'
            },
            include: {
              proposingTeam: { 
                include: { 
                  owner: { select: { name: true } } 
                } 
              }
            }
          })

          // Send real-time notification to target team
          this.io!.to(`team:${data.toTeamId}`).emit('trade_proposal', {
            tradeId: trade.id,
            fromTeam: trade.proposingTeam.name,
            fromOwner: trade.proposingTeam.owner.name,
            message: data.message,
            offeredPlayers: data.offeredPlayers,
            requestedPlayers: data.requestedPlayers
          })
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Trade proposal error:', error);
          }
        }
      })

      socket.on('disconnect', () => {

        this.connectedUsers.delete(socket.id)
      })
    })

    return this.io
  }

  // Draft management methods
  private async getDraftState(leagueId: string) {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          include: {
            owner: { select: { name: true, email: true } },
            roster: {
              include: {
                player: {
                  select: { 
                    id: true, 
                    name: true, 
                    position: true, 
                    nflTeam: true,
                    adp: true
                  }
                }
              }
            }
          }
        },
      }
    })

    return {
      league,
      currentPick: 1, // Simplified for now
      availablePlayers: await this.getAvailablePlayers(leagueId),
      draftOrder: this.generateDraftOrder(league?.teams || [])
    }
  }

  private async executeDraft(data: {
    leagueId: string
    playerId: string
    teamId: string
    pick: number
    round: number
  }) {
    try {
      // Add player to team roster (simplified draft implementation)
      await prisma.rosterPlayer.create({
        data: {
          teamId: data.teamId,
          playerId: data.playerId,
          position: 'BENCH',
          isStarter: false
        }
      })

      // Get next team in draft order
      const nextTeamId = await this.getNextDraftTeam(data.leagueId, data.pick)
      
      return {
        success: true,
        nextTeamId,
        timeRemaining: 90 // 90 seconds per pick
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to execute draft pick'
      }
    }
  }

  private startDraftTimer(leagueId: string, teamId: string) {
    // Clear existing timer
    const existingTimer = this.draftTimers.get(`${leagueId}:${teamId}`)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Start new 90-second timer
    let timeRemaining = 90
    const timer = setInterval(() => {
      timeRemaining--
      
      // Broadcast time update
      this.io!.to(`draft:${leagueId}`).emit('draft_timer', {
        teamId,
        timeRemaining
      })

      // Auto-pick if time expires
      if (timeRemaining <= 0) {
        clearInterval(timer)
        this.draftTimers.delete(`${leagueId}:${teamId}`)
        this.executeAutoPick(leagueId, teamId)
      }
    }, 1000)

    this.draftTimers.set(`${leagueId}:${teamId}`, timer as any)
  }

  private async executeAutoPick(leagueId: string, teamId: string) {
    // Get best available player by ADP
    const availablePlayers = await this.getAvailablePlayers(leagueId)
    const bestPlayer = availablePlayers.find((p: any) => p.adp) || availablePlayers[0]

    if (bestPlayer) {
      // Execute auto-draft
      const currentPick = await this.getCurrentPickNumber(leagueId)
      const currentRound = Math.ceil(currentPick / 12) // Assuming 12-team league

      await this.executeDraft({
        leagueId,
        playerId: bestPlayer.id,
        teamId,
        pick: currentPick,
        round: currentRound
      })

      // Notify about auto-pick
      this.io!.to(`draft:${leagueId}`).emit('auto_pick', {
        teamId,
        player: bestPlayer,
        reason: 'Time expired'
      })
    }
  }

  private getCurrentDraftPick() {
    return 1 // Simplified for now
  }

  private async getAvailablePlayers(leagueId: string) {
    // Simplified - return all fantasy relevant players for now
    return prisma.player.findMany({
      where: {
        isFantasyRelevant: true
      },
      orderBy: { adp: 'asc' },
      take: 100 // Limit for performance
    })
  }

  private generateDraftOrder(teams: any[]) {
    // Simple snake draft order - can be enhanced
    return teams.map(team => team.id)
  }

  private async getNextDraftTeam(leagueId: string, currentPick: number) {
    // Simple logic - can be enhanced for snake draft
    const teams = await prisma.team.findMany({
      where: { leagueId },
      select: { id: true }
    })

    const nextPickIndex = currentPick % teams.length
    return teams[nextPickIndex]?.id
  }

  private async getCurrentPickNumber(leagueId: string) {
    // Simplified for now
    return 1
  }

  // Live scoring methods
  broadcastScoreUpdate(event: LiveScoreEvent) {
    if (this.io) {
      this.io.to(`scoring:${event.leagueId}:${new Date().getWeek()}`).emit('score_update', event)
    }
  }

  broadcastChatMessage(leagueId: string, message: ChatMessage) {
    if (this.io) {
      this.io.to(`chat:${leagueId}`).emit('chat_message', message)
    }
  }
}

// Extend Date prototype for week calculation
declare global {
  interface Date {
    getWeek(): number
  }
}

Date.prototype.getWeek = function() {
  const firstDayOfYear = new Date(this.getFullYear(), 0, 1)
  const pastDaysOfYear = (this.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

export const websocketManager = new WebSocketManager()