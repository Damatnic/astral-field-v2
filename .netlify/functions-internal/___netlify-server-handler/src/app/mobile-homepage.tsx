'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { motion } from 'framer-motion';
import MobileHeader from '@/components/mobile/MobileOptimizedNavigation';
import { 
  MobileOptimizedLayout, 
  MobileCard, 
  TouchFriendlyButton, 
  MobileGrid 
} from '@/components/mobile/MobileOptimizedComponents';
import {
  MobilePlayerCard,
  MobileLiveScore,
  MobileFantasyAlert,
  MobileQuickActions
} from '@/components/mobile/MobileFantasyComponents';
import {
  Trophy,
  Target,
  TrendingUp,
  Activity,
  Bell,
  ArrowRight
} from 'lucide-react';

// Mobile Stats Dashboard
function MobileStatsDashboard() {
  const stats = [
    {
      label: 'League Rank',
      value: '#2',
      change: '+1',
      icon: Trophy,
      color: 'bg-yellow-500'
    },
    {
      label: 'Total Points',
      value: '1,847',
      change: '+127',
      icon: Target,
      color: 'bg-green-500'
    },
    {
      label: 'Win Rate',
      value: '78%',
      change: '+5%',
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      label: 'Moves Left',
      value: '3',
      change: '-2',
      icon: Activity,
      color: 'bg-purple-500'
    }
  ];

  return (
    <MobileGrid columns={2} gap="sm">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <MobileCard className="p-4 text-center">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-xs text-gray-600 mb-1">{stat.label}</div>
            <div className="text-xs text-green-600 font-medium">{stat.change}</div>
          </MobileCard>
        </motion.div>
      ))}
    </MobileGrid>
  );
}

// Recent Activity Feed
function MobileActivityFeed() {
  const [alerts] = useState([
    {
      id: 1,
      type: 'injury' as const,
      title: 'Injury Update',
      description: 'Davante Adams listed as questionable for Sunday',
      playerName: 'Davante Adams',
      timestamp: '2m ago'
    },
    {
      id: 2,
      type: 'news' as const,
      title: 'Breakout Performance',
      description: 'Rookie WR had career-high 3 TDs last game',
      playerName: 'Jordan Addison',
      timestamp: '15m ago'
    },
    {
      id: 3,
      type: 'target' as const,
      title: 'Waiver Target',
      description: 'High-value pickup available for this week',
      playerName: 'Tyler Boyd',
      timestamp: '1h ago'
    }
  ]);

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <MobileFantasyAlert
          key={alert.id}
          type={alert.type}
          title={alert.title}
          description={alert.description}
          playerName={alert.playerName}
          timestamp={alert.timestamp}
        />
      ))}
    </div>
  );
}

// Mobile Roster Preview
function MobileRosterPreview() {
  const lineup = [
    {
      id: '1',
      name: 'Josh Allen',
      team: 'BUF',
      position: 'QB',
      projectedPoints: 24.5,
      status: 'active' as const,
      trend: 'up' as const
    },
    {
      id: '2',
      name: 'Christian McCaffrey',
      team: 'SF',
      position: 'RB',
      projectedPoints: 22.8,
      status: 'active' as const,
      trend: 'up' as const
    },
    {
      id: '3',
      name: 'Davante Adams',
      team: 'LV',
      position: 'WR',
      projectedPoints: 18.2,
      status: 'questionable' as const,
      trend: 'down' as const
    }
  ];

  return (
    <div className="space-y-3">
      {lineup.map((player) => (
        <MobilePlayerCard
          key={player.id}
          player={player}
          compact={true}
          showActions={false}
        />
      ))}
    </div>
  );
}

// Live Games Preview
function MobileLiveGames() {
  const games = [
    {
      homeTeam: 'KC',
      awayTeam: 'BUF',
      homeScore: 21,
      awayScore: 17,
      quarter: '3rd',
      timeRemaining: '8:42',
      possession: 'home' as const,
      isRedZone: true
    },
    {
      homeTeam: 'SF',
      awayTeam: 'DAL',
      homeScore: 14,
      awayScore: 10,
      quarter: '2nd',
      timeRemaining: '2:15',
      possession: 'away' as const
    }
  ];

  return (
    <div className="space-y-3">
      {games.map((game, index) => (
        <MobileLiveScore
          key={index}
          {...game}
        />
      ))}
    </div>
  );
}

export default function MobileHomepage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-black text-2xl">AF</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AstralField</h1>
            <p className="text-gray-600">Your Fantasy Football Command Center</p>
          </div>

          <div className="space-y-4">
            <TouchFriendlyButton
              href="/login"
              variant="primary"
              size="lg"
              fullWidth
            >
              Sign In to Your League
            </TouchFriendlyButton>
            
            <TouchFriendlyButton
              href="/signup"
              variant="outline"
              size="lg"
              fullWidth
            >
              Create New Account
            </TouchFriendlyButton>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Join millions of fantasy football managers</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Header */}
      <MobileHeader />
      
      {/* Main Dashboard */}
      <MobileOptimizedLayout>
        <div className="space-y-6">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MobileCard className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-1">
                    Welcome back, {user.name}!
                  </h1>
                  <p className="text-blue-100">
                    Your teams are ready for Week 7
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">#2</div>
                  <div className="text-sm text-blue-200">League Rank</div>
                </div>
              </div>
            </MobileCard>
          </motion.div>

          {/* Quick Actions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <MobileQuickActions onAction={() => {}} />
          </section>

          {/* Dashboard Stats */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Stats</h2>
              <Link href="/analytics" className="text-sm text-blue-600 font-medium">
                View All <ArrowRight className="inline w-4 h-4" />
              </Link>
            </div>
            <MobileStatsDashboard />
          </section>

          {/* Live Games */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Live Games</h2>
              <Link href="/live" className="text-sm text-blue-600 font-medium">
                All Games <ArrowRight className="inline w-4 h-4" />
              </Link>
            </div>
            <MobileLiveGames />
          </section>

          {/* Starting Lineup */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Starting Lineup</h2>
              <Link href="/lineup" className="text-sm text-blue-600 font-medium">
                Manage <ArrowRight className="inline w-4 h-4" />
              </Link>
            </div>
            <MobileRosterPreview />
          </section>

          {/* Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <TouchFriendlyButton variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </TouchFriendlyButton>
            </div>
            <MobileActivityFeed />
          </section>

          {/* Bottom Navigation Space */}
          <div className="h-20" />
        </div>
      </MobileOptimizedLayout>
    </>
  );
}