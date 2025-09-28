'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/outline'

interface Player {
  id: string
  name: string
  position: string
  nflTeam: string | null
  status: string
  stats: Array<{
    week: number
    fantasyPoints: number
    stats: any
  }>
  projections: Array<{
    projectedPoints: number
    confidence: number | null
  }>
}

interface RosterPlayer {
  id: string
  position: string
  isStarter: boolean
  isLocked: boolean
  player: Player
}

interface Team {
  id: string
  name: string
  league: {
    id: string
    name: string
    currentWeek: number
    rosterSettings: any
  }
}

interface LineupManagerProps {
  team: Team
  roster: RosterPlayer[]
}

const ROSTER_POSITIONS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
const BENCH_SIZE = 6

export function LineupManager({ team, roster }: LineupManagerProps) {
  const [localRoster, setLocalRoster] = useState(roster)
  const [saving, setSaving] = useState(false)

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      QB: 'bg-red-500/20 text-red-400 border-red-500/30',
      RB: 'bg-green-500/20 text-green-400 border-green-500/30',
      WR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      TE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      FLEX: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      K: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      DEF: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      BENCH: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
    return colors[position] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const movePlayerToPosition = (playerId: string, newPosition: string, isStarter: boolean) => {
    setLocalRoster(prev => prev.map(rp => 
      rp.id === playerId 
        ? { ...rp, position: newPosition, isStarter }
        : rp
    ))
  }

  const canPlayerPlayPosition = (player: Player, position: string): boolean => {
    if (position === 'BENCH') return true
    if (position === 'FLEX') return ['RB', 'WR', 'TE'].includes(player.position)
    return player.position === position
  }

  const getStartingLineup = () => {
    return localRoster.filter((rp: any) => rp.isStarter).sort((a: any, b: any) => {
      const positionOrder = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF']
      return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
    })
  }

  const getBenchPlayers = () => {
    return localRoster.filter(rp => !rp.isStarter)
  }

  const getProjectedLineupPoints = () => {
    return getStartingLineup().reduce((total: number, rp: any) => {
      const projection = rp.player.projections[0]
      return total + (projection ? projection.projectedPoints : 0)
    }, 0)
  }

  const saveLineup = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/teams/lineup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: team.id,
          roster: localRoster.map(rp => ({
            id: rp.id,
            position: rp.position,
            isStarter: rp.isStarter
          }))
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save lineup')
      }

      toast.success('Lineup saved successfully!')
    } catch (error) {
      toast.error('Failed to save lineup. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const startingLineup = getStartingLineup()
  const benchPlayers = getBenchPlayers()
  const projectedPoints = getProjectedLineupPoints()

  return (
    <div className="space-y-8">
      {/* Team Header */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{team.name}</h2>
            <p className="text-gray-400">{team.league.name} • Week {team.league.currentWeek}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Projected Points</p>
            <p className="text-2xl font-bold text-green-400">{projectedPoints.toFixed(1)}</p>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <Button onClick={saveLineup} disabled={saving}>
            {saving ? 'Saving...' : 'Save Lineup'}
          </Button>
          <Button variant="outline">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Optimize Lineup
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Starting Lineup */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-xl font-semibold text-white">Starting Lineup</h3>
          </div>
          <div className="p-6 space-y-4">
            {ROSTER_POSITIONS.map((position: any, index: number) => {
              const rosterPlayer = startingLineup.find(rp => 
                rp.position === position && 
                startingLineup.filter(r => r.position === position).indexOf(rp) === 
                ROSTER_POSITIONS.slice(0, index + 1).filter(p => p === position).length - 1
              )
              
              return (
                <div key={`${position}-${index}`} className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getPositionColor(position)}`}>
                    {position}
                  </div>
                  
                  {rosterPlayer ? (
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{rosterPlayer.player.name}</p>
                        <p className="text-sm text-gray-400">
                          {rosterPlayer.player.nflTeam} • {rosterPlayer.player.position}
                          {rosterPlayer.player.status !== 'active' && (
                            <span className="ml-2 text-yellow-400">({rosterPlayer.player.status})</span>
                          )}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">
                          {rosterPlayer.player.projections[0]?.projectedPoints.toFixed(1) || '--'} pts
                        </p>
                        <div className="flex space-x-1 mt-1">
                          <button
                            onClick={() => movePlayerToPosition(rosterPlayer.id, 'BENCH', false)}
                            className="p-1 text-gray-400 hover:text-white"
                            title="Move to bench"
                          >
                            <ArrowDownIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p className="text-gray-500 italic">Empty Slot</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bench */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-xl font-semibold text-white">Bench</h3>
          </div>
          <div className="p-6 space-y-4">
            {benchPlayers.map((rosterPlayer: any) => (
              <div key={rosterPlayer.id} className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getPositionColor(rosterPlayer.player.position)}`}>
                  {rosterPlayer.player.position}
                </div>
                
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{rosterPlayer.player.name}</p>
                    <p className="text-sm text-gray-400">
                      {rosterPlayer.player.nflTeam}
                      {rosterPlayer.player.status !== 'active' && (
                        <span className="ml-2 text-yellow-400">({rosterPlayer.player.status})</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {rosterPlayer.player.projections[0]?.projectedPoints.toFixed(1) || '--'} pts
                    </p>
                    <div className="flex space-x-1 mt-1">
                      {canPlayerPlayPosition(rosterPlayer.player, 'FLEX') && (
                        <button
                          onClick={() => movePlayerToPosition(rosterPlayer.id, 'FLEX', true)}
                          className="p-1 text-gray-400 hover:text-white"
                          title="Move to starting lineup"
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty bench slots */}
            {Array.from({ length: Math.max(0, BENCH_SIZE - benchPlayers.length) }, (_, index) => (
              <div key={`empty-bench-${index}`} className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg opacity-50">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getPositionColor('BENCH')}`}>
                  BE
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 italic">Empty Slot</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lineup Warnings */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-yellow-400">Lineup Notes</h4>
            <ul className="text-sm text-gray-300 mt-2 space-y-1">
              <li>• Lineups lock when the first game of the week starts</li>
              <li>• Players marked as "OUT" or "IR" will score 0 points</li>
              <li>• FLEX position can be filled by RB, WR, or TE</li>
              <li>• Check injury reports before finalizing your lineup</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}