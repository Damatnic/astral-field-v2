'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Trophy, TrendingUp, Users, Zap } from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  teamName: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'system' | 'pick' | 'trade';
  metadata?: any;
}

interface DraftChatProps {
  messages: ChatMessage[];
  draftId: string;
  currentUser?: {
    id: string;
    name: string;
    teamName: string;
  };
  onSendMessage?: (message: string) => void;
}

export function DraftChat({ 
  messages = [], 
  draftId,
  currentUser,
  onSendMessage 
}: DraftChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'pick':
        return <Trophy className="w-3 h-3" />;
      case 'trade':
        return <TrendingUp className="w-3 h-3" />;
      case 'system':
        return <Zap className="w-3 h-3" />;
      default:
        return <MessageSquare className="w-3 h-3" />;
    }
  };

  const getMessageStyle = (type: string, isOwnMessage: boolean) => {
    if (type === 'system') return 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-600';
    if (type === 'pick') return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
    if (type === 'trade') return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
    if (isOwnMessage) return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
    return 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Draft Chat
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {messages.filter(m => m.type === 'chat').length} messages
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Be the first to chat!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = currentUser?.id === msg.userId;
                
                return (
                  <div
                    key={msg.id}
                    className={`
                      flex ${isOwnMessage ? 'justify-end' : 'justify-start'}
                    `}
                  >
                    <div
                      className={`
                        max-w-[80%] rounded-lg p-3 border
                        ${getMessageStyle(msg.type, isOwnMessage)}
                      `}
                    >
                      {/* Header */}
                      {!isOwnMessage && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {msg.userName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {msg.teamName}
                          </span>
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {getMessageIcon(msg.type)}
                        </div>
                        <div className="flex-1">
                          {msg.type === 'pick' && msg.metadata ? (
                            <div>
                              <p className="text-sm font-medium">
                                Drafted {msg.metadata.playerName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {msg.metadata.position} - {msg.metadata.team}
                              </p>
                            </div>
                          ) : msg.type === 'trade' && msg.metadata ? (
                            <div>
                              <p className="text-sm font-medium">Trade Proposal</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {msg.message}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm">{msg.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="mt-1 text-xs text-gray-500 text-right">
                        {formatTimestamp(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
                <span>Someone is typing...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        {currentUser && onSendMessage && (
          <div className="p-3 border-t dark:border-gray-700">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                disabled={!onSendMessage}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !onSendMessage}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewMessage('Good pick! 👍')}
              >
                👍
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewMessage('Steal! 🔥')}
              >
                🔥
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewMessage('Reach... 🤔')}
              >
                🤔
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewMessage('GLHF! 🏈')}
              >
                🏈
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DraftChat;