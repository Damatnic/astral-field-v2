/**
 * Phoenix WebSocket Manager
 * Real-time communication system for Astral Field sports application
 *
 * Features:
 * - Sub-second real-time updates for live sports events
 * - Room-based communication (leagues, drafts, matchups)
 * - Redis pub/sub for horizontal scaling
 * - Intelligent message queuing and prioritization
 * - Connection health monitoring and auto-reconnection
 * - Rate limiting and abuse prevention
 * - Performance metrics and monitoring
 */
import { Server as SocketServer } from 'socket.io';
interface WebSocketConfig {
    redis?: {
        url?: string;
        keyPrefix?: string;
    };
    rateLimiting?: {
        enabled?: boolean;
        maxEventsPerSecond?: number;
        maxEventsPerMinute?: number;
    };
    monitoring?: {
        enabled?: boolean;
        logInterval?: number;
    };
    rooms?: {
        maxClientsPerRoom?: number;
        autoCleanup?: boolean;
    };
}
interface ConnectionMetrics {
    totalConnections: number;
    activeConnections: number;
    totalMessages: number;
    messagesPerSecond: number;
    roomCounts: Map<string, number>;
    lastUpdate: Date;
}
declare class WebSocketManager {
    private static instance;
    private io;
    private redis;
    private subscriberRedis;
    private logger;
    private config;
    private metrics;
    private rateLimitMap;
    private messageQueue;
    private isProcessingQueue;
    private connectedUsers;
    private socketToUser;
    private roomMemberships;
    private constructor();
    static getInstance(io?: SocketServer, config?: WebSocketConfig): WebSocketManager;
    private initializeMetrics;
    private initializeRedis;
    private setupEventHandlers;
    private handleConnection;
    private handleAuthentication;
    private validateAuthToken;
    private joinRoom;
    private leaveRoom;
    private handleDisconnection;
    private handleChatMessage;
    private handleDraftPick;
    private handleTradeProposal;
    private handleTradeResponse;
    private handleLineupUpdate;
    private handleRedisMessage;
    private broadcastScoreUpdate;
    private broadcastDraftPick;
    private broadcastTradeProposal;
    private broadcastTradeResult;
    private broadcastPlayerNews;
    private broadcastInjuryUpdate;
    private queueMessage;
    private startMessageProcessor;
    private processMessageQueue;
    private checkRateLimit;
    private setupMonitoring;
    private updateMetrics;
    private logMetrics;
    private cleanupStaleData;
    getMetrics(): ConnectionMetrics;
    getRoomInfo(room: string): {
        name: string;
        size: number;
        sockets: string[];
    };
    getAllRooms(): {
        name: string;
        size: number;
    }[];
    broadcastToUser(userId: string, event: string, data: any): Promise<void>;
    broadcastToLeague(leagueId: string, event: string, data: any): Promise<void>;
    disconnect(): Promise<void>;
}
export declare function initializeWebSocketManager(io: SocketServer, config?: WebSocketConfig): WebSocketManager;
export declare function getWebSocketManager(): WebSocketManager | null;
export { WebSocketManager };
export type { WebSocketConfig, ConnectionMetrics };
//# sourceMappingURL=websocket-manager.d.ts.map