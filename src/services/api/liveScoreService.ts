'use client'

import { createClient } from '@/lib/supabase'
import socketService, { type GameUpdate, type LiveScore } from '../websocket/socketService'

const supabase = createClient()

export interface LiveGame {
  id: string
  awayTeam: string
  homeTeam: string
  awayScore: number
  homeScore: number
  quarter: number
  timeRemaining: string
  status: 'scheduled' | 'pregame' | 'live' | 'halftime' | 'final' | 'postponed'
  gameDate: string
  redZoneStatus?: 'away' | 'home' | null
  possession?: 'away' | 'home' | null
}

export interface PlayerLiveStats {
  playerId: string
  gameId: string
  name: string
  position: string
  nflTeam: string
  fantasyPoints: number
  projectedPoints: number
  stats: {
    passingYards?: number
    passingTDs?: number
    interceptions?: number
    rushingYards?: number
    rushingTDs?: number
    receivingYards?: number
    receivingTDs?: number
    receptions?: number
    fumbles?: number
    targets?: number
  }
  gameStatus: 'scheduled' | 'live' | 'final'
  lastUpdate: string
}

export interface TeamLiveScore {
  teamId: string
  teamName: string
  totalPoints: number
  projectedPoints: number
  playersActive: number
  playersPlaying: number
  playersCompleted: number
  starters: PlayerLiveStats[]
  bench: PlayerLiveStats[]
  weeklyRank?: number
}

export interface LeagueLiveScoring {
  leagueId: string
  week: number
  lastUpdate: string
  games: LiveGame[]
  teams: TeamLiveScore[]
  topPerformers: PlayerLiveStats[]
  closeMatchups: Array<{
    team1: TeamLiveScore
    team2: TeamLiveScore
    pointDifferential: number
  }>
}

class LiveScoreService {
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()
  private activeWeek: number = 1

  async startLiveScoring(leagueId: string, week: number = this.getCurrentWeek()): Promise<void> {
    try {
      this.activeWeek = week
      
      // Subscribe to live updates
      await socketService.subscribeToLiveScoring()
      
      // Set up periodic updates during game times
      const intervalId = setInterval(async () => {
        await this.updateLiveScores(leagueId, week)
      }, 30000) // Update every 30 seconds
      
      this.updateIntervals.set(leagueId, intervalId)
      
      // Initial load
      await this.updateLiveScores(leagueId, week)
    } catch (error) {
      console.error('Failed to start live scoring:', error)
    }
  }

  async stopLiveScoring(leagueId: string): Promise<void> {
    const intervalId = this.updateIntervals.get(leagueId)
    if (intervalId) {
      clearInterval(intervalId)
      this.updateIntervals.delete(leagueId)
    }
  }

  async getLeagueLiveScoring(leagueId: string, week: number): Promise<LeagueLiveScoring> {
    try {
      const [games, teams] = await Promise.all([
        this.getLiveGames(),
        this.getTeamLiveScores(leagueId, week)
      ])

      const allPlayers = teams.flatMap(team => [...team.starters, ...team.bench])
      const topPerformers = allPlayers
        .filter(player => player.gameStatus === 'live' || player.gameStatus === 'final')
        .sort((a, b) => b.fantasyPoints - a.fantasyPoints)
        .slice(0, 10)

      const closeMatchups = this.findCloseMatchups(teams)

      return {
        leagueId,
        week,
        lastUpdate: new Date().toISOString(),
        games,
        teams,
        topPerformers,
        closeMatchups
      }
    } catch (error) {
      console.error('Error fetching league live scoring:', error)
      throw error
    }
  }

  async getTeamLiveScores(leagueId: string, week: number): Promise<TeamLiveScore[]> {
    try {
      // Get all teams in the league with their lineups
      const { data: teams } = await supabase
        .from('teams')
        .select(`
          id,
          team_name,
          lineup_entries!inner(
            player_id,
            position_slot,
            players(
              id,
              name,
              position,
              nfl_team,
              player_projections(fantasy_points)
            )
          )
        `)
        .eq('league_id', leagueId)
        .eq('lineup_entries.week', week)

      if (!teams) return []

      const teamScores: TeamLiveScore[] = []

      for (const team of teams) {
        const lineupEntries = team.lineup_entries as any[]
        const starters: PlayerLiveStats[] = []
        const bench: PlayerLiveStats[] = []

        let totalPoints = 0
        let totalProjected = 0

        for (const entry of lineupEntries) {
          const player = entry.players
          const liveStats = await this.getPlayerLiveStats(player.id)
          
          totalPoints += liveStats.fantasyPoints
          totalProjected += liveStats.projectedPoints

          // Determine if starter or bench (simplified)
          if (['QB', 'RB', 'WR', 'TE', 'FLEX', 'D/ST', 'K'].includes(entry.position_slot)) {
            starters.push(liveStats)
          } else {
            bench.push(liveStats)
          }
        }

        teamScores.push({
          teamId: team.id,
          teamName: team.team_name,
          totalPoints,
          projectedPoints: totalProjected,
          playersActive: starters.filter(p => p.gameStatus === 'live').length,
          playersPlaying: starters.filter(p => p.gameStatus !== 'scheduled').length,
          playersCompleted: starters.filter(p => p.gameStatus === 'final').length,
          starters: starters.sort((a, b) => b.fantasyPoints - a.fantasyPoints),
          bench
        })
      }

      // Add weekly rankings
      teamScores.sort((a, b) => b.totalPoints - a.totalPoints)
      teamScores.forEach((team, index) => {
        team.weeklyRank = index + 1
      })

      return teamScores
    } catch (error) {
      console.error('Error fetching team live scores:', error)
      return []
    }
  }

  async getPlayerLiveStats(playerId: string): Promise<PlayerLiveStats> {
    try {
      // Get player info
      const { data: player } = await supabase
        .from('players')
        .select(`
          id,
          name,
          position,
          nfl_team,
          player_projections(fantasy_points)
        `)
        .eq('id', playerId)
        .single()

      if (!player) throw new Error('Player not found')

      // Simulate live stats (in production, this would come from real NFL data)
      const gameStatus = this.getGameStatus(player.nfl_team)
      const fantasyPoints = this.calculateLiveFantasyPoints(player.position, gameStatus)
      const projectedPoints = (player.player_projections as any)?.[0]?.fantasy_points || 0

      return {
        playerId: player.id,
        gameId: `${player.nfl_team}_${new Date().toISOString().split('T')[0]}`,
        name: player.name,
        position: player.position,
        nflTeam: player.nfl_team,
        fantasyPoints,
        projectedPoints,
        stats: this.generateLiveStats(player.position, gameStatus),
        gameStatus,
        lastUpdate: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error fetching player live stats:', error)
      // Return default stats if error
      return {
        playerId,
        gameId: '',
        name: 'Unknown',
        position: 'UNKNOWN',
        nflTeam: 'UNKNOWN',
        fantasyPoints: 0,
        projectedPoints: 0,
        stats: {},
        gameStatus: 'scheduled',
        lastUpdate: new Date().toISOString()
      }
    }
  }

  async getLiveGames(): Promise<LiveGame[]> {
    try {
      // In production, this would fetch from NFL API
      // For now, simulate some games
      const games: LiveGame[] = []
      const nflTeams = ['KC', 'BUF', 'CIN', 'LAC', 'BAL', 'MIA', 'CLE', 'PIT']
      
      for (let i = 0; i < 4; i++) {
        const awayTeam = nflTeams[i * 2]
        const homeTeam = nflTeams[i * 2 + 1]
        
        games.push({
          id: `game_${i}`,
          awayTeam,
          homeTeam,
          awayScore: Math.floor(Math.random() * 35),
          homeScore: Math.floor(Math.random() * 35),
          quarter: Math.floor(Math.random() * 4) + 1,
          timeRemaining: `${Math.floor(Math.random() * 15)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          status: this.isGameDay() ? 'live' : 'scheduled',
          gameDate: new Date().toISOString(),
          possession: Math.random() > 0.5 ? 'away' : 'home'
        })
      }

      return games
    } catch (error) {
      console.error('Error fetching live games:', error)
      return []
    }
  }

  private async updateLiveScores(leagueId: string, week: number): Promise<void> {
    try {
      const liveScoring = await this.getLeagueLiveScoring(leagueId, week)
      
      // Broadcast updates through WebSocket
      await socketService.broadcast({
        type: 'player_scores',
        leagueId,
        data: liveScoring
      })
    } catch (error) {
      console.error('Error updating live scores:', error)
    }
  }

  private getGameStatus(nflTeam: string): 'scheduled' | 'live' | 'final' {
    if (!this.isGameDay()) return 'scheduled'
    
    const hour = new Date().getHours()
    if (hour >= 13 && hour < 17) return 'live' // Sunday afternoon
    if (hour >= 17) return 'final'
    
    return 'scheduled'
  }

  private calculateLiveFantasyPoints(position: string, gameStatus: 'scheduled' | 'live' | 'final'): number {
    if (gameStatus === 'scheduled') return 0
    
    const basePoints = Math.random() * 20
    const positionMultiplier = position === 'QB' ? 1.2 : position === 'K' ? 0.5 : 1
    const statusMultiplier = gameStatus === 'final' ? 1 : Math.random() * 0.8
    
    return Math.round((basePoints * positionMultiplier * statusMultiplier) * 10) / 10
  }

  private generateLiveStats(position: string, gameStatus: 'scheduled' | 'live' | 'final'): PlayerLiveStats['stats'] {
    if (gameStatus === 'scheduled') return {}
    
    const stats: PlayerLiveStats['stats'] = {}
    
    switch (position) {
      case 'QB':
        stats.passingYards = Math.floor(Math.random() * 350)
        stats.passingTDs = Math.floor(Math.random() * 4)
        stats.interceptions = Math.floor(Math.random() * 2)
        break
      case 'RB':
        stats.rushingYards = Math.floor(Math.random() * 150)
        stats.rushingTDs = Math.floor(Math.random() * 3)
        stats.receptions = Math.floor(Math.random() * 8)
        stats.receivingYards = Math.floor(Math.random() * 80)
        break
      case 'WR':
      case 'TE':
        stats.receptions = Math.floor(Math.random() * 12)
        stats.receivingYards = Math.floor(Math.random() * 120)
        stats.receivingTDs = Math.floor(Math.random() * 2)
        stats.targets = stats.receptions + Math.floor(Math.random() * 5)
        break
    }
    
    return stats
  }

  private findCloseMatchups(teams: TeamLiveScore[]): Array<{
    team1: TeamLiveScore
    team2: TeamLiveScore
    pointDifferential: number
  }> {
    const closeMatchups: Array<{
      team1: TeamLiveScore
      team2: TeamLiveScore
      pointDifferential: number
    }> = []

    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        const team1 = teams[i]
        const team2 = teams[i + 1]
        const differential = Math.abs(team1.totalPoints - team2.totalPoints)
        
        if (differential < 15) { // Close matchup threshold
          closeMatchups.push({
            team1,
            team2,
            pointDifferential: differential
          })
        }
      }
    }

    return closeMatchups.sort((a, b) => a.pointDifferential - b.pointDifferential)
  }

  private getCurrentWeek(): number {
    const now = new Date()
    const seasonStart = new Date(now.getFullYear(), 8, 1) // September 1st
    const weeksDiff = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(18, weeksDiff + 1))
  }

  private isGameDay(): boolean {
    const today = new Date().getDay()
    return today === 0 || today === 1 || today === 4 // Sunday, Monday, Thursday
  }

  // Cleanup
  destroy(): void {
    this.updateIntervals.forEach(interval => clearInterval(interval))
    this.updateIntervals.clear()
  }
}

const liveScoreService = new LiveScoreService()
export default liveScoreService