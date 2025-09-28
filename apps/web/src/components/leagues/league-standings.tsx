'use client'

import React from 'react'

interface Team {
  id: string
  name: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}

interface LeagueStandingsProps {
  teams?: Team[]
}

export function LeagueStandings({ teams = [] }: LeagueStandingsProps) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">League Standings</h3>
      
      {teams.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No standings data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm">
                <th className="text-left py-2">Team</th>
                <th className="text-center py-2">W-L</th>
                <th className="text-center py-2">PF</th>
                <th className="text-center py-2">PA</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr key={team.id} className="border-t border-slate-700">
                  <td className="py-3 text-white">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                      <span>{team.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {team.wins}-{team.losses}
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {team.pointsFor.toFixed(1)}
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {team.pointsAgainst.toFixed(1)}
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