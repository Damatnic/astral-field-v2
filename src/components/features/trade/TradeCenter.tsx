'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowRightLeft, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react'
import { useTradeStore } from '@/stores/tradeStore'
import { useLeagueStore } from '@/stores/leagueStore'
import { useAuthStore } from '@/stores/authStore'
import type { TradeProposal } from '@/services/api/tradeService'

interface TradeCenterProps {
  leagueId: string
}

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'border-yellow-500 text-yellow-400 bg-yellow-900/20'
    case 'accepted':
      return 'border-green-500 text-green-400 bg-green-900/20'
    case 'rejected':
      return 'border-red-500 text-red-400 bg-red-900/20'
    case 'expired':
      return 'border-gray-500 text-gray-400 bg-gray-900/20'
    default:
      return 'border-gray-500 text-gray-400 bg-gray-900/20'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3" />
    case 'accepted':
      return <CheckCircle className="h-3 w-3" />
    case 'rejected':
      return <XCircle className="h-3 w-3" />
    case 'expired':
      return <AlertTriangle className="h-3 w-3" />
    default:
      return <Clock className="h-3 w-3" />
  }
}

export default function TradeCenter({ leagueId }: TradeCenterProps) {
  const { user } = useAuthStore()
  const { teams } = useLeagueStore()
  const { 
    trades, 
    isLoading, 
    error, 
    fetchTeamTrades, 
    respondToTrade,
    cancelTrade,
    clearError 
  } = useTradeStore()
  
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'create'>('active')
  const [selectedTrade, setSelectedTrade] = useState<TradeProposal | null>(null)

  const userTeam = teams.find(team => team.user_id === user?.id)

  useEffect(() => {
    if (userTeam) {
      fetchTeamTrades(userTeam.id)
    }
  }, [userTeam, fetchTeamTrades])

  const activeTrades = trades.filter(trade => 
    trade.status === 'pending' && new Date(trade.expiresAt) > new Date()
  )
  
  const historyTrades = trades.filter(trade => 
    trade.status !== 'pending' || new Date(trade.expiresAt) <= new Date()
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />
      case 'expired': return <Clock className="h-4 w-4 text-gray-500" />
      default: return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-400 bg-green-900/30 border-green-600/30'
      case 'rejected': return 'text-red-400 bg-red-900/30 border-red-600/30'
      case 'expired': return 'text-gray-400 bg-gray-900/30 border-gray-600/30'
      default: return 'text-yellow-400 bg-yellow-900/30 border-yellow-600/30'
    }
  }

  const handleTradeResponse = async (tradeId: string, response: 'accepted' | 'rejected') => {
    clearError()
    const success = await respondToTrade(tradeId, response)
    if (success) {
      setSelectedTrade(null)
    }
  }

  const handleCancelTrade = async (tradeId: string) => {
    clearError()
    const success = await cancelTrade(tradeId)
    if (success) {
      setSelectedTrade(null)
    }
  }

  if (isLoading && trades.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
                <ArrowRightLeft className="h-8 w-8 text-blue-500 mr-3" />
                Trade Center
              </h1>
              <p className="text-gray-400 mt-1">Manage your trade proposals and negotiations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Clock className="h-4 w-4 mr-2" />
            Active Trades ({activeTrades.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            History ({historyTrades.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Trade
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

        {/* Active Trades */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeTrades.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                <ArrowRightLeft className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Active Trades</h3>
                <p className="text-gray-400">You don&apos;t have any pending trade proposals.</p>
              </div>
            ) : (
              activeTrades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  userTeam={userTeam}
                  onView={() => setSelectedTrade(trade)}
                  onRespond={handleTradeResponse}
                  onCancel={handleCancelTrade}
                  isLoading={isLoading}
                />
              ))
            )}
          </div>
        )}

        {/* Trade History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyTrades.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Trade History</h3>
                <p className="text-gray-400">Your completed trades will appear here.</p>
              </div>
            ) : (
              historyTrades.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  userTeam={userTeam}
                  onView={() => setSelectedTrade(trade)}
                  isHistory
                />
              ))
            )}
          </div>
        )}

        {/* Create Trade */}
        {activeTab === 'create' && userTeam && (
          <CreateTradeForm leagueId={leagueId} userTeam={userTeam} teams={teams} />
        )}
      </div>

      {/* Trade Details Modal */}
      {selectedTrade && (
        <TradeDetailsModal
          trade={selectedTrade}
          userTeam={userTeam}
          onClose={() => setSelectedTrade(null)}
          onRespond={handleTradeResponse}
          onCancel={handleCancelTrade}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

// Trade Card Component
interface TradeCardProps {
  trade: TradeProposal
  userTeam: any
  onView: () => void
  onRespond?: (tradeId: string, response: 'accepted' | 'rejected') => void
  onCancel?: (tradeId: string) => void
  isHistory?: boolean
  isLoading?: boolean
}

function TradeCard({ trade, userTeam, onView, onRespond, onCancel, isHistory, isLoading }: TradeCardProps) {
  const isInitiator = trade.initiatorTeam.id === userTeam?.id
  const isReceiver = trade.receiverTeam.id === userTeam?.id
  const canRespond = isReceiver && trade.status === 'pending' && !isHistory
  const canCancel = isInitiator && trade.status === 'pending' && !isHistory

  const daysLeft = Math.max(0, Math.ceil((new Date(trade.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg border border-gray-700 p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(trade.status)}`}>
              {getStatusIcon(trade.status)}
              <span className="ml-1 capitalize">{trade.status}</span>
            </div>
            {!isHistory && trade.status === 'pending' && (
              <span className="text-xs text-gray-400">
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onView}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Initiator Team */}
        <div className="text-center">
          <h3 className="font-semibold text-white mb-2">
            {trade.initiatorTeam.name}
            {isInitiator && <span className="text-blue-400 text-sm ml-1">(You)</span>}
          </h3>
          <div className="space-y-1">
            {trade.offeredPlayers.slice(0, 3).map(player => (
              <div key={player.id} className="text-sm text-gray-400">
                {player.name} ({player.position})
              </div>
            ))}
            {trade.offeredPlayers.length > 3 && (
              <div className="text-xs text-gray-500">
                +{trade.offeredPlayers.length - 3} more
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRightLeft className="h-6 w-6 text-gray-500" />
        </div>

        {/* Receiver Team */}
        <div className="text-center">
          <h3 className="font-semibold text-white mb-2">
            {trade.receiverTeam.name}
            {isReceiver && <span className="text-blue-400 text-sm ml-1">(You)</span>}
          </h3>
          <div className="space-y-1">
            {trade.requestedPlayers.slice(0, 3).map(player => (
              <div key={player.id} className="text-sm text-gray-400">
                {player.name} ({player.position})
              </div>
            ))}
            {trade.requestedPlayers.length > 3 && (
              <div className="text-xs text-gray-500">
                +{trade.requestedPlayers.length - 3} more
              </div>
            )}
          </div>
        </div>
      </div>

      {trade.message && (
        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-300">
            <strong>{isInitiator ? 'Your' : trade.initiatorTeam.user}&apos;s message:</strong> {trade.message}
          </p>
        </div>
      )}

      {/* Actions */}
      {!isHistory && (canRespond || canCancel) && (
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-700">
          {canCancel && (
            <button
              onClick={() => onCancel?.(trade.id)}
              disabled={isLoading}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          {canRespond && onRespond && (
            <>
              <button
                onClick={() => onRespond(trade.id, 'rejected')}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => onRespond(trade.id, 'accepted')}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Accept
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Placeholder components for Create Trade Form and Trade Details Modal
function CreateTradeForm({ leagueId, userTeam, teams }: any) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Create New Trade</h3>
      <div className="text-center text-gray-400 py-8">
        <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Trade creation form will be implemented next</p>
      </div>
    </div>
  )
}

function TradeDetailsModal({ trade, userTeam, onClose, onRespond, onCancel, isLoading }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Trade Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-center text-gray-400 py-8">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Detailed trade view will be implemented next</p>
        </div>
      </motion.div>
    </div>
  )
}