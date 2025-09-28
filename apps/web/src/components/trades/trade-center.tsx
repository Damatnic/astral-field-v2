'use client'

import { useState, useEffect } from 'react'
import { useTradeNotifications } from '@/hooks/use-websocket'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  HandRaisedIcon,
  CalculatorIcon
} from '@heroicons/react/outline'

interface TradeCenterProps {
  leagueId: string
  currentUserId: string
  userTeams: any[]
}

interface TradeProposal {
  id: string
  proposingTeam: any
  receivingTeam: any
  givingPlayers: any[]
  receivingPlayers: any[]
  status: string
  message?: string
  tradeValue: any
  canRespond: boolean
  canCancel: boolean
  createdAt: string
  expiresAt?: string
}

export function TradeCenter({ leagueId, currentUserId, userTeams }: TradeCenterProps) {
  const { state, tradeProposals, notifications } = useTradeNotifications()
  const [trades, setTrades] = useState<TradeProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'history'>('pending')
  const [selectedTrade, setSelectedTrade] = useState<TradeProposal | null>(null)
  const [showProposalForm, setShowProposalForm] = useState(false)

  // Fetch trades
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const status = activeTab === 'pending' ? 'PENDING' : undefined
        const action = activeTab === 'history' ? 'history' : 'proposals'
        
        const response = await fetch(`/api/trades?leagueId=${leagueId}&action=${action}${status ? `&status=${status}` : ''}`)
        const data = await response.json()
        
        if (data.success) {
          setTrades(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch trades:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [leagueId, activeTab])

  const handleTradeResponse = async (tradeId: string, response: 'ACCEPTED' | 'REJECTED', message?: string) => {
    try {
      const result = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          tradeId,
          response,
          message
        })
      })

      const data = await result.json()
      
      if (data.success) {
        // Update trade in state
        setTrades(prev => prev.map(t => 
          t.id === tradeId ? { ...t, status: response } : t
        ))
        setSelectedTrade(null)
      } else {
        alert(data.error || 'Failed to respond to trade')
      }
    } catch (error) {
      console.error('Trade response error:', error)
      alert('Failed to respond to trade')
    }
  }

  const handleCancelTrade = async (tradeId: string) => {
    try {
      const result = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          tradeId
        })
      })

      const data = await result.json()
      
      if (data.success) {
        setTrades(prev => prev.map(t => 
          t.id === tradeId ? { ...t, status: 'CANCELLED' } : t
        ))
      } else {
        alert(data.error || 'Failed to cancel trade')
      }
    } catch (error) {
      console.error('Trade cancel error:', error)
      alert('Failed to cancel trade')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trades...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Trade Center</h2>
          <p className="text-gray-400">Manage your fantasy football trades</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowProposalForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Propose Trade
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
        {(['pending', 'all', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab} {tab === 'pending' && trades.filter(t => t.status === 'PENDING').length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {trades.filter(t => t.status === 'PENDING').length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Trade Notifications */}
      {notifications.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">Recent Trade Activity</h3>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((notification, index) => (
              <div key={index} className="text-sm text-blue-200">
                {notification.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trades List */}
      <div className="space-y-4">
        {trades.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <ArrowRightIcon className="h-16 w-16 mx-auto text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Trades Found</h3>
            <p className="text-gray-400 mb-6">
              {activeTab === 'pending' 
                ? 'No pending trades at the moment'
                : 'No trade history available'
              }
            </p>
            {activeTab === 'pending' && (
              <Button
                onClick={() => setShowProposalForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Propose Your First Trade
              </Button>
            )}
          </div>
        ) : (
          trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              currentUserId={currentUserId}
              onRespond={handleTradeResponse}
              onCancel={handleCancelTrade}
              onView={() => setSelectedTrade(trade)}
            />
          ))
        )}
      </div>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onRespond={handleTradeResponse}
          onCancel={handleCancelTrade}
          currentUserId={currentUserId}
        />
      )}

      {/* Proposal Form Modal */}
      {showProposalForm && (
        <TradeProposalModal
          leagueId={leagueId}
          userTeams={userTeams}
          onClose={() => setShowProposalForm(false)}
          onSuccess={() => {
            setShowProposalForm(false)
            // Refresh trades
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

function TradeCard({ trade, currentUserId, onRespond, onCancel, onView }: {
  trade: TradeProposal
  currentUserId: string
  onRespond: (tradeId: string, response: 'ACCEPTED' | 'REJECTED', message?: string) => void
  onCancel: (tradeId: string) => void
  onView: () => void
}) {
  const isInvolved = trade.proposingTeam.owner.id === currentUserId || 
                   trade.receivingTeam.owner.id === currentUserId

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-600'
      case 'ACCEPTED':
        return 'bg-green-600'
      case 'REJECTED':
        return 'bg-red-600'
      case 'EXPIRED':
        return 'bg-gray-600'
      case 'VETOED':
        return 'bg-purple-600'
      default:
        return 'bg-gray-600'
    }
  }

  const isExpiringSoon = trade.expiresAt && 
    new Date(trade.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000

  return (
    <Card className={`border-slate-700 ${isInvolved ? 'border-blue-500/30' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Badge className={getStatusColor(trade.status)}>
              {trade.status}
            </Badge>
            {isExpiringSoon && trade.status === 'PENDING' && (
              <Badge variant="warning" className="bg-orange-600">
                <ClockIcon className="h-3 w-3 mr-1" />
                Expires Soon
              </Badge>
            )}
            {trade.tradeValue.fairness === 'UNBALANCED' && (
              <Badge variant="warning" className="bg-yellow-600">
                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                Unbalanced
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-400">
            {new Date(trade.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Proposing Team */}
          <div className="text-center">
            <h3 className="font-semibold text-white mb-2">{trade.proposingTeam.name}</h3>
            <div className="space-y-1">
              {trade.givingPlayers.map(player => (
                <div key={player.id} className="text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${getPositionColor(player.position)}`}>
                    {player.position}
                  </span>
                  <span className="ml-2 text-gray-300">{player.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Trade Value: {trade.tradeValue.givingValue}
            </div>
          </div>

          {/* Arrow and Trade Info */}
          <div className="text-center">
            <ArrowRightIcon className="h-6 w-6 mx-auto text-gray-400 mb-2" />
            <div className="text-xs text-gray-400">
              {trade.tradeValue.difference > 0 ? '+' : ''}{trade.tradeValue.difference} pts
            </div>
            {trade.message && (
              <div className="text-xs text-gray-500 mt-1 italic">
                "{trade.message}"
              </div>
            )}
          </div>

          {/* Receiving Team */}
          <div className="text-center">
            <h3 className="font-semibold text-white mb-2">{trade.receivingTeam.name}</h3>
            <div className="space-y-1">
              {trade.receivingPlayers.map(player => (
                <div key={player.id} className="text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${getPositionColor(player.position)}`}>
                    {player.position}
                  </span>
                  <span className="ml-2 text-gray-300">{player.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Trade Value: {trade.tradeValue.receivingValue}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex items-center space-x-1"
          >
            <EyeIcon className="h-4 w-4" />
            <span>View Details</span>
          </Button>

          <div className="flex space-x-2">
            {trade.canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(trade.id)}
                className="text-red-400 border-red-400 hover:bg-red-400/10"
              >
                Cancel
              </Button>
            )}
            
            {trade.canRespond && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRespond(trade.id, 'REJECTED')}
                  className="text-red-400 border-red-400 hover:bg-red-400/10"
                >
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => onRespond(trade.id, 'ACCEPTED')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Accept
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TradeDetailModal({ trade, onClose, onRespond, onCancel, currentUserId }: {
  trade: TradeProposal
  onClose: () => void
  onRespond: (tradeId: string, response: 'ACCEPTED' | 'REJECTED', message?: string) => void
  onCancel: (tradeId: string) => void
  currentUserId: string
}) {
  const [responseMessage, setResponseMessage] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Trade Details</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trade Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                {trade.proposingTeam.name} Gives
              </h3>
              <div className="space-y-3">
                {trade.givingPlayers.map(player => (
                  <div key={player.id} className="bg-slate-800 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs ${getPositionColor(player.position)}`}>
                          {player.position}
                        </span>
                        <span className="ml-2 font-medium text-white">{player.name}</span>
                        <span className="ml-2 text-sm text-gray-400">{player.nflTeam}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white">
                          {player.projections?.[0]?.projectedPoints?.toFixed(1) || 'N/A'} pts
                        </div>
                        <div className="text-xs text-gray-400">Projected</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                {trade.receivingTeam.name} Gives
              </h3>
              <div className="space-y-3">
                {trade.receivingPlayers.map(player => (
                  <div key={player.id} className="bg-slate-800 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs ${getPositionColor(player.position)}`}>
                          {player.position}
                        </span>
                        <span className="ml-2 font-medium text-white">{player.name}</span>
                        <span className="ml-2 text-sm text-gray-400">{player.nflTeam}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white">
                          {player.projections?.[0]?.projectedPoints?.toFixed(1) || 'N/A'} pts
                        </div>
                        <div className="text-xs text-gray-400">Projected</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trade Analysis */}
          <div className="bg-slate-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <CalculatorIcon className="h-5 w-5 mr-2" />
              Trade Analysis
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {trade.tradeValue.givingValue}
                </div>
                <div className="text-sm text-gray-400">{trade.proposingTeam.name} Value</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  trade.tradeValue.difference > 0 ? 'text-green-400' : 
                  trade.tradeValue.difference < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {trade.tradeValue.difference > 0 ? '+' : ''}{trade.tradeValue.difference}
                </div>
                <div className="text-sm text-gray-400">Difference</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {trade.tradeValue.receivingValue}
                </div>
                <div className="text-sm text-gray-400">{trade.receivingTeam.name} Value</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Badge className={
                trade.tradeValue.fairness === 'FAIR' ? 'bg-green-600' : 'bg-yellow-600'
              }>
                {trade.tradeValue.fairness}
              </Badge>
            </div>
          </div>

          {/* Response Section */}
          {trade.canRespond && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Your Response</h3>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Add a message (optional)..."
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex space-x-3">
                <Button
                  onClick={() => onRespond(trade.id, 'REJECTED', responseMessage)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Reject Trade
                </Button>
                <Button
                  onClick={() => onRespond(trade.id, 'ACCEPTED', responseMessage)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Accept Trade
                </Button>
              </div>
            </div>
          )}

          {trade.canCancel && (
            <div className="flex justify-end">
              <Button
                onClick={() => onCancel(trade.id)}
                variant="outline"
                className="text-red-400 border-red-400 hover:bg-red-400/10"
              >
                Cancel Trade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TradeProposalModal({ leagueId, userTeams, onClose, onSuccess }: {
  leagueId: string
  userTeams: any[]
  onClose: () => void
  onSuccess: () => void
}) {
  // Simplified trade proposal modal - would implement full functionality
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Propose Trade</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Trade proposal form would be implemented here</p>
            <Button onClick={onSuccess} className="bg-blue-600 hover:bg-blue-700">
              Create Trade Proposal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getPositionColor(position: string): string {
  const colors: Record<string, string> = {
    QB: 'bg-red-500 text-red-100',
    RB: 'bg-green-500 text-green-100',
    WR: 'bg-blue-500 text-blue-100',
    TE: 'bg-yellow-500 text-yellow-100',
    K: 'bg-purple-500 text-purple-100',
    DEF: 'bg-orange-500 text-orange-100'
  }
  return colors[position] || 'bg-gray-500 text-gray-100'
}