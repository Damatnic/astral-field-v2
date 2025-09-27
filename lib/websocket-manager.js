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
import { Redis } from 'ioredis';
import { cacheManager } from './cache-manager';
import { queryOptimizer } from './query-optimizer';
import pino from 'pino';
class WebSocketManager {
    static instance;
    io;
    redis;
    subscriberRedis;
    logger;
    config;
    metrics;
    rateLimitMap = new Map();
    messageQueue = [];
    isProcessingQueue = false;
    connectedUsers = new Map(); // userId -> Set of socketIds
    socketToUser = new Map(); // socketId -> userId
    roomMemberships = new Map(); // room -> Set of socketIds
    constructor(io, config = {}) {
        this.io = io;
        this.logger = pino({
            name: 'WebSocketManager',
            level: process.env.LOG_LEVEL || 'info'
        });
        this.config = {
            redis: {
                url: config.redis?.url || process.env.REDIS_URL || 'redis://localhost:6379',
                keyPrefix: config.redis?.keyPrefix || 'ws:'
            },
            rateLimiting: {
                enabled: config.rateLimiting?.enabled ?? true,
                maxEventsPerSecond: config.rateLimiting?.maxEventsPerSecond || 10,
                maxEventsPerMinute: config.rateLimiting?.maxEventsPerMinute || 100
            },
            monitoring: {
                enabled: config.monitoring?.enabled ?? true,
                logInterval: config.monitoring?.logInterval || 60000 // 1 minute
            },
            rooms: {
                maxClientsPerRoom: config.rooms?.maxClientsPerRoom || 1000,
                autoCleanup: config.rooms?.autoCleanup ?? true
            }
        };
        this.metrics = this.initializeMetrics();
        this.initializeRedis();
        this.setupEventHandlers();
        this.startMessageProcessor();
        this.setupMonitoring();
    }
    static getInstance(io, config) {
        if (!WebSocketManager.instance) {
            if (!io) {
                throw new Error('SocketServer instance required for WebSocketManager initialization');
            }
            WebSocketManager.instance = new WebSocketManager(io, config);
        }
        return WebSocketManager.instance;
    }
    initializeMetrics() {
        return {
            totalConnections: 0,
            activeConnections: 0,
            totalMessages: 0,
            messagesPerSecond: 0,
            roomCounts: new Map(),
            lastUpdate: new Date()
        };
    }
    initializeRedis() {
        // Publisher Redis connection
        this.redis = new Redis(this.config.redis.url, {
            retryDelayOnFailure: 100,
            maxRetriesPerRequest: 3,
            keyPrefix: this.config.redis.keyPrefix,
            lazyConnect: true
        });
        // Subscriber Redis connection (separate for pub/sub)
        this.subscriberRedis = new Redis(this.config.redis.url, {
            retryDelayOnFailure: 100,
            maxRetriesPerRequest: 3,
            keyPrefix: this.config.redis.keyPrefix,
            lazyConnect: true
        });
        // Redis event handlers
        this.redis.on('error', (error) => {
            this.logger.error('Redis publisher error:', error);
        });
        this.subscriberRedis.on('error', (error) => {
            this.logger.error('Redis subscriber error:', error);
        });
        // Subscribe to all sports-related events
        this.subscriberRedis.subscribe('score_update', 'draft_pick', 'trade_proposed', 'trade_accepted', 'trade_rejected', 'waiver_processed', 'lineup_updated', 'chat_message', 'league_update', 'player_news', 'injury_update');
        // Handle incoming Redis messages
        this.subscriberRedis.on('message', (channel, message) => {
            try {
                const data = JSON.parse(message);
                this.handleRedisMessage(channel, data);
            }
            catch (error) {
                this.logger.error('Failed to parse Redis message:', { channel, error });
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }
    handleConnection(socket) {
        this.metrics.totalConnections++;
        this.metrics.activeConnections++;
        this.logger.info('Client connected', {
            socketId: socket.id,
            userAgent: socket.handshake.headers['user-agent'],
            ip: socket.handshake.address
        });
        // Authentication and user association
        socket.on('authenticate', async (data) => {
            await this.handleAuthentication(socket, data);
        });
        // Room management
        socket.on('join-league', (leagueId) => {
            this.joinRoom(socket, `league:${leagueId}`);
        });
        socket.on('leave-league', (leagueId) => {
            this.leaveRoom(socket, `league:${leagueId}`);
        });
        socket.on('join-draft', (draftId) => {
            this.joinRoom(socket, `draft:${draftId}`);
        });
        socket.on('leave-draft', (draftId) => {
            this.leaveRoom(socket, `draft:${draftId}`);
        });
        socket.on('join-matchup', (matchupId) => {
            this.joinRoom(socket, `matchup:${matchupId}`);
        });
        socket.on('leave-matchup', (matchupId) => {
            this.leaveRoom(socket, `matchup:${matchupId}`);
        });
        // Chat functionality
        socket.on('send-message', async (data) => {
            await this.handleChatMessage(socket, data);
        });
        // Draft functionality
        socket.on('make-draft-pick', async (data) => {
            await this.handleDraftPick(socket, data);
        });
        // Trade functionality
        socket.on('propose-trade', async (data) => {
            await this.handleTradeProposal(socket, data);
        });
        socket.on('respond-trade', async (data) => {
            await this.handleTradeResponse(socket, data);
        });
        // Lineup updates
        socket.on('update-lineup', async (data) => {
            await this.handleLineupUpdate(socket, data);
        });
        // Heartbeat for connection health
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });
        // Disconnection handling
        socket.on('disconnect', (reason) => {
            this.handleDisconnection(socket, reason);
        });
        // Error handling
        socket.on('error', (error) => {
            this.logger.error('Socket error:', { socketId: socket.id, error });
        });
    }
    async handleAuthentication(socket, data) {
        try {
            // Validate token (implement your auth logic here)
            const isValid = await this.validateAuthToken(data.userId, data.token);
            if (isValid) {
                // Associate socket with user
                this.socketToUser.set(socket.id, data.userId);
                if (!this.connectedUsers.has(data.userId)) {
                    this.connectedUsers.set(data.userId, new Set());
                }
                this.connectedUsers.get(data.userId).add(socket.id);
                socket.emit('authenticated', { success: true, userId: data.userId });
                // Join user to their personal room for direct messaging
                socket.join(`user:${data.userId}`);
                this.logger.info('User authenticated', { userId: data.userId, socketId: socket.id });
            }
            else {
                socket.emit('authentication_failed', { reason: 'Invalid token' });
                socket.disconnect();
            }
        }
        catch (error) {
            this.logger.error('Authentication error:', error);
            socket.emit('authentication_failed', { reason: 'Authentication error' });
            socket.disconnect();
        }
    }
    async validateAuthToken(userId, token) {
        // Implement your token validation logic here
        // This could check against your session store, JWT validation, etc.
        try {
            const sessionData = await cacheManager.getUserSession(token);
            return sessionData && sessionData.userId === userId;
        }
        catch {
            return false;
        }
    }
    joinRoom(socket, room) {
        // Check room capacity
        const currentSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
        if (currentSize >= this.config.rooms.maxClientsPerRoom) {
            socket.emit('room_full', { room });
            return;
        }
        socket.join(room);
        // Track room membership
        if (!this.roomMemberships.has(room)) {
            this.roomMemberships.set(room, new Set());
        }
        this.roomMemberships.get(room).add(socket.id);
        // Update metrics
        this.metrics.roomCounts.set(room, currentSize + 1);
        socket.emit('joined_room', { room });
        this.logger.debug('User joined room', {
            socketId: socket.id,
            room,
            roomSize: currentSize + 1
        });
    }
    leaveRoom(socket, room) {
        socket.leave(room);
        // Update room membership tracking
        this.roomMemberships.get(room)?.delete(socket.id);
        if (this.roomMemberships.get(room)?.size === 0) {
            this.roomMemberships.delete(room);
        }
        // Update metrics
        const newSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
        if (newSize === 0) {
            this.metrics.roomCounts.delete(room);
        }
        else {
            this.metrics.roomCounts.set(room, newSize);
        }
        socket.emit('left_room', { room });
        this.logger.debug('User left room', { socketId: socket.id, room, roomSize: newSize });
    }
    handleDisconnection(socket, reason) {
        this.metrics.activeConnections--;
        const userId = this.socketToUser.get(socket.id);
        if (userId) {
            this.connectedUsers.get(userId)?.delete(socket.id);
            if (this.connectedUsers.get(userId)?.size === 0) {
                this.connectedUsers.delete(userId);
            }
            this.socketToUser.delete(socket.id);
        }
        // Clean up room memberships
        for (const [room, sockets] of this.roomMemberships.entries()) {
            if (sockets.has(socket.id)) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    this.roomMemberships.delete(room);
                    this.metrics.roomCounts.delete(room);
                }
                else {
                    this.metrics.roomCounts.set(room, sockets.size);
                }
            }
        }
        this.logger.info('Client disconnected', {
            socketId: socket.id,
            userId,
            reason,
            activeConnections: this.metrics.activeConnections
        });
    }
    // ========================================
    // MESSAGE HANDLING METHODS
    // ========================================
    async handleChatMessage(socket, data) {
        if (!this.checkRateLimit(socket.id)) {
            socket.emit('rate_limited', { message: 'Too many messages' });
            return;
        }
        try {
            const userId = this.socketToUser.get(socket.id);
            if (!userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            // Validate and save message to database
            // Implementation depends on your chat system
            // Broadcast to league room
            this.queueMessage(`league:${data.leagueId}`, 'chat_message', {
                id: data.id || `msg-${Date.now()}-${Math.random()}`,
                userId,
                content: data.content,
                type: data.type || 'TEXT',
                timestamp: new Date().toISOString()
            }, 'medium');
        }
        catch (error) {
            this.logger.error('Chat message error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }
    async handleDraftPick(socket, data) {
        if (!this.checkRateLimit(socket.id))
            return;
        try {
            const userId = this.socketToUser.get(socket.id);
            if (!userId)
                return;
            // Make the draft pick using query optimizer
            const result = await queryOptimizer.makeDraftPick(data.draftId, data.teamId, data.playerId, data.timeUsed);
            // Broadcast draft pick immediately to all draft participants
            this.broadcastDraftPick({
                draftId: data.draftId,
                pickNumber: result.pick.pickNumber,
                teamId: data.teamId,
                playerId: data.playerId,
                playerName: result.pick.players?.name,
                teamName: result.pick.teams?.name,
                nextTeamId: result.nextTeamId,
                timeRemaining: 90, // Reset timer
                isComplete: result.isComplete
            });
            // Also publish to Redis for other server instances
            await this.redis.publish('draft_pick', JSON.stringify({
                draftId: data.draftId,
                pickNumber: result.pick.pickNumber,
                teamId: data.teamId,
                playerId: data.playerId,
                playerName: result.pick.players?.name,
                nextTeamId: result.nextTeamId,
                isComplete: result.isComplete
            }));
        }
        catch (error) {
            this.logger.error('Draft pick error:', error);
            socket.emit('draft_error', { message: 'Failed to make draft pick' });
        }
    }
    async handleTradeProposal(socket, data) {
        if (!this.checkRateLimit(socket.id))
            return;
        try {
            // Process trade proposal
            // Implementation depends on your trade system
            // Notify involved parties
            this.queueMessage(`user:${data.targetUserId}`, 'trade_proposed', {
                tradeId: data.tradeId,
                proposingTeam: data.proposingTeam,
                givingPlayers: data.givingPlayers,
                receivingPlayers: data.receivingPlayers,
                message: data.message
            }, 'high');
        }
        catch (error) {
            this.logger.error('Trade proposal error:', error);
        }
    }
    async handleTradeResponse(socket, data) {
        if (!this.checkRateLimit(socket.id))
            return;
        try {
            // Process trade response
            // Implementation depends on your trade system
            // Notify league of trade result
            this.queueMessage(`league:${data.leagueId}`, 'trade_' + data.action, {
                tradeId: data.tradeId,
                action: data.action, // 'accepted' or 'rejected'
                teams: data.teams,
                players: data.players
            }, 'high');
        }
        catch (error) {
            this.logger.error('Trade response error:', error);
        }
    }
    async handleLineupUpdate(socket, data) {
        if (!this.checkRateLimit(socket.id))
            return;
        try {
            const userId = this.socketToUser.get(socket.id);
            if (!userId)
                return;
            // Update lineup in database
            // Implementation depends on your lineup system
            // Notify league of lineup change
            this.queueMessage(`league:${data.leagueId}`, 'lineup_updated', {
                teamId: data.teamId,
                changes: data.changes,
                timestamp: new Date().toISOString()
            }, 'low');
        }
        catch (error) {
            this.logger.error('Lineup update error:', error);
        }
    }
    // ========================================
    // REDIS MESSAGE HANDLING
    // ========================================
    handleRedisMessage(channel, data) {
        switch (channel) {
            case 'score_update':
                this.broadcastScoreUpdate(data);
                break;
            case 'draft_pick':
                this.broadcastDraftPick(data);
                break;
            case 'trade_proposed':
                this.broadcastTradeProposal(data);
                break;
            case 'trade_accepted':
            case 'trade_rejected':
                this.broadcastTradeResult(data);
                break;
            case 'player_news':
                this.broadcastPlayerNews(data);
                break;
            case 'injury_update':
                this.broadcastInjuryUpdate(data);
                break;
            default:
                this.logger.warn('Unknown Redis message channel:', channel);
        }
    }
    // ========================================
    // BROADCAST METHODS
    // ========================================
    broadcastScoreUpdate(data) {
        this.queueMessage(`league:${data.leagueId}`, 'score_update', {
            matchupId: data.matchupId,
            homeTeamId: data.homeTeamId,
            awayTeamId: data.awayTeamId,
            homeScore: data.homeScore,
            awayScore: data.awayScore,
            week: data.week,
            timestamp: new Date().toISOString()
        }, 'high');
    }
    broadcastDraftPick(data) {
        this.queueMessage(`draft:${data.draftId}`, 'draft_pick', {
            pickNumber: data.pickNumber,
            teamId: data.teamId,
            playerId: data.playerId,
            playerName: data.playerName,
            teamName: data.teamName,
            nextTeamId: data.nextTeamId,
            timeRemaining: data.timeRemaining,
            isComplete: data.isComplete,
            timestamp: new Date().toISOString()
        }, 'high');
    }
    broadcastTradeProposal(data) {
        this.queueMessage(`user:${data.targetUserId}`, 'trade_proposed', data, 'high');
    }
    broadcastTradeResult(data) {
        this.queueMessage(`league:${data.leagueId}`, 'trade_result', data, 'high');
    }
    broadcastPlayerNews(data) {
        // Broadcast to all leagues that might have this player
        this.io.emit('player_news', data);
    }
    broadcastInjuryUpdate(data) {
        // Broadcast to all leagues that might have this player
        this.io.emit('injury_update', data);
    }
    // ========================================
    // MESSAGE QUEUE SYSTEM
    // ========================================
    queueMessage(room, event, data, priority) {
        this.messageQueue.push({
            room,
            event,
            data,
            priority,
            timestamp: Date.now()
        });
        // Sort queue by priority (high first)
        this.messageQueue.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    startMessageProcessor() {
        setInterval(() => {
            this.processMessageQueue();
        }, 10); // Process every 10ms for sub-second latency
    }
    processMessageQueue() {
        if (this.isProcessingQueue || this.messageQueue.length === 0)
            return;
        this.isProcessingQueue = true;
        try {
            // Process up to 10 messages per cycle
            const messagesToProcess = this.messageQueue.splice(0, 10);
            for (const message of messagesToProcess) {
                this.io.to(message.room).emit(message.event, message.data);
                this.metrics.totalMessages++;
            }
        }
        catch (error) {
            this.logger.error('Message processing error:', error);
        }
        finally {
            this.isProcessingQueue = false;
        }
    }
    // ========================================
    // RATE LIMITING
    // ========================================
    checkRateLimit(socketId) {
        if (!this.config.rateLimiting.enabled)
            return true;
        const now = Date.now();
        const info = this.rateLimitMap.get(socketId);
        if (!info || now > info.resetTime) {
            this.rateLimitMap.set(socketId, {
                count: 1,
                resetTime: now + 1000 // Reset every second
            });
            return true;
        }
        if (info.count >= this.config.rateLimiting.maxEventsPerSecond) {
            return false;
        }
        info.count++;
        return true;
    }
    // ========================================
    // MONITORING AND METRICS
    // ========================================
    setupMonitoring() {
        if (!this.config.monitoring.enabled)
            return;
        setInterval(() => {
            this.updateMetrics();
            this.logMetrics();
            this.cleanupStaleData();
        }, this.config.monitoring.logInterval);
    }
    updateMetrics() {
        const now = new Date();
        const timeDiff = (now.getTime() - this.metrics.lastUpdate.getTime()) / 1000;
        this.metrics.messagesPerSecond = this.metrics.totalMessages / timeDiff;
        this.metrics.lastUpdate = now;
        // Reset message counter
        this.metrics.totalMessages = 0;
    }
    logMetrics() {
        this.logger.info('WebSocket metrics', {
            activeConnections: this.metrics.activeConnections,
            totalRooms: this.metrics.roomCounts.size,
            messagesPerSecond: this.metrics.messagesPerSecond.toFixed(2),
            queueSize: this.messageQueue.length,
            connectedUsers: this.connectedUsers.size
        });
    }
    cleanupStaleData() {
        const now = Date.now();
        // Clean up rate limit data older than 1 minute
        for (const [socketId, info] of this.rateLimitMap.entries()) {
            if (now > info.resetTime + 60000) {
                this.rateLimitMap.delete(socketId);
            }
        }
        // Clean up old messages from queue (older than 30 seconds)
        this.messageQueue = this.messageQueue.filter(msg => now - msg.timestamp < 30000);
    }
    // ========================================
    // PUBLIC API METHODS
    // ========================================
    getMetrics() {
        return { ...this.metrics };
    }
    getRoomInfo(room) {
        const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
        return {
            name: room,
            size: roomSize,
            sockets: Array.from(this.io.sockets.adapter.rooms.get(room) || [])
        };
    }
    getAllRooms() {
        return Array.from(this.metrics.roomCounts.entries()).map(([room, size]) => ({
            name: room,
            size
        }));
    }
    async broadcastToUser(userId, event, data) {
        this.io.to(`user:${userId}`).emit(event, data);
    }
    async broadcastToLeague(leagueId, event, data) {
        this.queueMessage(`league:${leagueId}`, event, data, 'medium');
    }
    async disconnect() {
        this.logger.info('Shutting down WebSocket manager...');
        try {
            await this.redis.disconnect();
            await this.subscriberRedis.disconnect();
            this.logger.info('WebSocket manager disconnected successfully');
        }
        catch (error) {
            this.logger.error('Error during WebSocket manager shutdown:', error);
            throw error;
        }
    }
}
// Export singleton instance
let wsManager = null;
export function initializeWebSocketManager(io, config) {
    wsManager = WebSocketManager.getInstance(io, config);
    return wsManager;
}
export function getWebSocketManager() {
    return wsManager;
}
// Export for testing and advanced usage
export { WebSocketManager };
//# sourceMappingURL=websocket-manager.js.map