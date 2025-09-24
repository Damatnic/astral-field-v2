'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Trophy,
  Calendar,
  ArrowRight,
  Bell,
  Star,
  Activity,
  BarChart3,
  Clock,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
  Download
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

// Types
interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  priority: number;
  badge?: number;
}

interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading?: boolean;
}

interface RecentActivity {
  id: string;
  type: 'trade' | 'waiver' | 'lineup' | 'score';
  title: string;
  subtitle: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
  priority: 'high' | 'medium' | 'low';
}

// Mock data - in real app, this would come from API
const quickActions: QuickAction[] = [
  {
    id: 'lineup',
    title: 'Set Lineup',
    subtitle: 'Week 15 deadline in 2h',
    icon: Users,
    href: '/lineup',
    color: 'bg-blue-500',
    priority: 1,
    badge: 3
  },
  {
    id: 'waivers',
    title: 'Waivers',
    subtitle: '2 claims pending',
    icon: TrendingUp,
    href: '/waivers',
    color: 'bg-green-500',
    priority: 2,
    badge: 2
  },
  {
    id: 'trades',
    title: 'Trades',
    subtitle: 'Active proposals',
    icon: ArrowRight,
    href: '/trades',
    color: 'bg-purple-500',
    priority: 3,
    badge: 1
  },
  {
    id: 'matchup',
    title: 'This Week',
    subtitle: 'vs. Team Alpha',
    icon: Trophy,
    href: '/matchup',
    color: 'bg-orange-500',
    priority: 4
  }
];

const dashboardCards: DashboardCard[] = [
  {
    id: 'rank',
    title: 'League Rank',
    value: '3rd',
    change: '+1',
    trend: 'up',
    icon: Trophy,
    color: 'text-yellow-500'
  },
  {
    id: 'points',
    title: 'Total Points',
    value: '1,847',
    change: '+127',
    trend: 'up',
    icon: BarChart3,
    color: 'text-blue-500'
  },
  {
    id: 'record',
    title: 'Record',
    value: '9-5-0',
    icon: Star,
    color: 'text-green-500'
  },
  {
    id: 'streak',
    title: 'Win Streak',
    value: 3,
    trend: 'up',
    icon: Zap,
    color: 'text-purple-500'
  }
];

const recentActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'lineup',
    title: 'Lineup Updated',
    subtitle: 'Started Josh Allen, benched Tua',
    timestamp: '2 hours ago',
    icon: Users,
    priority: 'high'
  },
  {
    id: '2',
    type: 'waiver',
    title: 'Waiver Claim Successful',
    subtitle: 'Added Rashee Rice for $15 FAAB',
    timestamp: '1 day ago',
    icon: TrendingUp,
    priority: 'medium'
  },
  {
    id: '3',
    type: 'trade',
    title: 'Trade Proposed',
    subtitle: 'Sent offer to Team Beta',
    timestamp: '2 days ago',
    icon: ArrowRight,
    priority: 'medium'
  },
  {
    id: '4',
    type: 'score',
    title: 'Week 14 Result',
    subtitle: 'Won 156.7 - 142.3',
    timestamp: '3 days ago',
    icon: Trophy,
    priority: 'low'
  }
];

export function MobileDashboard() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-gray-400';
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (!trend) return null;
    
    return trend === 'up' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : trend === 'down' ? (
      <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
    ) : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20 lg:pb-0">
      {/* Mobile Header with Status */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome back, {user?.name?.split(' ')[0]}!
              </h1>
              <p className="text-sm text-gray-500">
                {isOnline ? 'Live updates' : 'Offline mode'}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Network status indicator */}
              <div className={`p-2 rounded-full ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
              </div>
              
              {/* Refresh button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
              
              {/* Notifications */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors relative"
              >
                <Bell className="h-4 w-4 text-gray-600" />
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">3</span>
                </div>
              </motion.button>
            </div>
          </div>
          
          {/* Last updated timestamp */}
          <div className="flex items-center text-xs text-gray-400">
            <Clock className="h-3 w-3 mr-1" />
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Quick Actions - Priority based layout */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions
              .sort((a, b) => a.priority - b.priority)
              .map((action, index) => (
                <motion.a
                  key={action.id}
                  href={action.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all group"
                >
                  {action.badge && (
                    <div className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{action.badge}</span>
                    </div>
                  )}
                  
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{action.title}</h3>
                      <p className="text-sm text-gray-500 truncate">{action.subtitle}</p>
                    </div>
                  </div>
                </motion.a>
              ))}
          </div>
        </section>

        {/* Stats Cards - Mobile optimized grid */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            {dashboardCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg bg-gray-100`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  {getTrendIcon(card.trend)}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
                  <div className="flex items-end space-x-2">
                    <span className="text-2xl font-bold text-gray-900">{card.value}</span>
                    {card.change && (
                      <span className={`text-sm font-medium ${
                        card.trend === 'up' ? 'text-green-600' : 
                        card.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {card.change}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Activity - Infinite scroll ready */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            <AnimatePresence>
              {recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${getPriorityColor(activity.priority)} border border-gray-200`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <activity.icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{activity.title}</h3>
                      <p className="text-sm text-gray-500">{activity.subtitle}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Offline Indicator */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Download className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-amber-900">Offline Mode Active</h3>
                <p className="text-sm text-amber-700">
                  You're viewing cached data. Changes will sync when you're back online.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default MobileDashboard;