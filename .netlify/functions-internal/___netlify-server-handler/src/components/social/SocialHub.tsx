'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Trophy, Flame, Send,
  Crown, Shield, Star, TrendingUp,
  Award, Zap
} from 'lucide-react';

interface Message {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  timestamp: Date;
  reactions: { [key: string]: string[] };
  type: 'message' | 'achievement' | 'trash-talk' | 'trade';
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
}

export default function SocialHub() {
  const [activeTab, setActiveTab] = useState<'chat' | 'trophy' | 'trash-talk'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      userId: 'user1',
      userName: "Nicholas D'Amato",
      avatar: '👑',
      content: "Just optimized my lineup with AI - projected 145 points this week!",
      timestamp: new Date(Date.now() - 5 * 60000),
      reactions: { '🔥': ['user2', 'user3'], '👀': ['user4'] },
      type: 'message'
    },
    {
      id: '2',
      userId: 'user2',
      userName: "Nick Hartley",
      avatar: '🦅',
      content: "My trade analyzer says I'm getting 85/100 value. Should I accept?",
      timestamp: new Date(Date.now() - 10 * 60000),
      reactions: { '✅': ['user1'], '❌': ['user3', 'user5'] },
      type: 'trade'
    },
    {
      id: '3',
      userId: 'user3',
      userName: "Jon Kornbeck",
      avatar: '💪',
      content: "🏆 Achievement Unlocked: Won 5 games in a row!",
      timestamp: new Date(Date.now() - 15 * 60000),
      reactions: { '🎉': ['user1', 'user2', 'user4', 'user5'] },
      type: 'achievement'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const achievements: Achievement[] = [
    {
      id: '1',
      name: 'Dynasty Founder',
      description: 'Created the D\'Amato Dynasty League',
      icon: <Crown className="h-8 w-8" />,
      rarity: 'legendary',
      unlockedAt: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Trade Master',
      description: 'Completed 10 successful trades',
      icon: <TrendingUp className="h-8 w-8" />,
      rarity: 'epic',
      unlockedAt: new Date('2024-03-15')
    },
    {
      id: '3',
      name: 'Perfect Week',
      description: 'Score 150+ points in a single week',
      icon: <Star className="h-8 w-8" />,
      rarity: 'rare',
      unlockedAt: new Date('2024-10-20')
    },
    {
      id: '4',
      name: 'Waiver Wire Wizard',
      description: 'Pick up the #1 scorer from waivers',
      icon: <Zap className="h-8 w-8" />,
      rarity: 'epic'
    },
    {
      id: '5',
      name: 'Underdog Victory',
      description: 'Win as a 30+ point underdog',
      icon: <Shield className="h-8 w-8" />,
      rarity: 'rare',
      unlockedAt: new Date('2024-11-01')
    },
    {
      id: '6',
      name: 'Championship Belt',
      description: 'Win the league championship',
      icon: <Trophy className="h-8 w-8" />,
      rarity: 'legendary'
    }
  ];

  const trashTalkTemplates = [
    "My bench could beat your starters 💪",
    "Already planning my victory speech 🎤",
    "Your lineup looking scared 😱",
    "Weather says 100% chance of you losing ⛈️",
    "My AI says you have a 12% win probability 🤖",
    "Time to update your resume to 'Former Champion' 📝"
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        userId: 'currentUser',
        userName: 'You',
        avatar: '🎯',
        content: newMessage,
        timestamp: new Date(),
        reactions: {},
        type: activeTab === 'trash-talk' ? 'trash-talk' : 'message'
      };
      setMessages([...messages, message]);
      setNewMessage('');
      
      // Simulate typing indicator
      setIsTyping(['user1']);
      setTimeout(() => {
        setIsTyping([]);
        // Simulate response
        if (activeTab === 'trash-talk') {
          const response: Message = {
            id: (Date.now() + 1).toString(),
            userId: 'user1',
            userName: "Nicholas D'Amato",
            avatar: '👑',
            content: "Bring it on! My lineup is locked and loaded 🚀",
            timestamp: new Date(),
            reactions: {},
            type: 'trash-talk'
          };
          setMessages(prev => [...prev, response]);
        }
      }, 2000);
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        if (!reactions[emoji]) reactions[emoji] = [];
        if (!reactions[emoji].includes('currentUser')) {
          reactions[emoji].push('currentUser');
        } else {
          reactions[emoji] = reactions[emoji].filter(u => u !== 'currentUser');
        }
        return { ...msg, reactions };
      }
      return msg;
    }));
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'chat'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">League Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('trophy')}
          className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'trophy'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Trophy className="h-5 w-5" />
          <span className="font-medium">Trophy Room</span>
        </button>
        <button
          onClick={() => setActiveTab('trash-talk')}
          className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'trash-talk'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-b-2 border-red-600'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Flame className="h-5 w-5" />
          <span className="font-medium">Trash Talk</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* League Chat */}
        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-[600px]"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.filter(m => m.type !== 'trash-talk').map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-3"
                >
                  <div className="text-2xl">{message.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{message.userName}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.type === 'achievement' 
                        ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/10'
                        : message.type === 'trade'
                        ? 'bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    {Object.keys(message.reactions).length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {Object.entries(message.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(message.id, emoji)}
                            className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                              users.includes('currentUser')
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isTyping.length > 0 && (
                <div className="flex gap-3">
                  <div className="text-2xl">👑</div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                {['👍', '❤️', '🔥', '😂', '🎯', '💪'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setNewMessage(newMessage + emoji)}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Trophy Room */}
        {activeTab === 'trophy' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative rounded-xl overflow-hidden ${
                    achievement.unlockedAt ? 'opacity-100' : 'opacity-40 grayscale'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${getRarityColor(achievement.rarity)} opacity-20`} />
                  <div className="relative p-6 bg-white dark:bg-gray-800 bg-opacity-95 backdrop-blur">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${getRarityColor(achievement.rarity)} text-white mb-4`}>
                      {achievement.icon}
                    </div>
                    <h3 className="font-bold text-lg mb-1">{achievement.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{achievement.description}</p>
                    {achievement.unlockedAt && (
                      <p className="text-xs text-gray-500">
                        Unlocked {achievement.unlockedAt.toLocaleDateString()}
                      </p>
                    )}
                    {!achievement.unlockedAt && (
                      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                League Leaders
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">🥇</div>
                  <p className="font-semibold">Nicholas D&apos;Amato</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">12 Trophies</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🥈</div>
                  <p className="font-semibold">Jon Kornbeck</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">8 Trophies</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🥉</div>
                  <p className="font-semibold">Nick Hartley</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">7 Trophies</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Trash Talk Board */}
        {activeTab === 'trash-talk' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-[600px]"
          >
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
              <h3 className="font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                Quick Burns
              </h3>
              <div className="flex flex-wrap gap-2 mt-3">
                {trashTalkTemplates.map((template, i) => (
                  <button
                    key={i}
                    onClick={() => setNewMessage(template)}
                    className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.filter(m => m.type === 'trash-talk').map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-3"
                >
                  <div className="text-2xl">{message.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{message.userName}</span>
                      <Flame className="h-3 w-3 text-red-500" />
                    </div>
                    <div className="bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-3">
                      <p className="text-sm font-medium">{message.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Drop your best trash talk..."
                  className="flex-1 px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all flex items-center gap-2"
                >
                  <Flame className="h-4 w-4" />
                  Burn!
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
