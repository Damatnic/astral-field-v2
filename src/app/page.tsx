'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { motion } from 'framer-motion'
import { Trophy, Users, Zap, Shield, TrendingUp, Play, Monitor, Info } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { user, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const features = [
    {
      icon: Trophy,
      title: 'Elite Fantasy Experience',
      description: 'Advanced analytics, AI-powered insights, and real-time scoring for the ultimate fantasy football experience.'
    },
    {
      icon: Users,
      title: 'League Management',
      description: 'Create and manage leagues with customizable scoring, roster settings, and automated scheduling.'
    },
    {
      icon: Zap,
      title: 'Live Draft Room',
      description: 'Real-time draft experience with snake and auction formats, AI assistant, and advanced player analytics.'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime and real-time data backup for peace of mind.'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Machine learning predictions, player trends, injury analysis, and trade recommendations.'
    },
    {
      icon: Play,
      title: 'Mobile Experience',
      description: 'Native-like mobile app with offline support, push notifications, and touch-optimized interfaces.'
    }
  ]

  if (user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute inset-0 bg-grid-white/[0.05] opacity-40"></div>
      
      {/* Demo Access Banner */}
      <div className="relative z-20 bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-white" />
              <span className="text-white font-medium">
                🚀 Demo Ready! Login with: <code className="bg-white/20 px-2 py-1 rounded text-sm ml-1">nicholas.damato@astralfield.com</code> / <code className="bg-white/20 px-2 py-1 rounded text-sm">astral2025</code>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/status')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm rounded-lg transition-all duration-200"
              >
                <Monitor className="w-4 h-4" />
                System Status
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-6xl md:text-7xl font-bold text-white mb-6"
          >
            Astral
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Field</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed"
          >
            The future of fantasy football. Built with cutting-edge AI, real-time analytics, 
            and the most intuitive interface in the galaxy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/auth/register')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold rounded-full shadow-xl transition-all duration-200"
            >
              Get Started Free
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/auth/login')}
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white text-lg font-semibold rounded-full transition-all duration-200"
            >
              Sign In
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Astral Field?</h2>
            <p className="text-lg text-gray-300">Experience fantasy football like never before with our advanced platform</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
              >
                <feature.icon className="h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-white/10 rounded-3xl p-12"
          >
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Dominate Your League?</h2>
            <p className="text-lg text-gray-300 mb-8">
              Join thousands of fantasy managers who have already upgraded to Astral Field
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/auth/register')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold rounded-full shadow-xl transition-all duration-200"
            >
              Start Your Journey
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold text-white mb-2">Astral Field</h3>
              <p className="text-gray-400">The future of fantasy football.</p>
            </div>
            
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push('/status')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                System Status
              </button>
              <button
                onClick={() => router.push('/api-status')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                API Info
              </button>
              <button
                onClick={() => router.push('/health')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Health Check
              </button>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-gray-500">
            <p>&copy; 2025 Astral Field. Built with Next.js, deployed on Vercel. Latest: Production-Ready!</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
