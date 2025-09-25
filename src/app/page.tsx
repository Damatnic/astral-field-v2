'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy,
  Users,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Zap,
  Shield,
  Star,
  Activity,
  Award,
  Target,
  Sparkles,
  Flame,
  Crown,
  Rocket,
  Database,
  Clock,
  Globe
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

// Particle background component
const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{x: number, y: number, size: number, speedX: number, speedY: number, opacity: number}> = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 51, 234, ${particle.opacity})`;
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

// Animated counter component
const AnimatedCounter = ({ end, duration = 2000, prefix = '', suffix = '' }: any) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentCount = Math.floor(progress * end);
      setCount(currentCount);
      
      if (progress === 1) clearInterval(timer);
    }, 50);
    
    return () => clearInterval(timer);
  }, [end, duration]);
  
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// Feature card with hover effects
const FeatureCard = ({ icon: Icon, title, description, color, delay }: any) => (
  <div 
    className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-8 hover:bg-white/20 transition-all duration-500 hover:scale-105 hover:-translate-y-2 cursor-pointer"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl`}>
      <Icon className="w-8 h-8 text-white" />
    </div>
    
    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-yellow-400 group-hover:to-pink-500 transition-all duration-500">
      {title}
    </h3>
    <p className="text-gray-300 leading-relaxed">
      {description}
    </p>
    
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
  </div>
);

// Testimonial card
const TestimonialCard = ({ name, team, quote, wins, position }: any) => (
  <div className="group relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105">
    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
      <Trophy className="w-6 h-6 text-white" />
    </div>
    
    <div className="flex items-start mb-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg mr-4">
        {position}
      </div>
      <div>
        <h4 className="font-bold text-white text-lg">{name}</h4>
        <p className="text-gray-400 text-sm">{team}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 font-bold text-sm">{wins} Wins</span>
        </div>
      </div>
    </div>
    
    <p className="text-gray-300 italic">&ldquo;{quote}&rdquo;</p>
  </div>
);

// Glow button component
const GlowButton = ({ children, onClick, primary = false, large = false, className = '' }: any) => (
  <button
    onClick={onClick}
    className={`
      relative group overflow-hidden rounded-xl font-bold transition-all duration-500
      ${large ? 'px-10 py-5 text-lg' : 'px-8 py-4'}
      ${primary 
        ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 text-white shadow-2xl hover:shadow-purple-500/50' 
        : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
      }
      hover:scale-105 hover:-translate-y-1
      ${className}
    `}
  >
    <span className="relative z-10 flex items-center justify-center gap-2">
      {children}
    </span>
    
    {primary && (
      <>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-pink-600 to-purple-600 animate-gradient-shift" />
      </>
    )}
  </button>
);

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Redirect authenticated users
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Track mouse for gradient effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold animate-pulse">Loading AstralField...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(147, 51, 234, 0.3), transparent 50%), 
                       linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #feca57 75%, #ff6b6b 100%)`
        }}
      />
      
      {/* Particle effect */}
      <ParticleBackground />
      
      {/* Grid overlay */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgb3BhY2l0eT0iMC4wNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgLz48L3N2Zz4=')] opacity-20" />

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-7xl mx-auto text-center">
            {/* Animated logo */}
            <div className="mb-8 inline-block">
              <div className="relative">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 rounded-3xl flex items-center justify-center animate-float shadow-2xl shadow-purple-500/50">
                  <Trophy className="w-16 h-16 text-white animate-pulse" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 rounded-3xl blur-2xl opacity-75 animate-pulse" />
              </div>
            </div>

            {/* Animated title */}
            <h1 className="text-7xl md:text-9xl font-black mb-6 animate-slide-up">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-gradient-shift">
                ASTRALFIELD
              </span>
            </h1>
            
            <p className="text-2xl md:text-3xl text-white/90 mb-4 font-bold animate-slide-up animation-delay-100">
              <Sparkles className="inline w-8 h-8 text-yellow-400 animate-spin-slow mr-2" />
              Fantasy Football Elevated to the Stars
              <Sparkles className="inline w-8 h-8 text-yellow-400 animate-spin-slow ml-2" />
            </p>
            
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto animate-slide-up animation-delay-200">
              Experience the future of fantasy football with real-time analytics, AI-powered insights, 
              and an immersive platform that makes every game feel legendary.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16 animate-slide-up animation-delay-300">
              <GlowButton onClick={() => router.push('/login')} primary large>
                <Rocket className="w-6 h-6" />
                Launch Your Dynasty
                <ChevronRight className="w-6 h-6" />
              </GlowButton>
              
              <GlowButton onClick={() => router.push('/login')} large>
                <Zap className="w-6 h-6" />
                Quick Demo
              </GlowButton>
            </div>

            {/* Stats counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-slide-up animation-delay-400">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-2">
                  <AnimatedCounter end={10} suffix="+" />
                </div>
                <p className="text-white/80 font-semibold">Elite Teams</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2">
                  <AnimatedCounter end={500} prefix="$" suffix="K" />
                </div>
                <p className="text-white/80 font-semibold">Prize Pool</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 mb-2">
                  <AnimatedCounter end={99} suffix="%" />
                </div>
                <p className="text-white/80 font-semibold">Uptime</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500 mb-2">
                  <AnimatedCounter end={24} suffix="/7" />
                </div>
                <p className="text-white/80 font-semibold">Live Support</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
                <Flame className="inline w-12 h-12 text-orange-500 animate-pulse mr-3" />
                Unleash Your Power
                <Flame className="inline w-12 h-12 text-orange-500 animate-pulse ml-3" />
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Professional-grade tools and features designed to dominate your league
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={Activity}
                title="Live Scoring"
                description="Real-time updates with play-by-play analysis and instant notifications for every touchdown."
                color="from-purple-500 to-pink-500"
                delay={0}
              />
              <FeatureCard
                icon={Target}
                title="AI Predictions"
                description="Machine learning algorithms analyze millions of data points to predict player performance."
                color="from-pink-500 to-orange-500"
                delay={100}
              />
              <FeatureCard
                icon={TrendingUp}
                title="Trade Analyzer"
                description="Advanced trade evaluation with win probability impact and historical trade patterns."
                color="from-orange-500 to-yellow-500"
                delay={200}
              />
              <FeatureCard
                icon={Shield}
                title="Injury Shield"
                description="Automated lineup protection with instant injury alerts and replacement suggestions."
                color="from-blue-500 to-purple-500"
                delay={300}
              />
              <FeatureCard
                icon={Database}
                title="Deep Analytics"
                description="Comprehensive stats, trends, and matchup analysis with exportable reports."
                color="from-green-500 to-blue-500"
                delay={400}
              />
              <FeatureCard
                icon={Crown}
                title="Dynasty Mode"
                description="Multi-year keeper leagues with contract management and rookie draft support."
                color="from-yellow-500 to-red-500"
                delay={500}
              />
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
                <Star className="inline w-12 h-12 text-yellow-400 animate-pulse mr-3" />
                Champions Speak
                <Star className="inline w-12 h-12 text-yellow-400 animate-pulse ml-3" />
              </h2>
              <p className="text-xl text-gray-300">
                Join the winning tradition
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <TestimonialCard
                name="Nicholas D'Amato"
                team="Astral Commanders"
                quote="This platform revolutionized how we run our league. The live scoring is incredible!"
                wins={42}
                position="1st"
              />
              <TestimonialCard
                name="Jack McCaigue"
                team="Jack Attack"
                quote="The AI predictions helped me win 3 championships in a row. Absolutely game-changing!"
                wins={38}
                position="2nd"
              />
              <TestimonialCard
                name="David Jarvey"
                team="Jarvey's Juggernauts"
                quote="Best fantasy platform I've ever used. The trade analyzer alone is worth it!"
                wins={35}
                position="3rd"
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-4 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-orange-900/50 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
                Ready to Dominate?
              </h2>
              <p className="text-2xl text-gray-300 mb-8">
                Join the elite fantasy football experience today
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <GlowButton onClick={() => router.push('/login')} primary large>
                  <Trophy className="w-6 h-6" />
                  Start Your Dynasty
                  <ChevronRight className="w-6 h-6 animate-bounce-right" />
                </GlowButton>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-8 text-white/60">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>Setup in 2 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  <span>Play anywhere</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>10 teams ready</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}