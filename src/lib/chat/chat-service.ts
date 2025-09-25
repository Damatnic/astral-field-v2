import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/cache/redis-client';
import { notificationService } from '@/lib/notifications/notification-service';
import { Server as SocketIOServer } from 'socket.io';

export interface ChatMessage {
  id: string;
  leagueId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  type: 'text' | 'trade' | 'score_update' | 'trash_talk' | 'announcement' | 'poll';
  metadata?: any;
  replyToId?: string;
  reactions: MessageReaction[];
  edited: boolean;
  editedAt?: Date;
  createdAt: Date;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface ChatRoom {
  id: string;
  leagueId: string;
  name: string;
  type: 'league' | 'matchup' | 'trade_discussion' | 'commissioner';
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: Map<string, number>;
  isPinned: boolean;
  settings: ChatRoomSettings;
}

export interface ChatRoomSettings {
  slowMode: boolean;
  slowModeInterval: number; // seconds
  allowReactions: boolean;
  allowPolls: boolean;
  allowGifs: boolean;
  mutedUsers: string[];
}

export interface TrashTalkTemplate {
  id: string;
  category: 'win' | 'loss' | 'trade' | 'injury' | 'general';
  message: string;
  intensity: 'mild' | 'medium' | 'spicy';
}

export class ChatService {
  private io: SocketIOServer | null = null;
  private readonly MESSAGE_CACHE_TTL = 3600; // 1 hour
  private readonly MAX_MESSAGE_LENGTH = 500;
  private readonly RATE_LIMIT_MESSAGES = 30; // per minute
  
  private trashTalkTemplates: TrashTalkTemplate[] = [
    // Win templates
    { id: 'tt1', category: 'win', message: "Another week, another W! 💪", intensity: 'mild' },
    { id: 'tt2', category: 'win', message: "Your team name should be 'Second Place' 🥈", intensity: 'medium' },
    { id: 'tt3', category: 'win', message: "I'm starting to feel bad... nah, just kidding! 🔥", intensity: 'spicy' },
    
    // Loss templates
    { id: 'tt4', category: 'loss', message: "Lucky week for you! See you in the playoffs 😤", intensity: 'mild' },
    { id: 'tt5', category: 'loss', message: "My bench outscored my starters... still almost beat you", intensity: 'medium' },
    { id: 'tt6', category: 'loss', message: "Enjoy it while it lasts, revenge tour starts now!", intensity: 'spicy' },
    
    // Trade templates
    { id: 'tt7', category: 'trade', message: "Thanks for the trade! Your generosity knows no bounds 😊", intensity: 'mild' },
    { id: 'tt8', category: 'trade', message: "Highway robbery! Call the police! 🚔", intensity: 'medium' },
    { id: 'tt9', category: 'trade', message: "Can't believe you accepted that... league winner incoming! 👑", intensity: 'spicy' },
    
    // General templates
    { id: 'tt10', category: 'general', message: "How's last place treating you? 📉", intensity: 'medium' },
    { id: 'tt11', category: 'general', message: "Your team is like a broken clock - right twice a season", intensity: 'spicy' },
    { id: 'tt12', category: 'general', message: "I've seen better lineups in a 6-team league", intensity: 'spicy' }
  ];

  setSocketServer(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join league chat rooms
      socket.on('join_league_chat', async (data: { leagueId: string; userId: string }) => {
        socket.join(`league:${data.leagueId}`);
        socket.join(`user:${data.userId}`);
        
        // Send recent messages
        const recentMessages = await this.getRecentMessages(data.leagueId);
        socket.emit('recent_messages', recentMessages);
      });

      // Handle new messages
      socket.on('send_message', async (data: any) => {
        const message = await this.sendMessage(data);
        if (message) {
          this.io?.to(`league:${data.leagueId}`).emit('new_message', message);
        }
      });

      // Handle reactions
      socket.on('add_reaction', async (data: { messageId: string; emoji: string; userId: string }) => {
        await this.addReaction(data.messageId, data.userId, data.emoji);
      });

      // Handle typing indicators
      socket.on('typing', (data: { leagueId: string; userId: string; userName: string }) => {
        socket.to(`league:${data.leagueId}`).emit('user_typing', {
          userId: data.userId,
          userName: data.userName
        });
      });

      socket.on('stop_typing', (data: { leagueId: string; userId: string }) => {
        socket.to(`league:${data.leagueId}`).emit('user_stop_typing', {
          userId: data.userId
        });
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  async sendMessage(data: {
    leagueId: string;
    userId: string;
    message: string;
    type?: ChatMessage['type'];
    metadata?: any;
    replyToId?: string;
  }): Promise<ChatMessage | null> {
    try {
      // Rate limiting
      const rateLimitKey = `chat:rate:${data.userId}`;
      const messageCount = await redis.incr(rateLimitKey);
      
      if (messageCount === 1) {
        await redis.expire(rateLimitKey, 60);
      }
      
      if (messageCount > this.RATE_LIMIT_MESSAGES) {
        throw new Error('Rate limit exceeded');
      }

      // Validate message
      if (!data.message || data.message.length > this.MAX_MESSAGE_LENGTH) {
        throw new Error('Invalid message');
      }

      // Check if user is muted
      const isMuted = await this.isUserMuted(data.leagueId, data.userId);
      if (isMuted) {
        throw new Error('User is muted');
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { name: true, avatar: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create message
      const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leagueId: data.leagueId,
        userId: data.userId,
        userName: user.name || 'Unknown',
        userAvatar: user.avatar,
        message: data.message,
        type: data.type || 'text',
        metadata: data.metadata,
        replyToId: data.replyToId,
        reactions: [],
        edited: false,
        createdAt: new Date()
      };

      // Store in database
      await prisma.chatMessage.create({
        data: {
          id: message.id,
          leagueId: message.leagueId,
          userId: message.userId,
          content: message.message,
          type: message.type.toUpperCase() as any,
          metadata: message.metadata ? JSON.stringify(message.metadata) : null,
          replyToId: message.replyToId
        }
      });

      // Cache recent messages
      const cacheKey = `chat:messages:${data.leagueId}`;
      await redis.lpush(cacheKey, JSON.stringify(message));
      await redis.ltrim(cacheKey, 0, 99); // Keep last 100 messages
      await redis.expire(cacheKey, this.MESSAGE_CACHE_TTL);

      // Handle special message types
      await this.handleSpecialMessageTypes(message);

      return message;

    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  private async handleSpecialMessageTypes(message: ChatMessage) {
    switch (message.type) {
      case 'trade':
        // Notify involved teams
        if (message.metadata?.involvedTeams) {
          await this.notifyTradeDiscussion(message);
        }
        break;

      case 'announcement':
        // Send push notifications for important announcements
        if (message.metadata?.important) {
          await this.notifyAnnouncement(message);
        }
        break;

      case 'trash_talk':
        // Track trash talk stats
        await this.trackTrashTalk(message);
        break;

      case 'poll':
        // Initialize poll data
        await this.initializePoll(message);
        break;
    }
  }

  async getRecentMessages(leagueId: string, limit: number = 50): Promise<ChatMessage[]> {
    // Try cache first
    const cacheKey = `chat:messages:${leagueId}`;
    const cached = await redis.lrange(cacheKey, 0, limit - 1);
    
    if (cached && cached.length > 0) {
      return cached.map(msg => JSON.parse(msg));
    }

    // Fetch from database
    const messages = await prisma.chatMessage.findMany({
      where: { leagueId },
      include: {
        user: {
          select: { name: true, avatar: true }
        },
        reactions: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    const formattedMessages: ChatMessage[] = messages.map(msg => ({
      id: msg.id,
      leagueId: msg.leagueId,
      userId: msg.userId,
      userName: msg.user.name || 'Unknown',
      userAvatar: msg.user.avatar,
      message: msg.content,
      type: msg.type as ChatMessage['type'],
      metadata: msg.metadata ? JSON.parse(msg.metadata as string) : undefined,
      replyToId: msg.replyToId || undefined,
      reactions: msg.reactions.map(r => ({
        userId: r.userId,
        emoji: r.emoji,
        createdAt: r.createdAt
      })),
      edited: msg.edited,
      editedAt: msg.editedAt || undefined,
      createdAt: msg.createdAt
    }));

    // Cache the messages
    if (formattedMessages.length > 0) {
      const pipeline = redis.pipeline();
      formattedMessages.forEach(msg => {
        pipeline.lpush(cacheKey, JSON.stringify(msg));
      });
      pipeline.ltrim(cacheKey, 0, 99);
      pipeline.expire(cacheKey, this.MESSAGE_CACHE_TTL);
      await pipeline.exec();
    }

    return formattedMessages.reverse(); // Return in chronological order
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    try {
      // Check if reaction already exists
      const existing = await prisma.messageReaction.findFirst({
        where: {
          messageId,
          userId,
          emoji
        }
      });

      if (existing) {
        // Remove reaction if it exists
        await prisma.messageReaction.delete({
          where: { id: existing.id }
        });
      } else {
        // Add new reaction
        await prisma.messageReaction.create({
          data: {
            messageId,
            userId,
            emoji
          }
        });
      }

      // Broadcast reaction update
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: { reactions: true }
      });

      if (message && this.io) {
        this.io.to(`league:${message.leagueId}`).emit('reaction_update', {
          messageId,
          reactions: message.reactions.map(r => ({
            userId: r.userId,
            emoji: r.emoji,
            createdAt: r.createdAt
          }))
        });
      }

    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }

  async editMessage(messageId: string, userId: string, newContent: string): Promise<boolean> {
    try {
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId }
      });

      if (!message || message.userId !== userId) {
        return false;
      }

      // Update message
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          content: newContent,
          edited: true,
          editedAt: new Date()
        }
      });

      // Broadcast update
      if (this.io) {
        this.io.to(`league:${message.leagueId}`).emit('message_edited', {
          messageId,
          newContent,
          editedAt: new Date()
        });
      }

      return true;

    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }

  async deleteMessage(messageId: string, userId: string, isCommissioner: boolean = false): Promise<boolean> {
    try {
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId }
      });

      if (!message) return false;

      // Check permissions
      if (message.userId !== userId && !isCommissioner) {
        return false;
      }

      // Soft delete (mark as deleted)
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          content: '[Message deleted]',
          deleted: true,
          deletedAt: new Date()
        }
      });

      // Broadcast deletion
      if (this.io) {
        this.io.to(`league:${message.leagueId}`).emit('message_deleted', {
          messageId
        });
      }

      return true;

    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  async getTrashTalkTemplates(category?: string, intensity?: string): Promise<TrashTalkTemplate[]> {
    let templates = this.trashTalkTemplates;

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    if (intensity) {
      templates = templates.filter(t => t.intensity === intensity);
    }

    return templates;
  }

  async generateSmartTrashTalk(
    userId: string,
    targetUserId: string,
    leagueId: string,
    context: 'win' | 'loss' | 'trade'
  ): Promise<string> {
    try {
      // Get recent performance data
      const [userTeam, targetTeam] = await Promise.all([
        prisma.team.findFirst({
          where: { ownerId: userId, leagueId }
        }),
        prisma.team.findFirst({
          where: { ownerId: targetUserId, leagueId }
        })
      ]);

      if (!userTeam || !targetTeam) {
        return this.getRandomTrashTalk(context);
      }

      // Generate personalized trash talk
      const winDiff = userTeam.wins - targetTeam.wins;

      if (context === 'win') {
        if (winDiff > 3) {
          return `${targetTeam.name} should just forfeit the rest of the season at this point 😂`;
        } else if (winDiff < -3) {
          return `Even a blind squirrel finds a nut sometimes! First win feels good huh?`;
        } else {
          return `Another one for the highlight reel! ${targetTeam.name} in shambles 💀`;
        }
      } else if (context === 'loss') {
        if (targetTeam.wins === 0) {
          return `Lost to a winless team... time to retire from fantasy football`;
        } else {
          return `Ref must've been paid off! Demanding a recount! 🧐`;
        }
      } else {
        return `That trade just won me the championship. Thanks for the donation! 🏆`;
      }

    } catch (error) {
      console.error('Error generating smart trash talk:', error);
      return this.getRandomTrashTalk(context);
    }
  }

  private getRandomTrashTalk(category: string): string {
    const templates = this.trashTalkTemplates.filter(t => t.category === category);
    if (templates.length === 0) return "Better luck next time!";
    
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex].message;
  }

  private async isUserMuted(leagueId: string, userId: string): Promise<boolean> {
    const mutedKey = `chat:muted:${leagueId}:${userId}`;
    const isMuted = await redis.get(mutedKey);
    return isMuted === '1';
  }

  async muteUser(leagueId: string, userId: string, duration: number = 3600): Promise<void> {
    const mutedKey = `chat:muted:${leagueId}:${userId}`;
    await redis.setex(mutedKey, duration, '1');

    if (this.io) {
      this.io.to(`user:${userId}`).emit('user_muted', {
        leagueId,
        duration
      });
    }
  }

  private async notifyTradeDiscussion(message: ChatMessage): Promise<void> {
    if (!message.metadata?.involvedTeams) return;

    const targets = message.metadata.involvedTeams.map((teamId: string) => ({
      teamId,
      method: 'push' as const
    }));

    await notificationService.sendNotification(
      targets,
      {
        title: 'Trade Discussion',
        body: `New message in trade discussion: "${message.message.substring(0, 50)}..."`,
        data: {
          type: 'trade_chat',
          leagueId: message.leagueId,
          messageId: message.id
        }
      },
      'trade_discussion'
    );
  }

  private async notifyAnnouncement(message: ChatMessage): Promise<void> {
    const league = await prisma.league.findUnique({
      where: { id: message.leagueId },
      include: {
        teams: {
          include: { owner: true }
        }
      }
    });

    if (!league) return;

    const targets = league.teams.map(team => ({
      userId: team.ownerId,
      method: 'push' as const
    }));

    await notificationService.sendNotification(
      targets,
      {
        title: 'League Announcement',
        body: message.message,
        data: {
          type: 'announcement',
          leagueId: message.leagueId,
          messageId: message.id
        }
      },
      'announcement',
      'high'
    );
  }

  private async trackTrashTalk(message: ChatMessage): Promise<void> {
    const statsKey = `stats:trash_talk:${message.userId}`;
    await redis.incr(statsKey);
  }

  private async initializePoll(message: ChatMessage): Promise<void> {
    if (!message.metadata?.options) return;

    const pollKey = `poll:${message.id}`;
    const pollData = {
      question: message.message,
      options: message.metadata.options,
      votes: {},
      createdAt: new Date(),
      expiresAt: message.metadata.expiresAt || null
    };

    await redis.setex(pollKey, 7 * 24 * 60 * 60, JSON.stringify(pollData));
  }

  async votePoll(messageId: string, userId: string, optionIndex: number): Promise<void> {
    const pollKey = `poll:${messageId}`;
    const pollData = await redis.get(pollKey);
    
    if (!pollData) return;

    const poll = JSON.parse(pollData);
    poll.votes[userId] = optionIndex;

    await redis.setex(pollKey, 7 * 24 * 60 * 60, JSON.stringify(poll));

    // Broadcast poll update
    if (this.io) {
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId }
      });

      if (message) {
        this.io.to(`league:${message.leagueId}`).emit('poll_update', {
          messageId,
          votes: poll.votes
        });
      }
    }
  }
}

export const chatService = new ChatService();