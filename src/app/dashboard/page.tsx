'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useLeagueStore } from '@/stores/leagueStore'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Users, 
  Calendar, 
  TrendingUp, 
  Star, 
  Clock,
  Plus,
  Settings,
  LogOut
} from 'lucide-react'


export default function DashboardPage() {
  const router = useRouter()
  const { user, logout, checkAuth } = useAuthStore()
  const { leagues, fetchUserLeagues } = useLeagueStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    
    // Load user's leagues
    fetchUserLeagues(user.id)
  }, [user, router, fetchUserLeagues])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 text-purple-500"
          >
            <Trophy className="w-full h-full" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-purple-400 font-medium"
          >
            Loading your dashboard...
          </motion.p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Astral Field</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-white hidden sm:block">
                <span className="text-gray-300">Welcome back,</span>
                <span className="font-semibold ml-1">{user.username}</span>
              </div>
              <div className="text-white sm:hidden">
                <span className="font-semibold text-sm">{user.username}</span>
              </div>
              <button
                onClick={() => router.push('/settings')}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700"
          >
            <div className="flex items-center">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              <div className="ml-2 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Active Leagues</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{leagues.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700"
          >
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              <div className="ml-2 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Win Rate</p>
                <p className="text-lg sm:text-2xl font-bold text-white">73%</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700"
          >
            <div className="flex items-center">
              <Star className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              <div className="ml-2 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Total Points</p>
                <p className="text-lg sm:text-2xl font-bold text-white">2,847</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700"
          >
            <div className="flex items-center">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
              <div className="ml-2 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Next Game</p>
                <p className="text-lg sm:text-2xl font-bold text-white">2d</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* My Leagues Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">My Leagues</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/leagues/create')}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create League
            </motion.button>
          </div>

          {leagues.length === 0 ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <Trophy className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No leagues yet</h3>
              <p className="text-gray-400 mb-6">Create your first league or join an existing one</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.push('/leagues/create')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create League
                </button>
                <button
                  onClick={() => router.push('/leagues/join')}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Join League
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leagues.map((league, index) => {
                const settings = league.settings as Record<string, unknown>
                const teamCount = 8 // This would come from a real query
                const status = league.draft_date ? 'draft' : 'active'
                const nextEvent = league.draft_date 
                  ? `Draft - ${new Date(league.draft_date).toLocaleDateString()}` 
                  : 'Week 10 - Sunday'
                
                return (
                <motion.div
                  key={league.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-6 cursor-pointer hover:border-gray-600 transition-all"
                  onClick={() => router.push(`/leagues/${league.id}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{league.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      status === 'active' 
                        ? 'bg-green-500/20 text-green-400'
                        : status === 'draft'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center text-gray-400 mb-3">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">{teamCount} members</span>
                  </div>

                  <div className="flex items-center text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">{nextEvent}</span>
                  </div>

                  {status === 'draft' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                    >
                      <p className="text-sm text-yellow-400 font-medium">Draft starting soon!</p>
                    </motion.div>
                  )}
                </motion.div>
                )
              })}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/players')}
              className="p-4 bg-gray-800 border border-gray-700 rounded-lg text-left hover:bg-gray-700 transition-colors"
            >
              <Users className="h-6 w-6 text-blue-500 mb-2" />
              <p className="font-medium text-white">Player Database</p>
              <p className="text-sm text-gray-400">Browse players, stats, and projections</p>
            </button>

            <button
              onClick={() => router.push('/leagues/create')}
              className="p-4 bg-gray-800 border border-gray-700 rounded-lg text-left hover:bg-gray-700 transition-colors"
            >
              <Plus className="h-6 w-6 text-green-500 mb-2" />
              <p className="font-medium text-white">Create League</p>
              <p className="text-sm text-gray-400">Start a new fantasy football league</p>
            </button>

            {leagues.length > 0 && (
              <button
                onClick={() => router.push(`/leagues/${leagues[0].id}`)}
                className="p-4 bg-gray-800 border border-gray-700 rounded-lg text-left hover:bg-gray-700 transition-colors"
              >
                <Trophy className="h-6 w-6 text-yellow-500 mb-2" />
                <p className="font-medium text-white">View League</p>
                <p className="text-sm text-gray-400">Manage your teams and rosters</p>
              </button>
            )}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="text-center text-gray-400 py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm mt-1">Activity from your leagues will appear here</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}