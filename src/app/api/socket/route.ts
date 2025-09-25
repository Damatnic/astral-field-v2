import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { sleeperRealTimeScoringService } from '@/services/sleeper/realTimeScoringService';
import { gameStatusService } from '@/services/sleeper/gameStatusService';
import { scoringOrchestrator } from '@/services/scoring/scoringOrchestrator';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// This is a workaround for Next.js API routes not supporting WebSockets directly
// In a production environment, you might want to use a separate WebSocket server

let io: SocketIOServer | null = null;

export async function GET(request: NextRequest) {
  if (!io) {
    return NextResponse.json({
      message: 'WebSocket server not initialized. Use POST to initialize.',
      endpoints: {
        connect: '/api/socket',
        events: {
          subscribe: 'subscribe_league',
          unsubscribe: 'unsubscribe_league',
          score_update: 'score_update',
          game_status: 'game_status_update',
          error: 'error'
        }
      }
    });
  }

  return NextResponse.json({
    message: 'WebSocket server is running',
    connectedClients: io.engine.clientsCount,
    status: 'active'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, port = 3008 } = body;

    switch (action) {
      case 'initialize':
        if (!io) {
          // This would be handled differently in a real production setup
          return NextResponse.json({
            message: 'WebSocket initialization would be handled by server startup',
            note: 'In production, WebSocket server should be initialized during app startup'
          });
        }
        return NextResponse.json({ message: 'WebSocket server already initialized' });

      case 'broadcast_scores':
        if (io) {
          const { leagueId } = body;
          await broadcastScoreUpdate(leagueId);
          return NextResponse.json({ message: 'Score update broadcasted' });
        }
        return NextResponse.json({ error: 'WebSocket server not initialized' }, { status: 500 });

      case 'broadcast_game_status':
        if (io) {
          await broadcastGameStatusUpdate();
          return NextResponse.json({ message: 'Game status update broadcasted' });
        }
        return NextResponse.json({ error: 'WebSocket server not initialized' }, { status: 500 });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('WebSocket API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// WebSocket server setup (this would typically be in a separate file or server)
function initializeWebSocketServer(server: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    path: '/api/socket',
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com'] 
        : ['http://localhost:3007', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle league subscription
    socket.on('subscribe_league', async (leagueId: string) => {
      try {
        // Verify user has access to this league
        const isValidSubscription = await validateLeagueAccess(socket, leagueId);
        
        if (isValidSubscription) {
          socket.join(`league:${leagueId}`);
          socket.emit('subscribed', { leagueId, message: 'Successfully subscribed to league updates' });
          
          // Send initial data
          const liveScores = await sleeperRealTimeScoringService.getLiveScores(leagueId);
          if (liveScores) {
            socket.emit('score_update', {
              leagueId,
              data: liveScores,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          socket.emit('error', { message: 'Access denied to league' });
        }
      } catch (error) {
        console.error('Subscription error:', error);
        socket.emit('error', { message: 'Failed to subscribe to league' });
      }
    });

    // Handle league unsubscription
    socket.on('unsubscribe_league', (leagueId: string) => {
      socket.leave(`league:${leagueId}`);
      socket.emit('unsubscribed', { leagueId, message: 'Unsubscribed from league updates' });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to live scoring updates',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Set up periodic broadcasts
  setupPeriodicBroadcasts();

  return io;
}

// Validate league access (simplified - should integrate with auth)
async function validateLeagueAccess(socket: any, leagueId: string): Promise<boolean> {
  try {
    // In a real implementation, you'd validate the user's session/token
    // and check if they have access to this league
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, isActive: true }
    });

    return !!(league && league.isActive);
  } catch (error) {
    console.error('League access validation error:', error);
    return false;
  }
}

// Broadcast score updates to subscribed clients
async function broadcastScoreUpdate(leagueId?: string) {
  if (!io) return;

  try {
    if (leagueId) {
      // Broadcast to specific league
      const liveScores = await sleeperRealTimeScoringService.getLiveScores(leagueId);
      if (liveScores) {
        io.to(`league:${leagueId}`).emit('score_update', {
          leagueId,
          data: liveScores,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Broadcast to all active leagues
      const activeLeagues = await prisma.league.findMany({
        where: { isActive: true },
        select: { id: true }
      });

      for (const league of activeLeagues) {
        await broadcastScoreUpdate(league.id);
      }
    }
  } catch (error) {
    console.error('Broadcast score update error:', error);
  }
}

// Broadcast game status updates
async function broadcastGameStatusUpdate() {
  if (!io) return;

  try {
    const gameStatus = await gameStatusService.getCurrentGameStatus();
    const orchestratorStatus = scoringOrchestrator.getStatus();

    io.emit('game_status_update', {
      gameStatus: {
        isAnyGameActive: gameStatus.isAnyGameActive,
        activeGames: gameStatus.activeGames.length,
        scoringPriority: gameStatus.scoringPriority,
        recommendedUpdateInterval: gameStatus.recommendedUpdateInterval
      },
      orchestratorStatus: {
        isActive: orchestratorStatus.isActive,
        currentInterval: orchestratorStatus.currentInterval,
        lastUpdate: orchestratorStatus.lastUpdate,
        nextUpdate: orchestratorStatus.nextUpdate
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Broadcast game status error:', error);
  }
}

// Set up periodic broadcasts based on game status
function setupPeriodicBroadcasts() {
  if (!io) return;

  // Update every 30 seconds during active periods, 5 minutes otherwise
  setInterval(async () => {
    const gameStatus = await gameStatusService.getCurrentGameStatus();
    
    if (gameStatus.isAnyGameActive) {
      // Broadcast score updates for all active leagues during games
      await broadcastScoreUpdate();
      await broadcastGameStatusUpdate();
    }
  }, 30000); // 30 seconds

  // Always broadcast game status every 5 minutes
  setInterval(async () => {
    await broadcastGameStatusUpdate();
  }, 300000); // 5 minutes
}

// Get the socket server instance
function getSocketServer(): SocketIOServer | null {
  return io;
}

// Cleanup function  
function cleanupWebSocketServer() {
  if (io) {
    io.close();
    io = null;
  }
}