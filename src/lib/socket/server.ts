import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth/verify';
import { prisma } from '@/lib/prisma';
import { draftStateManager } from '@/lib/draft/draft-state';

let io: SocketIOServer | null = null;

export interface SocketWithAuth extends Socket {
  userId?: string;
  teamId?: string;
  leagueId?: string;
}

export function initSocketServer(server: HTTPServer): SocketIOServer {
  if (!io) {
    io = new SocketIOServer(server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    io.use(async (socket: SocketWithAuth, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = await verifyToken(token);
        if (!payload || !payload.userId) {
          return next(new Error('Invalid token'));
        }

        socket.userId = payload.userId;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    io.on('connection', async (socket: SocketWithAuth) => {
      console.log(`User ${socket.userId} connected`);

      // Join user's personal room for notifications
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }

      // Draft room handlers
      socket.on('draft:join', async (draftId: string) => {
        try {
          if (!socket.userId) return;

          // Verify user has access to this draft
          const draftAccess = await prisma.draft.findFirst({
            where: {
              id: draftId,
              league: {
                teams: {
                  some: {
                    ownerId: socket.userId
                  }
                }
              }
            },
            include: {
              league: {
                include: {
                  teams: {
                    where: {
                      ownerId: socket.userId
                    }
                  }
                }
              }
            }
          });

          if (!draftAccess) {
            socket.emit('draft:error', 'Access denied to draft room');
            return;
          }

          socket.teamId = draftAccess.league.teams[0]?.id;
          socket.leagueId = draftAccess.leagueId;

          // Join draft room
          socket.join(`draft:${draftId}`);
          
          // Initialize or get draft state
          await draftStateManager.initializeDraft(draftId);
          
          // Send current state to joining user
          const state = draftStateManager.getState(draftId);
          socket.emit('draft:state', state);

          // Notify others that user joined
          socket.to(`draft:${draftId}`).emit('draft:userJoined', {
            userId: socket.userId,
            teamId: socket.teamId
          });

          console.log(`User ${socket.userId} joined draft ${draftId}`);
        } catch (error) {
          console.error('Error joining draft:', error);
          socket.emit('draft:error', 'Failed to join draft room');
        }
      });

      socket.on('draft:leave', async (draftId: string) => {
        socket.leave(`draft:${draftId}`);
        
        // Notify others that user left
        socket.to(`draft:${draftId}`).emit('draft:userLeft', {
          userId: socket.userId,
          teamId: socket.teamId
        });
      });

      socket.on('draft:makePick', async ({ draftId, playerId }: { draftId: string; playerId: string }) => {
        try {
          if (!socket.userId || !socket.teamId) return;

          // Make the pick through the state manager
          const result = await draftStateManager.makePick(draftId, socket.teamId, playerId);
          
          if (result.success) {
            // Broadcast updated state to all in draft room
            const state = draftStateManager.getState(draftId);
            io?.to(`draft:${draftId}`).emit('draft:state', state);
            
            // Send pick announcement
            io?.to(`draft:${draftId}`).emit('draft:pickMade', {
              pick: result.pick,
              nextTeam: state?.currentTeamId || null
            });
          } else {
            socket.emit('draft:error', result.error || 'Failed to make pick');
          }
        } catch (error) {
          console.error('Error making pick:', error);
          socket.emit('draft:error', 'Failed to process pick');
        }
      });

      socket.on('draft:chat', async ({ draftId, message }: { draftId: string; message: string }) => {
        if (!socket.userId || !socket.teamId) return;

        try {
          const team = await prisma.team.findUnique({
            where: { id: socket.teamId },
            include: { owner: true }
          });

          if (!team) return;

          const chatMessage = {
            id: `msg-${Date.now()}`,
            userId: socket.userId,
            teamId: socket.teamId,
            teamName: team.name,
            userName: team.owner.name || team.owner.email,
            message: message.slice(0, 500), // Limit message length
            timestamp: new Date()
          };

          // Broadcast to all in draft room
          io?.to(`draft:${draftId}`).emit('draft:chatMessage', chatMessage);
        } catch (error) {
          console.error('Error sending chat message:', error);
        }
      });

      socket.on('draft:requestAutoPick', async ({ draftId }: { draftId: string }) => {
        try {
          if (!socket.userId || !socket.teamId) return;

          // Verify it's user's turn
          const state = draftStateManager.getState(draftId);
          if (state?.currentTeamId !== socket.teamId) {
            socket.emit('draft:error', 'Not your turn to pick');
            return;
          }

          // Trigger auto-pick
          await draftStateManager.triggerAutoPick(draftId);
        } catch (error) {
          console.error('Error requesting auto-pick:', error);
          socket.emit('draft:error', 'Failed to process auto-pick');
        }
      });

      socket.on('draft:pause', async ({ draftId }: { draftId: string }) => {
        try {
          if (!socket.userId) return;

          // Verify user is commissioner
          const draft = await prisma.draft.findFirst({
            where: {
              id: draftId,
              league: {
                commissionerId: socket.userId
              }
            }
          });

          if (!draft) {
            socket.emit('draft:error', 'Only commissioner can pause draft');
            return;
          }

          await draftStateManager.pauseDraft(draftId);
          io?.to(`draft:${draftId}`).emit('draft:paused');
        } catch (error) {
          console.error('Error pausing draft:', error);
          socket.emit('draft:error', 'Failed to pause draft');
        }
      });

      socket.on('draft:resume', async ({ draftId }: { draftId: string }) => {
        try {
          if (!socket.userId) return;

          // Verify user is commissioner
          const draft = await prisma.draft.findFirst({
            where: {
              id: draftId,
              league: {
                commissionerId: socket.userId
              }
            }
          });

          if (!draft) {
            socket.emit('draft:error', 'Only commissioner can resume draft');
            return;
          }

          await draftStateManager.resumeDraft(draftId);
          io?.to(`draft:${draftId}`).emit('draft:resumed');
        } catch (error) {
          console.error('Error resuming draft:', error);
          socket.emit('draft:error', 'Failed to resume draft');
        }
      });

      // Trade room handlers
      socket.on('trade:propose', async (tradeData: any) => {
        try {
          if (!socket.userId) return;

          // Process trade proposal
          const trade = await prisma.transaction.create({
            data: {
              type: 'trade',
              status: 'pending',
              teamId: tradeData.fromTeamId,
              playerIds: tradeData.givingPlayerIds,
              relatedData: {
                toTeamId: tradeData.toTeamId,
                receivingPlayerIds: tradeData.receivingPlayerIds,
                message: tradeData.message
              },
              leagueId: tradeData.leagueId,
              week: tradeData.week
            }
          });

          // Notify receiving team
          const receivingTeam = await prisma.team.findUnique({
            where: { id: tradeData.toTeamId },
            include: { owner: true }
          });

          if (receivingTeam?.owner) {
            io?.to(`user:${receivingTeam.owner.id}`).emit('trade:received', {
              tradeId: trade.id,
              from: tradeData.fromTeamName,
              message: tradeData.message
            });
          }

          socket.emit('trade:proposed', { tradeId: trade.id });
        } catch (error) {
          console.error('Error proposing trade:', error);
          socket.emit('trade:error', 'Failed to propose trade');
        }
      });

      // Live scoring updates
      socket.on('scoring:subscribe', async ({ leagueId, week }: { leagueId: string; week: number }) => {
        socket.join(`scoring:${leagueId}:${week}`);
      });

      socket.on('scoring:unsubscribe', async ({ leagueId, week }: { leagueId: string; week: number }) => {
        socket.leave(`scoring:${leagueId}:${week}`);
      });

      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        
        // Handle cleanup for draft rooms
        if (socket.teamId) {
          // Notify draft rooms that user went offline
          socket.rooms.forEach(room => {
            if (room.startsWith('draft:')) {
              socket.to(room).emit('draft:userOffline', {
                userId: socket.userId,
                teamId: socket.teamId
              });
            }
          });
        }
      });
    });
  }

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

// Utility functions for sending updates from other parts of the app
export function broadcastToLeague(leagueId: string, event: string, data: any) {
  io?.to(`league:${leagueId}`).emit(event, data);
}

export function broadcastToUser(userId: string, event: string, data: any) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function broadcastToDraft(draftId: string, event: string, data: any) {
  io?.to(`draft:${draftId}`).emit(event, data);
}

export function broadcastScoringUpdate(leagueId: string, week: number, data: any) {
  io?.to(`scoring:${leagueId}:${week}`).emit('scoring:update', data);
}

// Helper to initialize socket in API routes
export function initSocket(res: NextApiResponse) {
  if (!res.socket) return;
  
  const httpServer = res.socket as any;
  if (!httpServer.server) return;
  
  if (!io) {
    console.log('Initializing Socket.IO server...');
    initSocketServer(httpServer.server);
  }
}