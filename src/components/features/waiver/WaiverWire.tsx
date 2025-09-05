'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Trophy,
  Target
} from 'lucide-react'
import { useWaiverStore } from '@/stores/waiverStore'
import { useRosterStore } from '@/stores/rosterStore'
import { useLeagueStore } from '@/stores/leagueStore'
import { useAuthStore } from '@/stores/authStore'
import type { WaiverPlayer, WaiverClaim } from '@/services/api/waiverService'

interface WaiverWireProps {
  leagueId: string
}

export default function WaiverWire({ leagueId }: WaiverWireProps) {
  const { user } = useAuthStore()
  const { teams } = useLeagueStore()
  const { roster, fetchRoster } = useRosterStore()
  const { 
    waiverPlayers, 
    teamClaims, 
    faabBudget, 
    isLoading, 
    error,
    fetchWaiverPlayers,
    fetchTeamClaims,
    fetchFAABBudget,
    submitWaiverClaim,
    cancelWaiverClaim,
    processWaivers,
    clearError 
  } = useWaiverStore()
  
  const [activeTab, setActiveTab] = useState<'available' | 'claims' | 'process'>('available')
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('ALL')
  const [selectedPlayer, setSelectedPlayer] = useState<WaiverPlayer | null>(null)
  const [showClaimModal, setShowClaimModal] = useState(false)

  const userTeam = teams.find(team => team.user_id === user?.id)

  useEffect(() => {
    if (leagueId) {
      fetchWaiverPlayers(leagueId)
    }
  }, [leagueId, fetchWaiverPlayers])

  useEffect(() => {
    if (userTeam) {
      fetchTeamClaims(userTeam.id)
      fetchFAABBudget(userTeam.id)
      fetchRoster(userTeam.id)
    }
  }, [userTeam, fetchTeamClaims, fetchFAABBudget, fetchRoster])

  const filteredPlayers = waiverPlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.nfl_team.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter
    return matchesSearch && matchesPosition
  })

  const pendingClaims = teamClaims.filter(claim => claim.status === 'pending')
  const claimHistory = teamClaims.filter(claim => claim.status !== 'pending')

  const handlePlayerClaim = (player: WaiverPlayer) => {
    setSelectedPlayer(player)
    setShowClaimModal(true)
  }

  const handleProcessWaivers = async () => {
    clearError()
    const result = await processWaivers(leagueId)
    if (result.success) {
      // Refresh data after processing
      if (userTeam) {
        fetchTeamClaims(userTeam.id)
        fetchFAABBudget(userTeam.id)
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'successful': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'processed': return <Clock className="h-4 w-4 text-gray-500" />
      default: return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'successful': return 'text-green-400 bg-green-900/30 border-green-600/30'
      case 'failed': return 'text-red-400 bg-red-900/30 border-red-600/30'
      case 'processed': return 'text-gray-400 bg-gray-900/30 border-gray-600/30'
      default: return 'text-yellow-400 bg-yellow-900/30 border-yellow-600/30'
    }
  }

  const isCommissioner = teams.find(team => team.user_id === user?.id && 
    teams.some(t => t.league_id === leagueId))?.league_id === leagueId // This logic needs fixing with proper league data

  if (!userTeam) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Team Access</h2>
          <p className="text-gray-400">You need to be part of this league to access the waiver wire.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <Target className="h-8 w-8 text-blue-500 mr-3" />
                Waiver Wire
              </h1>
              <p className="text-gray-400 mt-1">Claim players and manage your roster</p>
            </div>

            <div className="flex items-center space-x-4">
              {/* FAAB Budget Display */}
              <div className="bg-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-400">FAAB Budget</p>
                    <p className="font-semibold text-white">
                      ${faabBudget.remaining} / ${faabBudget.total}
                    </p>
                  </div>
                </div>
              </div>

              {/* Process Waivers (Commissioner Only) */}
              {isCommissioner && pendingClaims.length > 0 && (
                <button
                  onClick={handleProcessWaivers}
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Process Waivers
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'available'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Available Players ({filteredPlayers.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'claims'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Clock className="h-4 w-4 mr-2" />
            My Claims ({pendingClaims.length})
          </button>
          <button
            onClick={() => setActiveTab('process')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'process'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Claim History
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Available Players Tab */}
        {activeTab === 'available' && (
          <div>
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Positions</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="D/ST">D/ST</option>
                <option value="K">K</option>
              </select>
            </div>

            {/* Players List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredPlayers.length === 0 ? (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                  <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Players Found</h3>
                  <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <WaiverPlayerCard
                    key={player.id}
                    player={player}
                    onClaim={() => handlePlayerClaim(player)}
                    userTeam={userTeam}
                    isLoading={isLoading}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* My Claims Tab */}
        {activeTab === 'claims' && (
          <div className="space-y-4">
            {pendingClaims.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Pending Claims</h3>
                <p className="text-gray-400">You don&apos;t have any pending waiver claims.</p>
              </div>
            ) : (
              pendingClaims.map((claim) => (
                <WaiverClaimCard
                  key={claim.id}
                  claim={claim}
                  onCancel={cancelWaiverClaim}
                  isLoading={isLoading}
                />
              ))
            )}
          </div>
        )}

        {/* Claim History Tab */}
        {activeTab === 'process' && (
          <div className="space-y-4">
            {claimHistory.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                <Trophy className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Claim History</h3>
                <p className="text-gray-400">Your processed claims will appear here.</p>
              </div>
            ) : (
              claimHistory.map((claim) => (
                <WaiverClaimCard
                  key={claim.id}
                  claim={claim}
                  isHistory
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Claim Modal */}
      {showClaimModal && selectedPlayer && (
        <WaiverClaimModal
          player={selectedPlayer}
          roster={roster?.players || []}
          faabBudget={faabBudget}
          onClose={() => {
            setShowClaimModal(false)
            setSelectedPlayer(null)
          }}
          onSubmit={async (data: any) => {
            if (!userTeam) return false
            const success = await submitWaiverClaim(userTeam.id, data)
            if (success) {
              setShowClaimModal(false)
              setSelectedPlayer(null)
            }
            return success
          }}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

// Waiver Player Card Component
interface WaiverPlayerCardProps {
  player: WaiverPlayer
  onClaim: () => void
  userTeam: any
  isLoading: boolean
}

function WaiverPlayerCard({ player, onClaim, userTeam, isLoading }: WaiverPlayerCardProps) {
  const getInjuryStatusIcon = (status: string | null) => {
    switch (status) {
      case 'OUT': return <div className="w-2 h-2 bg-red-500 rounded-full" />
      case 'DOUBTFUL': return <div className="w-2 h-2 bg-red-400 rounded-full" />
      case 'QUESTIONABLE': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />
      case 'PROBABLE': return <div className="w-2 h-2 bg-green-400 rounded-full" />
      default: return <div className="w-2 h-2 bg-green-500 rounded-full" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg border border-gray-700 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <p className="font-medium text-white">{player.name}</p>
              {getInjuryStatusIcon(player.injury_status)}
            </div>
            <span className="px-2 py-1 bg-gray-700 rounded text-xs font-medium text-gray-300">
              {player.position}
            </span>
            <span className="text-sm text-gray-400">{player.nfl_team}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {player.projections && (
            <div className="text-right">
              <p className="text-sm text-green-400 font-medium">
                {player.projections.fantasy_points.toFixed(1)} pts
              </p>
              {player.projections.adp && (
                <p className="text-xs text-gray-400">ADP: {player.projections.adp}</p>
              )}
            </div>
          )}
          
          {player.claimsCount > 0 && (
            <div className="text-center">
              <p className="text-sm text-yellow-400 font-medium">{player.claimsCount}</p>
              <p className="text-xs text-gray-400">claim{player.claimsCount !== 1 ? 's' : ''}</p>
            </div>
          )}

          <button
            onClick={onClaim}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Claim
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Waiver Claim Card Component
interface WaiverClaimCardProps {
  claim: WaiverClaim
  onCancel?: (claimId: string) => Promise<boolean>
  isHistory?: boolean
  isLoading?: boolean
}

function WaiverClaimCard({ claim, onCancel, isHistory, isLoading }: WaiverClaimCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'successful': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'processed': return <Clock className="h-4 w-4 text-gray-500" />
      default: return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'successful': return 'text-green-400 bg-green-900/30 border-green-600/30'
      case 'failed': return 'text-red-400 bg-red-900/30 border-red-600/30'
      case 'processed': return 'text-gray-400 bg-gray-900/30 border-gray-600/30'
      default: return 'text-yellow-400 bg-yellow-900/30 border-yellow-600/30'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg border border-gray-700 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(claim.status)}`}>
          {getStatusIcon(claim.status)}
          <span className="ml-1 capitalize">{claim.status}</span>
        </div>
        <div className="flex items-center space-x-2">
          {claim.bidAmount > 0 && (
            <span className="text-sm text-green-400 font-medium">${claim.bidAmount}</span>
          )}
          <span className="text-sm text-gray-400">Priority: {claim.priority}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-white">
            Add: {claim.playerName} ({claim.playerPosition})
          </p>
          {claim.dropPlayerName && (
            <p className="text-sm text-gray-400">
              Drop: {claim.dropPlayerName}
            </p>
          )}
          <p className="text-xs text-gray-500">{claim.playerTeam}</p>
        </div>

        {!isHistory && onCancel && (
          <button
            onClick={() => onCancel(claim.id)}
            disabled={isLoading}
            className="px-3 py-1 text-red-400 hover:text-red-300 text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </motion.div>
  )
}

// Placeholder for Waiver Claim Modal
function WaiverClaimModal({ player, roster, faabBudget, onClose, onSubmit, isLoading }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Submit Waiver Claim</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-center text-gray-400 py-8">
          <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Waiver claim form will be implemented next</p>
        </div>
      </motion.div>
    </div>
  )
}