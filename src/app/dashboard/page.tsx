'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Activity, 
  Star,
  Crown,
  Flame,
  Zap,
  Shield,
  Target,
  ChevronDown,
  Loader2,
  ArrowRight,
  Sparkles,
  Play,
  Settings,
  Bell,
  Calendar,
  TrendingUp,
  DollarSign,
  Award,
  BarChart3,
  LineChart,
  PieChart,
  Clock,
  UserCheck,
  Plus,
  Edit3,
  Eye,
  RefreshCw,
  Filter,
  Search,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

// Ambient background particles for dashboard
const DashboardParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: any[] = [];
    const particleCount = 30;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Create subtle particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${particle.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
};

// Quick stats card component
const QuickStatsCard = ({ icon: Icon, title, value, change, color, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/8"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className="text-right">
        <div className="text-sm text-gray-400">{change}</div>
      </div>
    </div>
    <div className="mb-2">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  </motion.div>
);

// Team roster card
const TeamRosterCard = ({ delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300"
  >
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-400" />
        My Roster
      </h3>
      <button className="text-blue-400 hover:text-blue-300 transition-colors">
        <Edit3 className="w-4 h-4" />
      </button>
    </div>
    
    <div className="space-y-3">
      {[
        { name: "Josh Allen", position: "QB", team: "BUF", points: "24.8", status: "active" },
        { name: "Christian McCaffrey", position: "RB", team: "SF", points: "31.2", status: "active" },
        { name: "Tyreek Hill", position: "WR", team: "MIA", points: "18.6", status: "active" },
        { name: "Travis Kelce", position: "TE", team: "KC", points: "15.4", status: "questionable" },
        { name: "49ers D/ST", position: "DEF", team: "SF", points: "12.0", status: "active" }
      ].map((player, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${player.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <div>
              <div className="font-medium text-white">{player.name}</div>
              <div className="text-sm text-gray-400">{player.position} - {player.team}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-green-400">{player.points}</div>
            <div className="text-xs text-gray-500">pts</div>
          </div>
        </div>
      ))}
    </div>
    
    <button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2">
      <Eye className="w-4 h-4" />
      View Full Roster
    </button>
  </motion.div>
);

// Recent activity feed
const ActivityFeed = ({ delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300"
  >
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
        <Activity className="w-5 h-5 text-green-400" />
        Recent Activity
      </h3>
      <button className="text-green-400 hover:text-green-300 transition-colors">
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
    
    <div className="space-y-4">
      {[
        { type: "trade", text: "Trade proposal received from Alex Thunder", time: "2 min ago", color: "text-blue-400" },
        { type: "waiver", text: "Waiver claim for Jaylen Waddle processed", time: "1 hour ago", color: "text-green-400" },
        { type: "score", text: "Christian McCaffrey scored 31.2 points", time: "3 hours ago", color: "text-yellow-400" },
        { type: "lineup", text: "Lineup submitted for Week 12", time: "1 day ago", color: "text-purple-400" }
      ].map((activity, index) => (
        <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <div className={`w-2 h-2 rounded-full mt-2 ${activity.color.replace('text-', 'bg-')}`} />
          <div className="flex-1">
            <div className="text-white">{activity.text}</div>
            <div className="text-sm text-gray-400">{activity.time}</div>
          </div>
        </div>
      ))}
    </div>
    
    <button className="w-full mt-4 text-gray-400 hover:text-white transition-colors py-2 text-sm">
      View All Activity
    </button>
  </motion.div>
);

// Upcoming matchups
const UpcomingMatchups = ({ delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300"
  >
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
        <Target className="w-5 h-5 text-red-400" />
        This Week's Matchup
      </h3>
      <div className="text-sm text-gray-400">Week 12</div>
    </div>
    
    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-4 border border-blue-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div className="font-semibold text-white">Lightning Bolts</div>
          <div className="text-sm text-gray-400">You (8-3)</div>
          <div className="text-lg font-bold text-green-400 mt-1">124.6</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">VS</div>
          <div className="text-sm text-gray-400">Sunday 1:00 PM</div>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div className="font-semibold text-white">Storm Riders</div>
          <div className="text-sm text-gray-400">Sarah (7-4)</div>
          <div className="text-lg font-bold text-red-400 mt-1">98.2</div>
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-sm text-gray-400 mb-2">Projected Score</div>
        <div className="text-2xl font-bold text-yellow-400">Lightning Bolts Win</div>
        <div className="text-sm text-gray-400">73% confidence</div>
      </div>
    </div>
    
    <button className="w-full mt-4 bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-300 flex items-center justify-center gap-2">
      <Play className="w-4 h-4" />
      View Matchup Details
    </button>
  </motion.div>
);

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else {
        setIsLoading(false);
      }
    }
  }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <div className="text-xl text-white">Loading your dashboard...</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      <DashboardParticles />
      
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-white/5 backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ASTRAL FIELD
              </div>
              <div className="hidden sm:block text-gray-400">|</div>
              <div className="hidden sm:block text-white font-medium">Dashboard</div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{user?.name || 'Lightning Bolts'}</div>
                  <div className="text-xs text-gray-400">Team Owner</div>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-t border-white/10 py-4"
              >
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center gap-3 px-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-base font-medium text-white">{user?.name || 'Lightning Bolts'}</div>
                      <div className="text-sm text-gray-400">Team Owner</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6 px-4">
                    <button className="relative p-3 text-gray-400 hover:text-white transition-colors">
                      <Bell className="w-6 h-6" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                    </button>
                    <button className="p-3 text-gray-400 hover:text-white transition-colors">
                      <Settings className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Main Dashboard Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Champion</span>
          </h1>
          <p className="text-gray-400">Here's your fantasy empire at a glance</p>
        </motion.div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <QuickStatsCard
            icon={Trophy}
            title="League Rank"
            value="#1"
            change="+2 this week"
            color="bg-yellow-500"
            delay={0.1}
          />
          <QuickStatsCard
            icon={TrendingUp}
            title="Total Points"
            value="1,247.5"
            change="+124.6 this week"
            color="bg-green-500"
            delay={0.2}
          />
          <QuickStatsCard
            icon={Award}
            title="Record"
            value="8-3"
            change="3 game win streak"
            color="bg-blue-500"
            delay={0.3}
          />
          <QuickStatsCard
            icon={DollarSign}
            title="Waiver Budget"
            value="$78"
            change="$22 spent"
            color="bg-purple-500"
            delay={0.4}
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <UpcomingMatchups delay={0.5} />
            <TeamRosterCard delay={0.6} />
          </div>
          
          {/* Right Column */}
          <div className="space-y-8">
            <ActivityFeed delay={0.7} />
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-8"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Edit3, label: "Set Lineup", color: "from-blue-600 to-purple-600" },
              { icon: Users, label: "Waiver Wire", color: "from-green-600 to-teal-600" },
              { icon: BarChart3, label: "Trade Center", color: "from-yellow-600 to-orange-600" },
              { icon: Calendar, label: "Schedule", color: "from-red-600 to-pink-600" }
            ].map((action, index) => (
              <button
                key={index}
                className={`bg-gradient-to-r ${action.color} p-3 sm:p-4 rounded-xl text-white hover:scale-105 transition-all duration-300 flex flex-col items-center gap-1 sm:gap-2`}
              >
                <action.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-xs sm:text-sm font-medium text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}