// @ts-nocheck
import { neonServerless } from '@/lib/neon-serverless'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Team = Tables<'teams'>
export type Player = Tables<'players'>
export type RosterEntry = Tables<'rosters'>
export type LineupEntry = Tables<'lineup_entries'>

export interface LineupSlot {
  id: string
  name: string
  position: string
  maxPlayers: number
  eligiblePositions: string[]
}

export interface PlayerWithDetails {
  id: string
  name: string
  position: string
  nfl_team: string
  injury_status?: string | null
  bye_week?: number
  created_at?: string
  updated_at?: string
  projections?: {
    fantasy_points: number
    adp?: number
    confidence: number
  }
  roster_entry?: RosterEntry
}

export interface TeamRoster {
  teamId: string
  teamName: string
  players: PlayerWithDetails[]
  totalValue: number
  positionBreakdown: Record<string, number>
}

export interface OptimalLineup {
  starters: PlayerWithDetails[]
  bench: PlayerWithDetails[]
  totalProjectedPoints: number
  lineup: Record<string, string | null>
}

export interface RosterResponse {
  roster: TeamRoster | null
  error: string | null
}

export interface LineupResponse {
  lineup: OptimalLineup | null
  error: string | null
}

export class RosterService {
  async getTeamRoster(teamId: string, week?: number): Promise<RosterResponse> {
    try {
      // Get team info
      const teamResult = await neonServerless.selectSingle('teams', {
        eq: { id: teamId }
      })

      if (teamResult.error) throw teamResult.error
      if (!teamResult.data) throw new Error('Team not found')

      const team = teamResult.data

      // Get roster entries with player details
      const rosterResult = await neonServerless.selectWithJoins('rosters', `
        *,
        players!inner (
          *,
          player_projections (fantasy_points, adp, confidence)
        )
      `, {
        eq: { team_id: teamId }
      })

      if (rosterResult.error) throw rosterResult.error

      const rosterData = rosterResult.data || []

      // Transform roster data
      const players: PlayerWithDetails[] = rosterData.map((rosterEntry: any) => ({
        ...rosterEntry.players,
        projections: rosterEntry.players.player_projections?.[0] || null,
        roster_entry: {
          id: rosterEntry.id,
          team_id: rosterEntry.team_id,
          player_id: rosterEntry.player_id,
          position_slot: rosterEntry.position_slot,
          acquired_date: rosterEntry.acquired_date,
          dropped_date: rosterEntry.dropped_date,
          created_at: rosterEntry.created_at,
          updated_at: rosterEntry.updated_at
        }
      }))

      // Calculate total value and position breakdown
      let totalValue = 0
      const positionBreakdown: Record<string, number> = {}

      players.forEach(player => {
        const projectedPoints = player.projections?.fantasy_points || 0
        totalValue += projectedPoints
        positionBreakdown[player.position] = (positionBreakdown[player.position] || 0) + 1
      })

      const roster: TeamRoster = {
        teamId: team.id,
        teamName: team.team_name,
        players,
        totalValue: Math.round(totalValue * 10) / 10,
        positionBreakdown
      }

      return { roster, error: null }
    } catch (error: any) {
      console.error('Get team roster error:', error)
      return { roster: null, error: error.message || 'Failed to get roster' }
    }
  }

  async addPlayerToRoster(teamId: string, playerId: string, positionSlot = 'BENCH'): Promise<{ error: string | null }> {
    try {
      // Check if player is already on roster
      const existingResult = await neonServerless.selectSingle('rosters', {
        eq: { team_id: teamId, player_id: playerId }
      })

      if (existingResult.data) {
        throw new Error('Player already on roster')
      }

      // Add to roster
      const result = await neonServerless.insert('rosters', {
        team_id: teamId,
        player_id: playerId,
        position_slot: positionSlot,
        acquired_date: new Date().toISOString()
      })

      if (result.error) throw result.error

      return { error: null }
    } catch (error: any) {
      console.error('Add player to roster error:', error)
      return { error: error.message || 'Failed to add player to roster' }
    }
  }

  async removePlayerFromRoster(teamId: string, playerId: string): Promise<{ error: string | null }> {
    try {
      const result = await neonServerless.delete('rosters', {
        team_id: teamId,
        player_id: playerId
      })

      if (result.error) throw result.error

      return { error: null }
    } catch (error: any) {
      console.error('Remove player from roster error:', error)
      return { error: error.message || 'Failed to remove player from roster' }
    }
  }

  async getOptimalLineup(teamId: string, week: number): Promise<LineupResponse> {
    try {
      // Get roster
      const rosterResult = await this.getTeamRoster(teamId)
      if (rosterResult.error || !rosterResult.roster) {
        throw new Error(rosterResult.error || 'No roster found')
      }

      const roster = rosterResult.roster

      // Get current lineup for this week
      const lineupResult = await neonServerless.select('lineup_entries', {
        eq: { team_id: teamId, week }
      })

      if (lineupResult.error) throw lineupResult.error

      const currentLineup = lineupResult.data || []

      // Define standard lineup slots
      const lineupSlots = [
        'QB1', 'RB1', 'RB2', 'WR1', 'WR2', 'TE1', 'FLEX', 'K1', 'DST1',
        'BENCH1', 'BENCH2', 'BENCH3', 'BENCH4', 'BENCH5', 'BENCH6'
      ]

      // Create lineup structure
      const lineup: Record<string, string | null> = {}
      lineupSlots.forEach(slot => {
        const existingEntry = currentLineup.find(entry => entry.position_slot === slot)
        lineup[slot] = existingEntry?.player_id || null
      })

      // Separate starters and bench
      const starterSlots = ['QB1', 'RB1', 'RB2', 'WR1', 'WR2', 'TE1', 'FLEX', 'K1', 'DST1']
      const benchSlots = ['BENCH1', 'BENCH2', 'BENCH3', 'BENCH4', 'BENCH5', 'BENCH6']

      const starters: PlayerWithDetails[] = []
      const bench: PlayerWithDetails[] = []

      starterSlots.forEach(slot => {
        const playerId = lineup[slot]
        if (playerId) {
          const player = roster.players.find(p => p.id === playerId)
          if (player) starters.push(player)
        }
      })

      benchSlots.forEach(slot => {
        const playerId = lineup[slot]
        if (playerId) {
          const player = roster.players.find(p => p.id === playerId)
          if (player) bench.push(player)
        }
      })

      // Calculate total projected points
      const totalProjectedPoints = starters.reduce((total, player) => {
        return total + (player.projections?.fantasy_points || 0)
      }, 0)

      const optimalLineup: OptimalLineup = {
        starters,
        bench,
        totalProjectedPoints: Math.round(totalProjectedPoints * 10) / 10,
        lineup
      }

      return { lineup: optimalLineup, error: null }
    } catch (error: any) {
      console.error('Get optimal lineup error:', error)
      return { lineup: null, error: error.message || 'Failed to get optimal lineup' }
    }
  }

  async setLineup(teamId: string, week: number, lineup: Record<string, string | null>): Promise<{ error: string | null }> {
    try {
      // Clear existing lineup for this week
      await neonServerless.delete('lineup_entries', {
        team_id: teamId,
        week
      })

      // Insert new lineup entries
      const entries: TablesInsert<'lineup_entries'>[] = []
      Object.entries(lineup).forEach(([slot, playerId]) => {
        if (playerId) {
          entries.push({
            team_id: teamId,
            week,
            player_id: playerId,
            position_slot: slot
          })
        }
      })

      // Insert all entries
      for (const entry of entries) {
        const result = await neonServerless.insert('lineup_entries', entry)
        if (result.error) throw result.error
      }

      return { error: null }
    } catch (error: any) {
      console.error('Set lineup error:', error)
      return { error: error.message || 'Failed to set lineup' }
    }
  }

  async getStartingLineup(teamId: string, week: number): Promise<{ lineup: PlayerWithDetails[]; error: string | null }> {
    try {
      const optimalResult = await this.getOptimalLineup(teamId, week)
      if (optimalResult.error || !optimalResult.lineup) {
        throw new Error(optimalResult.error || 'Failed to get lineup')
      }

      return { lineup: optimalResult.lineup.starters, error: null }
    } catch (error: any) {
      console.error('Get starting lineup error:', error)
      return { lineup: [], error: error.message || 'Failed to get starting lineup' }
    }
  }

  async getBenchPlayers(teamId: string, week: number): Promise<{ players: PlayerWithDetails[]; error: string | null }> {
    try {
      const optimalResult = await this.getOptimalLineup(teamId, week)
      if (optimalResult.error || !optimalResult.lineup) {
        throw new Error(optimalResult.error || 'Failed to get lineup')
      }

      return { players: optimalResult.lineup.bench, error: null }
    } catch (error: any) {
      console.error('Get bench players error:', error)
      return { players: [], error: error.message || 'Failed to get bench players' }
    }
  }

  async analyzeRosterNeeds(teamId: string): Promise<{ needs: string[]; strengths: string[]; error: string | null }> {
    try {
      const rosterResult = await this.getTeamRoster(teamId)
      if (rosterResult.error || !rosterResult.roster) {
        throw new Error(rosterResult.error || 'Failed to get roster')
      }

      const roster = rosterResult.roster
      const positionBreakdown = roster.positionBreakdown

      const needs: string[] = []
      const strengths: string[] = []

      // Analyze position depth
      const idealBreakdown = { QB: 2, RB: 4, WR: 5, TE: 2, K: 1, DST: 1 }

      Object.entries(idealBreakdown).forEach(([position, ideal]) => {
        const current = positionBreakdown[position] || 0
        if (current < ideal) {
          needs.push(`${position} (${current}/${ideal})`)
        } else if (current > ideal + 1) {
          strengths.push(`${position} (${current} players)`)
        }
      })

      return { needs, strengths, error: null }
    } catch (error: any) {
      console.error('Analyze roster needs error:', error)
      return { needs: [], strengths: [], error: error.message || 'Failed to analyze roster' }
    }
  }

  async getRosterValue(teamId: string): Promise<{ value: number; error: string | null }> {
    try {
      const rosterResult = await this.getTeamRoster(teamId)
      if (rosterResult.error || !rosterResult.roster) {
        throw new Error(rosterResult.error || 'Failed to get roster')
      }

      return { value: rosterResult.roster.totalValue, error: null }
    } catch (error: any) {
      console.error('Get roster value error:', error)
      return { value: 0, error: error.message || 'Failed to get roster value' }
    }
  }
}

export default new RosterService()