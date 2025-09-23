'use client';

import React, { useState, useEffect } from 'react';
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
}

interface UpcomingMatchup {
  opponent: {
    name: string;
    record: TeamRecord;
  };
  week: number;
}

// Clean stat card component
const StatCard = ({ 
  title, 
  value, 
  subtitle,
  change, 
  icon: Icon,
  trend
}: any) => (
  <div className="card hover:shadow-md transition-shadow duration-200">
    <div className="card-body">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-field-green-100 flex items-center justify-center">
          <Icon className="w-6 h-6 text-field-green-600" />
        </div>
        
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            change > 0 ? 'text-green-600' : 
            change < 0 ? 'text-red-600' : 
            'text-gray-500'
          }`}>
            {change > 0 ? <ArrowUpRight className="w-4 h-4" /> : 
             change < 0 ? <ArrowDownRight className="w-4 h-4" /> : 
             <Minus className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-sm text-gray-600 mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  </div>
);

// Clean matchup card
const MatchupCard = ({ matchup, userTeam }: any) => (
  <div className="card">
    <div className="card-header">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Week {matchup.week} Matchup</h2>
        <span className="badge badge-info">Upcoming</span>
      </div>
    </div>
    
    <div className="card-body">
      <div className="grid grid-cols-3 gap-4 items-center">
        {/* User team */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-field-green-100 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-field-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{userTeam?.name || 'Your Team'}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {userTeam ? `${userTeam.record.wins}-${userTeam.record.losses}` : '0-0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {userTeam?.pointsFor?.toFixed(1) || '0.0'} PF
          </p>
        </div>
        
        {/* VS */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-400">VS</div>
        </div>
        
        {/* Opponent */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
            <Shield className="w-10 h-10 text-orange-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{matchup.opponent.name}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {matchup.opponent.record.wins}-{matchup.opponent.record.losses}
          </p>
          <p className="text-xs text-gray-500 mt-1">Opponent</p>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <Button className="w-full btn-primary">
          View Full Matchup
        </Button>
      </div>
    </div>
  </div>
);

// Quick action card
const QuickAction = ({ 
  title, 
  description, 
  icon: Icon, 
  action,
  color = 'green'
}: any) => (
  <div 
    className="card-hover cursor-pointer"
    onClick={action}
  >
    <div className="card-body">
      <div className="flex items-start space-x-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          color === 'green' ? 'bg-field-green-100' :
          color === 'blue' ? 'bg-blue-100' :
          color === 'orange' ? 'bg-orange-100' :
          'bg-gray-100'
        }`}>
          <Icon className={`w-5 h-5 ${
            color === 'green' ? 'text-field-green-600' :
            color === 'blue' ? 'text-blue-600' :
            color === 'orange' ? 'text-orange-600' :
            'text-gray-600'
          }`} />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        
        <ChevronRight className="w-5 h-5 text-gray-400" />
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

// Main dashboard component
export default function DashboardPage() {
  const { user } = useAuth();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [upcomingMatchup, setUpcomingMatchup] = useState<UpcomingMatchup | null>(null);
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
              week: apiData.matchup?.week || 3
            });
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchUserData();
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Manager'}</p>
            </div>
            <Button className="btn-primary">
              <Settings className="w-4 h-4 mr-2" />
              League Settings
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="League Standing"
            value={`${userTeam?.standing || 1}/${userTeam?.totalTeams || 10}`}
            subtitle="Current Position"
            icon={Trophy}
            change={0}
          />
          <StatCard
            title="Record"
            value={userTeam ? `${userTeam.record.wins}-${userTeam.record.losses}` : '0-0'}
            subtitle="Win-Loss"
            icon={Award}
            change={userTeam ? ((userTeam.record.wins / (userTeam.record.wins + userTeam.record.losses)) * 100).toFixed(0) : 0}
          />
          <StatCard
            title="Points For"
            value={userTeam?.pointsFor?.toFixed(1) || '0.0'}
            subtitle="Total Scored"
            icon={TrendingUp}
            change={5.2}
          />
          <StatCard
            title="Points Against"
            value={userTeam?.pointsAgainst?.toFixed(1) || '0.0'}
            subtitle="Total Allowed"
            icon={Shield}
            change={-2.1}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Matchup */}
            {upcomingMatchup && (
              <MatchupCard matchup={upcomingMatchup} userTeam={userTeam} />
            )}

            {/* Quick Actions */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="divide-y divide-gray-100">
                <QuickAction
                  title="Set Lineup"
                  description="Optimize your starting lineup for this week"
                  icon={Users}
                  color="green"
                  action={() => console.log('Set lineup')}
                />
                <QuickAction
                  title="Waiver Wire"
                  description="Browse available free agents"
                  icon={RefreshCw}
                  color="blue"
                  action={() => console.log('Waiver wire')}
                />
                <QuickAction
                  title="Trade Center"
                  description="Review trade offers and proposals"
                  icon={TrendingUp}
                  color="orange"
                  action={() => console.log('Trade center')}
                />
                <QuickAction
                  title="League Standings"
                  description="View full league standings and playoff picture"
                  icon={BarChart3}
                  color="green"
                  action={() => console.log('Standings')}
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="card-body">
                <div className="divide-y divide-gray-100">
                  <ActivityItem
                    type="score"
                    message="Won Week 2 matchup 125.4 - 98.2"
                    time="2 days ago"
                  />
                  <ActivityItem
                    type="waiver"
                    message="Added K. Walker from waivers"
                    time="3 days ago"
                  />
                  <ActivityItem
                    type="trade"
                    message="Trade proposal received from Team Alpha"
                    time="5 days ago"
                  />
                  <ActivityItem
                    type="score"
                    message="Lost Week 1 matchup 102.1 - 108.5"
                    time="1 week ago"
                  />
                </div>
              </div>
            </div>

            {/* League Leaders */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">League Leaders</h2>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        <Star className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Team Dynasty</p>
                        <p className="text-xs text-gray-500">First Place</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">3-0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-600">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Power Squad</p>
                        <p className="text-xs text-gray-500">Second Place</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">2-1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-600">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Elite Team</p>
                        <p className="text-xs text-gray-500">Third Place</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">2-1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}