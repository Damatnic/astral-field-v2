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
          ? ['https://astralfield.vercel.app', 'https://astralfield.com']
          : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
        credentials: true
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
    // Mock implementation - replace with actual database queries
    return {
      id: draftId,
      status: 'active',
      currentRound: 1,
      currentPickNumber: 1,
      timeRemaining: 90,
      picks: [],
      currentPick: {
        round: 1,
        pick: 1,
        teamId: 'team1',
        teamName: 'Team 1'
      }
    };
  }

  private async processDraftPick(pickData: DraftPickData) {
    // Mock implementation - replace with actual database operations
    try {
      // Validate pick
      // Save to database
      // Calculate next pick
      
      return {
        success: true,
        pick: {
          ...pickData,
          playerName: 'Mock Player',
          position: 'RB',
          team: 'SF'
        },
        nextUp: {
          round: pickData.round,
          pick: pickData.pick + 1,
          teamId: 'team2',
          teamName: 'Team 2'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process pick'
      };
    }
  }

  private startPickTimer(draftId: string, currentPick: any) {
    this.clearPickTimer(draftId);
    
    let timeRemaining = 90; // 90 seconds per pick
    
    const timer = setInterval(() => {
      timeRemaining--;
      
      // Broadcast timer update
      this.io?.to(`draft_${draftId}`).emit('timer_update', {
        timeRemaining,
        currentPick,
        timestamp: new Date().toISOString()
      });

      if (timeRemaining <= 0) {
        // Auto-pick logic
        this.handleAutoPick(draftId, currentPick);
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
    // Auto-pick best available player
    const autoPickData: DraftPickData = {
      draftId,
      round: currentPick.round,
      pick: currentPick.pick,
      overall: (currentPick.round - 1) * 10 + currentPick.pick, // Assuming 10 teams
      teamId: currentPick.teamId,
      playerId: 'auto_pick_player',
      userId: 'system'
    };

    const result = await this.processDraftPick(autoPickData);
    if (result.success) {
      this.io?.to(`draft_${draftId}`).emit('auto_pick_made', {
        pick: result.pick,
        nextUp: result.nextUp,
        timestamp: new Date().toISOString()
      });

      this.startPickTimer(draftId, result.nextUp);
    }
  }

  private async startDraft(draftId: string) {
    // Mock implementation
    console.log(`Starting draft ${draftId}`);
  }

  private async pauseDraft(draftId: string) {
    // Mock implementation
    console.log(`Pausing draft ${draftId}`);
  }

  private async resumeDraft(draftId: string) {
    // Mock implementation
    console.log(`Resuming draft ${draftId}`);
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