'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Users, Calendar, TrendingUp, AlertCircle, 
  Crown, Shield, Zap, Star, Award, Activity, 
  ArrowUpRight, ArrowDownRight, Minus, BarChart3,
  Play, Target, Clock, ChevronRight, Sparkles,
  Flame, Eye, ArrowRight, Plus, Settings
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';

// Real data interfaces
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

// Premium stat card with 3D effects
const PremiumStatCard = ({ 
  title, 
  value, 
  subtitle,
  change, 
  icon: Icon, 
  gradient = "cosmic",
  delay = 0 
}: any) => (
  <motion.div
    initial={{ opacity: 0, y: 40, rotateX: -15 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    transition={{ 
      delay, 
      duration: 0.8,
      type: "spring",
      bounce: 0.3
    }}
    className="astral-card-premium group cursor-pointer overflow-hidden relative"
    whileHover={{ y: -8, rotateX: 5 }}
  >
    {/* Background gradient animation */}
    <div className={`absolute inset-0 bg-gradient-to-br ${
      gradient === 'cosmic' ? 'from-astral-quantum-600/20 to-astral-cosmic-600/20' :
      gradient === 'gold' ? 'from-astral-gold-600/20 to-astral-supernova-600/20' :
      gradient === 'nebula' ? 'from-astral-nebula-600/20 to-astral-cosmic-600/20' :
      'from-astral-supernova-600/20 to-astral-quantum-600/20'
    } opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
    
    {/* Floating particles */}
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: 3 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          style={{
            left: `${20 + i * 30}%`,
            top: `${20 + i * 20}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
    </div>

    <div className="relative z-10 p-8">
      <div className="flex items-start justify-between mb-6">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${
          gradient === 'cosmic' ? 'from-astral-quantum-500 to-astral-cosmic-600' :
          gradient === 'gold' ? 'from-astral-gold-500 to-astral-supernova-600' :
          gradient === 'nebula' ? 'from-astral-nebula-500 to-astral-cosmic-600' :
          'from-astral-supernova-500 to-astral-quantum-600'
        } flex items-center justify-center shadow-xl transform-gpu group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
        
        {change !== undefined && (
          <motion.div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium ${
              change > 0 ? 'text-astral-gold-400 bg-astral-gold-400/10' : 
              change < 0 ? 'text-astral-supernova-400 bg-astral-supernova-400/10' : 
              'text-astral-light-shadow bg-astral-dark-surface/50'
            }`}
            whileHover={{ scale: 1.05 }}
          >
            {change > 0 ? <ArrowUpRight className="w-4 h-4" /> : 
             change < 0 ? <ArrowDownRight className="w-4 h-4" /> : 
             <Minus className="w-4 h-4" />}
            {Math.abs(change)}%
          </motion.div>
        )}
      </div>
      
      <div className="space-y-2">
        <motion.h3 
          className="text-4xl font-bold text-white font-orbitron tracking-tight"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {value}
        </motion.h3>
        <p className="text-astral-light-shadow font-medium">{title}</p>
        {subtitle && (
          <p className="text-astral-cosmic-400 text-sm font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  </motion.div>
);

// Enhanced matchup card component
const MatchupShowcase = ({ matchup, userTeam }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.8 }}
      className="astral-card-premium overflow-hidden relative"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-astral-quantum-600/10 via-astral-cosmic-600/10 to-astral-nebula-600/10"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      
      <div className="relative z-10 p-10">
        {/* Week indicator */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-astral-cosmic-500/20 rounded-full border border-astral-cosmic-500/30"
            animate={{ glow: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Calendar className="w-4 h-4 text-astral-cosmic-400" />
            <span className="text-white font-medium">Week {matchup.week} Matchup</span>
          </motion.div>
        </div>

        {/* Teams display */}
        <div className="flex items-center justify-between">
          {/* User team */}
          <motion.div 
            className="text-center"
            whileHover={{ scale: 1.05 }}
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-astral-quantum-500 to-astral-cosmic-600 flex items-center justify-center mx-auto shadow-2xl">
                <Crown className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-astral-gold-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{userTeam?.standing || 1}</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white font-orbitron mb-2">{userTeam?.name || 'Your Dynasty'}</h3>
            <div className="space-y-1">
              <p className="text-astral-cosmic-400 font-medium">
                {userTeam ? `${userTeam.record.wins}-${userTeam.record.losses}` : '0-0'}
              </p>
              <p className="text-astral-light-shadow text-sm">
                {userTeam?.pointsFor?.toFixed(1) || '0.0'} PF
              </p>
            </div>
          </motion.div>
          
          {/* VS indicator with animation */}
          <div className="text-center px-8">
            <motion.div
              className="relative"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0] 
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-astral-cosmic-400 to-astral-nebula-400 font-orbitron">
                VS
              </div>
              <div className="absolute inset-0 text-5xl font-bold text-astral-cosmic-400/20 font-orbitron blur-sm">
                VS
              </div>
            </motion.div>
            <p className="text-astral-light-shadow text-sm mt-2">Head to Head</p>
          </div>
          
          {/* Opponent */}
          <motion.div 
            className="text-center"
            whileHover={{ scale: 1.05 }}
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-astral-nebula-500 to-astral-supernova-600 flex items-center justify-center mx-auto shadow-2xl">
                <span className="text-white font-bold text-lg font-orbitron">
                  {matchup.opponent.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-astral-nebula-500 rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white font-orbitron mb-2">{matchup.opponent.name}</h3>
            <div className="space-y-1">
              <p className="text-astral-nebula-400 font-medium">
                {matchup.opponent.record.wins}-{matchup.opponent.record.losses}
              </p>
              <p className="text-astral-light-shadow text-sm">Rival Dynasty</p>
            </div>
          </motion.div>
        </div>

        {/* Battle preview */}
        <motion.div
          className="mt-8 pt-6 border-t border-astral-cosmic-500/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-center justify-center gap-4">
            <Flame className="w-5 h-5 text-astral-supernova-400" />
            <span className="text-astral-light-shadow font-medium">Battle for supremacy begins soon</span>
            <Flame className="w-5 h-5 text-astral-supernova-400" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Enhanced action cards
const ActionCard = ({ 
  title, 
  description, 
  icon: Icon, 
  action,
  gradient = "cosmic",
  delay = 0,
  featured = false
}: any) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    className={`astral-card-premium group cursor-pointer overflow-hidden relative ${
      featured ? 'col-span-2' : ''
    }`}
    onClick={action}
    whileHover={{ y: -8, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    {/* Dynamic background */}
    <div className={`absolute inset-0 bg-gradient-to-br ${
      gradient === 'cosmic' ? 'from-astral-quantum-600/20 to-astral-cosmic-600/20' :
      gradient === 'gold' ? 'from-astral-gold-600/20 to-astral-supernova-600/20' :
      gradient === 'nebula' ? 'from-astral-nebula-600/20 to-astral-cosmic-600/20' :
      'from-astral-supernova-600/20 to-astral-quantum-600/20'
    } opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
    
    <div className="relative z-10 p-8">
      <div className="flex items-start justify-between mb-6">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
          gradient === 'cosmic' ? 'from-astral-quantum-500 to-astral-cosmic-600' :
          gradient === 'gold' ? 'from-astral-gold-500 to-astral-supernova-600' :
          gradient === 'nebula' ? 'from-astral-nebula-500 to-astral-cosmic-600' :
          'from-astral-supernova-500 to-astral-quantum-600'
        } flex items-center justify-center shadow-xl transform-gpu group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
          <Icon className="w-7 h-7 text-white drop-shadow-lg" />
        </div>
        
        <motion.div
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          whileHover={{ x: 4 }}
        >
          <ArrowRight className="w-5 h-5 text-astral-cosmic-400" />
        </motion.div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-white font-orbitron group-hover:text-astral-cosmic-300 transition-colors">
          {title}
        </h3>
        <p className="text-astral-light-shadow leading-relaxed">{description}</p>
        
        {featured && (
          <div className="flex items-center gap-2 pt-2">
            <Sparkles className="w-4 h-4 text-astral-gold-400" />
            <span className="text-astral-gold-400 text-sm font-medium">Featured Action</span>
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

// Main dashboard component
export default function DashboardPage() {
  const { user } = useAuth();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [upcomingMatchup, setUpcomingMatchup] = useState<UpcomingMatchup | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real user data
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
              totalTeams: 10 // Default for now, could be from league data
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
                  ties: 0 // Default
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
      <div className="min-h-screen bg-astral-dark-void relative overflow-hidden">
        <div className="futuristic-background">
          <div className="neural-network">
            {Array.from({ length: 20 }, (_, i) => (
              <motion.div
                key={i}
                className="neural-node"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto mb-6"
            >
              <Trophy className="w-20 h-20 text-astral-cosmic-500" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white font-orbitron mb-2">Initializing Dynasty</h2>
            <p className="text-astral-light-shadow">Accessing your championship data...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-astral-dark-void relative overflow-hidden">
      {/* Enhanced background */}
      <div className="futuristic-background">
        <div className="neural-network">
          {Array.from({ length: 30 }, (_, i) => (
            <motion.div
              key={i}
              className="neural-node"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
        
        {/* Floating particles */}
        <div className="floating-particles">
          {Array.from({ length: 40 }, (_, i) => (
            <motion.div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, 20, -20],
                x: [-10, 10, -10],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 8 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="relative z-10">
        {/* Enhanced header */}
        <header className="nav-astral border-b border-astral-cosmic-500/20 px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-7xl mx-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <motion.h1 
                  className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-astral-cosmic-400 via-astral-nebula-400 to-astral-quantum-400 font-orbitron mb-3"
                  animate={{ 
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] 
                  }}
                  transition={{ 
                    duration: 5, 
                    repeat: Infinity 
                  }}
                  style={{ backgroundSize: '200% 200%' }}
                >
                  Command Center
                </motion.h1>
                <p className="text-astral-light-shadow text-lg font-medium">
                  Welcome back, <span className="text-astral-cosmic-400 font-bold">{user?.name}</span> • 
                  Week 3 2025 Season • {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              <motion.div 
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3 px-4 py-2 bg-astral-dark-surface/50 rounded-full border border-astral-cosmic-500/30">
                  <motion.div 
                    className="w-3 h-3 bg-astral-gold-500 rounded-full"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.8, 1, 0.8] 
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity 
                    }}
                  />
                  <span className="text-astral-light-shadow text-sm font-medium">Dynasty Active</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </header>

        {/* Main dashboard content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Performance metrics */}
          <section className="mb-16">
            <motion.h2
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-bold text-white font-orbitron mb-8 flex items-center gap-3"
            >
              <Trophy className="w-8 h-8 text-astral-gold-500" />
              Dynasty Performance
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <PremiumStatCard
                title="Season Record"
                value={userTeam ? `${userTeam.record.wins}-${userTeam.record.losses}${userTeam.record.ties > 0 ? `-${userTeam.record.ties}` : ''}` : '0-0'}
                subtitle="Championship Path"
                change={userTeam?.record.wins > userTeam?.record.losses ? 15 : userTeam?.record.wins < userTeam?.record.losses ? -10 : 0}
                icon={Trophy}
                gradient="cosmic"
                delay={0}
              />
              <PremiumStatCard
                title="League Ranking"
                value={userTeam ? `#${userTeam.standing}` : '#1'}
                subtitle={`of ${userTeam?.totalTeams || 10} dynasties`}
                change={userTeam?.standing <= 3 ? 5 : userTeam?.standing > 6 ? -8 : 0}
                icon={Crown}
                gradient="gold"
                delay={0.1}
              />
              <PremiumStatCard
                title="Points Scored"
                value={userTeam?.pointsFor?.toFixed(1) || '0.0'}
                subtitle="Offensive Power"
                change={12}
                icon={Target}
                gradient="nebula"
                delay={0.2}
              />
              <PremiumStatCard
                title="Points Allowed"
                value={userTeam?.pointsAgainst?.toFixed(1) || '0.0'}
                subtitle="Defensive Strength"
                change={-5}
                icon={Shield}
                gradient="supernova"
                delay={0.3}
              />
            </div>
          </section>

          {/* Current matchup showcase */}
          {upcomingMatchup && (
            <section className="mb-16">
              <motion.h2
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-white font-orbitron mb-8 flex items-center gap-3"
              >
                <Zap className="w-8 h-8 text-astral-nebula-500" />
                Battle Arena
              </motion.h2>
              
              <MatchupShowcase 
                matchup={upcomingMatchup}
                userTeam={userTeam}
              />
            </section>
          )}

          {/* Dynasty management */}
          <section>
            <motion.h2
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="text-3xl font-bold text-white font-orbitron mb-8 flex items-center gap-3"
            >
              <Settings className="w-8 h-8 text-astral-cosmic-500" />
              Dynasty Operations
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <ActionCard
                title="Roster Command"
                description="Manage your elite lineup and strategic formations for maximum championship potential"
                icon={Users}
                action={() => window.location.href = '/roster'}
                gradient="cosmic"
                delay={1}
                featured={false}
              />
              <ActionCard
                title="Player Intelligence"
                description="Advanced scouting network to discover hidden gems and championship-caliber talent"
                icon={Activity}
                action={() => window.location.href = '/players'}
                gradient="nebula"
                delay={1.1}
                featured={false}
              />
              <ActionCard
                title="League Analytics"
                description="Comprehensive dynasty rankings, statistical analysis, and competitive intelligence"
                icon={BarChart3}
                action={() => window.location.href = '/leagues'}
                gradient="gold"
                delay={1.2}
                featured={false}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}