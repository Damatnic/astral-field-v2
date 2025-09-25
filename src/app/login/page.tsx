'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Zap,
  Star,
  Crown,
  Rocket,
  Users,
  ChevronRight,
  Play
} from 'lucide-react';

const TEAMS = [
  { id: 1, name: "Nicholas D'Amato", email: "nicholas.damato@astralfield.com", team: "Astral Commanders", role: "Commissioner", color: "from-yellow-400 to-orange-500" },
  { id: 2, name: "Nick Hartley", email: "nick.hartley@astralfield.com", team: "Hartley's Heroes", role: "Manager", color: "from-blue-400 to-purple-500" },
  { id: 3, name: "Jack McCaigue", email: "jack.mccaigue@astralfield.com", team: "Jack Attack", role: "Manager", color: "from-green-400 to-teal-500" },
  { id: 4, name: "Larry McCaigue", email: "larry.mccaigue@astralfield.com", team: "Larry's Legends", role: "Manager", color: "from-purple-400 to-pink-500" },
  { id: 5, name: "Renee McCaigue", email: "renee.mccaigue@astralfield.com", team: "Renee's Raiders", role: "Manager", color: "from-pink-400 to-rose-500" },
  { id: 6, name: "Jon Kornbeck", email: "jon.kornbeck@astralfield.com", team: "Kornbeck's Crushers", role: "Manager", color: "from-indigo-400 to-blue-500" },
  { id: 7, name: "David Jarvey", email: "david.jarvey@astralfield.com", team: "Jarvey's Juggernauts", role: "Manager", color: "from-red-400 to-orange-500" },
  { id: 8, name: "Kaity Lorbecki", email: "kaity.lorbecki@astralfield.com", team: "Kaity's Knights", role: "Manager", color: "from-cyan-400 to-blue-500" },
  { id: 9, name: "Cason Minor", email: "cason.minor@astralfield.com", team: "Minor League Majors", role: "Manager", color: "from-amber-400 to-yellow-500" },
  { id: 10, name: "Brittany Bergum", email: "brittany.bergum@astralfield.com", team: "Bergum's Ballers", role: "Manager", color: "from-emerald-400 to-green-500" }
];

// Animated background component
const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{x: number, y: number, size: number, speedX: number, speedY: number, color: string}> = [];
    const colors = ['#9333ea', '#ec4899', '#f97316', '#fbbf24'];
    
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = 0.6;
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

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// Enhanced team card with 3D hover effect
const TeamCard = ({ team, onQuickLogin, isLoading }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleClick = async () => {
    setIsLoggingIn(true);
    await onQuickLogin(team);
    setIsLoggingIn(false);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading || isLoggingIn}
      className={`
        relative group p-6 rounded-2xl text-left transition-all duration-500 overflow-hidden
        bg-white/10 backdrop-blur-md border border-white/20
        hover:bg-white/20 hover:scale-105 hover:-translate-y-1
        ${isLoggingIn ? 'scale-95 opacity-75' : ''}
        ${(isLoading || isLoggingIn) ? 'cursor-wait' : 'cursor-pointer'}
      `}
      style={{
        transform: isHovered ? 'perspective(1000px) rotateX(-5deg)' : 'none',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${team.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
      
      {/* Commissioner badge */}
      {team.role === 'Commissioner' && (
        <div className="absolute -top-2 -right-2 animate-float">
          <div className="relative">
            <Crown className="w-8 h-8 text-yellow-400 filter drop-shadow-lg" />
            <div className="absolute inset-0 animate-pulse">
              <Crown className="w-8 h-8 text-yellow-400 blur-md" />
            </div>
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {isLoggingIn && (
        <div className="absolute top-2 right-2">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-3">
          {/* Animated avatar */}
          <div className={`
            relative w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg
            bg-gradient-to-br ${team.color} shadow-lg group-hover:shadow-2xl transition-all duration-500
            ${isHovered ? 'scale-110 rotate-3' : ''}
          `}>
            <span className="relative z-10">{team.name.split(' ').map((n: string) => n[0]).join('')}</span>
            {isHovered && (
              <div className="absolute inset-0 rounded-2xl bg-white opacity-20 animate-pulse" />
            )}
          </div>

          {/* Team info */}
          <div className="flex-1">
            <p className="font-bold text-white text-lg group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-yellow-400 group-hover:to-pink-500 transition-all duration-500">
              {team.name}
            </p>
            <p className="text-gray-300 font-semibold flex items-center gap-1">
              {team.role === 'Commissioner' && <Shield className="w-4 h-4 text-yellow-400" />}
              {team.team}
            </p>
          </div>
        </div>

        {/* Hover effect */}
        {isHovered && !isLoggingIn && (
          <div className="flex items-center gap-2 text-purple-300 font-semibold animate-slide-up">
            <Zap className="w-4 h-4 animate-bounce" />
            <span className="text-sm">Click to enter the arena</span>
            <ChevronRight className="w-4 h-4 animate-bounce-right" />
          </div>
        )}
        {isLoggingIn && (
          <div className="flex items-center gap-2 text-purple-400 font-semibold">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span className="text-sm">Entering the field...</span>
          </div>
        )}
      </div>

      {/* Bottom gradient border */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${team.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
    </button>
  );
};

// Demo login button component
const DemoLoginButton = ({ onClick, isLoading }: any) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="
      relative group w-full py-5 px-8 rounded-2xl font-bold text-lg
      bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600
      text-white shadow-2xl hover:shadow-purple-500/50
      hover:scale-105 transition-all duration-500
      disabled:opacity-50 disabled:cursor-not-allowed
      overflow-hidden
    "
  >
    <span className="relative z-10 flex items-center justify-center gap-3">
      <Rocket className="w-6 h-6 animate-bounce" />
      {isLoading ? 'Loading Demo...' : 'INSTANT DEMO ACCESS'}
      <Play className="w-6 h-6 animate-pulse" />
    </span>
    
    {/* Animated background gradient */}
    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-pink-600 to-purple-600 animate-gradient-shift opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    
    {/* Shimmer effect */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    </div>
  </button>
);

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  const handleQuickLogin = async (team: any) => {
    console.log('Quick login for:', team.name);
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // Quick sign-in with default password
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: team.email,
          password: 'Dynasty2025'  // Default password for all users
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccessMessage(`Welcome back, ${team.name}!`);
        // Short delay for success message
        await new Promise(resolve => setTimeout(resolve, 800));
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    // Login as the first team (Commissioner)
    await handleQuickLogin(TEAMS[0]);
    setDemoLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-animated" />
      
      {/* Animated particles */}
      <AnimatedBackground />
      
      {/* Grid pattern overlay */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgb3BhY2l0eT0iMC4wMyIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgLz48L3N2Zz4=')] opacity-50" />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Animated logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 rounded-3xl flex items-center justify-center animate-float shadow-2xl shadow-purple-500/50">
                <Trophy className="w-12 h-12 text-white animate-pulse" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 rounded-3xl blur-2xl opacity-75 animate-pulse" />
            </div>
          </div>

          {/* Title with gradient text */}
          <h2 className="text-center text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-gradient-shift mb-3">
            ASTRALFIELD
          </h2>
          <p className="text-center text-xl text-white/90 font-semibold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-spin-slow" />
            Dynasty League Portal
            <Sparkles className="w-5 h-5 text-yellow-400 animate-spin-slow" />
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl px-4">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/20 backdrop-blur-md border border-green-400/50 rounded-xl flex items-center justify-center gap-2 animate-slide-up">
              <CheckCircle className="w-5 h-5 text-green-400 animate-bounce" />
              <span className="text-green-300 font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-md border border-red-400/50 rounded-xl flex items-center justify-center gap-2 animate-slide-up">
              <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
              <span className="text-red-300 font-semibold">{error}</span>
            </div>
          )}

          {/* Demo Access Button */}
          <div className="mb-8 glass-dark rounded-2xl p-6 border border-purple-500/30">
            <h3 className="text-center text-2xl font-bold text-white mb-4 flex items-center justify-center gap-2">
              <Zap className="w-7 h-7 text-yellow-400 animate-pulse" />
              Quick Start
            </h3>
            <DemoLoginButton onClick={handleDemoLogin} isLoading={demoLoading} />
            <p className="text-center text-gray-400 text-sm mt-3">
              No account needed - instant access to all features
            </p>
          </div>

          {/* Team selection grid */}
          <div className="glass-dark rounded-2xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-2 text-center flex items-center justify-center gap-2">
              <Users className="w-7 h-7 text-purple-400" />
              Choose Your Dynasty
            </h3>
            <p className="text-center text-gray-400 mb-8">
              Select your team to enter the battlefield
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TEAMS.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onQuickLogin={handleQuickLogin}
                  isLoading={loading}
                />
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-center gap-6 text-gray-400 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>10 Elite Teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-400" />
                  <span>$500K Prize Pool</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>Secure Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}