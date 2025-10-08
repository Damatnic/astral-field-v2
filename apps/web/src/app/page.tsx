'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Trophy, Zap, Target, Users, TrendingUp, Shield, Star, ChevronRight, Play, CheckCircle2, Sparkles, BarChart3, Activity, Crown, Award } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Insights',
      description: 'Advanced AI algorithms analyze millions of data points to give you the ultimate competitive edge',
      color: 'from-blue-500 to-cyan-500',
      bgGlow: 'bg-blue-500/20',
    },
    {
      icon: Zap,
      title: 'Real-Time Everything',
      description: 'Sub-50ms updates for draft rooms, live scoring, and instant notifications. Never miss a beat.',
      color: 'from-green-500 to-emerald-500',
      bgGlow: 'bg-green-500/20',
    },
    {
      icon: BarChart3,
      title: 'Pro-Level Analytics',
      description: 'Deep statistical insights, performance trends, and predictive modeling used by champions',
      color: 'from-purple-500 to-pink-500',
      bgGlow: 'bg-purple-500/20',
    },
  ]

  const stats = [
    { value: '50ms', label: 'Update Speed', icon: Zap },
    { value: '99.9%', label: 'Uptime', icon: Shield },
    { value: '10K+', label: 'Active Users', icon: Users },
    { value: '4.9/5', label: 'User Rating', icon: Star },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />
        <div 
          className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        />
        <div 
          className="absolute top-0 -right-4 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
        <div 
          className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"
          style={{ transform: `translateY(${-scrollY * 0.2}px)` }}
        />
        
        {/* Football Field Lines */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent" />
          <div className="absolute top-2/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent" />
          <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl sticky top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="relative">
                  <Trophy className="w-8 h-8 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 blur-xl bg-yellow-400/30 group-hover:bg-yellow-400/50 transition-colors" />
                </div>
                <span className="text-2xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AstralField
                </span>
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <Link href="#features" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  Features
                </Link>
                <Link href="#pricing" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  Pricing
                </Link>
                <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  Dashboard
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signin?new=true">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/25">
                  Get Started
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 sm:pt-32 sm:pb-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-blue-300">The #1 Fantasy Football Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight">
              <span className="block text-white">Dominate Your League</span>
              <span className="block mt-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                With AI-Powered Fantasy
              </span>
            </h1>

            {/* Subheading */}
            <p className="max-w-3xl mx-auto text-xl sm:text-2xl text-slate-300 leading-relaxed">
              Advanced AI coaching, real-time analytics, and lightning-fast performance. 
              <span className="text-white font-semibold"> Built for serious players who play to win.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link href="/auth/signin?new=true">
                <Button size="lg" className="text-lg px-10 py-7 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl shadow-blue-500/30 group">
                  <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                  Start Winning Now
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 border-2 border-slate-700 hover:border-slate-600 bg-slate-900/50 backdrop-blur-sm">
                  <Target className="mr-2 w-5 h-5" />
                  See Features
                </Button>
              </Link>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-16 max-w-4xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
                    <stat.icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Powerful Features</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
              Everything You Need to Win
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Professional-grade tools that give you an unfair advantage over your competition
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-8 hover:border-slate-700 transition-all duration-500 ${
                  activeFeature === i ? 'scale-105 border-slate-600' : ''
                }`}
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                
                {/* Icon */}
                <div className={`relative inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-slate-300 leading-relaxed">{feature.description}</p>

                {/* Hover Arrow */}
                <ChevronRight className="absolute bottom-8 right-8 w-6 h-6 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-2 transition-all" />
              </div>
            ))}
          </div>

          {/* Additional Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
            {[
              { icon: Activity, title: 'Live Scoring', desc: 'Real-time stat updates' },
              { icon: Users, title: 'Draft Rooms', desc: 'Interactive draft experience' },
              { icon: TrendingUp, title: 'Trade Analyzer', desc: 'Fair trade evaluation' },
              { icon: Shield, title: 'Secure Platform', desc: 'Bank-level security' },
              { icon: Award, title: 'Achievements', desc: 'Earn badges & rewards' },
              { icon: Target, title: 'Lineup Optimizer', desc: 'AI-powered suggestions' },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-4 p-6 rounded-2xl bg-slate-900/30 border border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-900/50 transition-all group">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-colors">
                    <item.icon className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-32 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Trusted by Champions
            </h2>
            <p className="text-xl text-slate-300">
              Join thousands of fantasy players winning with AstralField
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Mike Chen', role: 'League Champion 2024', quote: 'The AI coach helped me win my first championship. Game changer!' },
              { name: 'Sarah Williams', role: '5-Year Fantasy Veteran', quote: 'Best platform I\'ve used. The real-time updates are incredible.' },
              { name: 'James Rodriguez', role: 'Commissioner', quote: 'Managing my league has never been easier. Highly recommend!' },
            ].map((testimonial, i) => (
              <div key={i} className="relative p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
                <div className="absolute -top-4 -left-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-slate-300 italic mb-6 mt-4">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-slate-400">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-8 animate-bounce" />
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
            Ready to Dominate Your League?
          </h2>
          <p className="text-xl text-slate-300 mb-10">
            Join the winning team. Start your championship journey today.
          </p>
          <Link href="/auth/signin?new=true">
            <Button size="lg" className="text-lg px-12 py-7 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl shadow-blue-500/30 group">
              <Crown className="mr-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
              Start Your Free Trial
              <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-sm text-slate-400 mt-6">
            No credit card required • Setup in 2 minutes • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-slate-800 bg-slate-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                AstralField
              </span>
            </div>
            <div className="flex space-x-8 text-slate-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/support" className="hover:text-white transition-colors">Support</Link>
              <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            </div>
          </div>
          <div className="text-center mt-8 text-slate-500 text-sm">
            © 2025 AstralField. Built for champions. 🏆
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
