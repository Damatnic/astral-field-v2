'use client'

import { createClient } from '@/lib/supabase'

const supabase = createClient()
import type { Database } from '@/types/database'

type RosterPlayer = Database['public']['Tables']['roster_players']['Row']
type LineupEntry = Database['public']['Tables']['lineup_entries']['Row']

export interface PlayerWithDetails {
  id: string
  name: string
  position: string
  nfl_team: string
  injury_status: string | null
  bye_week: number
  projections?: {
    fantasy_points: number
    adp: number | null
  }
  acquired_date: string
  acquisition_type: 'draft' | 'waiver' | 'trade' | 'free_agent'
}

export interface LineupSlot {
  position: string
  player: PlayerWithDetails | null
  isRequired: boolean
  isFlexible: boolean
}

export interface TeamRoster {
  starters: LineupSlot[]
  bench: PlayerWithDetails[]
  projectedPoints: number
  rosterStatus: {
    totalPlayers: number
    maxRoster: number
    byPosition: Record<string, number>
  }
}

export interface OptimalLineup {
  lineup: LineupSlot[]
  totalProjectedPoints: number
  improvements: Array<{
    currentPlayer: PlayerWithDetails | null
    suggestedPlayer: PlayerWithDetails
    pointsGain: number
    reason: string
  }>
}

class RosterService {
  async getTeamRoster(teamId: string, week?: number): Promise<{ roster: TeamRoster; error?: string }> {
    try {
      // Get roster players with details
      const { data: rosterData, error: rosterError } = await supabase
        .from('roster_players')
        .select(`
          *,
          players(
            id,
            name,
            position,
            nfl_team,
            injury_status,
            bye_week,
            player_projections(
              fantasy_points,
              adp
            )
          )
        `)
        .eq('team_id', teamId)

      if (rosterError) throw rosterError

      // Get current lineup if week is specified
      let lineupData: any[] = []
      if (week) {
        const { data: lineup, error: lineupError } = await supabase
          .from('lineup_entries')
          .select('*')
          .eq('team_id', teamId)
          .eq('week', week)

        if (lineupError) throw lineupError
        lineupData = lineup || []
      }

      // Transform roster data
      const players: PlayerWithDetails[] = (rosterData || []).map((rosterPlayer: any) => ({
        id: rosterPlayer.players.id,
        name: rosterPlayer.players.name,
        position: rosterPlayer.players.position,
        nfl_team: rosterPlayer.players.nfl_team,
        injury_status: rosterPlayer.players.injury_status,
        bye_week: (rosterPlayer.players as any).bye_week,
        projections: (rosterPlayer.players as any).player_projections?.[0] ? {
          fantasy_points: (rosterPlayer.players as any).player_projections[0].fantasy_points,
          adp: (rosterPlayer.players as any).player_projections[0].adp,
        } : undefined,
        acquired_date: rosterPlayer.acquired_date,
        acquisition_type: rosterPlayer.acquisition_type,
      }))

      // Get lineup configuration
      const lineupConfig = this.getLineupConfiguration()
      
      // Build current lineup
      const starters: LineupSlot[] = lineupConfig.map(slot => {
        const lineupEntry = lineupData.find(entry => entry.position_slot === slot.position)
        const player = lineupEntry ? players.find(p => p.id === lineupEntry.player_id) : null

        return {
          position: slot.position,
          player: player || null,
          isRequired: slot.isRequired,
          isFlexible: slot.isFlexible,
        }
      })

      // Get bench players (not in starting lineup)
      const starterPlayerIds = starters.map(s => s.player?.id).filter(Boolean)
      const bench = players.filter(p => !starterPlayerIds.includes(p.id))

      // Calculate projected points
      const projectedPoints = starters.reduce((total, slot) => {
        if (slot.player?.projections) {
          return total + slot.player.projections.fantasy_points
        }
        return total
      }, 0)

      // Calculate roster status
      const byPosition = players.reduce((acc, player) => {
        acc[player.position] = (acc[player.position] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const roster: TeamRoster = {
        starters,
        bench,
        projectedPoints,
        rosterStatus: {
          totalPlayers: players.length,
          maxRoster: 16, // This should come from league settings
          byPosition,
        },
      }

      return { roster }
    } catch (error) {
      console.error('Error fetching team roster:', error)
      return {
        roster: {
          starters: [],
          bench: [],
          projectedPoints: 0,
          rosterStatus: {
            totalPlayers: 0,
            maxRoster: 16,
            byPosition: {},
          },
        },
        error: error instanceof Error ? error.message : 'Failed to fetch roster'
      }
    }
  }

  async setLineup(teamId: string, week: number, lineup: Array<{position: string, playerId: string | null}>): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete existing lineup for this week
      const { error: deleteError } = await supabase
        .from('lineup_entries')
        .delete()
        .eq('team_id', teamId)
        .eq('week', week)

      if (deleteError) throw deleteError

      // Insert new lineup entries
      const lineupEntries = lineup
        .filter(entry => entry.playerId)
        .map(entry => ({
          team_id: teamId,
          week,
          player_id: entry.playerId!,
          position_slot: entry.position,
        }))

      if (lineupEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('lineup_entries')
          .insert(lineupEntries)

        if (insertError) throw insertError
      }

      return { success: true }
    } catch (error) {
      console.error('Error setting lineup:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set lineup'
      }
    }
  }

  async getOptimalLineup(teamId: string, week: number): Promise<{ lineup: OptimalLineup; error?: string }> {
    try {
      const { roster, error } = await this.getTeamRoster(teamId, week)
      if (error) throw new Error(error)

      const allPlayers = [...roster.starters.filter(s => s.player).map(s => s.player!), ...roster.bench]
      const lineupConfig = this.getLineupConfiguration()

      // Simple optimization: assign highest projected players to each position
      const optimalStarters: LineupSlot[] = []
      const usedPlayerIds = new Set<string>()
      const improvements: OptimalLineup['improvements'] = []

      for (const slot of lineupConfig) {
        let bestPlayer: PlayerWithDetails | null = null
        
        if (slot.isFlexible) {
          // For FLEX positions, consider RB, WR, TE
          const eligiblePlayers = allPlayers.filter(p => 
            ['RB', 'WR', 'TE'].includes(p.position) && 
            !usedPlayerIds.has(p.id) &&
            p.projections
          )
          bestPlayer = eligiblePlayers.sort((a, b) => 
            (b.projections?.fantasy_points || 0) - (a.projections?.fantasy_points || 0)
          )[0] || null
        } else {
          // For standard positions
          const eligiblePlayers = allPlayers.filter(p => 
            p.position === slot.position && 
            !usedPlayerIds.has(p.id) &&
            p.projections
          )
          bestPlayer = eligiblePlayers.sort((a, b) => 
            (b.projections?.fantasy_points || 0) - (a.projections?.fantasy_points || 0)
          )[0] || null
        }

        if (bestPlayer) {
          usedPlayerIds.add(bestPlayer.id)
          
          // Check if this is an improvement over current starter
          const currentSlot = roster.starters.find(s => s.position === slot.position)
          if (currentSlot?.player && currentSlot.player.id !== bestPlayer.id) {
            const pointsGain = (bestPlayer.projections?.fantasy_points || 0) - 
                             (currentSlot.player.projections?.fantasy_points || 0)
            
            if (pointsGain > 0) {
              improvements.push({
                currentPlayer: currentSlot.player,
                suggestedPlayer: bestPlayer,
                pointsGain,
                reason: `${bestPlayer.name} projected for ${pointsGain.toFixed(1)} more points`
              })
            }
          }
        }

        optimalStarters.push({
          position: slot.position,
          player: bestPlayer,
          isRequired: slot.isRequired,
          isFlexible: slot.isFlexible,
        })
      }

      const totalProjectedPoints = optimalStarters.reduce((total, slot) => {
        return total + (slot.player?.projections?.fantasy_points || 0)
      }, 0)

      const optimalLineup: OptimalLineup = {
        lineup: optimalStarters,
        totalProjectedPoints,
        improvements,
      }

      return { lineup: optimalLineup }
    } catch (error) {
      console.error('Error calculating optimal lineup:', error)
      return {
        lineup: {
          lineup: [],
          totalProjectedPoints: 0,
          improvements: [],
        },
        error: error instanceof Error ? error.message : 'Failed to calculate optimal lineup'
      }
    }
  }

  private getLineupConfiguration() {
    // Standard fantasy football lineup positions
    return [
      { position: 'QB', isRequired: true, isFlexible: false },
      { position: 'RB', isRequired: true, isFlexible: false },
      { position: 'RB', isRequired: true, isFlexible: false },
      { position: 'WR', isRequired: true, isFlexible: false },
      { position: 'WR', isRequired: true, isFlexible: false },
      { position: 'TE', isRequired: true, isFlexible: false },
      { position: 'FLEX', isRequired: true, isFlexible: true }, // RB/WR/TE
      { position: 'D/ST', isRequired: true, isFlexible: false },
      { position: 'K', isRequired: true, isFlexible: false },
    ]
  }

  async addPlayer(teamId: string, playerId: string, acquisitionType: 'waiver' | 'free_agent' = 'free_agent'): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if player is available
      const { data: existingRoster, error: checkError } = await supabase
        .from('roster_players')
        .select('id')
        .eq('player_id', playerId)

      if (checkError) throw checkError

      if (existingRoster && existingRoster.length > 0) {
        return { success: false, error: 'Player is already on a roster' }
      }

      // Add player to roster
      const { error: insertError } = await supabase
        .from('roster_players')
        .insert({
          team_id: teamId,
          player_id: playerId,
          acquisition_type: acquisitionType,
          acquired_date: new Date().toISOString(),
        })

      if (insertError) throw insertError

      return { success: true }
    } catch (error) {
      console.error('Error adding player:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add player'
      }
    }
  }

  async dropPlayer(teamId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove from roster
      const { error: deleteError } = await supabase
        .from('roster_players')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId)

      if (deleteError) throw deleteError

      // Remove from any lineups
      const { error: lineupError } = await supabase
        .from('lineup_entries')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId)

      if (lineupError) throw lineupError

      return { success: true }
    } catch (error) {
      console.error('Error dropping player:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to drop player'
      }
    }
  }
}

const rosterService = new RosterService()
export default rosterService