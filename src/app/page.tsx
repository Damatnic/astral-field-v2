'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '@/components/mobile/ResponsiveUtils';
import MobileHomepage from './mobile-homepage';
import { 
  LiveScoresTicker as EnhancedLiveScoresTicker, 
  LivePlayerUpdates, 
  InjuryReport as InjuryReportComponent, 
  NewsFeed 
} from '@/components/ui/live-data-components';
import {
  Trophy,
  Users,
  BarChart3,
  MessageCircle,
  TrendingUp,
  Target,
  Zap,
  Shield,
  Crown,
  PlayCircle,
  ArrowRight,
  Star,

  ChevronRight,
  TrendingDown
} from 'lucide-react';

// Enhanced Dashboard Stats with ESPN-style visuals
function EnhancedDashboardStats() {
  const stats = [
    {
      label: 'League Rank',
      value: '#2',
      change: '+1',
      trend: 'up',
      icon: Trophy,
      color: 'text-yellow-600 bg-yellow-50',
      accent: 'border-yellow-200'
    },
    {
      label: 'Total Points',
      value: '1,847.2',
      change: '+127.4',
      trend: 'up',
      icon: Target,
      color: 'text-green-600 bg-green-50',
      accent: 'border-green-200'
    },
    {
      label: 'Win Percentage',
      value: '72%',
      change: '+8%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-50',
      accent: 'border-blue-200'
    },
    {
      label: 'Active Players',
      value: '14',
      change: '2 Injured',
      trend: 'down',
      icon: Users,
      color: 'text-orange-600 bg-orange-50',
      accent: 'border-orange-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${stat.accent} hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.trend === 'up' 
                  ? 'text-green-700 bg-green-100' 
                  : 'text-red-700 bg-red-100'
              }`}>
                {stat.change}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ESPN-Style Live Scores Ticker
// Yahoo-Style Quick Actions Grid
function QuickActionsGrid() {
  const actions = [
    {
      name: 'Set Lineup',
      description: 'Optimize your starting lineup',
      href: '/teams/lineup',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'from-blue-600 to-blue-700',
      stats: '2 changes needed'
    },
    {
      name: 'Waiver Wire',
      description: 'Add available players',
      href: '/waivers',
      icon: Target,
      gradient: 'from-green-500 to-green-600',
      hoverGradient: 'from-green-600 to-green-700',
      stats: '47 available'
    },
    {
      name: 'Trade Center',
      description: 'Propose and manage trades',
      href: '/trade',
      icon: ArrowRight,
      gradient: 'from-purple-500 to-purple-600',
      hoverGradient: 'from-purple-600 to-purple-700',
      stats: '3 pending'
    },
    {
      name: 'Advanced Search',
      description: 'Find & compare players',
      href: '/search',
      icon: BarChart3,
      gradient: 'from-cyan-500 to-cyan-600',
      hoverGradient: 'from-cyan-600 to-cyan-700',
      stats: 'AI-powered'
    },
    {
      name: 'Research',
      description: 'Player stats & analysis',
      href: '/players',
      icon: BarChart3,
      gradient: 'from-orange-500 to-orange-600',
      hoverGradient: 'from-orange-600 to-orange-700',
      stats: 'Updated 2h ago'
    },
    {
      name: 'Draft Room',
      description: 'Join live draft',
      href: '/draft',
      icon: Crown,
      gradient: 'from-red-500 to-red-600',
      hoverGradient: 'from-red-600 to-red-700',
      stats: 'Starting soon'
    },
    {
      name: 'League Chat',
      description: 'Connect with managers',
      href: '/chat',
      icon: MessageCircle,
      gradient: 'from-teal-500 to-teal-600',
      hoverGradient: 'from-teal-600 to-teal-700',
      stats: '12 new messages'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {actions.map((action, index) => {
        const IconComponent = action.icon;
        return (
          <motion.div
            key={action.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href={action.href as any}
              className={`block bg-gradient-to-br ${action.gradient} hover:${action.hoverGradient} p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 group`}
            >
              <div className="flex items-center justify-between mb-4">
                <IconComponent className="h-8 w-8 group-hover:scale-110 transition-transform duration-200" />
                <ChevronRight className="h-5 w-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{action.name}</h3>
              <p className="text-sm opacity-90 mb-2">{action.description}</p>
              <div className="text-xs opacity-75 bg-white/20 rounded-full px-3 py-1 inline-block">
                {action.stats}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

// ESPN-Style Top Performers Widget
function TopPerformers() {
  const performers = [
    {
      name: 'Josh Allen',
      position: 'QB',
      team: 'BUF',
      points: 28.7,
      projection: 24.2,
      status: 'playing',
      trend: 'up',
      avatar: '🏈'
    },
    {
      name: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF',
      points: 22.4,
      projection: 18.8,
      status: 'playing',
      trend: 'up',
      avatar: '🔥'
    },
    {
      name: 'Tyreek Hill',
      position: 'WR',
      team: 'MIA',
      points: 19.6,
      projection: 16.2,
      status: 'questionable',
      trend: 'down',
      avatar: '⚡'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Star className="h-5 w-5 text-yellow-500 mr-2" />
          Top Performers
        </h2>
        <Link href="/players" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View All
        </Link>
      </div>
      
      <div className="space-y-4">
        {performers.map((player, index) => (
          <motion.div
            key={player.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="text-2xl">{player.avatar}</div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">{player.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    player.status === 'playing' 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {player.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{player.position} • {player.team}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-gray-900">{player.points}</span>
                <div className={`flex items-center ${
                  player.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {player.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">Proj: {player.projection}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Enhanced Recent Activity Feed
function RecentActivity() {
  const activities = [
    {
      type: 'trade',
      icon: ArrowRight,
      color: 'text-purple-600 bg-purple-100',
      title: 'Trade Completed',
      description: 'You traded Davante Adams for Travis Kelce',
      time: '2 hours ago',
      details: '+12.4 projected points'
    },
    {
      type: 'waiver',
      icon: Target,
      color: 'text-green-600 bg-green-100',
      title: 'Waiver Claim Successful',
      description: 'Added Gabe Davis from waivers',
      time: '1 day ago',
      details: 'Dropped Romeo Doubs'
    },
    {
      type: 'injury',
      icon: Shield,
      color: 'text-red-600 bg-red-100',
      title: 'Injury Update',
      description: 'Saquon Barkley listed as Questionable',
      time: '2 days ago',
      details: 'Consider backup options'
    },
    {
      type: 'achievement',
      icon: Trophy,
      color: 'text-yellow-600 bg-yellow-100',
      title: 'Achievement Unlocked',
      description: 'Highest weekly score (147.2 points)',
      time: '3 days ago',
      details: '+50 league points'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
        <Link href="/activity" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View All
        </Link>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const IconComponent = activity.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className={`p-2 rounded-lg ${activity.color}`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">{activity.title}</h3>
                  <span className="text-xs text-gray-500 ml-2">{activity.time}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Enhanced Landing Page with ESPN/Yahoo styling
function EnhancedLandingPage() {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  const features = [
    {
      name: 'AI-Powered Insights',
      description: 'Advanced machine learning algorithms analyze player performance, matchups, and trends to give you the edge.',
      icon: Zap,
      image: '🤖',
      stats: ['95% Accuracy', '10M+ Data Points', 'Real-time Analysis']
    },
    {
      name: 'Live Draft Assistant',
      description: 'Interactive draft room with real-time recommendations, player rankings, and strategy optimization.',
      icon: Crown,
      image: '👑',
      stats: ['50+ Draft Strategies', 'Live Updates', 'Opponent Analysis']
    },
    {
      name: 'Advanced Analytics',
      description: 'Deep dive into comprehensive stats, heat maps, and predictive modeling for every player.',
      icon: BarChart3,
      image: '📊',
      stats: ['20+ Metrics', 'Custom Filters', 'Export Reports']
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 min-h-screen">
      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6">
              Dominate Your{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Fantasy League
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              The ultimate fantasy football platform with AI-powered insights, advanced analytics, 
              and professional-grade tools used by championship teams.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg flex items-center justify-center space-x-2"
              >
                <Crown className="h-6 w-6" />
                <span>Start Winning Today</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <PlayCircle className="h-6 w-6" />
                <span>Watch Demo</span>
              </motion.button>
            </div>
            
            {/* Stats Banner */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">10M+</div>
                <div className="text-gray-400 text-sm">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">95%</div>
                <div className="text-gray-400 text-sm">Win Rate Increase</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">$2.1M+</div>
                <div className="text-gray-400 text-sm">Prizes Won</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Interactive Features Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Championship-Level Features
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to build and manage a winning fantasy team
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeature}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-6xl mb-6">{features[currentFeature].image}</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    {features[currentFeature].name}
                  </h3>
                  <p className="text-lg text-gray-600 mb-6">
                    {features[currentFeature].description}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {features[currentFeature].stats.map((stat, index) => (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-semibold text-gray-900">{stat}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Feature Navigation */}
              <div className="flex space-x-2 mt-8">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentFeature 
                        ? 'bg-blue-600' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl shadow-2xl">
                <div className="text-white">
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Live Dashboard Preview</h4>
                    <div className="h-48 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                      <div className="text-4xl animate-pulse">🏆</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-4 rounded-lg">
                      <div className="text-2xl font-bold">147.2</div>
                      <div className="text-sm opacity-75">This Week</div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg">
                      <div className="text-2xl font-bold">#1</div>
                      <div className="text-sm opacity-75">League Rank</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Enhanced Dashboard
function EnhancedAuthenticatedDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, Champion! 🏆
              </h1>
              <p className="text-gray-600">
                Ready to dominate Week 8? Here&apos;s your team overview.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last updated</div>
              <div className="text-sm font-medium text-gray-900">2 minutes ago</div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Grid */}
        <EnhancedDashboardStats />

        {/* Enhanced Live Scores Ticker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <EnhancedLiveScoresTicker />
        </motion.div>

        {/* Quick Actions Grid */}
        <QuickActionsGrid />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <TopPerformers />
            
            {/* Live Player Updates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <LivePlayerUpdates />
            </motion.div>

            {/* News Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <NewsFeed />
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <RecentActivity />
            
            {/* Injury Report */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <InjuryReportComponent />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function EnhancedHomePage() {
  const { user, isLoading } = useAuth();
  const { isMobile } = useBreakpoint();

  // Return mobile version for mobile devices
  if (isMobile && user) {
    return <MobileHomepage />;
  }

  // Enhanced Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-white"
        >
          <div className="text-6xl mb-4 animate-pulse">🏆</div>
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-full h-full border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Loading AstralField</h2>
          <p className="text-blue-200">Preparing your championship dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return user ? <EnhancedAuthenticatedDashboard /> : <EnhancedLandingPage />;
}