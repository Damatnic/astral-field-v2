'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import LiveScoresTicker from '@/components/dashboard/LiveScoresTicker';
import TeamPerformanceMetrics from '@/components/dashboard/TeamPerformanceMetrics';
import LeagueActivityFeed from '@/components/dashboard/LeagueActivityFeed';
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
  Activity,
  Sparkles
} from 'lucide-react';

// Dashboard stats component
function DashboardStats() {
  const stats = [
    {
      label: 'D&apos;Amato Dynasty League',
      value: '1',
      change: 'Active',
      changeType: 'positive',
      icon: Trophy
    },
    {
      label: 'League Members',
      value: '10',
      change: 'Full League',
      changeType: 'positive', 
      icon: Users
    },
    {
      label: 'Season Progress',
      value: '18%',
      change: 'Week 3 of 17',
      changeType: 'positive',
      icon: Target
    },
    {
      label: 'League Avg Score',
      value: '115.3',
      change: 'Current Week',
      changeType: 'positive',
      icon: TrendingUp
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <div key={stat.label} className="card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className={`text-sm font-medium ${
                  stat.changeType === 'positive' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {stat.change}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <IconComponent className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Quick actions component
function QuickActions() {
  const { hasPermission } = useAuth();

  const actions = [
    {
      name: 'Join League',
      description: 'Find and join a new fantasy league',
      href: '/leagues/join',
      icon: Trophy,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      name: 'Draft Room',
      description: 'Enter live draft room',
      href: '/draft',
      icon: PlayCircle,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: 'Player Research',
      description: 'Analyze player performance',
      href: '/players',
      icon: BarChart3,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      name: 'League Chat',
      description: 'Connect with league members',
      href: '/chat',
      icon: MessageCircle,
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  // Add admin/commissioner actions
  if (hasPermission(['ADMIN', 'COMMISSIONER'])) {
    actions.push({
      name: hasPermission(['ADMIN']) ? 'Admin Panel' : 'Commissioner Tools',
      description: hasPermission(['ADMIN']) ? 'Manage platform settings' : 'Manage your leagues',
      href: hasPermission(['ADMIN']) ? '/admin' : '/commissioner',
      icon: hasPermission(['ADMIN']) ? Shield : Crown,
      color: 'bg-red-500 hover:bg-red-600'
    });
  }

  return (
    <div className="card">
      <h2 className="section-title">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Link
              key={action.name}
              href={action.href as any}
              className="group relative p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${action.color} flex items-center justify-center transition-colors duration-200`}>
                  <IconComponent className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                    {action.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Recent activity component
function RecentActivity() {
  const activities = [
    {
      id: 1,
      type: 'trade',
      message: 'Nicholas D&apos;Amato proposed trade to Nick Hartley',
      timestamp: '2 hours ago',
      icon: Activity,
      color: 'text-green-600'
    },
    {
      id: 2,
      type: 'waiver',
      message: 'Jon Kornbeck claimed Jerome Ford from waivers',
      timestamp: '4 hours ago',
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      id: 3,
      type: 'matchup',
      message: 'David Jarvey leads with highest Week 2 score (156.8)',
      timestamp: '3 days ago',
      icon: Trophy,
      color: 'text-yellow-600'
    },
    {
      id: 4,
      type: 'lineup',
      message: 'Jack McCaigue updated Week 3 starting lineup',
      timestamp: '6 hours ago',
      icon: Star,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="card">
      <h2 className="section-title">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity) => {
          const IconComponent = activity.icon;
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center`}>
                <IconComponent className={`h-4 w-4 ${activity.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6">
        <Link
          href={"/activity" as any}
          className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center"
        >
          View all activity
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// Upcoming events component
function UpcomingEvents() {
  const events = [
    {
      id: 1,
      title: 'Week 3 Lineups Due',
      description: 'D\'Amato Dynasty League',
      date: 'Thursday, 8:20 PM',
      type: 'lineup',
      urgent: true
    },
    {
      id: 2,
      title: 'Trade Deadline',
      description: 'D&apos;Amato Dynasty League',
      date: 'Nov 19, 2024',
      type: 'deadline',
      urgent: false
    },
    {
      id: 3,
      title: 'Fantasy Playoffs',
      description: 'D&apos;Amato Dynasty League',
      date: 'Week 15-17',
      type: 'playoffs',
      urgent: false
    }
  ];

  return (
    <div className="card">
      <h2 className="section-title">Upcoming Events</h2>
      <div className="space-y-4">
        {events.map((event) => (
          <div 
            key={event.id} 
            className={`p-3 rounded-lg border ${
              event.urgent 
                ? 'border-orange-200 bg-orange-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {event.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {event.description}
                </p>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                event.urgent
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {event.date}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Authenticated dashboard component
function AuthenticatedDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome header with enhanced styling */}
        <div className="page-header relative">
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome back, {user?.name?.split(' ')[0]}!
              </h1>
              <Sparkles className="h-8 w-8 text-yellow-500 animate-spin-slow" />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Here&apos;s what&apos;s happening in the D&apos;Amato Dynasty League today.
            </p>
          </div>
        </div>

        {/* Live Scores Ticker */}
        <div className="mb-8">
          <LiveScoresTicker />
        </div>

        {/* Dashboard stats */}
        <div className="mb-8">
          <DashboardStats />
        </div>

        {/* Team Performance Metrics */}
        <div className="mb-8">
          <TeamPerformanceMetrics />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            <QuickActions />
            <LeagueActivityFeed leagueId="damato-dynasty-league" />
          </div>

          {/* Right column - 1/3 width */}
          <div className="space-y-8">
            <UpcomingEvents />
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  );
}

// Landing page for non-authenticated users
function LandingPage() {
  const features = [
    {
      name: 'AI-Powered Insights',
      description: 'Get personalized recommendations and predictions powered by advanced AI.',
      icon: Zap
    },
    {
      name: 'Advanced Analytics',
      description: 'Deep dive into player stats, trends, and performance metrics.',
      icon: BarChart3
    },
    {
      name: 'Real-time Updates',
      description: 'Stay updated with live scores, news, and player updates.',
      icon: Activity
    },
    {
      name: 'Draft Tools',
      description: 'Comprehensive draft preparation and live draft assistance.',
      icon: Target
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
        
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Fantasy Football
              <span className="gradient-text"> Reimagined</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Experience the future of fantasy football with AI-powered insights, 
              advanced analytics, and immersive league management.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/login" className="btn-primary text-lg px-8 py-3">
                Get started
              </Link>
              <Link 
                href="/features" 
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-green-600 transition-colors"
              >
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
        </div>
      </div>

      {/* Features section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-green-600">
              Everything you need
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Built for serious fantasy players
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              From casual players to championship contenders, AstralField provides 
              the tools and insights you need to dominate your leagues.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <div key={feature.name} className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      {feature.name}
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">
                      {feature.description}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-green-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to dominate your league?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-green-100">
              Join thousands of fantasy players who trust AstralField to give them 
              the competitive edge they need.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/login"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-green-600 shadow-sm hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Start your journey
              </Link>
              <Link
                href={"/contact" as any}
                className="text-sm font-semibold leading-6 text-white hover:text-green-100"
              >
                Contact sales <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function HomePage() {
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AstralField...</p>
        </div>
      </div>
    );
  }

  // Show appropriate content based on auth state
  return user ? <AuthenticatedDashboard /> : <LandingPage />;
}