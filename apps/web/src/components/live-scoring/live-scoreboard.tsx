'use client'

import { useState, useEffect } from 'react'
import { useLiveScoring } from '@/hooks/use-websocket'
import { 
  ClockIcon, 
  PlayIcon, 
  StopIcon,
  ExclamationTriangleIcon,
  FireIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LiveScoreboardProps {
  leagueId: string
  week: number
  season?: number
}

interface MatchupData {
  matchupId: string
  week: number
  season: number
  homeTeam: TeamScore
  awayTeam: TeamScore
  isComplete: boolean
  lastUpdated: string
}

interface TeamScore {
  id: string
  name: string
  owner: string
  score: number
  projectedScore: number
  roster: PlayerScore[]
}

interface PlayerScore {
  playerId: string
  name: string
  position: string
  rosterPosition: string
  nflTeam: string
  currentScore: number
  projectedScore: number
  isActive: boolean
  injuryStatus: string
  liveUpdates: any[]
}

export function LiveScoreboard({ leagueId, week, season = 2025 }: LiveScoreboardProps) {
  const { state, scores, liveEvents } = useLiveScoring(leagueId, week)
  const [matchups, setMatchups] = useState<MatchupData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [selectedMatchup, setSelectedMatchup] = useState<string | null>(null)

  // Fetch live scoring data
  useEffect(() => {
    const fetchLiveScores = async () => {
      try {
        const response = await fetch(`/api/live-scoring?leagueId=${leagueId}&week=${week}&season=${season}`)
        const data = await response.json()
        
        if (data.success) {
          setMatchups(data.data.matchups)
          setLastUpdate(new Date(data.data.lastUpdated))
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch live scores:', error);
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLiveScores()
    
    // Refresh scores every 30 seconds
    const interval = setInterval(fetchLiveScores, 30000)
    return () => clearInterval(interval)
  }, [leagueId, week, season])

  // Handle live events from WebSocket
  useEffect(() => {
    liveEvents.forEach(event => {
      if (event.type === 'SCORE_UPDATE') {
        setLastUpdate(new Date())
        // Trigger refresh of scores
        setMatchups(prev => prev.map(matchup => ({
          ...matchup,
          lastUpdated: new Date().toISOString()
        })))
      }
    })
  }, [liveEvents])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading live scores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Scoreboard</h2>
          <p className="text-gray-400">Week {week} • {season} Season</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <ClockIcon className="h-4 w-4" />
          <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          {state.connected && (
            <Badge variant="success" className="bg-green-600">
              Live
            </Badge>
          )}
        </div>
      </div>

      {/* Matchups */}
      <div className="grid gap-4">
        {matchups.map((matchup) => (
          <MatchupCard
            key={matchup.matchupId}
            matchup={matchup}
            isSelected={selectedMatchup === matchup.matchupId}
            onSelect={() => setSelectedMatchup(
              selectedMatchup === matchup.matchupId ? null : matchup.matchupId
            )}
          />
        ))}
      </div>

      {/* Detailed View */}
      {selectedMatchup && (
        <MatchupDetails
          matchup={matchups.find(m => m.matchupId === selectedMatchup)!}
          onClose={() => setSelectedMatchup(null)}
        />
      )}
    </div>
  )
}

function MatchupCard({ matchup, isSelected, onSelect }: {
  matchup: MatchupData
  isSelected: boolean
  onSelect: () => void
}) {
  const homeWinning = matchup.homeTeam.score > matchup.awayTeam.score
  const margin = Math.abs(matchup.homeTeam.score - matchup.awayTeam.score)
  const isCloseGame = margin < 10 && !matchup.isComplete

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-400'
      } ${isCloseGame ? 'border-orange-500' : 'border-slate-700'}`}
      onClick={onSelect}
    >
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Away Team */}
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2 mb-2">
              <span className="font-medium text-white">{matchup.awayTeam.name}</span>
              {!homeWinning && !matchup.isComplete && (
                <TrophyIcon className="h-4 w-4 text-yellow-400" />
              )}
            </div>
            <div className="text-sm text-gray-400">{matchup.awayTeam.owner}</div>
            <div className="text-2xl font-bold text-white mt-2">
              {matchup.awayTeam.score.toFixed(1)}
            </div>
            <div className="text-sm text-gray-400">
              Proj: {matchup.awayTeam.projectedScore.toFixed(1)}
            </div>
          </div>

          {/* VS / Status */}
          <div className="text-center">
            <div className="text-gray-400 mb-2">VS</div>
            {matchup.isComplete ? (
              <Badge variant="success" className="bg-green-600">
                Final
              </Badge>
            ) : isCloseGame ? (
              <div className="flex items-center justify-center space-x-1">
                <FireIcon className="h-4 w-4 text-orange-400" />
                <Badge variant="warning" className="bg-orange-600">
                  Close
                </Badge>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-1">
                <PlayIcon className="h-4 w-4 text-green-400" />
                <Badge variant="default" className="bg-blue-600">
                  Live
                </Badge>
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Margin: {margin.toFixed(1)}
            </div>
          </div>

          {/* Home Team */}
          <div className="text-left">
            <div className="flex items-center space-x-2 mb-2">
              {homeWinning && !matchup.isComplete && (
                <TrophyIcon className="h-4 w-4 text-yellow-400" />
              )}
              <span className="font-medium text-white">{matchup.homeTeam.name}</span>
            </div>
            <div className="text-sm text-gray-400">{matchup.homeTeam.owner}</div>
            <div className="text-2xl font-bold text-white mt-2">
              {matchup.homeTeam.score.toFixed(1)}
            </div>
            <div className="text-sm text-gray-400">
              Proj: {matchup.homeTeam.projectedScore.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-400">Active Players</div>
              <div className="text-white">
                {matchup.awayTeam.roster.filter(p => p.isActive).length} / {matchup.awayTeam.roster.length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Active Players</div>
              <div className="text-white">
                {matchup.homeTeam.roster.filter(p => p.isActive).length} / {matchup.homeTeam.roster.length}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MatchupDetails({ matchup, onClose }: {
  matchup: MatchupData
  onClose: () => void
}) {
  return (
    <Card className="border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">
            {matchup.awayTeam.name} vs {matchup.homeTeam.name}
          </CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamRosterView team={matchup.awayTeam} />
          <TeamRosterView team={matchup.homeTeam} />
        </div>
      </CardContent>
    </Card>
  )
}

function TeamRosterView({ team }: { team: TeamScore }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">
        {team.name} ({team.score.toFixed(1)} pts)
      </h3>
      <div className="space-y-2">
        {team.roster.map((player) => (
          <div
            key={player.playerId}
            className={`p-3 rounded-lg ${
              player.isActive ? 'bg-green-900/20 border-green-500/20' : 'bg-slate-800'
            } border border-slate-700`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    getPositionColor(player.position)
                  }`}>
                    {player.rosterPosition}
                  </span>
                  <span className="font-medium text-white">{player.name}</span>
                  <span className="text-sm text-gray-400">{player.nflTeam}</span>
                  {player.isActive && (
                    <PlayIcon className="h-3 w-3 text-green-400" />
                  )}
                  {player.injuryStatus !== 'HEALTHY' && (
                    <ExclamationTriangleIcon className="h-3 w-3 text-yellow-400" />
                  )}
                </div>
                {player.liveUpdates.length > 0 && (
                  <div className="text-xs text-green-400 mt-1">
                    Last update: {new Date(player.liveUpdates[0].timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">
                  {player.currentScore.toFixed(1)}
                </div>
                <div className="text-sm text-gray-400">
                  Proj: {player.projectedScore.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
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
    DEF: 'bg-orange-500 text-orange-100',
    FLEX: 'bg-gray-500 text-gray-100'
  }
  return colors[position] || 'bg-gray-500 text-gray-100'
}