'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  Target,
  BarChart3,
  Settings,
  TrendingUp,
  Bell,
  Search,
  RefreshCw,
  Zap,
  Clock,
  Star,
  ChevronRight,
  Plus,
  Minus,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  Download
} from 'lucide-react';

// Quick Action Types
export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'lineup' | 'waiver' | 'trade' | 'research' | 'settings';
  shortcut?: string;
  badge?: string;
  color: string;
  bgColor: string;
  isActive?: boolean;
  onClick: () => void;
}

export interface ActionCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  actions: QuickAction[];
}

// ESPN/Yahoo-style Quick Actions Panel
export function QuickActionsPanel() {
  const [activeCategory, setActiveCategory] = useState('lineup');
  const [recentActions, setRecentActions] = useState<string[]>([]);
  const [showTooltips, setShowTooltips] = useState(false);

  // Handle action execution with tracking
  const executeAction = useCallback((actionId: string, callback: () => void) => {
    callback();
    setRecentActions(prev => {
      const updated = [actionId, ...prev.filter(id => id !== actionId)];
      return updated.slice(0, 5); // Keep last 5 actions
    });
  }, []);

  // Action Categories with ESPN/Yahoo-style quick actions
  const actionCategories: ActionCategory[] = [
    {
      id: 'lineup',
      title: 'Lineup',
      icon: Trophy,
      actions: [
        {
          id: 'set-lineup',
          title: 'Set Lineup',
          description: 'Optimize your starting lineup',
          icon: Trophy,
          category: 'lineup',
          shortcut: 'L',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 hover:bg-blue-100',
          onClick: () => {}
        },
        {
          id: 'auto-start',
          title: 'Auto Start/Sit',
          description: 'Let AI optimize your lineup',
          icon: Zap,
          category: 'lineup',
          badge: 'AI',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 hover:bg-purple-100',
          onClick: () => {}
        },
        {
          id: 'injury-check',
          title: 'Injury Report',
          description: 'Check player injury status',
          icon: AlertTriangle,
          category: 'lineup',
          badge: 'LIVE',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 hover:bg-orange-100',
          onClick: () => {}
        },
        {
          id: 'backup-plan',
          title: 'Backup Options',
          description: 'View bench alternatives',
          icon: RotateCcw,
          category: 'lineup',
          color: 'text-green-600',
          bgColor: 'bg-green-50 hover:bg-green-100',
          onClick: () => {}
        }
      ]
    },
    {
      id: 'waiver',
      title: 'Waivers',
      icon: Target,
      actions: [
        {
          id: 'add-player',
          title: 'Add Player',
          description: 'Claim player from waivers',
          icon: Plus,
          category: 'waiver',
          shortcut: 'W',
          color: 'text-green-600',
          bgColor: 'bg-green-50 hover:bg-green-100',
          onClick: () => {}
        },
        {
          id: 'drop-player',
          title: 'Drop Player',
          description: 'Release player to waivers',
          icon: Minus,
          category: 'waiver',
          color: 'text-red-600',
          bgColor: 'bg-red-50 hover:bg-red-100',
          onClick: () => {}
        },
        {
          id: 'waiver-priority',
          title: 'Waiver Priority',
          description: 'Check your waiver order',
          icon: Target,
          category: 'waiver',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 hover:bg-blue-100',
          onClick: () => {}
        },
        {
          id: 'trending-adds',
          title: 'Trending Adds',
          description: 'Hot waiver wire pickups',
          icon: TrendingUp,
          category: 'waiver',
          badge: 'HOT',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 hover:bg-orange-100',
          onClick: () => {}
        }
      ]
    },
    {
      id: 'trade',
      title: 'Trades',
      icon: Users,
      actions: [
        {
          id: 'propose-trade',
          title: 'Propose Trade',
          description: 'Start a new trade negotiation',
          icon: Users,
          category: 'trade',
          shortcut: 'T',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 hover:bg-purple-100',
          onClick: () => {}
        },
        {
          id: 'trade-analyzer',
          title: 'Trade Analyzer',
          description: 'Evaluate trade fairness',
          icon: BarChart3,
          category: 'trade',
          badge: 'PRO',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50 hover:bg-indigo-100',
          onClick: () => {}
        },
        {
          id: 'trade-history',
          title: 'Trade History',
          description: 'View past transactions',
          icon: Clock,
          category: 'trade',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 hover:bg-gray-100',
          onClick: () => {}
        },
        {
          id: 'trade-finder',
          title: 'Trade Finder',
          description: 'Find potential trade partners',
          icon: Search,
          category: 'trade',
          badge: 'AI',
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50 hover:bg-cyan-100',
          onClick: () => {}
        }
      ]
    },
    {
      id: 'research',
      title: 'Research',
      icon: BarChart3,
      actions: [
        {
          id: 'player-stats',
          title: 'Player Stats',
          description: 'View detailed player analytics',
          icon: BarChart3,
          category: 'research',
          shortcut: 'S',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 hover:bg-blue-100',
          onClick: () => {}
        },
        {
          id: 'matchup-preview',
          title: 'Matchup Preview',
          description: 'Analyze weekly matchups',
          icon: Eye,
          category: 'research',
          color: 'text-green-600',
          bgColor: 'bg-green-50 hover:bg-green-100',
          onClick: () => {}
        },
        {
          id: 'rankings',
          title: 'Rankings',
          description: 'Current position rankings',
          icon: Star,
          category: 'research',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 hover:bg-yellow-100',
          onClick: () => {}
        },
        {
          id: 'news-updates',
          title: 'News & Updates',
          description: 'Latest fantasy football news',
          icon: Bell,
          category: 'research',
          badge: 'LIVE',
          color: 'text-red-600',
          bgColor: 'bg-red-50 hover:bg-red-100',
          onClick: () => {}
        }
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      actions: [
        {
          id: 'league-settings',
          title: 'League Settings',
          description: 'Configure league preferences',
          icon: Settings,
          category: 'settings',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 hover:bg-gray-100',
          onClick: () => {}
        },
        {
          id: 'notifications',
          title: 'Notifications',
          description: 'Manage alert preferences',
          icon: Bell,
          category: 'settings',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 hover:bg-blue-100',
          onClick: () => {}
        },
        {
          id: 'export-data',
          title: 'Export Data',
          description: 'Download league data',
          icon: Download,
          category: 'settings',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 hover:bg-purple-100',
          onClick: () => {}
        },
        {
          id: 'reports',
          title: 'Season Reports',
          description: 'Generate performance reports',
          icon: FileText,
          category: 'settings',
          badge: 'NEW',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50 hover:bg-indigo-100',
          onClick: () => {}
        }
      ]
    }
  ];

  const activeActions = actionCategories.find(cat => cat.id === activeCategory)?.actions || [];
  const recentActionItems = actionCategories
    .flatMap(cat => cat.actions)
    .filter(action => recentActions.includes(action.id))
    .slice(0, 3);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-600">Manage your fantasy team efficiently</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTooltips(!showTooltips)}
              className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
              title="Toggle shortcuts"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Category Sidebar */}
        <div className="w-48 bg-gray-50 border-r border-gray-200">
          <nav className="p-4 space-y-2">
            {actionCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-white hover:shadow-sm'
                }`}
              >
                <category.icon className="w-4 h-4" />
                <span className="font-medium">{category.title}</span>
              </button>
            ))}
          </nav>

          {/* Recent Actions */}
          {recentActionItems.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Recent Actions
              </h3>
              <div className="space-y-2">
                {recentActionItems.map((action) => (
                  <button
                    key={`recent-${action.id}`}
                    onClick={() => executeAction(action.id, action.onClick)}
                    className="w-full flex items-center space-x-2 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                  >
                    <action.icon className="w-3 h-3" />
                    <span className="truncate">{action.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Grid */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeActions.map((action) => (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => executeAction(action.id, action.onClick)}
                className={`relative p-4 rounded-xl border border-gray-200 transition-all group ${action.bgColor}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center space-x-2">
                    {action.badge && (
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        action.badge === 'AI' ? 'bg-purple-100 text-purple-700' :
                        action.badge === 'PRO' ? 'bg-indigo-100 text-indigo-700' :
                        action.badge === 'HOT' ? 'bg-red-100 text-red-700' :
                        action.badge === 'LIVE' ? 'bg-green-100 text-green-700' :
                        action.badge === 'NEW' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {action.badge}
                      </span>
                    )}
                    {action.shortcut && showTooltips && (
                      <span className="px-2 py-1 text-xs font-mono bg-gray-200 text-gray-600 rounded">
                        {action.shortcut}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>

                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Quick Stats Bar */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Lineup Set</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">2 Days Until Waivers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">Rank: #2</span>
                </div>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All Stats →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating Quick Actions Button for mobile
export function FloatingQuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  
  const quickActions = [
    { icon: Trophy, label: 'Lineup', color: 'bg-blue-500' },
    { icon: Target, label: 'Waivers', color: 'bg-green-500' },
    { icon: Users, label: 'Trades', color: 'bg-purple-500' },
    { icon: BarChart3, label: 'Stats', color: 'bg-orange-500' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      {/* Action Buttons */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute bottom-16 right-0 space-y-3"
        >
          {quickActions.map((action, index) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                transition: { delay: index * 0.1 }
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`flex items-center space-x-2 ${action.color} text-white px-4 py-3 rounded-full shadow-lg`}
            >
              <action.icon className="w-5 h-5" />
              <span className="font-medium">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Main Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isOpen ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
        }`}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}
