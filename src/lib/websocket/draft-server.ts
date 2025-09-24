import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '@/lib/db';

export interface DraftPickData {
  draftId: string;
  round: number;
  pick: number;
  overall: number;
  teamId: string;
  playerId: string;
  userId: string;
}

export interface ChatMessageData {
  draftId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

export interface DraftTimerData {
  draftId: string;
  timeRemaining: number;
  currentTeamId: string;
  round: number;
  pick: number;
}

class DraftWebSocketServer {
  private io: SocketIOServer | null = null;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [
              'https://astralfield-v2.vercel.app',
              'https://astralfield.vercel.app', 
              'https://astralfield.com',
              /^https:\/\/.*\.vercel\.app$/
            ]
          : [
              'http://localhost:3000', 
              'http://localhost:3001', 
              'http://localhost:3002',
              'http://localhost:3010',
              'http://localhost:3011',
              'http://localhost:3012',
              'http://localhost:3013'
            ],
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.io.on('connection', (socket) => {
      console.log(`User connected to draft: ${socket.id}`);

      socket.on('join_draft', async (draftId: string, userId: string) => {
        try {
          await socket.join(`draft_${draftId}`);
          
          // Send current draft state
          const draftState = await this.getDraftState(draftId);
          socket.emit('draft_state', draftState);
          
          // Notify others that user joined
          socket.to(`draft_${draftId}`).emit('user_joined', {
            userId,
            timestamp: new Date().toISOString()
          });

          console.log(`User ${userId} joined draft ${draftId}`);
        } catch (error) {
          console.error('Error joining draft:', error);
          socket.emit('error', { message: 'Failed to join draft' });
        }
      });

      socket.on('leave_draft', (draftId: string, userId: string) => {
        socket.leave(`draft_${draftId}`);
        socket.to(`draft_${draftId}`).emit('user_left', {
          userId,
          timestamp: new Date().toISOString()
        });
        console.log(`User ${userId} left draft ${draftId}`);
      });

      socket.on('make_pick', async (pickData: DraftPickData) => {
        try {
          const result = await this.processDraftPick(pickData);
          if (result.success) {
            // Broadcast pick to all users in the draft
            this.io?.to(`draft_${pickData.draftId}`).emit('pick_made', {
              pick: result.pick,
              nextUp: result.nextUp,
              timestamp: new Date().toISOString()
            });

            // Reset timer for next pick
            this.startPickTimer(pickData.draftId, result.nextUp);
          } else {
            socket.emit('error', { message: result.error });
          }
        } catch (error) {
          console.error('Error processing pick:', error);
          socket.emit('error', { message: 'Failed to process pick' });
        }
      });

      socket.on('send_chat_message', async (messageData: ChatMessageData) => {
        try {
          // Save message to database if needed
          const chatMessage = {
            id: Date.now().toString(),
            user: messageData.username,
            message: messageData.message,
            timestamp: messageData.timestamp,
            userId: messageData.userId
          };

          // Broadcast to all users in the draft
          this.io?.to(`draft_${messageData.draftId}`).emit('chat_message', chatMessage);
        } catch (error) {
          console.error('Error sending chat message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      socket.on('start_draft', async (draftId: string) => {
        try {
          await this.startDraft(draftId);
          this.io?.to(`draft_${draftId}`).emit('draft_started', {
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error starting draft:', error);
          socket.emit('error', { message: 'Failed to start draft' });
        }
      });

      socket.on('pause_draft', async (draftId: string) => {
        try {
          await this.pauseDraft(draftId);
          this.clearPickTimer(draftId);
          this.io?.to(`draft_${draftId}`).emit('draft_paused', {
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error pausing draft:', error);
          socket.emit('error', { message: 'Failed to pause draft' });
        }
      });

      socket.on('resume_draft', async (draftId: string) => {
        try {
          await this.resumeDraft(draftId);
          const draftState = await this.getDraftState(draftId);
          if (draftState.currentPick) {
            this.startPickTimer(draftId, draftState.currentPick);
          }
          this.io?.to(`draft_${draftId}`).emit('draft_resumed', {
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error resuming draft:', error);
          socket.emit('error', { message: 'Failed to resume draft' });
        }
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  private async getDraftState(draftId: string) {
    try {
      const draft = await prisma.draft.findUnique({
        where: { id: draftId },
        include: {
          league: {
            include: {
              teams: {
                include: {
                  owner: { select: { id: true, name: true } }
                }
              }
            }
          },
          picks: {
            include: {
              team: {
                include: {
                  owner: { select: { id: true, name: true } }
                }
              },
              player: {
                select: { id: true, name: true, position: true, nflTeam: true }
              }
            },
            orderBy: { pickNumber: 'asc' }
          },
          draftOrder: {
            include: {
              team: {
                include: {
                  owner: { select: { id: true, name: true } }
                }
              }
            },
            orderBy: { pickOrder: 'asc' }
          }
        }
      });

      if (!draft) {
        throw new Error('Draft not found');
      }

      const currentTeam = draft.draftOrder.find(order => order.teamId === draft.currentTeamId);

      return {
        id: draft.id,
        leagueId: draft.leagueId,
        status: draft.status,
        type: draft.type,
        currentRound: draft.currentRound,
        currentPick: draft.currentPick,
        timeRemaining: draft.timeRemaining,
        timePerPick: draft.timePerPick,
        totalRounds: draft.totalRounds,
        participants: draft.draftOrder.map(order => ({
          position: order.pickOrder,
          teamId: order.teamId,
          teamName: order.team.name,
          ownerName: order.team.owner.name,
          ownerId: order.team.owner.id
        })),
        picks: draft.picks.map(pick => ({
          id: pick.id,
          round: pick.round,
          pickInRound: pick.pickInRound,
          pickNumber: pick.pickNumber,
          teamId: pick.teamId,
          teamName: pick.team.name,
          player: pick.player,
          pickMadeAt: pick.pickMadeAt
        })),
        currentTeam: currentTeam ? {
          teamId: currentTeam.teamId,
          teamName: currentTeam.team.name,
          ownerName: currentTeam.team.owner.name,
          position: currentTeam.pickOrder
        } : null,
        isComplete: draft.status === 'COMPLETED',
        startedAt: draft.startedAt,
        completedAt: draft.completedAt
      };
    } catch (error) {
      console.error('Error fetching draft state:', error);
      throw error;
    }
  }

  private async processDraftPick(pickData: DraftPickData) {
    try {
      // Make API call to process the pick
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3007'}/api/draft/${pickData.draftId}/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: pickData.playerId,
          teamId: pickData.teamId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to process pick'
        };
      }

      const result = await response.json();
      
      return {
        success: true,
        pick: result.data.pick,
        nextUp: result.data.draftState.nextUp,
        draftState: result.data.draftState
      };
    } catch (error) {
      console.error('Error processing draft pick:', error);
      return {
        success: false,
        error: 'Failed to process pick'
      };
    }
  }

  private async startPickTimer(draftId: string, currentPick: any) {
    this.clearPickTimer(draftId);
    
    // Get current draft state to get the correct time remaining
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      select: { timeRemaining: true, timePerPick: true, status: true }
    });

    if (!draft || draft.status !== 'IN_PROGRESS') {
      return;
    }

    let timeRemaining = draft.timeRemaining || draft.timePerPick;
    
    const timer = setInterval(async () => {
      timeRemaining--;
      
      // Update database with current time remaining
      await prisma.draft.update({
        where: { id: draftId },
        data: { timeRemaining }
      }).catch(err => console.error('Error updating timer:', err));
      
      // Broadcast timer update
      this.io?.to(`draft_${draftId}`).emit('timer_update', {
        timeRemaining,
        currentPick,
        timestamp: new Date().toISOString()
      });

      if (timeRemaining <= 0) {
        // Auto-pick logic
        await this.handleAutoPick(draftId, currentPick);
        clearInterval(timer);
        this.timers.delete(draftId);
      }
    }, 1000);

    this.timers.set(draftId, timer);
  }

  private clearPickTimer(draftId: string) {
    const timer = this.timers.get(draftId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(draftId);
    }
  }

  private async handleAutoPick(draftId: string, currentPick: any) {
    try {
      // Get draft and already picked players
      const draft = await prisma.draft.findUnique({
        where: { id: draftId },
        include: {
          picks: { select: { playerId: true } }
        }
      });

      if (!draft) {
        console.error('Draft not found for auto-pick');
        return;
      }

      const pickedPlayerIds = draft.picks.map(pick => pick.playerId);

      // Find best available player (simple ranking by ADP)
      const availablePlayer = await prisma.player.findFirst({
        where: {
          id: { notIn: pickedPlayerIds },
          status: 'active'
        },
        orderBy: [
          { adp: 'asc' },
          { rank: 'asc' },
          { name: 'asc' }
        ]
      });

      if (!availablePlayer) {
        console.error('No available players found for auto-pick');
        return;
      }

      const autoPickData: DraftPickData = {
        draftId,
        round: currentPick.round,
        pick: currentPick.pick,
        overall: (currentPick.round - 1) * 10 + currentPick.pick, // Estimate
        teamId: currentPick.teamId,
        playerId: availablePlayer.id,
        userId: 'system'
      };

      const result = await this.processDraftPick(autoPickData);
      if (result.success) {
        this.io?.to(`draft_${draftId}`).emit('auto_pick_made', {
          pick: result.pick,
          nextUp: result.nextUp,
          timestamp: new Date().toISOString()
        });

        if (result.nextUp) {
          await this.startPickTimer(draftId, result.nextUp);
        }
      }
    } catch (error) {
      console.error('Error handling auto-pick:', error);
    }
  }

  private async startDraft(draftId: string) {
    try {
      const draft = await prisma.draft.findUnique({
        where: { id: draftId },
        include: {
          draftOrder: {
            orderBy: { pickOrder: 'asc' },
            take: 1
          }
        }
      });

      if (!draft) {
        throw new Error('Draft not found');
      }

      if (draft.status !== 'SCHEDULED') {
        throw new Error('Draft cannot be started');
      }

      const firstTeam = draft.draftOrder[0];
      
      await prisma.draft.update({
        where: { id: draftId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          currentRound: 1,
          currentPick: 1,
          currentTeamId: firstTeam.teamId,
          timeRemaining: draft.timePerPick
        }
      });

      console.log(`Started draft ${draftId}`);
    } catch (error) {
      console.error('Error starting draft:', error);
      throw error;
    }
  }

  private async pauseDraft(draftId: string) {
    try {
      await prisma.draft.update({
        where: { id: draftId },
        data: {
          status: 'PAUSED'
        }
      });

      console.log(`Paused draft ${draftId}`);
    } catch (error) {
      console.error('Error pausing draft:', error);
      throw error;
    }
  }

  private async resumeDraft(draftId: string) {
    try {
      await prisma.draft.update({
        where: { id: draftId },
        data: {
          status: 'IN_PROGRESS',
          timeRemaining: (await prisma.draft.findUnique({
            where: { id: draftId },
            select: { timePerPick: true }
          }))?.timePerPick || 90
        }
      });

      console.log(`Resumed draft ${draftId}`);
    } catch (error) {
      console.error('Error resuming draft:', error);
      throw error;
    }
  }

  public cleanup() {
    // Clear all timers
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.clear();
    
    if (this.io) {
      this.io.close();
    }
  }
}

export const draftWebSocketServer = new DraftWebSocketServer();