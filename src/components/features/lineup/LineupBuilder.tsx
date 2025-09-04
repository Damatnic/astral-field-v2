'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  TrendingUp, 
  Clock,
  Star,
  AlertTriangle,
  RotateCcw,
  Save,
  Play
} from 'lucide-react'
import teamService, { RosterSettings } from '@/services/api/teamService'
import playerService from '@/services/api/playerService'

interface LineupBuilderProps {
  teamId: string
  week: number
  leagueId: string
}

interface LineupSlot {
  position: string
  player: any | null
  isRequired: boolean
}

export default function LineupBuilder({ teamId, week, leagueId }: LineupBuilderProps) {
  const [lineup, setLineup] = useState<LineupSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectedPoints, setProjectedPoints] = useState(0)

  const rosterSettings = teamService.getDefaultRosterSettings()

  useEffect(() => {
    loadLineup()
  }, [teamId, week])

  const loadLineup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { lineup: currentLineup, error } = await teamService.getTeamLineup(teamId, week)
      
      if (error) {
        setError(error)
        return
      }

      // Initialize lineup slots based on roster settings
      const slots = teamService.getPositionSlots(rosterSettings)
      const lineupSlots: LineupSlot[] = slots.map(slot => {
        const basePosition = slot.replace(/\d+$/, '')
        const existingEntry = currentLineup?.find(entry => entry.position_slot === slot)
        
        return {
          position: slot,
          player: null,
          isRequired: basePosition !== 'BENCH'
        }
      })

      setLineup(lineupSlots)
      calculateProjectedPoints(lineupSlots)
    } catch (err) {
      setError('Failed to load lineup')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateProjectedPoints = (lineupSlots: LineupSlot[]) => {
    const total = lineupSlots.reduce((sum, slot) => {
      if (slot.player && slot.position !== 'BENCH') {
        const projections = slot.player.projections as any
        return sum + (projections?.projectedPoints || 0)
      }
      return sum
    }, 0)
    setProjectedPoints(total)
  }

  const handleSaveLineup = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const rosterPlayers = lineup
        .filter(slot => slot.player)
        .map(slot => ({
          id: slot.player.id,
          playerId: slot.player.id,
          teamId,
          position: slot.position,
          isStarter: slot.position !== 'BENCH'
        }))

      const { error } = await teamService.setLineup(teamId, week, rosterPlayers)
      
      if (error) {
        setError(error)
      } else {
        // Show success message
        setError(null)
      }
    } catch (err) {
      setError('Failed to save lineup')
    } finally {
      setIsSaving(false)
    }
  }

  const getPositionColor = (position: string) => {
    const basePosition = position.replace(/\d+$/, '')
    const colorMap: Record<string, string> = {
      QB: 'border-red-500 bg-red-500/10',
      RB: 'border-green-500 bg-green-500/10',
      WR: 'border-blue-500 bg-blue-500/10',
      TE: 'border-yellow-500 bg-yellow-500/10',
      FLEX: 'border-purple-500 bg-purple-500/10',
      K: 'border-pink-500 bg-pink-500/10',
      DST: 'border-gray-500 bg-gray-500/10',
      BENCH: 'border-gray-600 bg-gray-600/10',
    }
    return colorMap[basePosition] || 'border-gray-600 bg-gray-600/10'
  }

  const getPositionDisplayName = (position: string) => {
    if (position.startsWith('BENCH')) return 'Bench'
    if (position.startsWith('FLEX')) return 'Flex'
    return position.replace(/\d+$/, '')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Users className="h-6 w-6 mr-2" />
            Week {week} Lineup
          </h2>
          <p className="text-gray-400 mt-1">Set your starting lineup and bench</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-400">Projected Points</div>
            <div className="text-2xl font-bold text-green-400">{projectedPoints.toFixed(1)}</div>
          </div>
          
          <button
            onClick={handleSaveLineup}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Lineup
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Starting Lineup */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Star className="h-5 w-5 text-yellow-500 mr-2" />
            Starting Lineup
          </h3>
          
          <div className="space-y-3">
            {lineup.filter(slot => slot.isRequired).map((slot, index) => (
              <motion.div
                key={slot.position}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-lg border-2 border-dashed p-4 ${getPositionColor(slot.position)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-3" />
                    <div>
                      <div className="font-medium text-white">
                        {getPositionDisplayName(slot.position)}
                      </div>
                      {slot.player ? (
                        <div className="text-sm text-gray-300">
                          {slot.player.name} - {slot.player.nfl_team}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Empty</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {slot.player && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">
                          {((slot.player.projections as any)?.projectedPoints || 0).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-400">proj</div>
                      </div>
                    )}
                    
                    <button className="p-1 text-gray-400 hover:text-white transition-colors">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {slot.player?.injury_status && slot.player.injury_status !== 'Healthy' && (
                  <div className="mt-2 flex items-center text-yellow-400 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {slot.player.injury_status}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bench */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Users className="h-5 w-5 text-gray-500 mr-2" />
            Bench
          </h3>
          
          <div className="space-y-3">
            {lineup.filter(slot => !slot.isRequired).map((slot, index) => (
              <motion.div
                key={slot.position}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + lineup.filter(s => s.isRequired).length) * 0.05 }}
                className="bg-gray-800 border border-gray-600 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-500 mr-3" />
                    <div>
                      <div className="font-medium text-white">Bench {index + 1}</div>
                      {slot.player ? (
                        <div className="text-sm text-gray-300">
                          {slot.player.name} - {slot.player.position} - {slot.player.nfl_team}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Empty</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {slot.player && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">
                          {((slot.player.projections as any)?.projectedPoints || 0).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-400">proj</div>
                      </div>
                    )}
                    
                    <button className="p-1 text-gray-400 hover:text-white transition-colors">
                      <Play className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm">
            Optimize Lineup
          </button>
          <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm">
            Check Matchups
          </button>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm">
            View Projections
          </button>
        </div>
      </div>
    </div>
  )
}