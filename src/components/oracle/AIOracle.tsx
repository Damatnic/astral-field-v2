'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
  BarChart3,
  AlertCircle,
  Trophy,
  Target,
  Zap,
  Send,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  Loader2,
  ChevronDown,
  Info,
  Shield,
  Activity,
  DollarSign,
  Calendar,
  Settings,
  HelpCircle
} from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'lineup' | 'trade' | 'waiver' | 'start-sit' | 'general';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  reasoning: string[];
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: Suggestion[];
  isTyping?: boolean;
}

interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
  icon: any;
}

export default function AIOracle() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI Fantasy Oracle. I can help you optimize lineups, analyze trades, suggest waiver pickups, and provide strategic insights. What would you like help with today?',
      timestamp: new Date(),
      suggestions: [
        {
          id: 's1',
          type: 'lineup',
          title: 'Lineup Optimization Available',
          description: 'Your current lineup could be improved by 8.5 projected points',
          confidence: 92,
          impact: 'high',
          reasoning: [
            'CeeDee Lamb has a favorable matchup against NYG (28th against WR)',
            'Weather conditions favor passing game in DAL vs NYG',
            'Consider starting Lamb over Mike Evans in FLEX'
          ]
        }
      ]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'analysis'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const quickPrompts: QuickPrompt[] = [
    { 
      id: '1', 
      label: 'Optimize Lineup', 
      prompt: 'What\'s the optimal lineup for this week?',
      icon: Sparkles
    },
    { 
      id: '2', 
      label: 'Trade Analysis', 
      prompt: 'Analyze this trade: Should I accept?',
      icon: Users
    },
    { 
      id: '3', 
      label: 'Waiver Targets', 
      prompt: 'Who should I target on waivers this week?',
      icon: TrendingUp
    },
    { 
      id: '4', 
      label: 'Start/Sit', 
      prompt: 'Who should I start between these players?',
      icon: HelpCircle
    },
    { 
      id: '5', 
      label: 'Injury Impact', 
      prompt: 'How does this injury affect my team?',
      icon: AlertCircle
    },
    { 
      id: '6', 
      label: 'Playoff Strategy', 
      prompt: 'What\'s my path to the playoffs?',
      icon: Trophy
    }
  ];

  const insightCards = [
    {
      title: 'Trade Opportunity Detected',
      description: 'Team "Lightning Strike" needs RB depth. Your bench RBs could fetch premium WR value.',
      confidence: 85,
      impact: 'high',
      icon: Users,
      color: 'from-blue-500 to-purple-500'
    },
    {
      title: 'Breakout Candidate',
      description: 'Tank Bigsby showing 73% snap share increase. Consider FAAB bid before Week 9.',
      confidence: 78,
      impact: 'medium',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Schedule Alert',
      description: 'Your WR corps faces tough matchups Weeks 14-16. Plan trades now for playoff run.',
      confidence: 91,
      impact: 'high',
      icon: Calendar,
      color: 'from-orange-500 to-red-500'
    },
    {
      title: 'Injury Hedge Recommended',
      description: 'Christian McCaffrey showing usage decline. Handcuff Elijah Mitchell immediately.',
      confidence: 68,
      impact: 'medium',
      icon: Shield,
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  const performanceMetrics = {
    accuracy: 87.3,
    winsAdded: 3.2,
    tradeSuccess: 82,
    waiverSuccess: 71,
    totalSuggestions: 156,
    implemented: 112
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate typing indicator
    const typingMessage: ChatMessage = {
      id: `typing-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    // Simulate AI response
    setTimeout(() => {
      const response = generateAIResponse(inputMessage);
      setMessages(prev => prev.filter(m => !m.isTyping).concat(response));
      setIsLoading(false);
    }, 2000);
  };

  const generateAIResponse = (query: string): ChatMessage => {
    // This would normally call your AI API
    const responses: Record<string, { content: string; suggestions?: Suggestion[] }> = {
      lineup: {
        content: 'Based on my analysis of matchups, weather conditions, and recent performance trends, here\'s my optimal lineup recommendation for Week 9:',
        suggestions: [
          {
            id: 's2',
            type: 'lineup',
            title: 'Recommended Lineup Changes',
            description: 'Projected to increase points by 12.3',
            confidence: 88,
            impact: 'high',
            reasoning: [
              'Start CeeDee Lamb over Mike Evans (better matchup)',
              'Bench Christian McCaffrey (injury concern) for Austin Ekeler',
              'Stream Cowboys DST vs Giants (allowing 28.5 ppg)'
            ]
          }
        ]
      },
      trade: {
        content: 'I\'ve analyzed the proposed trade from multiple angles. Here\'s my comprehensive assessment:',
        suggestions: [
          {
            id: 's3',
            type: 'trade',
            title: 'Trade Verdict: ACCEPT',
            description: 'This trade improves your championship odds by 15%',
            confidence: 76,
            impact: 'high',
            reasoning: [
              'You\'re selling high on a player with injury history',
              'Acquiring a consistent WR1 fills your biggest need',
              'Schedule favors the incoming player for playoffs'
            ]
          }
        ]
      },
      waiver: {
        content: 'Based on usage trends, upcoming matchups, and your roster needs, here are my top waiver recommendations:',
        suggestions: [
          {
            id: 's4',
            type: 'waiver',
            title: 'Priority Waiver Targets',
            description: 'Spend 35% FAAB on Tank Bigsby',
            confidence: 82,
            impact: 'medium',
            reasoning: [
              'Bigsby: 73% snap share last 2 weeks',
              'Jaylen Warren: Standalone flex value',
              'Cowboys DST: Elite streaming option Week 9-11'
            ]
          }
        ]
      }
    };

    const queryLower = query.toLowerCase();
    let responseData = responses.lineup; // default

    if (queryLower.includes('trade')) {
      responseData = responses.trade;
    } else if (queryLower.includes('waiver') || queryLower.includes('pickup')) {
      responseData = responses.waiver;
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: responseData.content,
      timestamp: new Date(),
      suggestions: responseData.suggestions
    };
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
    inputRef.current?.focus();
  };

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    // Handle feedback submission
    console.log(`Feedback ${feedback} for message ${messageId}`);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400';
    if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[impact as keyof typeof colors] || colors.low;
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Fantasy Oracle AI</h2>
              <p className="text-purple-100">Your intelligent fantasy football assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              <p className="text-xs text-white">
                {performanceMetrics.accuracy}% Accuracy
              </p>
            </div>
            <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              <p className="text-xs text-white">
                +{performanceMetrics.winsAdded} Wins
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {(['chat', 'insights', 'analysis'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6"
          >
            {/* Quick Prompts */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
              {quickPrompts.map(prompt => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={prompt.id}
                    onClick={() => handleQuickPrompt(prompt.prompt)}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-400 hover:shadow-md transition-all whitespace-nowrap"
                  >
                    <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium">{prompt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Messages */}
            <div className="h-[500px] overflow-y-auto mb-4 space-y-4 pr-2">
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                    <div className={`rounded-xl p-4 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                    }`}>
                      {message.isTyping ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Oracle is thinking...</span>
                        </div>
                      ) : (
                        <>
                          <p className={message.role === 'user' ? 'text-white' : ''}>
                            {message.content}
                          </p>
                          
                          {/* Suggestions */}
                          {message.suggestions && message.suggestions.map(suggestion => (
                            <div key={suggestion.id} className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {suggestion.title}
                                </h4>
                                <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                                  {suggestion.confidence}% confident
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {suggestion.description}
                              </p>
                              <div className="space-y-1">
                                {suggestion.reasoning.map((reason, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactBadge(suggestion.impact)}`}>
                                  {suggestion.impact} impact
                                </span>
                                {suggestion.action && (
                                  <button className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                                    {suggestion.action.label} →
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Message Actions */}
                          {message.role === 'assistant' && !message.isTyping && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <button 
                                onClick={() => handleFeedback(message.id, 'positive')}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                              >
                                <ThumbsUp className="h-4 w-4 text-gray-500" />
                              </button>
                              <button 
                                onClick={() => handleFeedback(message.id, 'negative')}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                              >
                                <ThumbsDown className="h-4 w-4 text-gray-500" />
                              </button>
                              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors">
                                <Copy className="h-4 w-4 text-gray-500" />
                              </button>
                              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors">
                                <RefreshCw className="h-4 w-4 text-gray-500" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask me about lineups, trades, waivers, or strategy..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 resize-none"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  isLoading || !inputMessage.trim()
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insightCards.map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative overflow-hidden rounded-xl p-6 text-white"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${insight.color}`}></div>
                    <div className="relative">
                      <div className="flex items-start justify-between mb-3">
                        <Icon className="h-8 w-8 text-white/80" />
                        <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">
                          {insight.confidence}% confident
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{insight.title}</h3>
                      <p className="text-sm text-white/90">{insight.description}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">
                          {insight.impact} impact
                        </span>
                        <button className="text-sm font-medium hover:underline">
                          View Details →
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {Object.entries(performanceMetrics).map(([key, value]) => (
                <div key={key} className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {typeof value === 'number' && value < 100 && value.toString().includes('.') 
                      ? value.toFixed(1) 
                      : value}
                    {key.includes('Success') && '%'}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="font-semibold text-lg mb-4">AI Performance Breakdown</h3>
              <div className="space-y-3">
                {[
                  { category: 'Lineup Optimization', accuracy: 89, impact: '+4.2 PPG' },
                  { category: 'Trade Analysis', accuracy: 82, impact: '73% Win Rate' },
                  { category: 'Waiver Predictions', accuracy: 71, impact: '62% Hit Rate' },
                  { category: 'Injury Impact', accuracy: 86, impact: '2.1 Wins Saved' }
                ].map(stat => (
                  <div key={stat.category} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{stat.category}</span>
                        <span className="text-xs text-gray-500">{stat.accuracy}% accurate</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${stat.accuracy}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-4 text-sm font-medium text-green-600 dark:text-green-400">
                      {stat.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}