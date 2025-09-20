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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channels: Channel[] = [
    {
      id: 'general',
      name: 'General',
      description: 'League-wide discussions',
      icon: Hash,
      color: 'text-gray-600',
      messageCount: 247
    },
    {
      id: 'trades',
      name: 'Trade Central',
      description: 'Trade discussions and proposals',
      icon: DollarSign,
      color: 'text-green-600',
      messageCount: 89
    },
    {
      id: 'trash-talk',
      name: 'Trash Talk',
      description: 'Friendly competitive banter',
      icon: Trophy,
      color: 'text-yellow-600',
      messageCount: 156
    },
    {
      id: 'commissioner',
      name: 'Announcements',
      description: 'Commissioner updates',
      icon: Crown,
      color: 'text-purple-600',
      messageCount: 23
    }
  ];

  // Mock messages for the D'Amato Dynasty League
  const mockMessages: Message[] = [
    {
      id: '1',
      content: 'Week 15 playoffs are here! Good luck everyone! 🏆',
      author: {
        id: '10',
        name: 'Nicholas D Amato',
        avatar: 'ND',
        role: 'COMMISSIONER',
        teamName: 'D Amato Dynasty'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      channel: 'general',
      type: 'message'
    },
    {
      id: '2',
      content: 'Anyone interested in trading a RB? I need depth for playoffs',
      author: {
        id: '2',
        name: 'Jack McCaigue',
        avatar: 'JM',
        role: 'PLAYER',
        teamName: 'McCaigue Mayhem'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
      channel: 'trades',
      type: 'message'
    },
    {
      id: '3',
      content: 'Larry team is absolutely stacked this year. Championship bound! 🚀',
      author: {
        id: '4',
        name: 'Renee McCaigue',
        avatar: 'RM',
        role: 'PLAYER',
        teamName: 'Renee Reign'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
      channel: 'general',
      type: 'message'
    },
    {
      id: '4',
      content: 'Thanks! Been working the waiver wire all season. Dynasty mindset! 💪',
      author: {
        id: '3',
        name: 'Larry McCaigue',
        avatar: 'LM',
        role: 'PLAYER',
        teamName: 'Larry Legends'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 18),
      channel: 'general',
      type: 'message'
    },
    {
      id: '5',
      content: 'Setting lineups for Week 16 semifinals. May the best teams win!',
      author: {
        id: '10',
        name: 'Nicholas D Amato',
        avatar: 'ND',
        role: 'COMMISSIONER',
        teamName: 'D Amato Dynasty'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      channel: 'commissioner',
      type: 'message'
    },
    {
      id: '6',
      content: 'My team is ready to upset some higher seeds! Watch out! 😤',
      author: {
        id: '6',
        name: 'Jon Kornbeck',
        avatar: 'JK',
        role: 'PLAYER',
        teamName: 'Kornbeck Crushers'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      channel: 'trash-talk',
      type: 'message'
    },
    {
      id: '7',
      content: 'Still can\'t believe I made playoffs with this roster 😅',
      author: {
        id: '9',
        name: 'Cason Minor',
        avatar: 'CM',
        role: 'PLAYER',
        teamName: 'Minor Miracles'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      channel: 'general',
      type: 'message'
    }
  ];

  useEffect(() => {
    // Simulate loading messages
    setTimeout(() => {
      setMessages(mockMessages.filter(msg => msg.channel === selectedChannel));
      setLoading(false);
    }, 500);
  }, [selectedChannel]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !user) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      author: {
        id: user.id,
        name: user.name || 'Unknown User',
        avatar: user.name?.split(' ').map(n => n[0]).join('') || 'U',
        role: user.role === 'COMMISSIONER' ? 'COMMISSIONER' : 'PLAYER',
        teamName: 'Your Team' // This would come from user context
      },
      timestamp: new Date(),
      channel: selectedChannel,
      type: 'message'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
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