'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

interface PlayerComparison {
  playerId: string
  name: string
  position: string
  team: string
  stats: {
    projected: number
    average: number
    ceiling: number
    floor: number
    consistency: number
  }
  matchupRating: 'excellent' | 'good' | 'average' | 'poor' | 'terrible'
  opponent: string
  injuries?: string[]
  trends: {
    last3games: number
    season: number
  }
}

interface MatchupComparisonProps {
  myTeamPlayers: PlayerComparison[]
  opponentPlayers: PlayerComparison[]
  myTeamName: string
  opponentTeamName: string
  week: number
  onPlayerClick?: (player: PlayerComparison) => void
}

export default function MatchupComparison({
  myTeamPlayers,
  opponentPlayers,
  myTeamName,
  opponentTeamName,
  week,
  onPlayerClick
}: MatchupComparisonProps) {
  const [selectedCategory, setSelectedCategory] = useState<'projected' | 'ceiling' | 'floor' | 'consistency'>('projected')
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL')

  const positions = useMemo(() => {
    const allPositions = [...new Set([
      ...myTeamPlayers.map(p => p.position),
      ...opponentPlayers.map(p => p.position)
    ])].sort()
    return ['ALL', ...allPositions]
  }, [myTeamPlayers, opponentPlayers])

  const filteredData = useMemo(() => {
    const filterByPosition = (players: PlayerComparison[]) => 
      selectedPosition === 'ALL' ? players : players.filter(p => p.position === selectedPosition)

    return {
      myTeam: filterByPosition(myTeamPlayers),
      opponent: filterByPosition(opponentPlayers)
    }
  }, [myTeamPlayers, opponentPlayers, selectedPosition])

  const teamAdvantages = useMemo(() => {
    const myTeamTotal = filteredData.myTeam.reduce((sum, p) => sum + p.stats[selectedCategory], 0)
    const opponentTotal = filteredData.opponent.reduce((sum, p) => sum + p.stats[selectedCategory], 0)
    
    const advantage = myTeamTotal - opponentTotal
    const percentage = opponentTotal > 0 ? ((advantage / opponentTotal) * 100) : 0

    return {
      myTeamTotal,
      opponentTotal,
      advantage,
      percentage,
      favoredTeam: advantage > 0 ? 'my' : 'opponent'
    }
  }, [filteredData, selectedCategory])

  const getMatchupColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-400 bg-green-900/20 border-green-700'
      case 'good': return 'text-green-300 bg-green-900/10 border-green-800'
      case 'average': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700'
      case 'poor': return 'text-red-300 bg-red-900/10 border-red-800'
      case 'terrible': return 'text-red-400 bg-red-900/20 border-red-700'
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700'
    }
  }

  const StatBar = ({ value, maxValue, color = 'blue' }: { value: number; maxValue: number; color?: string }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
    
    return (
      <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`absolute left-0 top-0 h-full ${
            color === 'blue' ? 'bg-blue-500' :
            color === 'green' ? 'bg-green-500' :
            color === 'red' ? 'bg-red-500' :
            'bg-purple-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    )
  }

  const PlayerCard = ({ 
    player, 
    isMyTeam, 
    maxValue 
  }: { 
    player: PlayerComparison; 
    isMyTeam: boolean; 
    maxValue: number 
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-750 transition-colors ${
        isMyTeam ? 'bg-blue-900/20 border-blue-800' : 'bg-red-900/20 border-red-800'
      }`}
      onClick={() => onPlayerClick?.(player)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-white text-sm">{player.name}</h4>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span className="bg-gray-700 px-2 py-1 rounded">{player.position}</span>
            <span>{player.team}</span>
            <span>vs {player.opponent}</span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs border ${getMatchupColor(player.matchupRating)}`}>
          {player.matchupRating}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {selectedCategory === 'projected' ? 'Projected' :
             selectedCategory === 'ceiling' ? 'Ceiling' :
             selectedCategory === 'floor' ? 'Floor' :
             'Consistency'}
          </span>
          <span className="text-sm font-medium text-white">
            {player.stats[selectedCategory].toFixed(1)}
            {selectedCategory === 'consistency' ? '%' : ''}
          </span>
        </div>
        <StatBar 
          value={player.stats[selectedCategory]} 
          maxValue={maxValue}
          color={isMyTeam ? 'blue' : 'red'}
        />
      </div>

      {player.injuries && player.injuries.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {player.injuries.map((injury, i) => (
            <span key={i} className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded">
              {injury}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-gray-400">L3 Games</div>
          <div className={`font-medium ${
            player.trends.last3games > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {player.trends.last3games > 0 ? '+' : ''}{player.trends.last3games.toFixed(1)}
          </div>
        </div>
        <div>
          <div className="text-gray-400">Season</div>
          <div className={`font-medium ${
            player.trends.season > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {player.trends.season > 0 ? '+' : ''}{player.trends.season.toFixed(1)}
          </div>
        </div>
      </div>
    </motion.div>
  )

  const maxValue = Math.max(
    ...filteredData.myTeam.map(p => p.stats[selectedCategory]),
    ...filteredData.opponent.map(p => p.stats[selectedCategory])
  )

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">
          Week {week} Matchup Analysis
        </h3>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          >
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>

          <div className="flex bg-gray-700 rounded-lg p-1">
            {(['projected', 'ceiling', 'floor', 'consistency'] as const).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {category === 'projected' ? 'Proj' :
                 category === 'ceiling' ? 'Ceil' :
                 category === 'floor' ? 'Floor' :
                 'Consist'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Team */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-blue-400">{myTeamName}</h4>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {teamAdvantages.myTeamTotal.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">Total {selectedCategory}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            {filteredData.myTeam.map(player => (
              <PlayerCard
                key={player.playerId}
                player={player}
                isMyTeam={true}
                maxValue={maxValue}
              />
            ))}
          </div>
        </div>

        {/* Opponent Team */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-red-400">{opponentTeamName}</h4>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {teamAdvantages.opponentTotal.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">Total {selectedCategory}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            {filteredData.opponent.map(player => (
              <PlayerCard
                key={player.playerId}
                player={player}
                isMyTeam={false}
                maxValue={maxValue}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Matchup Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-gray-700 rounded-lg"
      >
        <div className="text-center">
          <div className="text-lg font-semibold text-white mb-2">
            Matchup Advantage: {teamAdvantages.favoredTeam === 'my' ? myTeamName : opponentTeamName}
          </div>
          
          <div className="flex items-center justify-center space-x-4">
            <div className={`text-2xl font-bold ${
              teamAdvantages.favoredTeam === 'my' ? 'text-green-400' : 'text-red-400'
            }`}>
              {Math.abs(teamAdvantages.advantage).toFixed(1)} points
            </div>
            <div className="text-gray-400">
              ({Math.abs(teamAdvantages.percentage).toFixed(1)}%)
            </div>
          </div>

          <div className="mt-3 w-full h-4 bg-gray-600 rounded-full overflow-hidden">
            <div className="flex h-full">
              <motion.div
                className="bg-blue-500"
                style={{ 
                  width: teamAdvantages.favoredTeam === 'my' 
                    ? `${50 + Math.abs(teamAdvantages.percentage) / 2}%`
                    : `${50 - Math.abs(teamAdvantages.percentage) / 2}%`
                }}
                initial={{ width: '50%' }}
                animate={{
                  width: teamAdvantages.favoredTeam === 'my'
                    ? `${50 + Math.min(Math.abs(teamAdvantages.percentage), 50) / 2}%`
                    : `${50 - Math.min(Math.abs(teamAdvantages.percentage), 50) / 2}%`
                }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <motion.div
                className="bg-red-500"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="flex justify-between mt-2 text-sm text-gray-400">
            <span>{myTeamName}</span>
            <span>{opponentTeamName}</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}