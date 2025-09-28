'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/outline'
import { Button } from '@/components/ui/button'

const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']
const nflTeams = [
  'ALL', 'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
  'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAC', 'LAR', 'LV', 'MIA',
  'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB',
  'TEN', 'WAS'
]

export function PlayerSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(searchParams?.get('search') || '')
  const [position, setPosition] = useState(searchParams?.get('position') || 'ALL')
  const [team, setTeam] = useState(searchParams?.get('team') || 'ALL')

  const updateFilters = () => {
    const params = new URLSearchParams()
    
    if (search) params.set('search', search)
    if (position && position !== 'ALL') params.set('position', position)
    if (team && team !== 'ALL') params.set('team', team)
    
    router.push(`/players?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setPosition('ALL')
    setTeam('ALL')
    router.push('/players')
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && updateFilters()}
          />
        </div>

        {/* Position Filter */}
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {positions.map((pos: any) => (
            <option key={pos} value={pos}>
              {pos === 'ALL' ? 'All Positions' : pos}
            </option>
          ))}
        </select>

        {/* Team Filter */}
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {nflTeams.map((t: any) => (
            <option key={t} value={t}>
              {t === 'ALL' ? 'All Teams' : t}
            </option>
          ))}
        </select>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button onClick={updateFilters} size="sm" className="flex-1">
            Search
          </Button>
          <Button onClick={clearFilters} variant="outline" size="sm" className="flex-1">
            Clear
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {(search || position !== 'ALL' || team !== 'ALL') && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-700">
          <span className="text-sm text-gray-400">Active filters:</span>
          {search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30">
              Search: "{search}"
            </span>
          )}
          {position !== 'ALL' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400 border border-green-500/30">
              Position: {position}
            </span>
          )}
          {team !== 'ALL' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-400 border border-purple-500/30">
              Team: {team}
            </span>
          )}
        </div>
      )}
    </div>
  )
}