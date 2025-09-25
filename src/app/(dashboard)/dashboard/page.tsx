'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Users, Calendar, TrendingUp, AlertCircle, 
  Shield, Star, Award, Activity, 
  ArrowUpRight, ArrowDownRight, Minus, BarChart3,
  Clock, ChevronRight, Settings, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';

// Data interfaces
interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
}

interface UserTeam {
  id: string;
  name: string;
  record: TeamRecord;
  pointsFor: number;
  pointsAgainst: number;
  standing: number;
  totalTeams: number;
  leagueId?: string;
}

interface UpcomingMatchup {
  opponent: {
    name: string;
    record: TeamRecord;
  };
  week: number;
}

// Enhanced stat card component with gradients and animations
const StatCard = ({ 
  title, 
  value, 
  subtitle,
  change, 
  icon: Icon,
  trend,
  gradientColor = 'green'
}: any) => (
  <div className="group relative overflow-hidden rounded-xl bg-white border border-gray-200 hover:shadow-xl hover:shadow-green-100/50 transition-all duration-300 hover:-translate-y-1">
    {/* Gradient overlay */}
    <div className={`absolute inset-0 bg-gradient-to-br ${
      gradientColor === 'green' ? 'from-green-50 via-emerald-50 to-teal-50' :
      gradientColor === 'blue' ? 'from-blue-50 via-indigo-50 to-purple-50' :
      gradientColor === 'orange' ? 'from-orange-50 via-amber-50 to-yellow-50' :
      'from-gray-50 via-slate-50 to-zinc-50'
    } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
    
    <div className="relative p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
          gradientColor === 'green' ? 'from-green-500 to-emerald-600' :
          gradientColor === 'blue' ? 'from-blue-500 to-indigo-600' :
          gradientColor === 'orange' ? 'from-orange-500 to-amber-600' :
          'from-gray-500 to-slate-600'
        } flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${
            change > 0 ? 'text-green-700 bg-green-100' : 
            change < 0 ? 'text-red-700 bg-red-100' : 
            'text-gray-700 bg-gray-100'
          } transition-colors duration-200`}>
            {change > 0 ? <ArrowUpRight className="w-4 h-4" /> : 
             change < 0 ? <ArrowDownRight className="w-4 h-4" /> : 
             <Minus className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
          {value}
        </h3>
        <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  </div>
);

// Enhanced matchup card with battle theme
const MatchupCard = ({ matchup, userTeam, router }: any) => (
  <div className="relative overflow-hidden rounded-xl bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
    {/* Epic background gradient */}
    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
    
    {/* Header */}
    <div className="relative px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          ⚡ Week {matchup.week} Showdown
        </h2>
        <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-full shadow-md">
          🔥 LIVE
        </span>
      </div>
    </div>
    
    <div className="relative p-6">
      <div className="grid grid-cols-3 gap-6 items-center">
        {/* User team */}
        <div className="text-center group">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow duration-300 ring-4 ring-green-100">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">{userTeam?.name || 'Your Team'}</h3>
          <p className="text-green-600 font-semibold mt-1">
            {userTeam ? `${userTeam.record.wins}-${userTeam.record.losses}` : '0-0'}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {userTeam?.pointsFor?.toFixed(1) || '0.0'} PF
          </p>
        </div>
        
        {/* VS with animation */}
        <div className="text-center">
          <div className="animate-pulse">
            <div className="text-4xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              VS
            </div>
            <div className="mt-2 text-xs text-gray-500 font-semibold">BATTLE ROYALE</div>
          </div>
        </div>
        
        {/* Opponent */}
        <div className="text-center group">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow duration-300 ring-4 ring-orange-100">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">{matchup.opponent.name}</h3>
          <p className="text-orange-600 font-semibold mt-1">
            {matchup.opponent.record.wins}-{matchup.opponent.record.losses}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Challenger</p>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-100">
        <Button 
          onClick={() => router.push('/matchup')}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          🎯 View Battle Details
        </Button>
      </div>
    </div>
  </div>
);

// Enhanced quick action card with hover effects
const QuickAction = ({ 
  title, 
  description, 
  icon: Icon, 
  action,
  color = 'green',
  emoji = '🚀'
}: any) => (
  <div 
    className="group relative cursor-pointer transition-all duration-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 rounded-lg border-l-4 border-transparent hover:border-blue-500"
    onClick={action}
  >
    <div className="p-4">
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 shadow-md ${
          color === 'green' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
          color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
          color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
          'bg-gradient-to-br from-gray-500 to-slate-600'
        }`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
            {emoji} {title}
          </h3>
          <p className="text-sm text-gray-600 group-hover:text-gray-700 mt-1">{description}</p>
        </div>
        
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-all duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  </div>
);

// Recent activity item
const ActivityItem = ({ type, message, time }: any) => {
  const getIcon = () => {
    switch(type) {
      case 'trade': return <TrendingUp className="w-4 h-4" />;
      case 'waiver': return <RefreshCw className="w-4 h-4" />;
      case 'score': return <Trophy className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };
  
  const getColor = () => {
    switch(type) {
      case 'trade': return 'text-blue-600 bg-blue-100';
      case 'waiver': return 'text-orange-600 bg-orange-100';
      case 'score': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  return (
    <div className="flex items-start space-x-3 py-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getColor()}`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-900">{message}</p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  );
};

// Helper functions
const getActivityEmoji = (type: string) => {
  switch(type) {
    case 'trade': return '📈';
    case 'waiver': return '⚡';
    case 'score': return '🏆';
    case 'injury': return '🚑';
    default: return '📌';
  }
};

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInHours < 48) return '1 day ago';
  return `${Math.floor(diffInHours / 24)} days ago`;
};

// Main dashboard component
export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [upcomingMatchup, setUpcomingMatchup] = useState<UpcomingMatchup | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [leagueStandings, setLeagueStandings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data
  useEffect(() => {
    async function fetchUserData() {
      try {
        // Fetch user's team data
        const teamResponse = await fetch('/api/my-team');
        if (teamResponse.ok) {
          const teamApiData = await teamResponse.json();
          if (teamApiData.success && teamApiData.data) {
            const apiData = teamApiData.data;
            setUserTeam({
              id: apiData.team.id,
              name: apiData.team.name,
              record: apiData.record,
              pointsFor: apiData.pointsFor,
              pointsAgainst: apiData.pointsAgainst,
              standing: apiData.standing,
              totalTeams: 10
            });
          }
        } else {
          // Fallback with demo data if API fails
          setUserTeam({
            id: 'demo-team',
            name: `${user?.name || 'Your'} Dynasty`,
            record: { wins: 2, losses: 1, ties: 0 },
            pointsFor: 367.8,
            pointsAgainst: 342.1,
            standing: 3,
            totalTeams: 10
          });
        }

        // Fetch upcoming matchup
        const matchupResponse = await fetch('/api/my-matchup');
        if (matchupResponse.ok) {
          const matchupApiData = await matchupResponse.json();
          if (matchupApiData.success && matchupApiData.data && matchupApiData.data.opponent) {
            const apiData = matchupApiData.data;
            setUpcomingMatchup({
              opponent: {
                name: apiData.opponent.name,
                record: {
                  wins: apiData.opponent.wins,
                  losses: apiData.opponent.losses,
                  ties: 0
                }
              },
              week: apiData.matchup?.week || 4
            });
          }
        } else {
          // Fallback matchup data
          setUpcomingMatchup({
            opponent: {
              name: 'The Competitors',
              record: { wins: 1, losses: 2, ties: 0 }
            },
            week: 4
          });
        }

        // Fetch recent activity
        try {
          const activityResponse = await fetch('/api/activity');
          if (activityResponse.ok) {
            const activityData = await activityResponse.json();
            if (activityData.success) {
              setRecentActivity(activityData.data.slice(0, 4)); // Show only 4 most recent
            }
          }
        } catch (err) {
          console.error('Error fetching activity:', err);
          // Keep default empty array
        }

        // Fetch league standings - need league ID from team
        if (userTeam?.id || userTeam?.leagueId) {
          try {
            const leagueId = userTeam?.leagueId || 'cmfy5ltrp000v1xpso7ux8a9v'; // Use fallback league ID
            const standingsResponse = await fetch(`/api/leagues/${leagueId}/standings`);
            if (standingsResponse.ok) {
              const standingsData = await standingsResponse.json();
              if (standingsData.success) {
                setLeagueStandings(standingsData.data.standings.slice(0, 3)); // Show top 3
              }
            }
          } catch (err) {
            console.error('Error fetching standings:', err);
            // Keep default empty array
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set fallback data on error
        setUserTeam({
          id: 'demo-team',
          name: `${user?.name || 'Your'} Dynasty`,
          record: { wins: 2, losses: 1, ties: 0 },
          pointsFor: 367.8,
          pointsAgainst: 342.1,
          standing: 3,
          totalTeams: 10
        });
        setUpcomingMatchup({
          opponent: {
            name: 'The Competitors',
            record: { wins: 1, losses: 2, ties: 0 }
          },
          week: 4
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchUserData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Dashboard</h2>
          <p className="text-gray-600 mt-2">Fetching your team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header with gradient background */}
      <header className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-2xl">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.05\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"4\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center shadow-xl">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white mb-2">
                  🏈 Fantasy Command Center
                </h1>
                <p className="text-blue-200 text-lg font-medium">
                  Welcome back, <span className="text-emerald-300 font-bold">{user?.name || 'Champion'}</span> 
                  <span className="ml-2">🎯</span>
                </p>
              </div>
            </div>
            <Button 
              onClick={() => router.push('/settings')}
              className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Settings className="w-5 h-5 mr-2" />
              ⚙️ League Control
            </Button>
          </div>
        </div>
        
        {/* Bottom gradient border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="League Standing"
            value={`#${userTeam?.standing || 1} of ${userTeam?.totalTeams || 10}`}
            subtitle="Current Position"
            icon={Trophy}
            change={0}
            gradientColor="green"
          />
          <StatCard
            title="Team Record"
            value={userTeam ? `${userTeam.record.wins}-${userTeam.record.losses}` : '0-0'}
            subtitle="Win-Loss Record"
            icon={Award}
            change={userTeam ? ((userTeam.record.wins / (userTeam.record.wins + userTeam.record.losses)) * 100).toFixed(0) : 0}
            gradientColor="blue"
          />
          <StatCard
            title="Points For"
            value={userTeam?.pointsFor?.toFixed(1) || '0.0'}
            subtitle="Total Points Scored"
            icon={TrendingUp}
            change={5.2}
            gradientColor="orange"
          />
          <StatCard
            title="Points Against"
            value={userTeam?.pointsAgainst?.toFixed(1) || '0.0'}
            subtitle="Total Points Allowed"
            icon={Shield}
            change={-2.1}
            gradientColor="gray"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Matchup */}
            {upcomingMatchup && (
              <MatchupCard matchup={upcomingMatchup} userTeam={userTeam} router={router} />
            )}

            {/* Enhanced Quick Actions */}
            <div className="overflow-hidden rounded-xl bg-white border border-gray-200 shadow-lg">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-slate-700 bg-clip-text text-transparent">
                  ⚡ Power Moves
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                <QuickAction
                  title="Set Lineup"
                  description="Optimize your starting lineup for this week"
                  icon={Users}
                  color="green"
                  emoji="🎯"
                  action={() => router.push('/roster')}
                />
                <QuickAction
                  title="Waiver Wire"
                  description="Browse available free agents"
                  icon={RefreshCw}
                  color="blue"
                  emoji="🔄"
                  action={() => router.push('/waivers')}
                />
                <QuickAction
                  title="Trade Center"
                  description="Review trade offers and proposals"
                  icon={TrendingUp}
                  color="orange"
                  emoji="🤝"
                  action={() => router.push('/trades')}
                />
                <QuickAction
                  title="League Standings"
                  description="View full league standings and playoff picture"
                  icon={BarChart3}
                  color="green"
                  emoji="📊"
                  action={() => router.push('/standings')}
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Enhanced Recent Activity */}
            <div className="overflow-hidden rounded-xl bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                  🚀 Recent Activity
                </h2>
              </div>
              <div className="p-4">
                <div className="divide-y divide-gray-100">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <ActivityItem
                        key={activity.id || index}
                        type={activity.type}
                        message={`${getActivityEmoji(activity.type)} ${activity.description}`}
                        time={formatTimeAgo(activity.timestamp)}
                      />
                    ))
                  ) : (
                    <>
                      <ActivityItem
                        type="score"
                        message="🏆 Won Week 2 matchup 125.4 - 98.2"
                        time="2 days ago"
                      />
                      <ActivityItem
                        type="waiver"
                        message="⚡ Added K. Walker from waivers"
                        time="3 days ago"
                      />
                      <ActivityItem
                        type="trade"
                        message="📈 Trade proposal received from Team Alpha"
                        time="5 days ago"
                      />
                      <ActivityItem
                        type="score"
                        message="😤 Lost Week 1 matchup 102.1 - 108.5"
                        time="1 week ago"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced League Leaders */}
            <div className="overflow-hidden rounded-xl bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-gray-100">
                <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-700 to-amber-600 bg-clip-text text-transparent">
                  👑 League Leaders
                </h2>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {leagueStandings.length > 0 ? (
                    leagueStandings.map((team, index) => {
                      const getRankEmoji = (rank: number) => {
                        switch(rank) {
                          case 1: return '🥇';
                          case 2: return '🥈';
                          case 3: return '🥉';
                          default: return '';
                        }
                      };

                      const getRankColors = (rank: number) => {
                        switch(rank) {
                          case 1: return {
                            bg: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200',
                            iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
                            textColor: 'text-yellow-700',
                            subtitle: 'First Place Champion'
                          };
                          case 2: return {
                            bg: 'bg-gray-50 border-gray-200',
                            iconBg: 'bg-gradient-to-br from-gray-400 to-slate-500',
                            textColor: 'text-gray-700',
                            subtitle: 'Second Place'
                          };
                          case 3: return {
                            bg: 'bg-orange-50 border-orange-200',
                            iconBg: 'bg-gradient-to-br from-orange-400 to-amber-500',
                            textColor: 'text-orange-700',
                            subtitle: 'Third Place'
                          };
                          default: return {
                            bg: 'bg-gray-50 border-gray-200',
                            iconBg: 'bg-gradient-to-br from-gray-400 to-slate-500',
                            textColor: 'text-gray-700',
                            subtitle: `${rank}th Place`
                          };
                        }
                      };

                      const colors = getRankColors(team.rank);
                      
                      return (
                        <div key={team.teamId} className={`flex items-center justify-between p-3 rounded-lg border ${colors.bg}`}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${colors.iconBg}`}>
                              {team.rank === 1 ? <Star className="w-5 h-5 text-white" /> : 
                               <span className="text-sm font-bold text-white">{team.rank}</span>}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{getRankEmoji(team.rank)} {team.teamName}</p>
                              <p className={`text-xs font-semibold ${colors.textColor}`}>{colors.subtitle}</p>
                            </div>
                          </div>
                          <span className={`text-lg font-bold ${colors.textColor}`}>
                            {team.wins}-{team.losses}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                            <Star className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">🥇 Team Dynasty</p>
                            <p className="text-xs text-yellow-700 font-semibold">First Place Champion</p>
                          </div>
                        </div>
                        <span className="text-lg font-black text-yellow-700">3-0</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-slate-500 flex items-center justify-center shadow-lg">
                            <span className="text-sm font-bold text-white">2</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">🥈 Power Squad</p>
                            <p className="text-xs text-gray-600">Second Place</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-gray-700">2-1</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                            <span className="text-sm font-bold text-white">3</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">🥉 Elite Team</p>
                            <p className="text-xs text-orange-700">Third Place</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-orange-700">2-1</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}