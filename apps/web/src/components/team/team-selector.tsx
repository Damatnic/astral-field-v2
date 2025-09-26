'use client'

import { useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  league: {
    id: string
    name: string
    currentWeek: number
    season: string
  }
}

interface TeamSelectorProps {
  teams: Team[]
  selectedTeamId?: string
}

export function TeamSelector({ teams, selectedTeamId }: TeamSelectorProps) {
  const router = useRouter()

  if (teams.length <= 1) return null

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">Select Team</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team: any) => (
          <button
            key={team.id}
            onClick={() => router.push(`/team?teamId=${team.id}`)}
            className={`p-4 rounded-lg border text-left transition-all ${
              selectedTeamId === team.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
            }`}
          >
            <h3 className="font-semibold text-white mb-2">{team.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{team.league.name}</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">
                {team.wins}W - {team.losses}L - {team.ties}T
              </span>
              <span className="text-gray-300">
                {team.pointsFor.toFixed(1)} PF
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}