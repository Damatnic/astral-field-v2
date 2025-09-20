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
  Play
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

// Three.js-inspired particle system
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: any[] = [];
    const particleCount = 50;

    // Set canvas size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() * 60 + 200, // Blue-green spectrum
      });
    }

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${particle.hue}, 70%, 60%)`;
        ctx.fill();
        ctx.restore();

        // Add glow effect
        ctx.save();
        ctx.globalAlpha = particle.opacity * 0.3;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${particle.hue}, 70%, 60%)`;
        ctx.fill();
        ctx.restore();
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
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

// Floating stats preview
const FloatingStatsPreview = () => {
  const stats = [
    { label: "Total Points", value: "15,247", icon: "📊", color: "from-blue-500/20 to-cyan-500/20" },
    { label: "Active Players", value: "10", icon: "👥", color: "from-purple-500/20 to-pink-500/20" },
    { label: "Games Today", value: "5", icon: "🏈", color: "from-green-500/20 to-emerald-500/20" },
    { label: "Prize Pool", value: "$1,000", icon: "💰", color: "from-yellow-500/20 to-orange-500/20" }
  ];

  return (
    <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-6 px-4 z-10">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.5 + i * 0.15, duration: 0.6, ease: "easeOut" }}
          className={`relative bg-gradient-to-br ${stat.color} backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/10 shadow-2xl hover:scale-105 transition-transform duration-300`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
          <div className="relative z-10 text-center">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-sm text-gray-300">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Enhanced Team Profile Card
const TeamProfileCard = ({ team, index, isSelected, onClick }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateX: -20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
      whileHover={{ y: -15, scale: 1.05, rotateY: 5 }}
      onClick={onClick}
      className={`
        relative cursor-pointer group perspective-1000 transform-gpu
        ${isSelected ? 'ring-4 ring-white/50 ring-opacity-100' : ''}
      `}
    >
      {/* Card Container */}
      <div 
        className="relative h-72 rounded-3xl overflow-hidden backdrop-blur-xl border border-white/20 shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${team.primaryColor}15, ${team.secondaryColor}25, rgba(0,0,0,0.6))`,
        }}
      >
        {/* Animated gradient overlay */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${team.primaryColor}30, transparent 70%)`,
          }}
        />

        {/* Sparkle effects */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                top: `${20 + i * 30}%`,
                left: `${15 + i * 25}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.7,
              }}
            />
          ))}
        </div>

        {/* Trophy Badge */}
        {team.trophies > 0 && (
          <div className="absolute top-4 right-4 bg-gradient-to-br from-yellow-400/30 to-orange-500/30 backdrop-blur-sm rounded-full p-3 border border-yellow-400/20">
            <div className="relative">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {team.trophies}
              </span>
            </div>
          </div>
        )}

        {/* Ranking Badge */}
        <div className="absolute top-4 left-4 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
          <span className="text-sm font-bold text-white">#{team.ranking}</span>
        </div>

        {/* Team Content */}
        <div className="flex flex-col items-center justify-center h-full p-6 relative z-10">
          {/* Avatar Container */}
          <div className="relative mb-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 group-hover:border-white/60 transition-all duration-300 shadow-xl">
              <img 
                src={team.avatar} 
                alt={team.owner}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            
            {/* Live indicator with pulse */}
            <div className="absolute -bottom-1 -right-1">
              <div className="relative">
                <div className="w-6 h-6 bg-green-500 rounded-full border-3 border-black shadow-lg" />
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
              </div>
            </div>

            {/* Glow effect */}
            <div 
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
              style={{
                background: `radial-gradient(circle, ${team.primaryColor}40, transparent)`,
                transform: 'scale(1.5)',
              }}
            />
          </div>

          {/* Team Info */}
          <div className="text-center space-y-2">
            <h3 className="text-white font-bold text-lg leading-tight">
              {team.teamName}
            </h3>
            <p className="text-gray-300 text-sm font-medium">{team.owner}</p>
            <div className="flex items-center justify-center space-x-3 text-sm">
              <span className="text-gray-400">{team.record}</span>
              <div className="w-1 h-1 bg-gray-500 rounded-full" />
              <span className="text-green-400 font-semibold">{team.points} pts</span>
            </div>
          </div>

          {/* Team Motto */}
          <motion.div 
            className="absolute bottom-6 left-4 right-4 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isSelected ? 1 : 0, y: isSelected ? 0 : 10 }}
            whileHover={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-xs text-white/90 italic font-medium px-3 py-2 bg-black/20 rounded-full backdrop-blur-sm border border-white/10">
              "{team.motto}"
            </p>
          </motion.div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            layoutId="selection-indicator"
            className="absolute inset-0 border-4 border-white rounded-3xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </motion.div>
  );
};

// Quick stat component
const QuickStat = ({ label, value, trend }: any) => (
  <div className="text-center">
    <div className="text-lg font-bold text-white">{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
    {trend && <div className="text-xs text-green-400 mt-1">{trend}</div>}
  </div>
);

// Enhanced selected team preview
const SelectedTeamPreview = ({ team, onConfirm, isAuthenticating }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.95 }}
      transition={{ type: "spring", duration: 0.6 }}
      className="mt-16 p-8 rounded-3xl relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${team.primaryColor}08, ${team.secondaryColor}12, rgba(0,0,0,0.4))`,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Team Details */}
          <div className="flex items-center gap-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
                <img src={team.avatar} alt={team.owner} className="w-full h-full object-cover" />
              </div>
              <div 
                className="absolute inset-0 rounded-3xl opacity-50 blur-2xl"
                style={{
                  background: `radial-gradient(circle, ${team.primaryColor}60, transparent)`,
                  transform: 'scale(1.2)',
                }}
              />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-3xl font-bold text-white">{team.teamName}</h3>
              <p className="text-xl text-gray-300">Managed by <span className="text-white font-semibold">{team.owner}</span></p>
              <div className="flex gap-6 text-sm">
                <span className="text-gray-400">Record: <span className="text-white font-bold">{team.record}</span></span>
                <span className="text-gray-400">Rank: <span className="text-yellow-400 font-bold">#{team.ranking}</span></span>
                <span className="text-gray-400">Trophies: <span className="text-yellow-500 font-bold">{team.trophies}</span></span>
              </div>
              <p className="text-sm text-gray-400 italic max-w-md">"{team.motto}"</p>
            </div>
          </div>

          {/* Login Button */}
          <motion.button
            onClick={onConfirm}
            disabled={isAuthenticating}
            className="relative px-10 py-5 font-bold text-white rounded-2xl overflow-hidden group disabled:opacity-50 min-w-[200px] shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor})`,
            }}
            whileHover={{ scale: 1.05, boxShadow: `0 20px 40px ${team.primaryColor}40` }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700" />
            
            {isAuthenticating ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Entering League...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <span className="relative z-10">Enter as {team.owner}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            )}
          </motion.button>
        </div>

        {/* Quick Stats Preview */}
        <div className="grid grid-cols-4 gap-6 mt-8 pt-8 border-t border-white/10">
          <QuickStat label="Total Points" value="1,247.5" trend="+12%" />
          <QuickStat label="Win Streak" value="3" trend="🔥" />
          <QuickStat label="Trades" value="7" />
          <QuickStat label="Waiver Priority" value="4th" />
        </div>
      </div>
    </motion.div>
  );
};

// D'Amato Dynasty League 2025 - Real League Members
const DEMO_TEAMS = [
  {
    id: 1,
    owner: "Nicholas D'Amato",
    teamName: "D'Amato Dynasty",
    avatar: "/api/avatars/nicholas",
    primaryColor: "#C41E3A",
    secondaryColor: "#FFD700",
    record: "0-0",
    ranking: 1,
    trophies: 2,
    points: "0",
    motto: "Dynasty Starts Here",
    email: "nicholas@damato-dynasty.com"
  },
  {
    id: 2,
    owner: "Nick Hartley",
    teamName: "Hartley's Heroes",
    avatar: "/api/avatars/nick",
    primaryColor: "#00CED1",
    secondaryColor: "#4682B4",
    record: "0-0",
    ranking: 2,
    trophies: 1,
    points: "0",
    motto: "Heroes Always Win",
    email: "nick@damato-dynasty.com"
  },
  {
    id: 3,
    owner: "Jack McCaigue",
    teamName: "McCaigue Mayhem",
    avatar: "/api/avatars/jack",
    primaryColor: "#FF4500",
    secondaryColor: "#DC143C",
    record: "0-0",
    ranking: 3,
    trophies: 1,
    points: "0",
    motto: "Mayhem on the Field",
    email: "jack@damato-dynasty.com"
  },
  {
    id: 4,
    owner: "Larry McCaigue",
    teamName: "Larry Legends",
    avatar: "/api/avatars/larry",
    primaryColor: "#32CD32",
    secondaryColor: "#228B22",
    record: "0-0",
    ranking: 4,
    trophies: 0,
    points: "0",
    motto: "Legends Never Die",
    email: "larry@damato-dynasty.com"
  },
  {
    id: 5,
    owner: "Renee McCaigue",
    teamName: "Renee's Reign",
    avatar: "/api/avatars/renee",
    primaryColor: "#9370DB",
    secondaryColor: "#8A2BE2",
    record: "0-0",
    ranking: 5,
    trophies: 0,
    points: "0",
    motto: "Reigning Supreme",
    email: "renee@damato-dynasty.com"
  },
  {
    id: 6,
    owner: "Jon Kornbeck",
    teamName: "Kornbeck Crushers",
    avatar: "/api/avatars/jon",
    primaryColor: "#1E90FF",
    secondaryColor: "#000080",
    record: "0-0",
    ranking: 6,
    trophies: 0,
    points: "0",
    motto: "Crushing Dreams Since Day One",
    email: "jon@damato-dynasty.com"
  },
  {
    id: 7,
    owner: "David Jarvey",
    teamName: "Jarvey's Juggernauts",
    avatar: "/api/avatars/david",
    primaryColor: "#FFA500",
    secondaryColor: "#FF8C00",
    record: "0-0",
    ranking: 7,
    trophies: 0,
    points: "0",
    motto: "Unstoppable Force",
    email: "david@damato-dynasty.com"
  },
  {
    id: 8,
    owner: "Kaity Lorbecki",
    teamName: "Lorbecki Lions",
    avatar: "/api/avatars/kaity",
    primaryColor: "#FFB6C1",
    secondaryColor: "#FF69B4",
    record: "0-0",
    ranking: 8,
    trophies: 0,
    points: "0",
    motto: "Hear Us Roar",
    email: "kaity@damato-dynasty.com"
  },
  {
    id: 9,
    owner: "Cason Minor",
    teamName: "Minor Miracles",
    avatar: "/api/avatars/cason",
    primaryColor: "#40E0D0",
    secondaryColor: "#48D1CC",
    record: "0-0",
    ranking: 9,
    trophies: 0,
    points: "0",
    motto: "Miracles Happen Every Sunday",
    email: "cason@damato-dynasty.com"
  },
  {
    id: 10,
    owner: "Brittany Bergum",
    teamName: "Bergum Blitz",
    avatar: "/api/avatars/brittany",
    primaryColor: "#DA70D6",
    secondaryColor: "#BA55D3",
    record: "0-0",
    ranking: 10,
    trophies: 0,
    points: "0",
    motto: "Blitz to Victory",
    email: "brittany@damato-dynasty.com"
  }
];

// Team Selection Component
const TeamSelectionLogin = () => {
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  const handleLogin = async (team: any) => {
    setIsAuthenticating(true);
    
    try {
      // Demo mode: instant authentication with team selection
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: team.email,
          password: 'Dynasty2025!',
          teamId: team.id,
          demo: true,
          season: '2025'
        })
      });

      if (response.ok) {
        // Store team selection
        localStorage.setItem('selected_team', JSON.stringify(team));
        
        // Smooth transition to dashboard
        await new Promise(resolve => setTimeout(resolve, 1500)); // Show loading animation
        router.push('/dashboard'); // Navigate to dashboard instead of self
      } else {
        console.error('Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <section id="login" className="relative min-h-screen py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900/95 to-black" />
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      {/* Section Header */}
      <motion.div 
        className="relative z-10 text-center mb-20"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <motion.h2 
          className="text-6xl md:text-7xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-green-400 bg-clip-text text-transparent">
            Choose Your
          </span>
          <br />
          <span className="text-white">Dynasty</span>
        </motion.h2>
        <motion.p 
          className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Select your team to enter the <span className="text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text font-semibold">2025 D'Amato Dynasty Championship</span>
        </motion.p>
      </motion.div>

      {/* Team Selection Grid */}
      <div className="relative z-10 container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12">
          {DEMO_TEAMS.map((team, index) => (
            <TeamProfileCard
              key={team.id}
              team={team}
              index={index}
              isSelected={selectedTeam?.id === team.id}
              onClick={() => setSelectedTeam(team)}
            />
          ))}
        </div>

        {/* Selected Team Preview */}
        <AnimatePresence mode="wait">
          {selectedTeam && (
            <SelectedTeamPreview
              team={selectedTeam}
              onConfirm={() => handleLogin(selectedTeam)}
              isAuthenticating={isAuthenticating}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

// Main Landing Page Component
const CinematicLandingPage = () => {
  const scrollToLogin = () => {
    document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Particle field */}
        <ParticleField />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black/80" />
        
        {/* Stadium lights effect */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-40 bg-gradient-to-b from-white/20 to-transparent"
              style={{
                left: `${15 + i * 15}%`,
                top: '10%',
                transformOrigin: 'top center',
              }}
              animate={{
                rotate: [0, 5, -5, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-6xl md:text-8xl lg:text-9xl font-bold mb-6 leading-none"
          >
            <span className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              D'AMATO
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              DYNASTY
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="text-2xl md:text-3xl lg:text-4xl text-gray-300 mb-4 font-light"
          >
            2025 Championship Season
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto"
          >
            Welcome to the D'Amato Dynasty League. Ten teams. One champion. Your dynasty starts here.
          </motion.p>
          
          {/* CTA Button */}
          <motion.button
            onClick={scrollToLogin}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.3, duration: 0.8, ease: "easeOut" }}
            className="group relative px-12 py-6 text-xl font-bold text-black bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-[0_0_50px_rgba(34,197,94,0.5)] hover:shadow-[0_0_80px_rgba(34,197,94,0.8)] transition-all duration-300 overflow-hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 flex items-center gap-3">
              Enter The League
              <Play className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </motion.button>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="mt-16"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-gray-400"
            >
              <span className="text-sm">Scroll to choose your team</span>
              <ChevronDown className="w-6 h-6" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Floating Stats Preview */}
        <FloatingStatsPreview />
      </section>

      {/* Team Selection Section */}
      <TeamSelectionLogin />
    </div>
  );
};

// Main component with auth check
export default function FantasyEliteLandingPage() {
  const { user, isLoading } = useAuth();

  // Show landing page for non-authenticated users
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6">
            <Trophy className="w-10 h-10 text-white animate-pulse" />
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Fantasy Elite</h2>
          <p className="text-blue-400">Loading the ultimate fantasy experience...</p>
        </motion.div>
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (user) {
    window.location.href = '/dashboard';
    return null;
  }

  return <CinematicLandingPage />;
}