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
import MyTeamCard from '@/components/team/MyTeamCard';
import CurrentMatchup from '@/components/matchup/CurrentMatchup';
import WeekStatus from '@/components/league/WeekStatus';
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
  ArrowRight,
  Star,
  Activity,
  Calendar,
  ChevronRight,
  TrendingDown,
  ExternalLink,
  Flame,
  AlertTriangle
} from 'lucide-react';

// Real Dashboard Stats from D'Amato Dynasty League
function RealDashboardStats() {
  const [leagueData, setLeagueData] = useState<any>(null);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leagueResponse, teamResponse] = await Promise.all([
          fetch('/api/league/damato'),
          fetch('/api/my-team')
        ]);

        if (leagueResponse.ok && teamResponse.ok) {
          const league = await leagueResponse.json();
          const team = await teamResponse.json();
          setLeagueData(league);
          setUserTeam(team.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!userTeam || !leagueData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
        <p className="text-red-800">Unable to load team data. Please check your connection.</p>
      </div>
    );
  }

  // Calculate user's league rank
  const sortedTeams = leagueData.teams?.sort((a: any, b: any) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return Number(b.pointsFor) - Number(a.pointsFor);
  }) || [];
  
  const userRank = sortedTeams.findIndex((team: any) => team.id === userTeam.id) + 1;
  const totalTeams = sortedTeams.length;
  
  const stats = [
    {
      label: 'League Rank',
      value: `#${userRank}`,
      change: `of ${totalTeams}`,
      trend: userRank <= totalTeams / 2 ? 'up' : 'down',
      icon: Trophy,
      color: userRank <= 3 ? 'text-yellow-600 bg-yellow-50' : 'text-blue-600 bg-blue-50',
      accent: userRank <= 3 ? 'border-yellow-200' : 'border-blue-200'
    },
    {
      label: 'Total Points',
      value: Number(userTeam.pointsFor).toFixed(1),
      change: `vs ${Number(userTeam.pointsAgainst).toFixed(1)} against`,
      trend: Number(userTeam.pointsFor) > Number(userTeam.pointsAgainst) ? 'up' : 'down',
      icon: Target,
      color: 'text-green-600 bg-green-50',
      accent: 'border-green-200'
    },
    {
      label: 'Record',
      value: `${userTeam.wins}-${userTeam.losses}`,
      change: `${(userTeam.record.percentage * 100).toFixed(0)}%`,
      trend: userTeam.record.percentage >= 0.5 ? 'up' : 'down',
      icon: TrendingUp,
      color: userTeam.record.percentage >= 0.5 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50',
      accent: userTeam.record.percentage >= 0.5 ? 'border-green-200' : 'border-red-200'
    },
    {
      label: 'Proj. This Week',
      value: userTeam.stats.currentWeekProjection.toFixed(1),
      change: 'points',
      trend: userTeam.stats.currentWeekProjection > userTeam.stats.seasonAverage ? 'up' : 'down',
      icon: Activity,
      color: 'text-purple-600 bg-purple-50',
      accent: 'border-purple-200'
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
// Real Quick Actions Grid - Only Working Features
function RealQuickActionsGrid() {
  const [actionStats, setActionStats] = useState<any>({});
  
  useEffect(() => {
    // This would fetch real stats for each action
    setActionStats({
      lineup: 'Check starters',
      trade: 'Analyze trades', 
      players: 'Research hub',
      standings: 'View rankings'
    });
  }, []);

  const actions = [
    {
      name: 'My Team',
      description: 'Manage lineup and roster',
      href: '/teams',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'from-blue-600 to-blue-700',
      stats: actionStats.lineup || 'Manage lineup'
    },
    {
      name: 'Trade Analyzer',
      description: 'Evaluate trade proposals',
      href: '/trade',
      icon: ArrowRight,
      gradient: 'from-purple-500 to-purple-600',
      hoverGradient: 'from-purple-600 to-purple-700',
      stats: actionStats.trade || 'AI-powered'
    },
    {
      name: 'Player Research',
      description: 'Stats and player analysis',
      href: '/players',
      icon: BarChart3,
      gradient: 'from-orange-500 to-orange-600',
      hoverGradient: 'from-orange-600 to-orange-700',
      stats: actionStats.players || 'Real-time data'
    },
    {
      name: 'League Standings',
      description: 'View current rankings',
      href: '/league',
      icon: Trophy,
      gradient: 'from-yellow-500 to-yellow-600',
      hoverGradient: 'from-yellow-600 to-yellow-700',
      stats: actionStats.standings || '10 teams'
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

// Real Top Performers from D'Amato Dynasty League
function LeagueTopPerformers() {
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopPerformers = async () => {
      try {
        const response = await fetch('/api/league/damato');
        if (response.ok) {
          const league = await response.json();
          
          // Extract and sort all players by recent performance
          const allPlayers: any[] = [];
          league.teams?.forEach((team: any) => {
            team.roster?.forEach((rosterSpot: any) => {
              if (rosterSpot.player?.playerStats?.length > 0) {
                const latestStats = rosterSpot.player.playerStats[0];
                allPlayers.push({
                  name: rosterSpot.player.name,
                  position: rosterSpot.player.position,
                  team: rosterSpot.player.nflTeam,
                  points: Number(latestStats.fantasyPoints || 0),
                  owner: team.owner.name,
                  teamName: team.name,
                  status: rosterSpot.player.status || 'healthy',
                  trend: 'up' // Would calculate based on recent games
                });
              }
            });
          });
          
          // Sort by points and take top 5
          const sorted = allPlayers.sort((a, b) => b.points - a.points).slice(0, 5);
          setTopPerformers(sorted);
        }
      } catch (error) {
        console.error('Failed to fetch top performers:', error);
        // Fallback to mock data if API fails
        setTopPerformers([
          {
            name: 'Player data loading...',
            position: '--',
            team: '--',
            points: 0,
            owner: 'Loading...',
            status: 'unknown',
            trend: 'up'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopPerformers();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Flame className="h-5 w-5 text-orange-500 mr-2" />
            League Leaders
          </h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Flame className="h-5 w-5 text-orange-500 mr-2" />
          League Leaders
        </h2>
        <Link href="/players" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View All
        </Link>
      </div>
      
      <div className="space-y-4">
        {topPerformers.map((player, index) => (
          <motion.div
            key={`${player.name}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="text-lg font-bold text-gray-600 w-6">
                #{index + 1}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">{player.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    player.status === 'healthy' || player.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : player.status === 'questionable'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {player.status || 'Active'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{player.position} • {player.team}</p>
                <p className="text-xs text-blue-600">{player.owner}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-gray-900">{player.points.toFixed(1)}</span>
                <div className={`flex items-center ${
                  player.trend === 'up' ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {player.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">Last week</p>
            </div>
          </motion.div>
        ))}
      </div>
      
      {topPerformers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No player data available yet.</p>
          <p className="text-sm">Check back after games are played.</p>
        </div>
      )}
    </div>
  );
}

// Real League Activity Feed
function LeagueActivity() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeagueActivity = async () => {
      try {
        const response = await fetch('/api/leagues/league-damato-dynasty-2024/activity');
        if (response.ok) {
          const data = await response.json();
          setActivities(data.slice(0, 6)); // Show last 6 activities
        } else {
          // Fallback to recent matchup results
          const leagueResponse = await fetch('/api/league/damato');
          if (leagueResponse.ok) {
            const league = await leagueResponse.json();
            const recentMatchups = league.matchups?.slice(0, 5) || [];
            
            const mockActivities = recentMatchups.map((matchup: any, index: number) => ({
              type: 'matchup',
              icon: Trophy,
              color: 'text-blue-600 bg-blue-100',
              title: `Week ${matchup.week} Result`,
              description: `${matchup.homeTeam.owner.name} vs ${matchup.awayTeam.owner.name}`,
              time: `${index + 1} day${index > 0 ? 's' : ''} ago`,
              details: matchup.isCompleted ? `Final: ${Number(matchup.homeScore).toFixed(1)} - ${Number(matchup.awayScore).toFixed(1)}` : 'In progress'
            }));
            
            setActivities(mockActivities);
          }
        }
      } catch (error) {
        console.error('Failed to fetch league activity:', error);
        setActivities([
          {
            type: 'info',
            icon: Activity,
            color: 'text-gray-600 bg-gray-100',
            title: 'League Activity',
            description: 'Recent league activity will appear here',
            time: 'Loading...',
            details: 'Check back soon'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeagueActivity();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">League Activity</h2>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start space-x-4 p-3 rounded-lg animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">League Activity</h2>
        <Link href="/league" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
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
      
      {activities.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No recent activity</p>
          <p className="text-sm">League activity will appear here</p>
        </div>
      )}
    </div>
  );
}

// Simple login redirect for unauthenticated users
function LoginRedirect() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md mx-auto p-8"
      >
        <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-6">
          <span className="text-white font-bold text-xl">🏈</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to AstralField
        </h1>
        <p className="text-gray-600 mb-8">
          The ultimate fantasy football platform for the D'Amato Dynasty League.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 space-x-2"
        >
          <span>Sign In to Continue</span>
          <ExternalLink className="h-4 w-4" />
        </Link>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>D'Amato Dynasty League • 2024 Season</p>
        </div>
      </motion.div>
    </div>
  );
}

// Real D'Amato Dynasty League Dashboard
function RealAuthenticatedDashboard() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(2);
  
  useEffect(() => {
    // Get current week from league data
    const fetchCurrentWeek = async () => {
      try {
        const response = await fetch('/api/league/damato');
        if (response.ok) {
          const league = await response.json();
          setCurrentWeek(league.currentWeek || 2);
        }
      } catch (error) {
        console.error('Failed to fetch current week:', error);
      }
    };
    
    fetchCurrentWeek();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header with Real League Info */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.name?.split(' ')[0] || 'Manager'}! 🏈
              </h1>
              <p className="text-gray-600">
                D'Amato Dynasty League • Week {currentWeek} • 2024 Season
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last updated</div>
              <div className="text-sm font-medium text-gray-900">{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </motion.div>

        {/* Real Stats Grid */}
        <RealDashboardStats />

        {/* Live Scores Ticker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <EnhancedLiveScoresTicker />
        </motion.div>

        {/* Real Quick Actions Grid */}
        <RealQuickActionsGrid />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <LeagueTopPerformers />
            
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
            {/* Current Matchup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CurrentMatchup />
            </motion.div>

            {/* My Team Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <MyTeamCard />
            </motion.div>

            {/* Week Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <WeekStatus />
            </motion.div>
            
            <LeagueActivity />
            
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

// Main Component - D'Amato Dynasty League Home
export default function AstralFieldHomePage() {
  const { user, isLoading } = useAuth();
  const { isMobile } = useBreakpoint();

  // Return mobile version for mobile devices
  if (isMobile && user) {
    return <MobileHomepage />;
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-6">
            <span className="text-white font-bold text-xl animate-pulse">🏈</span>
          </div>
          <div className="w-12 h-12 mx-auto mb-4">
            <div className="w-full h-full border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading AstralField</h2>
          <p className="text-blue-600">Preparing your league dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return user ? <RealAuthenticatedDashboard /> : <LoginRedirect />;
}