'use client'

import React from 'react'

interface PlayerStat {
  id: string
  name: string
  position: string
  team: string
  fantasyPoints: number
  projectedPoints?: number
}

interface PlayerStatsGridProps {
  players?: PlayerStat[]
  title?: string
  currentWeek?: number
}

export function PlayerStatsGrid({ players = [], title = "Player Stats", currentWeek }: PlayerStatsGridProps) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      
      {players.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No player stats available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm">
                <th className="text-left py-2">Player</th>
                <th className="text-center py-2">Pos</th>
                <th className="text-center py-2">Team</th>
                <th className="text-center py-2">Pts</th>
                <th className="text-center py-2">Proj</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-t border-slate-700">
                  <td className="py-3 text-white font-medium">
                    {player.name}
                  </td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      player.position === 'QB' ? 'bg-red-500/20 text-red-300' :
                      player.position === 'RB' ? 'bg-green-500/20 text-green-300' :
                      player.position === 'WR' ? 'bg-blue-500/20 text-blue-300' :
                      player.position === 'TE' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {player.position}
                    </span>
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {player.team}
                  </td>
                  <td className="py-3 text-center text-white font-medium">
                    {player.fantasyPoints.toFixed(1)}
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {player.projectedPoints?.toFixed(1) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}