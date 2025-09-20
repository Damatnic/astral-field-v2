'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, 
  Users, 
  Send, 
  Hash, 
  Crown,
  Shield,
  Trophy,
  DollarSign,
  AlertCircle,
  Smile,
  Image,
  Clock
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    role: 'COMMISSIONER' | 'PLAYER';
    teamName: string;
  };
  timestamp: Date;
  channel: string;
  type: 'message' | 'trade_alert' | 'system';
}

interface Channel {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  messageCount: number;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [channelStats, setChannelStats] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channels: Channel[] = [
    {
      id: 'general',
      name: 'General',
      description: 'League-wide discussions',
      icon: Hash,
      color: 'text-gray-600',
      messageCount: channelStats.general || 0
    },
    {
      id: 'trades',
      name: 'Trade Central',
      description: 'Trade discussions and proposals',
      icon: DollarSign,
      color: 'text-green-600',
      messageCount: channelStats.trades || 0
    },
    {
      id: 'trash-talk',
      name: 'Trash Talk',
      description: 'Friendly competitive banter',
      icon: Trophy,
      color: 'text-yellow-600',
      messageCount: channelStats['trash-talk'] || 0
    },
    {
      id: 'commissioner',
      name: 'Announcements',
      description: 'Commissioner updates',
      icon: Crown,
      color: 'text-purple-600',
      messageCount: channelStats.commissioner || 0
    }
  ];

  // Fetch messages from API
  const fetchMessages = async (channel: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chat?channel=${channel}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
        setChannelStats(data.data.channelStats || {});
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMessages(selectedChannel);
    }
  }, [selectedChannel, user]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchMessages(selectedChannel);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedChannel, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          channel: selectedChannel
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Add the new message to the list
        setMessages(prev => [...prev, {
          ...data.message,
          timestamp: new Date(data.message.timestamp)
        }]);
        setNewMessage('');
        
        // Update channel stats
        setChannelStats(prev => ({
          ...prev,
          [selectedChannel]: (prev[selectedChannel] || 0) + 1
        }));
      } else {
        console.error('Failed to send message:', data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access league chat.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <MessageCircle className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-slate-900">League Chat</h1>
          </div>
          <p className="text-slate-600">D'Amato Dynasty League Communication Hub</p>
        </div>

        <div className="grid grid-cols-12 gap-6 h-[calc(100%-120px)]">
          {/* Channel Sidebar */}
          <div className="col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Hash className="h-4 w-4 mr-2" />
                  Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel.id)}
                      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                        selectedChannel === channel.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <channel.icon className={`h-4 w-4 ${channel.color}`} />
                        <div>
                          <p className="font-medium text-gray-900">{channel.name}</p>
                          <p className="text-xs text-gray-500">{channel.description}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {channel.messageCount}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="col-span-9">
            <Card className="h-full flex flex-col">
              {/* Channel Header */}
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const channel = channels.find(c => c.id === selectedChannel);
                      const IconComponent = channel?.icon;
                      return IconComponent ? (
                        <IconComponent 
                          className={`h-5 w-5 ${channel.color}`} 
                        />
                      ) : null;
                    })()}
                    <span>{channels.find(c => c.id === selectedChannel)?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>10 members</span>
                  </div>
                </CardTitle>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-500">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div key={message.id} className="flex gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm relative">
                            {message.author.avatar}
                            {message.author.role === 'COMMISSIONER' && (
                              <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 bg-white rounded-full p-0.5" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{message.author.name}</span>
                            <span className="text-xs text-gray-500">{message.author.teamName}</span>
                            {message.author.role === 'COMMISSIONER' && (
                              <Badge className="text-xs bg-purple-100 text-purple-800">Commissioner</Badge>
                            )}
                            <span className="text-xs text-gray-400">{formatRelativeTime(message.timestamp)}</span>
                          </div>
                          <p className="text-gray-800 break-words">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </CardContent>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder={`Message #${channels.find(c => c.id === selectedChannel)?.name.toLowerCase()}...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="min-h-[44px] max-h-32 resize-none"
                      rows={1}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      size="sm"
                      className="px-3"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Real-time chat</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}