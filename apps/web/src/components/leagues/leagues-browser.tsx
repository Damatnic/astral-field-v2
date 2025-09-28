'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  UserGroupIcon,
  TrophyIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  LockClosedIcon
} from '@heroicons/react/outline'

interface League {
  id: string
  name: string
  description: string | null
  isActive: boolean
  playoffs: boolean
  currentWeek: number
  maxTeams: number
  availableSpots: number
  isUserMember: boolean
  teams: Array<{
    id: string
    name: string
    owner: {
      name: string | null
      email: string
    }
  }>
}

interface LeaguesBrowserProps {
  leagues: League[]
  userLeagues: Array<{
    id: string
    name: string
    description: string | null
    currentWeek: number
    isActive: boolean
  }>
  currentUserId: string
}

export function LeaguesBrowser({ leagues, userLeagues, currentUserId }: LeaguesBrowserProps) {
  const [filter, setFilter] = useState<'all' | 'available' | 'my-leagues'>('all')
  const [joining, setJoining] = useState<string | null>(null)

  const filteredLeagues = leagues.filter(league => {
    switch (filter) {
      case 'available':
        return !league.isUserMember && league.availableSpots > 0 && league.isActive
      case 'my-leagues':
        return league.isUserMember
      default:
        return true
    }
  })

  const handleJoinLeague = async (leagueId: string) => {
    setJoining(leagueId)
    try {
      const response = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leagueId }),
      })

      if (!response.ok) {
        throw new Error('Failed to join league')
      }

      toast.success('Successfully joined league!')
      // Refresh the page to update the data
      window.location.reload()
    } catch (error) {
      toast.error('Failed to join league. Please try again.')
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* My Leagues Summary */}
      {userLeagues.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">My Leagues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userLeagues.map(league => (
              <div key={league.id} className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">{league.name}</h3>
                <p className="text-sm text-gray-400 mb-3">
                  {league.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-1 rounded-full ${
                    league.isActive 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {league.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-gray-300">Week {league.currentWeek}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          All Leagues
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'available'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          Available to Join
        </button>
        <button
          onClick={() => setFilter('my-leagues')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            filter === 'my-leagues'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          My Leagues
        </button>
      </div>

      {/* Leagues List */}
      <div className="space-y-4">
        {filteredLeagues.length > 0 ? (
          filteredLeagues.map(league => (
            <div key={league.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{league.name}</h3>
                    <div className="flex items-center space-x-2">
                      {league.isUserMember && (
                        <CheckCircleIcon className="h-5 w-5 text-green-400" title="You're a member" />
                      )}
                      {!league.isActive && (
                        <LockClosedIcon className="h-5 w-5 text-gray-400" title="Inactive" />
                      )}
                    </div>
                  </div>
                  <p className="text-gray-400 mb-3">
                    {league.description || 'No description provided'}
                  </p>
                  
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <UserGroupIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300">
                        {league.teams.length}/{league.maxTeams} teams
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300">Week {league.currentWeek}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrophyIcon className="h-4 w-4 text-gray-400" />
                      <span className={`font-medium ${
                        league.playoffs ? 'text-yellow-400' : 'text-gray-300'
                      }`}>
                        {league.playoffs ? 'Playoffs' : 'Regular Season'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  {league.isUserMember ? (
                    <Button variant="outline" disabled>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Member
                    </Button>
                  ) : league.availableSpots > 0 && league.isActive ? (
                    <Button
                      onClick={() => handleJoinLeague(league.id)}
                      disabled={joining === league.id}
                    >
                      <PlusCircleIcon className="h-4 w-4 mr-2" />
                      {joining === league.id ? 'Joining...' : 'Join League'}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      {league.availableSpots === 0 ? 'Full' : 'Inactive'}
                    </Button>
                  )}
                  
                  {league.availableSpots > 0 && (
                    <span className="text-sm text-gray-400">
                      {league.availableSpots} spot{league.availableSpots !== 1 ? 's' : ''} left
                    </span>
                  )}
                </div>
              </div>

              {/* League Members */}
              {league.teams.length > 0 && (
                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Members</h4>
                  <div className="flex flex-wrap gap-2">
                    {league.teams.slice(0, 8).map(team => (
                      <div
                        key={team.id}
                        className="bg-slate-700/50 rounded-full px-3 py-1 text-sm text-gray-300"
                      >
                        {team.owner.name || team.owner.email.split('@')[0]}
                      </div>
                    ))}
                    {league.teams.length > 8 && (
                      <div className="bg-slate-700/50 rounded-full px-3 py-1 text-sm text-gray-400">
                        +{league.teams.length - 8} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <TrophyIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'available' ? 'No Available Leagues' :
               filter === 'my-leagues' ? 'No Leagues Joined' :
               'No Leagues Found'}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === 'available' ? 'All leagues are currently full or inactive.' :
               filter === 'my-leagues' ? 'You haven\'t joined any leagues yet.' :
               'There are no leagues created yet.'}
            </p>
            {filter !== 'my-leagues' && (
              <a href="/leagues/create">
                <Button>
                  <PlusCircleIcon className="h-4 w-4 mr-2" />
                  Create New League
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}