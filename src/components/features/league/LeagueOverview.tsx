'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Users, 
  Calendar, 
  Settings,
  UserPlus,
  LogOut,
  Crown,
  Zap,
  TrendingUp
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useLeagueStore } from '@/stores/leagueStore'
import type { Database } from '@/types/database'

type League = Database['public']['Tables']['leagues']['Row']
type Team = Database['public']['Tables']['teams']['Row'] & {
  users: {
    username: string
    email: string
    avatar_url: string | null
  }
}

interface LeagueOverviewProps {
  leagueId: string
}

export default function LeagueOverview({ leagueId }: LeagueOverviewProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { 
    currentLeague, 
    teams, 
    selectLeague, 
    fetchLeagueTeams,
    isLoading,
    error 
  } = useLeagueStore()
  
  const [showJoinForm, setShowJoinForm] = useState(false)

  useEffect(() => {
    if (leagueId) {
      selectLeague(leagueId)
    }
  }, [leagueId, selectLeague])

  const userTeam = teams.find(team => team.user_id === user?.id)
  const isCommissioner = currentLeague?.commissioner_id === user?.id
  const canJoin = !userTeam && teams.length < (currentLeague?.settings as any)?.maxTeams

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !currentLeague) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">League not found</h2>
          <p className="text-gray-400 mb-4">{error || 'This league does not exist or you don&apos;t have access.'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const settings = currentLeague.settings as any
  const scoringSystem = currentLeague.scoring_system as any

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
                {currentLeague.name}
              </h1>
              <div className="flex items-center space-x-6 mt-2 text-sm text-gray-400">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {teams.length}/{settings.maxTeams} Teams
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {currentLeague.season_year} Season
                </div>
                {currentLeague.draft_date && (
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 mr-1" />
                    Draft: {new Date(currentLeague.draft_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {canJoin && (
                <button
                  onClick={() => setShowJoinForm(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join League
                </button>
              )}
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push(`/leagues/${leagueId}/draft`)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Draft Room
                </button>
                
                {isCommissioner && (
                  <button
                    onClick={() => router.push(`/leagues/${leagueId}/settings`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* League Stats */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">League Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <div className="flex items-center">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-400">League Type</p>
                      <p className="text-lg font-semibold text-white">
                        {settings.startingLineup?.FLEX > 0 ? 'PPR' : 'Standard'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-400">Roster Size</p>
                      <p className="text-lg font-semibold text-white">{settings.rosterSize}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-400">Waiver Type</p>
                      <p className="text-lg font-semibold text-white">{settings.waiverType}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="text-center text-gray-400 py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm mt-1">League activity will appear here</p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Teams List */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Teams</h2>
              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white">Members</span>
                    <span className="text-sm text-gray-400">{teams.length}/{settings.maxTeams}</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {teams.map((team: any, index) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {team.users.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-white flex items-center">
                            {team.team_name}
                            {team.user_id === currentLeague.commissioner_id && (
                              <Crown className="h-4 w-4 text-yellow-500 ml-1" />
                            )}
                          </p>
                          <p className="text-sm text-gray-400">{team.users.username}</p>
                        </div>
                      </div>
                      {team.user_id === user?.id && (
                        <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </motion.div>
                  ))}
                  
                  {/* Empty Slots */}
                  {Array.from({ length: settings.maxTeams - teams.length }, (_, i) => (
                    <div key={`empty-${i}`} className="flex items-center p-3 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-gray-400">Open Slot</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            {userTeam && (
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push(`/leagues/${leagueId}/roster`)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-left hover:bg-gray-700 transition-colors"
                  >
                    <p className="font-medium text-white">Manage Roster</p>
                    <p className="text-sm text-gray-400">Set your lineup and make changes</p>
                  </button>
                  
                  <button
                    onClick={() => router.push(`/leagues/${leagueId}/trades`)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-left hover:bg-gray-700 transition-colors"
                  >
                    <p className="font-medium text-white">Trade Center</p>
                    <p className="text-sm text-gray-400">Propose and review trades</p>
                  </button>

                  <button
                    onClick={() => router.push(`/leagues/${leagueId}/waiver`)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-left hover:bg-gray-700 transition-colors"
                  >
                    <p className="font-medium text-white">Waiver Wire</p>
                    <p className="text-sm text-gray-400">Add/drop players</p>
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Join League Modal */}
      {showJoinForm && (
        <JoinLeagueModal
          leagueId={leagueId}
          onClose={() => setShowJoinForm(false)}
        />
      )}
    </div>
  )
}

// Join League Modal Component
function JoinLeagueModal({ leagueId, onClose }: { leagueId: string; onClose: () => void }) {
  const { user } = useAuthStore()
  const { joinLeague, isLoading, error, clearError } = useLeagueStore()
  const [teamName, setTeamName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !teamName.trim()) return

    clearError()
    const success = await joinLeague(leagueId, user.id, teamName.trim())
    if (success) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-semibold text-white mb-4">Join League</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="teamName" className="block text-sm font-medium text-gray-200 mb-2">
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your team name"
              required
              maxLength={50}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !teamName.trim()}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Joining...
                </>
              ) : (
                'Join League'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}