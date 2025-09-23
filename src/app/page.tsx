'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  Trophy,
  Star,
  Crown,
  Flame,
  Sparkles,
  ChevronRight,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Award,
  BarChart3,
  Clock,
  Globe,
  Gamepad2,
  Target,
  Play,
  Rocket,
  Brain,
  Eye,
  Layers,
  Infinity,
  Cpu,
  Activity,
  ArrowRight,
  CheckCircle,
  Database,
  LineChart
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

// Enhanced gradient text component
const GradientText = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`bg-gradient-cosmic bg-clip-text text-transparent text-glow ${className}`}>
    {children}
  </span>
);

// Futuristic animated background
const FuturisticBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Dynamic gradient base */}
      <motion.div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(26, 145, 255, 0.1) 0%, rgba(102, 0, 204, 0.05) 30%, rgba(0, 0, 0, 0.9) 70%)'
        }}
        animate={{
          background: [
            'radial-gradient(ellipse at center, rgba(26, 145, 255, 0.1) 0%, rgba(102, 0, 204, 0.05) 30%, rgba(0, 0, 0, 0.9) 70%)',
            'radial-gradient(ellipse at center, rgba(102, 0, 204, 0.1) 0%, rgba(204, 0, 136, 0.05) 30%, rgba(0, 0, 0, 0.9) 70%)',
            'radial-gradient(ellipse at center, rgba(204, 0, 136, 0.1) 0%, rgba(26, 145, 255, 0.05) 30%, rgba(0, 0, 0, 0.9) 70%)'
          ]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Floating geometric shapes */}
      <div className="absolute inset-0">
        {Array.from({ length: 12 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-quantum-400/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -100, -20],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Neural network pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" viewBox="0 0 1000 1000">
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-quantum-400" />
        </svg>
      </div>
    </div>
  );
};

// 3D Card Component
const Card3D = ({ children, className = "", delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 50, rotateX: 15 }}
    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.8, type: "spring" }}
    whileHover={{ 
      y: -10, 
      rotateX: 5, 
      rotateY: 5,
      transition: { duration: 0.3 }
    }}
    className={`astral-card-premium transform-gpu perspective-1000 ${className}`}
    style={{ transformStyle: 'preserve-3d' }}
  >
    {children}
  </motion.div>
);

// Modern feature showcase
const FeatureShowcase = ({ icon: Icon, title, description, delay, gradient }: any) => (
  <Card3D delay={delay} className="group cursor-pointer">
    <div className="relative">
      <motion.div 
        className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.6 }}
      >
        <Icon className="w-8 h-8 text-white" />
      </motion.div>
      <h3 className="text-xl font-bold text-white mb-3 text-heading">{title}</h3>
      <p className="text-starlight-400 leading-relaxed">{description}</p>
      
      <motion.div
        className="absolute top-0 right-0 w-8 h-8 border border-quantum-400/30 rounded-full opacity-0 group-hover:opacity-100"
        initial={false}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <ArrowRight className="w-4 h-4 text-quantum-400 m-auto mt-2" />
      </motion.div>
    </div>
  </Card3D>
);

// Premium stats component
const PremiumStats = ({ value, label, icon: Icon, delay }: any) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      
      const counter = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(counter);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(counter);
    }, delay * 100);
    
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: delay * 0.1, duration: 0.6, type: "spring" }}
      className="text-center group"
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="w-16 h-16 bg-gradient-cosmic rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-quantum group-hover:shadow-glow-cosmic transition-all duration-300"
      >
        <Icon className="w-8 h-8 text-white" />
      </motion.div>
      <motion.div 
        className="text-4xl font-bold mb-2 text-heading"
        animate={{ 
          textShadow: [
            "0 0 10px rgba(26, 145, 255, 0.5)",
            "0 0 20px rgba(102, 0, 204, 0.5)",
            "0 0 10px rgba(26, 145, 255, 0.5)"
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <GradientText>
          {displayValue}{typeof value === 'string' && value.includes('%') ? '%' : ''}
          {typeof value === 'string' && value.includes('+') ? '+' : ''}
        </GradientText>
      </motion.div>
      <p className="text-starlight-400 font-medium">{label}</p>
    </motion.div>
  );
};

// Feature card component
const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="relative group"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
    <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 hover:transform hover:-translate-y-2">
      <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// Stats counter component
const StatsCounter = ({ end, label, prefix = "", suffix = "", delay }: any) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;
    
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = end / steps;
    
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
        setHasAnimated(true);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);
    
    return () => clearInterval(timer);
  }, [end, hasAnimated]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, type: "spring" }}
      className="text-center"
    >
      <div className="text-5xl font-bold mb-2">
        <GradientText>
          {prefix}{count}{suffix}
        </GradientText>
      </div>
      <p className="text-gray-400">{label}</p>
    </motion.div>
  );
};

// Testimonial card
const TestimonialCard = ({ quote, author, role, avatar, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.6 }}
    className="relative"
  >
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
      <div className="flex items-start mb-6">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
        ))}
      </div>
      <p className="text-gray-300 text-lg mb-6 italic">"{quote}"</p>
      <div className="flex items-center">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg mr-4">
          {avatar}
        </div>
        <div>
          <p className="text-white font-semibold">{author}</p>
          <p className="text-gray-400 text-sm">{role}</p>
        </div>
      </div>
    </div>
  </motion.div>
);

// Revolutionary Landing Page Component
export default function RevolutionaryLandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.8]);
  
  // Redirect authenticated users
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void-500 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 border-4 border-quantum-400/30 border-t-quantum-400 rounded-full mx-auto mb-6"
          />
          <GradientText className="text-xl font-heading">Initializing Dynasty...</GradientText>
        </motion.div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div ref={containerRef} className="relative min-h-screen bg-void-500 overflow-hidden">
      <FuturisticBackground />
      
      {/* Hero Section with Parallax */}
      <motion.section 
        className="relative min-h-screen flex items-center justify-center"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-cosmic/20 backdrop-blur-xl rounded-full border border-quantum-400/30 mb-8"
            >
              <Sparkles className="w-5 h-5 text-quantum-400 animate-pulse" />
              <span className="text-quantum-300 font-medium tracking-wide">2025 DYNASTY SEASON LIVE</span>
              <Rocket className="w-5 h-5 text-nebula-400 animate-bounce" />
            </motion.div>
          </motion.div>

          <motion.h1 
            className="text-7xl md:text-8xl lg:text-9xl font-black mb-8 leading-tight text-heading"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <motion.div
              animate={{ 
                textShadow: [
                  "0 0 20px rgba(26, 145, 255, 0.5)",
                  "0 0 40px rgba(102, 0, 204, 0.5)",
                  "0 0 20px rgba(26, 145, 255, 0.5)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              DOMINATE THE
            </motion.div>
            <motion.div
              className="bg-gradient-cosmic bg-clip-text text-transparent"
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 8, repeat: Infinity }}
              style={{ backgroundSize: "200% 200%" }}
            >
              ASTRALFIELD
            </motion.div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-2xl md:text-3xl text-starlight-300 mb-12 max-w-4xl mx-auto leading-relaxed"
          >
            The most advanced fantasy football platform ever created. 
            <span className="text-quantum-400 font-semibold"> AI-powered insights</span>, 
            <span className="text-cosmic-400 font-semibold"> real-time analytics</span>, and 
            <span className="text-nebula-400 font-semibold"> championship-grade tools</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <motion.button
              onClick={() => router.push('/login')}
              className="btn-astral-primary text-xl px-12 py-6 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-6 h-6 mr-3 group-hover:animate-pulse" />
              LAUNCH DYNASTY
              <motion.div
                className="ml-3"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-6 h-6" />
              </motion.div>
            </motion.button>
            
            <motion.button
              className="btn-astral-secondary text-xl px-12 py-6 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-6 h-6 mr-3" />
              Experience Demo
            </motion.button>
          </motion.div>

          {/* Floating achievement badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="flex flex-wrap items-center justify-center gap-8 mt-20 text-starlight-400"
          >
            {[
              { icon: Shield, text: "Military-Grade Security" },
              { icon: Cpu, text: "AI-Powered Engine" },
              { icon: Activity, text: "Real-Time Analytics" },
              { icon: Infinity, text: "Unlimited Potential" }
            ].map((badge, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 + index * 0.1 }}
                className="flex items-center gap-3"
                whileHover={{ scale: 1.1 }}
              >
                <badge.icon className="w-6 h-6 text-quantum-400" />
                <span className="text-sm font-medium">{badge.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Premium Stats Section */}
      <section className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <PremiumStats value={2025} label="Season Year" icon={Calendar} delay={0} />
            <PremiumStats value={10} label="Dynasty Teams" icon={Crown} delay={1} />
            <PremiumStats value={99} label="Uptime %" icon={Activity} delay={2} />
            <PremiumStats value={247} label="24/7 Support" icon={Shield} delay={3} />
          </motion.div>
        </div>
      </section>

      {/* Revolutionary Features */}
      <section className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-6xl md:text-7xl font-black mb-8 text-heading">
              <GradientText>REVOLUTIONARY</GradientText>
              <br />
              <span className="text-white">FEATURES</span>
            </h2>
            <p className="text-2xl text-starlight-300 max-w-3xl mx-auto">
              Experience the future of fantasy football with cutting-edge technology
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureShowcase
              icon={Brain}
              title="Neural Analytics Engine"
              description="Advanced AI algorithms analyze millions of data points to predict player performance with unprecedented accuracy."
              delay={0}
              gradient="bg-gradient-cosmic"
            />
            <FeatureShowcase
              icon={Eye}
              title="Real-Time Vision System"
              description="Live game tracking with computer vision technology provides instant updates and insights as plays unfold."
              delay={0.1}
              gradient="bg-gradient-nebula"
            />
            <FeatureShowcase
              icon={Layers}
              title="Multi-Dimensional Strategy"
              description="Layer complex strategies across multiple timeframes with our advanced simulation and modeling tools."
              delay={0.2}
              gradient="bg-gradient-aurora"
            />
            <FeatureShowcase
              icon={Database}
              title="Quantum Data Processing"
              description="Process massive datasets instantly with our quantum-inspired algorithms for lightning-fast insights."
              delay={0.3}
              gradient="bg-gradient-quantum"
            />
            <FeatureShowcase
              icon={LineChart}
              title="Predictive Market Intelligence"
              description="Stay ahead of trends with predictive analytics that forecast player values and market movements."
              delay={0.4}
              gradient="bg-gradient-starfield"
            />
            <FeatureShowcase
              icon={Rocket}
              title="Championship Acceleration"
              description="Accelerate your path to victory with our championship-tested strategies and optimization tools."
              delay={0.5}
              gradient="bg-gradient-cosmic"
            />
          </div>
        </div>
      </section>

      {/* Elite Testimonials */}
      <section className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-6xl md:text-7xl font-black mb-8 text-heading">
              <span className="text-white">ELITE</span>
              <br />
              <GradientText>CHAMPIONS</GradientText>
            </h2>
            <p className="text-2xl text-starlight-300 max-w-3xl mx-auto">
              Hear from the dynasty builders who dominate the AstralField
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "AstralField's AI-powered insights gave me the edge I needed to win my first championship. The predictive analytics are game-changing.",
                author: "Nicholas D'Amato",
                role: "Dynasty Champion • 3x Winner",
                avatar: "ND",
                delay: 0
              },
              {
                quote: "The real-time analytics and market intelligence helped me build a dynasty that's dominated for 4 consecutive seasons.",
                author: "Sarah Chen",
                role: "Dynasty Architect • Hall of Fame",
                avatar: "SC", 
                delay: 0.1
              },
              {
                quote: "From rookie to champion in one season. AstralField's tools and community support made all the difference.",
                author: "Marcus Johnson",
                role: "Rising Star • Rookie Champion",
                avatar: "MJ",
                delay: 0.2
              }
            ].map((testimonial, index) => (
              <Card3D key={index} delay={testimonial.delay} className="p-8">
                <div className="flex items-center mb-6">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="w-5 h-5 text-gold-400 fill-current" />
                  ))}
                </div>
                <p className="text-starlight-300 text-lg mb-8 italic leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-cosmic flex items-center justify-center text-white font-bold text-lg mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">{testimonial.author}</p>
                    <p className="text-quantum-400 text-sm font-medium">{testimonial.role}</p>
                  </div>
                </div>
              </Card3D>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Championship Ready */}
      <section className="relative z-10 py-32">
        <div className="max-w-5xl mx-auto px-6">
          <Card3D delay={0} className="text-center p-16 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-cosmic opacity-10"
              animate={{ 
                backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
              }}
              transition={{ duration: 20, repeat: Infinity }}
              style={{ backgroundSize: "400% 400%" }}
            />
            
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto mb-8"
            >
              <Crown className="w-20 h-20 text-gold-400 animate-pulse" />
            </motion.div>
            
            <h2 className="text-5xl md:text-6xl font-black mb-6 text-heading">
              READY TO BUILD YOUR
              <br />
              <GradientText>CHAMPIONSHIP DYNASTY?</GradientText>
            </h2>
            
            <p className="text-2xl text-starlight-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join the most elite fantasy football platform and compete with the greatest dynasty builders in the galaxy.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <motion.button
                onClick={() => router.push('/login')}
                className="btn-astral-primary text-2xl px-16 py-8 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Rocket className="w-8 h-8 mr-4 group-hover:animate-bounce" />
                LAUNCH DYNASTY NOW
                <motion.div
                  className="ml-4"
                  animate={{ x: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ChevronRight className="w-8 h-8" />
                </motion.div>
              </motion.button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-8 text-starlight-400">
              {[
                { icon: CheckCircle, text: "No Setup Fees" },
                { icon: Zap, text: "Instant Access" },
                { icon: Shield, text: "100% Secure" },
                { icon: Infinity, text: "Unlimited Potential" }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: "spring" }}
                  className="flex items-center gap-3"
                >
                  <feature.icon className="w-5 h-5 text-quantum-400" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </Card3D>
        </div>
      </section>

      {/* Futuristic Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-void-500/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-gradient-cosmic rounded-2xl flex items-center justify-center shadow-glow-quantum">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-heading bg-gradient-cosmic bg-clip-text text-transparent">
                  AstralField
                </h3>
                <p className="text-quantum-400 text-sm font-mono">DYNASTY LEAGUE</p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-center md:text-right"
            >
              <p className="text-starlight-400 mb-2">
                © 2025 AstralField Dynasty League. All rights reserved.
              </p>
              <p className="text-quantum-400 text-sm">
                Built for champions, by champions. 🚀
              </p>
            </motion.div>
          </div>
        </div>
      </footer>
    </div>
  );
}