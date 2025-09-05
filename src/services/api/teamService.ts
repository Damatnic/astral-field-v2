// THIS FILE NEEDS REFACTORING FOR NEON DATABASE - TEMPORARILY DISABLED
// @ts-nocheck
import { neonServerless } from '@/lib/neon-serverless'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

type Team = Database['public']['Tables']['teams']['Row']
type LineupEntry = Database['public']['Tables']['lineup_entries']['Row']

export interface RosterPlayer {
  id: string
  playerId: string
  teamId: string
  position: string
  isStarter: boolean
  week?: number
}

export interface Lineup {
  week: number
  entries: LineupEntry[]
}

export interface TeamResponse {
  team: Team | null
  error: string | null
}

export interface LineupResponse {
  lineup: LineupEntry[]
  error: string | null
}

export interface RosterSettings {
  QB: number
  RB: number
  WR: number
  TE: number
  FLEX: number
  DST: number
  K: number
  BENCH: number
}

class TeamService {

  async getUserTeam(userId: string, leagueId: string): Promise<TeamResponse> {
    try {
      const { data: team, error } = await this.supabase
        .from('teams')
        .select('*')
        .eq('user_id', userId)
        .eq('league_id', leagueId)
        .single()

      if (error) throw error

      return { team, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch team'
      return { team: null, error: message }
    }
  }

  async getTeamLineup(teamId: string, week: number): Promise<LineupResponse> {
    try {
      const { data: lineup, error } = await this.supabase
        .from('lineup_entries')
        .select(`
          *,
          players!inner(
            name,
            position,
            nfl_team,
            injury_status
          )
        `)
        .eq('team_id', teamId)
        .eq('week', week)
        .order('position_slot')

      if (error) throw error

      return { lineup: lineup || [], error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch lineup'
      return { lineup: [], error: message }
    }
  }

  async setLineup(teamId: string, week: number, lineup: RosterPlayer[]): Promise<{ error: string | null }> {
    try {
      // First, delete existing lineup entries for this week
      const { error: deleteError } = await this.supabase
        .from('lineup_entries')
        .delete()
        .eq('team_id', teamId)
        .eq('week', week)

      if (deleteError) throw deleteError

      // Insert new lineup entries
      const lineupEntries = lineup.map(player => ({
        team_id: teamId,
        week: week,
        player_id: player.playerId,
        position_slot: player.position,
        points_scored: null,
      }))

      const { error: insertError } = await this.supabase
        .from('lineup_entries')
        .insert(lineupEntries)

      if (insertError) throw insertError

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to set lineup'
      return { error: message }
    }
  }

  async addPlayerToLineup(
    teamId: string,
    week: number,
    playerId: string,
    positionSlot: string
  ): Promise<{ error: string | null }> {
    try {
      // Check if position slot is already filled
      const { data: existing, error: checkError } = await this.supabase
        .from('lineup_entries')
        .select('id')
        .eq('team_id', teamId)
        .eq('week', week)
        .eq('position_slot', positionSlot)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw checkError
      }

      if (existing) {
        // Update existing entry
        const { error: updateError } = await this.supabase
          .from('lineup_entries')
          .update({ player_id: playerId })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        // Insert new entry
        const { error: insertError } = await this.supabase
          .from('lineup_entries')
          .insert({
            team_id: teamId,
            week: week,
            player_id: playerId,
            position_slot: positionSlot,
          })

        if (insertError) throw insertError
      }

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add player to lineup'
      return { error: message }
    }
  }

  async removePlayerFromLineup(
    teamId: string,
    week: number,
    positionSlot: string
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase
        .from('lineup_entries')
        .delete()
        .eq('team_id', teamId)
        .eq('week', week)
        .eq('position_slot', positionSlot)

      if (error) throw error

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove player from lineup'
      return { error: message }
    }
  }

  async getTeamRoster(teamId: string): Promise<{ players: any[], error: string | null }> {
    try {
      // This would require a roster/team_players table in a real implementation
      // For now, return empty array
      return { players: [], error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch roster'
      return { players: [], error: message }
    }
  }

  async calculateTeamPoints(teamId: string, week: number): Promise<{ points: number; error: string | null }> {
    try {
      const { data: lineup, error } = await this.supabase
        .from('lineup_entries')
        .select('points_scored')
        .eq('team_id', teamId)
        .eq('week', week)

      if (error) throw error

      const totalPoints = lineup?.reduce((sum: number, entry: any) => {
        return sum + (entry.points_scored || 0)
      }, 0) || 0

      return { points: totalPoints, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to calculate team points'
      return { points: 0, error: message }
    }
  }

  async updateTeamSettings(teamId: string, updates: Partial<Team>): Promise<TeamResponse> {
    try {
      const { data: team, error } = await this.supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single()

      if (error) throw error

      return { team, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update team'
      return { team: null, error: message }
    }
  }

  getDefaultRosterSettings(): RosterSettings {
    return {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 1,
      DST: 1,
      K: 1,
      BENCH: 6,
    }
  }

  getPositionSlots(settings: RosterSettings): string[] {
    const slots: string[] = []

    // Add starting positions
    for (let i = 0; i < settings.QB; i++) slots.push(`QB${i + 1}`)
    for (let i = 0; i < settings.RB; i++) slots.push(`RB${i + 1}`)
    for (let i = 0; i < settings.WR; i++) slots.push(`WR${i + 1}`)
    for (let i = 0; i < settings.TE; i++) slots.push(`TE${i + 1}`)
    for (let i = 0; i < settings.FLEX; i++) slots.push(`FLEX${i + 1}`)
    for (let i = 0; i < settings.DST; i++) slots.push(`DST${i + 1}`)
    for (let i = 0; i < settings.K; i++) slots.push(`K${i + 1}`)

    // Add bench slots
    for (let i = 0; i < settings.BENCH; i++) slots.push(`BENCH${i + 1}`)

    return slots
  }

  isValidPositionForSlot(playerPosition: string, slotPosition: string): boolean {
    // Remove number suffix from slot position
    const baseSlot = slotPosition.replace(/\d+$/, '')
    
    if (baseSlot === 'BENCH') return true
    if (baseSlot === playerPosition) return true
    if (baseSlot === 'FLEX' && ['RB', 'WR', 'TE'].includes(playerPosition)) return true
    
    return false
  }

  getOptimalLineup(availablePlayers: any[], settings: RosterSettings): RosterPlayer[] {
    // This would implement an algorithm to suggest the optimal lineup
    // based on projections, matchups, etc.
    // For now, return empty array
    return []
  }
}

const teamService = new TeamService()
export default teamService