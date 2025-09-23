/**
 * Landing Page - Production-ready with animations and complete features
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, Trophy, Users, TrendingUp, Zap, Shield, Star,
  ChevronRight, Play, BarChart3, Brain, Globe, Smartphone,
  CheckCircle2, Sparkles, Clock, DollarSign, Award, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Feature cards data
const features = [
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Machine learning algorithms analyze millions of data points to give you the edge.',
    gradient: 'from-purple-600 to-blue-600',
  },
  {
    icon: Zap,
    title: 'Real-Time Updates',
    description: 'Live scoring, instant notifications, and real-time player news as it happens.',
    gradient: 'from-yellow-600 to-red-600',
  },
  {
    icon: Trophy,
    title: 'Advanced Analytics',
    description: 'Deep statistical analysis, trend predictions, and performance projections.',
    gradient: 'from-green-600 to-teal-600',
  },
  {
    icon: Users,
    title: 'Social Features',
    description: 'Trash talk, league chat, and community engagement tools.',
    gradient: 'from-pink-600 to-purple-600',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Bank-level security with 99.9% uptime guarantee.',
    gradient: 'from-blue-600 to-cyan-600',
  },
  {
    icon: Globe,
    title: 'Multi-Platform',
    description: 'Seamless experience across web, iOS, and Android.',
    gradient: 'from-orange-600 to-pink-600',
  },
];

// Testimonials data
const testimonials = [
  {
    name: 'Nicholas D\'Amato',
    role: 'League Commissioner',
    content: 'Best fantasy platform I\'ve ever used. The AI recommendations are game-changing.',
    avatar: '👑',
    rating: 5,
  },
  {
    name: 'Sarah Johnson',
    role: '3x Champion',
    content: 'The real-time updates and analytics give me a huge advantage. Worth every penny!',
    avatar: '🏆',
    rating: 5,
  },
  {
    name: 'Mike Chen',
    role: 'Dynasty League Player',
    content: 'Finally, a platform that understands dynasty leagues. The keeper features are perfect.',
    avatar: '🚀',
    rating: 5,
  },
];

// Pricing tiers
const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '1 League',
      'Basic analytics',
      'Mobile app access',
      'Live scoring',
      'Community support',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    features: [
      'Unlimited leagues',
      'AI lineup optimizer',
      'Advanced analytics',
      'Priority support',
      'Custom scoring',
      'Trade analyzer',
      'Weather insights',
    ],
    cta: 'Go Pro',
    popular: true,
  },
  {
    name: 'Commissioner',
    price: '$19.99',
    period: '/month',
    features: [
      'Everything in Pro',
      'League customization',
      'Advanced admin tools',
      'Custom branding',
      'API access',
      'Dedicated support',
      'White-label options',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function LandingPage() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const { scrollYProgress } = useScroll();
  const headerY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  // Rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <motion.div 
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 20% 80%, #667eea 0%, transparent 50%)',
              'radial-gradient(circle at 80% 20%, #764ba2 0%, transparent 50%)',
              'radial-gradient(circle at 40% 40%, #f093fb 0%, transparent 50%)',
              'radial-gradient(circle at 20% 80%, #667eea 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Header */}
      <motion.header 
        style={{ y: headerY }}
        className="relative z-50 border-b border-white/10 backdrop-blur-xl bg-black/50"
      >
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">Astral Field</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/features" className="hover:text-purple-400 transition">Features</Link>
              <Link href="/pricing" className="hover:text-purple-400 transition">Pricing</Link>
              <Link href="/blog" className="hover:text-purple-400 transition">Blog</Link>
              <Link href="/docs" className="hover:text-purple-400 transition">Docs</Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/auth/signin" 
                className="hidden sm:block hover:text-purple-400 transition"
              >
                Sign In
              </Link>
              <Link 
                href="/auth/signup"
                className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition duration-300"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        style={{ scale: heroScale }}
        className="relative z-10 container mx-auto px-6 py-20 md:py-32"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center space-x-2 bg-purple-500/20 border border-purple-500/50 rounded-full px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-purple-300">2025 Season Ready</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Fantasy Football
              <br />
              <span className="text-4xl md:text-6xl">Redefined</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
              The most advanced fantasy football platform ever built. 
              AI-powered insights, real-time analytics, and an experience that puts ESPN and Yahoo to shame.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link 
                href="/auth/signup"
                className="group bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-purple-500/50 transition duration-300 flex items-center"
              >
                Start Your Dynasty
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition" />
              </Link>
              
              <button
                onClick={() => setIsVideoPlaying(true)}
                className="flex items-center space-x-2 px-8 py-4 border border-white/30 rounded-full hover:bg-white/10 transition"
              >
                <Play className="h-5 w-5" />
                <span>Watch Demo</span>
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="grid grid-cols-3 gap-8 mt-20"
          >
            {[
              { value: '10K+', label: 'Active Leagues' },
              { value: '99.9%', label: 'Uptime' },
              { value: '4.9★', label: 'User Rating' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"> Dominate</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Powerful features that give you the competitive edge
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, rotate: 1 }}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition duration-300"
              >
                <div className={`h-12 w-12 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="relative z-10 py-20 px-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold mb-6">
                See It In Action
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Experience the future of fantasy football with our interactive demo. 
                No sign-up required.
              </p>
              
              <div className="space-y-4">
                {[
                  'AI-powered draft assistant',
                  'Real-time player projections',
                  'Advanced trade analyzer',
                  'Live game simulations',
                ].map((item, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
              
              <Link 
                href="/demo"
                className="inline-flex items-center mt-8 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition"
              >
                Try Interactive Demo
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl border border-white/10 overflow-hidden">
                {/* Demo preview would go here */}
                <div className="h-full flex items-center justify-center">
                  <Play className="h-16 w-16 text-white/50" />
                </div>
              </div>
              
              {/* Floating stats */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-gradient-to-r from-green-600 to-emerald-600 p-3 rounded-xl shadow-xl"
              >
                <TrendingUp className="h-6 w-6 text-white" />
              </motion.div>
              
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -left-4 bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-xl shadow-xl"
              >
                <BarChart3 className="h-6 w-6 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Loved by Champions</h2>
            <p className="text-xl text-gray-400">Join thousands of winning managers</p>
          </motion.div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center"
            >
              <div className="text-5xl mb-4">{testimonials[currentTestimonial].avatar}</div>
              <div className="flex justify-center mb-4">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-xl text-gray-300 mb-6 italic">
                "{testimonials[currentTestimonial].content}"
              </p>
              <div>
                <div className="font-bold">{testimonials[currentTestimonial].name}</div>
                <div className="text-gray-400">{testimonials[currentTestimonial].role}</div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Testimonial indicators */}
          <div className="flex justify-center space-x-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTestimonial(i)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  currentTestimonial === i ? 'w-8 bg-purple-500' : 'w-2 bg-gray-600'
                )}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-400">Choose the plan that's right for you</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border rounded-2xl p-8',
                  tier.popular ? 'border-purple-500 scale-105' : 'border-white/10'
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <div className="text-4xl font-bold">
                    {tier.price}
                    <span className="text-lg text-gray-400">{tier.period}</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  className={cn(
                    'w-full py-3 rounded-full font-semibold transition',
                    tier.popular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg hover:shadow-purple-500/50'
                      : 'bg-white/10 border border-white/20 hover:bg-white/20'
                  )}
                >
                  {tier.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="container mx-auto max-w-4xl text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Win Your League?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of managers who've already made the switch
          </p>
          <Link 
            href="/auth/signup"
            className="inline-flex items-center bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-purple-500/50 transition duration-300"
          >
            Start Free Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          
          <div className="mt-8 flex items-center justify-center space-x-8 text-gray-400">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>No Hidden Fees</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
            onClick={() => setIsVideoPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Interactive demo showcase */}
              <div className="h-full relative bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                {/* Animated dashboard preview */}
                <div className="absolute inset-4 bg-gray-900 rounded-lg overflow-hidden">
                  <div className="h-full relative">
                    {/* Header bar */}
                    <div className="h-8 bg-gray-800 flex items-center px-4">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="ml-4 text-gray-400 text-xs">AstralField - Dynasty League</div>
                    </div>
                    
                    {/* Dashboard content */}
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-white font-bold">Command Center</div>
                        <div className="text-blue-400 text-sm">Week 3 • 2025 Season</div>
                      </div>
                      
                      {/* Stats grid */}
                      <div className="grid grid-cols-4 gap-3">
                        {['5-0', '#1', '156.2', '98.7'].map((stat, i) => (
                          <div key={i} className="bg-gray-800 rounded p-2">
                            <div className="text-blue-400 text-lg font-bold">{stat}</div>
                            <div className="text-gray-400 text-xs">
                              {['Record', 'Rank', 'PF', 'PA'][i]}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Live updates */}
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-white text-sm mb-2">Live Updates</div>
                        <div className="space-y-1">
                          <div className="text-green-400 text-xs">Josh Allen: 2 TD passes</div>
                          <div className="text-blue-400 text-xs">Travis Kelce: 67 yards receiving</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Animated pulse effect */}
                    <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                  </div>
                </div>
                
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <div className="w-0 h-0 border-l-8 border-l-white border-y-6 border-y-transparent ml-2"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}