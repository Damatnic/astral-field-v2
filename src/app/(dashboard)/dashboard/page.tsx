'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Users, Calendar, TrendingUp, AlertCircle, 
  Shield, Star, Award, Activity, 
  ArrowUpRight, ArrowDownRight, Minus, BarChart3,
  Clock, ChevronRight, Settings, RefreshCw, Zap, 
  Flame, Target, Sparkles, Crown, Rocket
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatsCounter } from '@/components/ui/StatsCounter';
import { LiveTicker } from '@/components/ui/LiveTicker';

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

// Particle background for dashboard
const DashboardParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{x: number, y: number, size: number, speedX: number, speedY: number, color: string, opacity: number}> = [];
    const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.3 + 0.1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();

        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x > canvas.width || particle.x < 0) particle.speedX *= -1;
        if (particle.y > canvas.height || particle.y < 0) particle.speedY *= -1;
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-30" />;
};

// Enhanced stat card component with spectacular animations
const StatCard = ({ 
  title, 
  value, 
  subtitle,
  change, 
  icon: Icon,
  trend,
  gradientColor = 'green',
  delay = 0
}: any) => (
  <AnimatedCard 
    className="p-6 hover-lift" 
    gradient={gradientColor} 
    hover="glow"
    delay={delay}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${
        gradientColor === 'green' ? 'from-green-500 to-emerald-600 shadow-green-500/50' :
        gradientColor === 'blue' ? 'from-blue-500 to-indigo-600 shadow-blue-500/50' :
        gradientColor === 'orange' ? 'from-orange-500 to-amber-600 shadow-orange-500/50' :
        gradientColor === 'purple' ? 'from-purple-500 to-violet-600 shadow-purple-500/50' :
        'from-gray-500 to-slate-600 shadow-gray-500/50'
      } flex items-center justify-center shadow-2xl animate-float`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full backdrop-blur-md ${
          change > 0 ? 'text-green-300 bg-green-500/20 border border-green-400/30' : 
          change < 0 ? 'text-red-300 bg-red-500/20 border border-red-400/30' : 
          'text-gray-300 bg-gray-500/20 border border-gray-400/30'
        } animate-pulse`}>
          {change > 0 ? <ArrowUpRight className="w-4 h-4" /> : 
           change < 0 ? <ArrowDownRight className="w-4 h-4" /> : 
           <Minus className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    
    <div>
      <div className="text-4xl font-black text-white mb-2">
        {typeof value === 'number' ? (
          <StatsCounter end={value} className="text-white" gradient={false} />
        ) : (
          <span>{value}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-300 mb-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  </AnimatedCard>
);

// Enhanced matchup card with epic battle theme
const MatchupCard = ({ matchup, userTeam, router }: any) => (
  <AnimatedCard className="overflow-hidden" gradient="rainbow" hover="scale">
    {/* Header */}
    <div className="px-6 py-4 border-b border-white/10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-7 h-7 text-yellow-400 animate-bounce" />
          Week {matchup.week} Showdown
        </h2>
        <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg neon-yellow">
          LIVE BATTLE
        </span>
      </div>
    </div>
    
    <div className="p-6">
      <div className="grid grid-cols-3 gap-6 items-center">
        {/* User team */}
        <div className="text-center group">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl neon-green animate-float ring-4 ring-green-400/30">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h3 className="font-bold text-white text-lg">{userTeam?.name || 'Your Dynasty'}</h3>
          <p className="text-green-400 font-bold mt-1">
            {userTeam ? `${userTeam.record.wins}-${userTeam.record.losses}` : '0-0'}
          </p>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            <StatsCounter end={userTeam?.pointsFor || 367.8} decimals={1} className="text-green-400" gradient={false} /> PF
          </p>
        </div>
        
        {/* VS with epic animation */}
        <div className="text-center">
          <div className="animate-pulse">
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 animate-gradient-shift">
              VS
            </div>
            <div className="mt-2 text-xs text-gray-400 font-bold animate-bounce">EPIC BATTLE</div>
          </div>
        </div>
        
        {/* Opponent */}
        <div className="text-center group">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-400 to-orange-600 flex items-center justify-center shadow-2xl neon-pink animate-float ring-4 ring-red-400/30">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h3 className="font-bold text-white text-lg">{matchup.opponent.name}</h3>
          <p className="text-orange-400 font-bold mt-1">
            {matchup.opponent.record.wins}-{matchup.opponent.record.losses}
          </p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Challenger</p>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-white/10">
        <GlowButton 
          onClick={() => router.push('/matchup')}
          variant="primary"
          className="w-full"
        >
          <Target className="w-5 h-5" />
          View Battle Details
          <Rocket className="w-5 h-5" />
        </GlowButton>
      </div>
    </div>
  </AnimatedCard>
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
    className="group relative cursor-pointer transition-all duration-500 hover:bg-white/10 rounded-lg border-l-4 border-transparent hover:border-purple-500 p-4"
    onClick={action}
  >
    <div className="flex items-start space-x-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110 shadow-lg animate-float ${
        color === 'green' ? 'bg-gradient-to-br from-green-500 to-emerald-600 neon-green' :
        color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 neon-blue' :
        color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-amber-600 neon-yellow' :
        'bg-gradient-to-br from-gray-500 to-slate-600'
      }`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      
      <div className="flex-1">
        <h3 className="font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-yellow-400 group-hover:to-pink-500 transition-all duration-500">
          {emoji} {title}
        </h3>
        <p className="text-sm text-gray-400 group-hover:text-gray-300 mt-1">{description}</p>
      </div>
      
      <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-all duration-500 group-hover:translate-x-1" />
    </div>
  </div>
);

// Recent activity item with animations
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
      case 'trade': return 'text-blue-300 bg-blue-500/20 border-blue-400/30';
      case 'waiver': return 'text-orange-300 bg-orange-500/20 border-orange-400/30';
      case 'score': return 'text-green-300 bg-green-500/20 border-green-400/30';
      default: return 'text-gray-300 bg-gray-500/20 border-gray-400/30';
    }
  };
  
  return (
    <div className="flex items-start space-x-3 py-3 hover-lift">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${getColor()} animate-pulse`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm text-white font-medium">{message}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
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
            record: { wins: 3, losses: 1, ties: 0 },
            pointsFor: 487.2,
            pointsAgainst: 423.8,
            standing: 2,
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
              week: apiData.matchup?.week || 5
            });
          }
        } else {
          // Fallback matchup data
          setUpcomingMatchup({
            opponent: {
              name: 'Elite Competitors',
              record: { wins: 2, losses: 2, ties: 0 }
            },
            week: 5
          });
        }

        // Set fallback recent activity
        setRecentActivity([
          { id: 1, type: 'score', description: 'Won Week 4 matchup 145.2 - 128.7', timestamp: new Date(Date.now() - 86400000).toISOString() },
          { id: 2, type: 'waiver', description: 'Added D. Swift from waivers', timestamp: new Date(Date.now() - 172800000).toISOString() },
          { id: 3, type: 'trade', description: 'Trade completed with Team Alpha', timestamp: new Date(Date.now() - 259200000).toISOString() },
          { id: 4, type: 'score', description: 'Won Week 3 matchup 132.8 - 119.3', timestamp: new Date(Date.now() - 604800000).toISOString() }
        ]);

        // Set fallback league standings
        setLeagueStandings([
          { teamId: '1', teamName: 'Dynasty Kings', wins: 4, losses: 0, rank: 1 },
          { teamId: '2', teamName: userTeam?.name || 'Your Team', wins: 3, losses: 1, rank: 2 },
          { teamId: '3', teamName: 'Championship Squad', wins: 3, losses: 1, rank: 3 }
        ]);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set fallback data on error
        setUserTeam({
          id: 'demo-team',
          name: `${user?.name || 'Your'} Dynasty`,
          record: { wins: 3, losses: 1, ties: 0 },
          pointsFor: 487.2,
          pointsAgainst: 423.8,
          standing: 2,
          totalTeams: 10
        });
        setUpcomingMatchup({
          opponent: {
            name: 'Elite Competitors',
            record: { wins: 2, losses: 2, ties: 0 }
          },
          week: 5
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
      <div className="min-h-screen bg-gradient-animated flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-6 neon-purple"></div>
          <h2 className="text-3xl font-bold text-white mb-3">Loading Command Center</h2>
          <p className="text-gray-300 text-lg animate-pulse">Preparing your dynasty...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-animated" />
      
      {/* Particle effects */}
      <DashboardParticles />
      
      {/* Grid overlay */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgb3BhY2l0eT0iMC4wMyIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgLz48L3N2Zz4=')] opacity-20" />
      
      <div className="relative z-10 min-h-screen">
        {/* Spectacular Header */}
        <header className="relative overflow-hidden glass-dark shadow-2xl border-b border-white/20">
          {/* Animated background effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-orange-900/50 animate-gradient-shift" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Live ticker at the top */}
            <div className="mb-6">
              <LiveTicker className="animate-slide-up" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative animate-float">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 flex items-center justify-center shadow-2xl neon-purple">
                    <Trophy className="w-10 h-10 text-white animate-pulse" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 rounded-3xl blur-2xl opacity-75 animate-pulse" />
                </div>
                
                <div className="animate-slide-up animation-delay-200">
                  <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-gradient-shift mb-2">
                    <Flame className="inline w-12 h-12 text-orange-500 animate-bounce mr-3" />
                    COMMAND CENTER
                    <Sparkles className="inline w-12 h-12 text-yellow-400 animate-spin-slow ml-3" />
                  </h1>
                  <p className="text-xl text-white/90 font-semibold flex items-center gap-2">
                    <Crown className="w-6 h-6 text-yellow-400 animate-bounce" />
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 font-black">{user?.name || 'Champion'}</span>
                    <Target className="w-6 h-6 text-green-400 animate-pulse" />
                  </p>
                </div>
              </div>
              
              <div className="animate-slide-up animation-delay-300">
                <GlowButton 
                  onClick={() => router.push('/settings')}
                  variant="primary"
                  size="lg"
                >
                  <Settings className="w-5 h-5" />
                  League Control
                  <Rocket className="w-5 h-5" />
                </GlowButton>
              </div>
            </div>
          </div>
          
          {/* Epic bottom border */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 animate-gradient-shift" />
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Spectacular Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up animation-delay-400">
            <StatCard
              title="League Standing"
              value={`#${userTeam?.standing || 2} of ${userTeam?.totalTeams || 10}`}
              subtitle="Current Position"
              icon={Trophy}
              change={0}
              gradientColor="green"
              delay={0}
            />
            <StatCard
              title="Team Record"
              value={userTeam ? `${userTeam.record.wins}-${userTeam.record.losses}` : '3-1'}
              subtitle="Win-Loss Record"
              icon={Award}
              change={userTeam ? ((userTeam.record.wins / (userTeam.record.wins + userTeam.record.losses)) * 100).toFixed(0) : 75}
              gradientColor="blue"
              delay={100}
            />
            <StatCard
              title="Points For"
              value={userTeam?.pointsFor || 487.2}
              subtitle="Total Points Scored"
              icon={TrendingUp}
              change={12.5}
              gradientColor="orange"
              delay={200}
            />
            <StatCard
              title="Points Against"
              value={userTeam?.pointsAgainst || 423.8}
              subtitle="Total Points Allowed"
              icon={Shield}
              change={-5.3}
              gradientColor="purple"
              delay={300}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Matchup with epic animations */}
              {upcomingMatchup && (
                <div className="animate-slide-up animation-delay-500">
                  <MatchupCard matchup={upcomingMatchup} userTeam={userTeam} router={router} />
                </div>
              )}

              {/* PRIMARY ROSTER ACTION - Most Important Feature */}
              <AnimatedCard className="animate-slide-up animation-delay-600 mb-8" gradient="rainbow" hover="glow">
                <div className="px-8 py-6 text-center">
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-gradient-shift mb-4">
                    🎯 MANAGE YOUR ROSTER 🎯
                  </h2>
                  <p className="text-xl text-white/90 mb-8 font-semibold">
                    Set your lineup • Drag & drop players • Optimize your team
                  </p>
                  <GlowButton 
                    onClick={() => router.push('/roster')}
                    variant="primary"
                    size="xl"
                    className="transform hover:scale-110 transition-all duration-300 text-2xl py-6 px-12"
                  >
                    <Users className="w-8 h-8" />
                    EDIT LINEUP NOW
                    <Rocket className="w-8 h-8" />
                  </GlowButton>
                </div>
              </AnimatedCard>

              {/* Enhanced Quick Actions */}
              <AnimatedCard className="animate-slide-up animation-delay-700" gradient="blue" hover="lift">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Zap className="w-7 h-7 text-yellow-400 animate-bounce" />
                    Power Moves
                    <Sparkles className="w-7 h-7 text-pink-400 animate-spin-slow" />
                  </h2>
                </div>
                <div className="divide-y divide-white/10">
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
              </AnimatedCard>
            </div>

            {/* Right column with animated cards */}
            <div className="space-y-6">
              {/* Enhanced Recent Activity */}
              <AnimatedCard className="animate-slide-up animation-delay-700" gradient="green" hover="glow">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Rocket className="w-6 h-6 text-green-400 animate-bounce" />
                    Recent Activity
                    <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
                  </h2>
                </div>
                <div className="p-4">
                  <div className="divide-y divide-white/10">
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
                          message="🏆 Won Week 4 matchup 145.2 - 128.7"
                          time="1 day ago"
                        />
                        <ActivityItem
                          type="waiver"
                          message="⚡ Added D. Swift from waivers"
                          time="2 days ago"
                        />
                        <ActivityItem
                          type="trade"
                          message="📈 Trade completed with Team Alpha"
                          time="3 days ago"
                        />
                        <ActivityItem
                          type="score"
                          message="🔥 Won Week 3 matchup 132.8 - 119.3"
                          time="1 week ago"
                        />
                      </>
                    )}
                  </div>
                </div>
              </AnimatedCard>

              {/* Enhanced League Leaders */}
              <AnimatedCard className="animate-slide-up animation-delay-800" gradient="orange" hover="scale">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Crown className="w-6 h-6 text-yellow-400 animate-float" />
                    League Leaders
                    <Star className="w-6 h-6 text-amber-400 animate-pulse" />
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
                              bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-400/30',
                              iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-500 neon-yellow',
                              textColor: 'text-yellow-300',
                              subtitle: 'First Place Champion'
                            };
                            case 2: return {
                              bg: 'bg-gray-500/20 border-gray-400/30',
                              iconBg: 'bg-gradient-to-br from-gray-400 to-slate-500 neon-purple',
                              textColor: 'text-gray-300',
                              subtitle: 'Second Place'
                            };
                            case 3: return {
                              bg: 'bg-orange-500/20 border-orange-400/30',
                              iconBg: 'bg-gradient-to-br from-orange-400 to-amber-500 neon-orange',
                              textColor: 'text-orange-300',
                              subtitle: 'Third Place'
                            };
                            default: return {
                              bg: 'bg-gray-500/20 border-gray-400/30',
                              iconBg: 'bg-gradient-to-br from-gray-400 to-slate-500',
                              textColor: 'text-gray-300',
                              subtitle: `${rank}th Place`
                            };
                          }
                        };

                        const colors = getRankColors(team.rank);
                        
                        return (
                          <div key={team.teamId} className={`flex items-center justify-between p-3 rounded-lg border ${colors.bg} hover-lift animate-slide-up`} style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${colors.iconBg} animate-float`}>
                                {team.rank === 1 ? <Star className="w-5 h-5 text-white" /> : 
                                 <span className="text-sm font-bold text-white">{team.rank}</span>}
                              </div>
                              <div>
                                <p className="font-bold text-white">{getRankEmoji(team.rank)} {team.teamName}</p>
                                <p className={`text-xs font-semibold ${colors.textColor}`}>{colors.subtitle}</p>
                              </div>
                            </div>
                            <span className={`text-lg font-bold ${colors.textColor}`}>
                              <StatsCounter end={team.wins} className={colors.textColor} gradient={false} />-<StatsCounter end={team.losses} className={colors.textColor} gradient={false} />
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 hover-lift animate-slide-up">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg neon-yellow animate-float">
                              <Star className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-white">🥇 Dynasty Kings</p>
                              <p className="text-xs text-yellow-300 font-semibold">First Place Champion</p>
                            </div>
                          </div>
                          <span className="text-lg font-black text-yellow-300">4-0</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-500/20 border border-gray-400/30 hover-lift animate-slide-up animation-delay-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-slate-500 flex items-center justify-center shadow-lg neon-purple animate-float">
                              <span className="text-sm font-bold text-white">2</span>
                            </div>
                            <div>
                              <p className="font-bold text-white">🥈 {userTeam?.name || 'Your Team'}</p>
                              <p className="text-xs text-gray-300">Second Place</p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-gray-300">3-1</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/20 border border-orange-400/30 hover-lift animate-slide-up animation-delay-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg neon-orange animate-float">
                              <span className="text-sm font-bold text-white">3</span>
                            </div>
                            <div>
                              <p className="font-bold text-white">🥉 Championship Squad</p>
                              <p className="text-xs text-orange-300">Third Place</p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-orange-300">3-1</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}