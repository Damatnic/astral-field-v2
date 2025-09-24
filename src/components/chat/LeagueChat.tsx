import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Send, 
  Smile, 
  Trophy, 
  MessageCircle,
  Hash,
  Flame,
  MoreVertical,
  Edit,
  Trash2,
  Reply,
  Poll,
  Megaphone,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
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

interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

interface LeagueChatProps {
  leagueId: string;
  isCommissioner?: boolean;
}

const EMOJI_REACTIONS = ['👍', '😂', '🔥', '😮', '😢', '🎉', '💪', '🤔'];

export default function LeagueChat({ leagueId, isCommissioner = false }: LeagueChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'trash-talk' | 'trades' | 'announcements'>('all');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.user?.id || !leagueId) return;

    // Initialize Socket.IO connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      transports: ['websocket'],
      query: {
        userId: session.user.id,
        leagueId
      }
    });

    socketInstance.on('connect', () => {
      console.log('Connected to chat server');
      socketInstance.emit('join_league_chat', {
        leagueId,
        userId: session.user.id
      });
    });

    socketInstance.on('recent_messages', (recentMessages: ChatMessage[]) => {
      setMessages(recentMessages);
    });

    socketInstance.on('new_message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socketInstance.on('user_typing', (data: { userId: string; userName: string }) => {
      if (data.userId !== session.user.id) {
        setTypingUsers(prev => new Map(prev).set(data.userId, data.userName));
      }
    });

    socketInstance.on('user_stop_typing', (data: { userId: string }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    });

    socketInstance.on('message_edited', (data: { messageId: string; newContent: string; editedAt: Date }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, message: data.newContent, edited: true, editedAt: data.editedAt }
          : msg
      ));
    });

    socketInstance.on('message_deleted', (data: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    });

    socketInstance.on('reaction_update', (data: { messageId: string; reactions: MessageReaction[] }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      ));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [session?.user?.id, leagueId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSendMessage = async (type: ChatMessage['type'] = 'text', metadata?: any) => {
    if (!newMessage.trim() || !socket || !session?.user?.id) return;

    const messageData = {
      leagueId,
      userId: session.user.id,
      message: newMessage.trim(),
      type,
      metadata,
      replyToId: replyTo?.id
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
    setReplyTo(null);
    handleStopTyping();
  };

  const handleTyping = () => {
    if (!socket || !session?.user) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', {
        leagueId,
        userId: session.user.id,
        userName: session.user.name || 'User'
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (!socket || !session?.user?.id) return;

    if (isTyping) {
      setIsTyping(false);
      socket.emit('stop_typing', {
        leagueId,
        userId: session.user.id
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!socket || !session?.user?.id) return;

    socket.emit('add_reaction', {
      messageId,
      emoji,
      userId: session.user.id
    });
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim() || !session?.user?.id) return;

    try {
      const response = await fetch('/api/chat/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          newContent: editContent.trim()
        })
      });

      if (response.ok) {
        setEditingMessage(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/chat/delete/${messageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Message will be removed via socket event
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'all') return true;
    if (activeTab === 'trash-talk') return msg.type === 'trash_talk';
    if (activeTab === 'trades') return msg.type === 'trade';
    if (activeTab === 'announcements') return msg.type === 'announcement';
    return true;
  });

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.userId === session?.user?.id;
    const isEditing = editingMessage === message.id;

    return (
      <div
        key={message.id}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}
      >
        <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} gap-3 max-w-[70%]`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.userAvatar} />
            <AvatarFallback>{message.userName[0].toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium">{message.userName}</span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </span>
              {message.edited && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
            </div>

            {message.replyToId && replyTo && (
              <div className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 mb-1">
                Replying to {replyTo.userName}
              </div>
            )}

            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleEditMessage(message.id);
                  }}
                  className="text-sm"
                />
                <Button size="sm" onClick={() => handleEditMessage(message.id)}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditingMessage(null);
                  setEditContent('');
                }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div
                className={`px-4 py-2 rounded-lg ${
                  isOwn
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                } ${message.type === 'announcement' ? 'border-2 border-yellow-400' : ''}`}
              >
                {message.type === 'trash_talk' && (
                  <Flame className="h-4 w-4 inline mr-1 text-orange-400" />
                )}
                {message.type === 'announcement' && (
                  <Megaphone className="h-4 w-4 inline mr-1 text-yellow-500" />
                )}
                <span className="text-sm">{message.message}</span>
              </div>
            )}

            {/* Reactions */}
            {message.reactions.length > 0 && (
              <div className="flex gap-1 mt-1">
                {Array.from(new Map(message.reactions.map(r => [r.emoji, r])).values()).map(reaction => {
                  const count = message.reactions.filter(r => r.emoji === reaction.emoji).length;
                  const hasReacted = message.reactions.some(
                    r => r.emoji === reaction.emoji && r.userId === session?.user?.id
                  );

                  return (
                    <button
                      key={reaction.emoji}
                      onClick={() => handleReaction(message.id, reaction.emoji)}
                      className={`text-xs px-2 py-1 rounded ${
                        hasReacted ? 'bg-blue-100' : 'bg-gray-100'
                      } hover:bg-gray-200 transition-colors`}
                    >
                      {reaction.emoji} {count > 1 && count}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Message actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 px-1">
                    <Smile className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="flex gap-1">
                    {EMOJI_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(message.id, emoji)}
                        className="hover:bg-gray-100 p-1 rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1"
                onClick={() => setReplyTo(message)}
              >
                <Reply className="h-3 w-3" />
              </Button>

              {isOwn && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1"
                    onClick={() => {
                      setEditingMessage(message.id);
                      setEditContent(message.message);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1"
                    onClick={() => handleDeleteMessage(message.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          League Chat
        </CardTitle>
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList>
            <TabsTrigger value="all">
              <Hash className="h-3 w-3 mr-1" />
              All
            </TabsTrigger>
            <TabsTrigger value="trash-talk">
              <Flame className="h-3 w-3 mr-1" />
              Trash Talk
            </TabsTrigger>
            <TabsTrigger value="trades">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trades
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <Megaphone className="h-3 w-3 mr-1" />
              Announcements
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          {filteredMessages.map(renderMessage)}
          
          {typingUsers.size > 0 && (
            <div className="text-xs text-gray-500 italic">
              {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </ScrollArea>

        {replyTo && (
          <div className="bg-gray-50 px-3 py-2 mb-2 rounded flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">Replying to {replyTo.userName}:</span>
              <span className="text-gray-600 ml-2">
                {replyTo.message.substring(0, 50)}...
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReplyTo(null)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Type a message..."
            className="flex-1"
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Flame className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Quick Trash Talk</h4>
                <div className="space-y-1">
                  {['Your team is trash 🗑️', 'Easy win! 😎', 'Better luck next week 🤷'].map(template => (
                    <Button
                      key={template}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setNewMessage(template);
                        handleSendMessage('trash_talk');
                      }}
                    >
                      {template}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {isCommissioner && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleSendMessage('announcement')}
              title="Send as announcement"
            >
              <Megaphone className="h-4 w-4" />
            </Button>
          )}

          <Button onClick={() => handleSendMessage()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}