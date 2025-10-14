'use client'

import { useState } from 'react'
import { GradientCard, StatusBadge, PlayerCard } from '@/components/redesign'
import { Sparkles, MessageCircle, TrendingUp, AlertCircle } from 'lucide-react'

interface Player {
  id: string
  name: string
  position: string
  nflTeam: string
  adp?: number | null
  rank?: number | null
}

interface AIDraftCoachProps {
  currentPick: number
  userTeam: {
    id: string
    name: string
  }
  availablePlayers: Player[]
  draftedPlayers: Player[]
  needPositions: string[]
}

export function AIDraftCoach({ 
  currentPick, 
  userTeam, 
  availablePlayers,
  draftedPlayers,
  needPositions 
}: AIDraftCoachProps) {
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: 'Hi! I\'m your AI Draft Coach. Ask me anything about your draft strategy, player recommendations, or positional needs.' }
  ])
  const [userInput, setUserInput] = useState('')

  // Mock AI recommendations based on needs
  const getTopRecommendations = () => {
    const recommendations = availablePlayers
      .filter(p => needPositions.includes(p.position))
      .slice(0, 3)

    if (recommendations.length === 0) {
      return availablePlayers.slice(0, 3)
    }

    return recommendations
  }

  const recommendations = getTopRecommendations()

  const getStrategyAdvice = () => {
    const roundNum = Math.ceil(currentPick / 12)
    
    if (roundNum <= 2) {
      return "Focus on elite RBs and WRs. These are your foundation players."
    } else if (roundNum <= 5) {
      return "Balance your starters. Look for WR depth and consider a top TE."
    } else if (roundNum <= 9) {
      return "Fill in QB and flex positions. Target high-upside players."
    } else {
      return "Look for sleepers and handcuffs. Defense and kicker in final rounds."
    }
  }

  const handleSendMessage = () => {
    if (!userInput.trim()) return

    setChatMessages([
      ...chatMessages,
      { role: 'user', content: userInput },
      { 
        role: 'assistant', 
        content: `Based on your current roster and available players, I recommend focusing on ${needPositions.join(', ')}. ${getStrategyAdvice()}` 
      }
    ])
    setUserInput('')
  }

  return (
    <div className="space-y-4">
      {/* AI Coach Header */}
      <GradientCard gradient="purple" className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fantasy-purple-600 to-fantasy-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">AI Draft Coach</h3>
            <p className="text-xs text-gray-400">Powered by Advanced Analytics</p>
          </div>
        </div>
        <button
          onClick={() => setShowChat(!showChat)}
          className="w-full px-4 py-2 bg-fantasy-blue-600 hover:bg-fantasy-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          {showChat ? 'Hide Chat' : 'Ask Your Coach'}
        </button>
      </GradientCard>

      {/* Chat Interface */}
      {showChat && (
        <GradientCard gradient="dark" className="p-4">
          <div className="h-64 overflow-y-auto mb-3 space-y-2">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === 'assistant'
                    ? 'bg-fantasy-purple-900/30 ml-0 mr-8'
                    : 'bg-fantasy-blue-900/30 ml-8 mr-0'
                }`}
              >
                <p className="text-sm text-white">{msg.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about strategy, players..."
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fantasy-purple-500"
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-2 bg-fantasy-purple-600 hover:bg-fantasy-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </GradientCard>
      )}

      {/* Strategy Advice */}
      <GradientCard gradient="blue" className="p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-fantasy-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-white mb-1">Current Strategy</h4>
            <p className="text-sm text-gray-300">{getStrategyAdvice()}</p>
          </div>
        </div>
      </GradientCard>

      {/* Position Needs */}
      <GradientCard gradient="dark" className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-fantasy-yellow-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-white mb-1">Position Needs</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {needPositions.length > 0 ? (
                needPositions.map((pos) => (
                  <StatusBadge key={pos} variant="warning" size="sm">
                    {pos}
                  </StatusBadge>
                ))
              ) : (
                <p className="text-sm text-gray-400">All positions covered!</p>
              )}
            </div>
          </div>
        </div>
      </GradientCard>

      {/* Top Recommendations */}
      <GradientCard gradient="dark" className="p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-fantasy-purple-400" />
          AI Recommendations
        </h4>
        <div className="space-y-2">
          {recommendations.length > 0 ? (
            recommendations.map((player, idx) => (
              <div key={player.id} className="relative">
                <div className="absolute -left-2 top-2 w-6 h-6 rounded-full bg-fantasy-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {idx + 1}
                </div>
                <PlayerCard
                  name={player.name}
                  position={player.position}
                  team={player.nflTeam}
                  className="ml-4"
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No recommendations available</p>
          )}
        </div>
      </GradientCard>

      {/* Draft Grade */}
      <GradientCard gradient="purple-blue" className="p-4">
        <h4 className="font-semibold text-white mb-3">Your Draft Grade</h4>
        <div className="text-center">
          <div className="text-5xl font-bold text-fantasy-green-400 mb-1">
            A-
          </div>
          <p className="text-sm text-gray-400">Above Average Draft</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Value</p>
              <p className="font-semibold text-white">8.5/10</p>
            </div>
            <div>
              <p className="text-gray-500">Balance</p>
              <p className="font-semibold text-white">7.5/10</p>
            </div>
          </div>
        </div>
      </GradientCard>
    </div>
  )
}

