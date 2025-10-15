'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Users, 
  Zap, 
  TrendingUp, 
  Target, 
  Trophy,
  Activity,
  Calendar,
  BarChart3,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickAction {
  label: string
  href: string
  icon: any
  color: string
  description: string
  count?: number
}

export function QuickActionsWidget() {
  const quickActions: QuickAction[] = [
    {
      label: 'Set Lineup',
      href: '/team',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      description: 'Optimize your starting roster'
    },
    {
      label: 'Claim Players',
      href: '/waivers',
      icon: Zap,
      color: 'from-purple-500 to-purple-600',
      description: 'AI-powered waiver recommendations',
      count: 12
    },
    {
      label: 'Propose Trade',
      href: '/trades',
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      description: 'Build trades with AI analysis'
    },
    {
      label: 'Research',
      href: '/players',
      icon: Target,
      color: 'from-orange-500 to-orange-600',
      description: 'Advanced player analytics'
    },
    {
      label: 'Live Scores',
      href: '/live-scores',
      icon: Activity,
      color: 'from-red-500 to-red-600',
      description: 'Real-time game updates'
    },
    {
      label: 'Matchup',
      href: '/matchups',
      icon: Trophy,
      color: 'from-yellow-500 to-yellow-600',
      description: 'Head-to-head battles'
    },
    {
      label: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Upcoming games & matchups'
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      color: 'from-pink-500 to-pink-600',
      description: 'League stats & trends'
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, idx) => (
          <Link
            key={action.label}
            href={action.href}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative p-6 rounded-xl',
                'bg-gradient-to-br', action.color,
                'text-white',
                'shadow-lg hover:shadow-2xl',
                'transition-all duration-300',
                'group cursor-pointer',
                'overflow-hidden'
              )}
            >
              {/* Background glow */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />

              {/* Count badge */}
              {action.count !== undefined && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold">
                  {action.count}
                </div>
              )}

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <action.icon className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-1">{action.label}</h3>
                  <p className="text-sm text-white/80 line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}

