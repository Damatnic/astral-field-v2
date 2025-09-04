'use client'

import { createClient } from '@/lib/supabase'

const supabase = createClient()
import type { Database } from '@/types/database'

export interface WaiverClaim {
  id: string
  teamId: string
  teamName: string
  playerId: string
  playerName: string
  playerPosition: string
  playerTeam: string
  dropPlayerId?: string
  dropPlayerName?: string
  bidAmount: number
  priority: number
  status: 'pending' | 'processed' | 'successful' | 'failed'
  processedAt?: string
  createdAt: string
}

export interface WaiverPlayer {
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
  isOnWaivers: boolean
  claimDeadline?: string
  claimsCount: number
}

export interface CreateWaiverClaimData {
  playerId: string
  dropPlayerId?: string
  bidAmount: number
}

class WaiverService {
  async getWaiverPlayers(leagueId: string): Promise<{ players: WaiverPlayer[]; error?: string }> {
    try {
      // Get available players (not on any roster in this league)
      const { data: players, error } = await supabase
        .from('players')
        .select(`
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
        `)
        .not('id', 'in', `(
          SELECT DISTINCT rp.player_id 
          FROM roster_players rp 
          INNER JOIN teams t ON rp.team_id = t.id 
          WHERE t.league_id = '${leagueId}'
        )`)

      if (error) throw error

      // Get claim counts for each player
      const playerIds = players?.map(p => p.id) || []
      const { data: claimCounts } = await supabase
        .from('waiver_claims')
        .select('player_id')
        .in('player_id', playerIds)
        .eq('status', 'pending')

      const claimCountMap = (claimCounts || []).reduce((acc, claim) => {
        acc[claim.player_id] = (acc[claim.player_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const waiverPlayers: WaiverPlayer[] = (players || []).map(player => ({
        id: player.id,
        name: player.name,
        position: player.position,
        nfl_team: player.nfl_team,
        injury_status: player.injury_status,
        bye_week: player.bye_week,
        projections: (player.player_projections as any)?.[0] ? {
          fantasy_points: (player.player_projections as any)[0].fantasy_points,
          adp: (player.player_projections as any)[0].adp,
        } : undefined,
        isOnWaivers: true,
        claimsCount: claimCountMap[player.id] || 0,
      }))

      return { players: waiverPlayers }
    } catch (error) {
      console.error('Error fetching waiver players:', error)
      return {
        players: [],
        error: error instanceof Error ? error.message : 'Failed to fetch waiver players'
      }
    }
  }

  async getTeamWaiverClaims(teamId: string): Promise<{ claims: WaiverClaim[]; error?: string }> {
    try {
      const { data: claims, error } = await supabase
        .from('waiver_claims')
        .select(`
          *,
          teams(team_name),
          add_player:players!waiver_claims_player_id_fkey(
            name,
            position,
            nfl_team
          ),
          drop_player:players!waiver_claims_drop_player_id_fkey(
            name,
            position,
            nfl_team
          )
        `)
        .eq('team_id', teamId)
        .order('priority', { ascending: true })

      if (error) throw error

      const formattedClaims: WaiverClaim[] = (claims || []).map(claim => ({
        id: claim.id,
        teamId: claim.team_id,
        teamName: (claim.teams as any).team_name,
        playerId: claim.player_id,
        playerName: (claim.add_player as any).name,
        playerPosition: (claim.add_player as any).position,
        playerTeam: (claim.add_player as any).nfl_team,
        dropPlayerId: claim.drop_player_id || undefined,
        dropPlayerName: claim.drop_player_id ? (claim.drop_player as any)?.name : undefined,
        bidAmount: claim.bid_amount || 0,
        priority: claim.priority,
        status: claim.status as any,
        processedAt: claim.processed_at || undefined,
        createdAt: claim.created_at,
      }))

      return { claims: formattedClaims }
    } catch (error) {
      console.error('Error fetching waiver claims:', error)
      return {
        claims: [],
        error: error instanceof Error ? error.message : 'Failed to fetch waiver claims'
      }
    }
  }

  async submitWaiverClaim(teamId: string, data: CreateWaiverClaimData): Promise<{ success: boolean; error?: string }> {
    try {
      // Get team's current waiver priority
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('waiver_priority')
        .eq('id', teamId)
        .single()

      if (teamError) throw teamError

      // Check if player is available
      const { data: existingRoster, error: rosterError } = await supabase
        .from('roster_players')
        .select('id')
        .eq('player_id', data.playerId)

      if (rosterError) throw rosterError

      if (existingRoster && existingRoster.length > 0) {
        return { success: false, error: 'Player is already on a roster' }
      }

      // Check for existing claim on this player by this team
      const { data: existingClaim, error: claimError } = await supabase
        .from('waiver_claims')
        .select('id')
        .eq('team_id', teamId)
        .eq('player_id', data.playerId)
        .eq('status', 'pending')

      if (claimError) throw claimError

      if (existingClaim && existingClaim.length > 0) {
        return { success: false, error: 'You already have a pending claim on this player' }
      }

      // Validate drop player if specified
      if (data.dropPlayerId) {
        const { data: ownedPlayer, error: ownedError } = await supabase
          .from('roster_players')
          .select('id')
          .eq('team_id', teamId)
          .eq('player_id', data.dropPlayerId)

        if (ownedError) throw ownedError

        if (!ownedPlayer || ownedPlayer.length === 0) {
          return { success: false, error: 'You can only drop players you own' }
        }
      }

      // Create waiver claim
      const { error: insertError } = await supabase
        .from('waiver_claims')
        .insert({
          team_id: teamId,
          player_id: data.playerId,
          drop_player_id: data.dropPlayerId || null,
          bid_amount: data.bidAmount,
          priority: team.waiver_priority,
          status: 'pending',
        })

      if (insertError) throw insertError

      return { success: true }
    } catch (error) {
      console.error('Error submitting waiver claim:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit waiver claim'
      }
    }
  }

  async cancelWaiverClaim(claimId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('waiver_claims')
        .delete()
        .eq('id', claimId)
        .eq('status', 'pending')

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error cancelling waiver claim:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel waiver claim'
      }
    }
  }

  async processWaivers(leagueId: string): Promise<{ success: boolean; processed: number; error?: string }> {
    try {
      // Get all pending waiver claims for this league, ordered by priority and bid amount
      const { data: claims, error: claimsError } = await supabase
        .from('waiver_claims')
        .select(`
          *,
          teams!inner(league_id, team_name, waiver_priority)
        `)
        .eq('teams.league_id', leagueId)
        .eq('status', 'pending')
        .order('priority', { ascending: true })
        .order('bid_amount', { ascending: false })

      if (claimsError) throw claimsError

      let processedCount = 0
      const processedPlayerIds = new Set<string>()

      for (const claim of claims || []) {
        // Skip if player has already been claimed in this processing cycle
        if (processedPlayerIds.has(claim.player_id)) {
          await supabase
            .from('waiver_claims')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', claim.id)
          continue
        }

        try {
          // Check if player is still available
          const { data: existingRoster } = await supabase
            .from('roster_players')
            .select('id')
            .eq('player_id', claim.player_id)

          if (existingRoster && existingRoster.length > 0) {
            // Player no longer available
            await supabase
              .from('waiver_claims')
              .update({
                status: 'failed',
                processed_at: new Date().toISOString(),
              })
              .eq('id', claim.id)
            continue
          }

          // Process the claim
          if (claim.drop_player_id) {
            // Drop player first
            await supabase
              .from('roster_players')
              .delete()
              .eq('team_id', claim.team_id)
              .eq('player_id', claim.drop_player_id)
          }

          // Add new player
          await supabase
            .from('roster_players')
            .insert({
              team_id: claim.team_id,
              player_id: claim.player_id,
              acquisition_type: 'waiver',
              acquired_date: new Date().toISOString(),
            })

          // Mark claim as successful
          await supabase
            .from('waiver_claims')
            .update({
              status: 'successful',
              processed_at: new Date().toISOString(),
            })
            .eq('id', claim.id)

          // Move team to back of waiver order
          await supabase
            .from('teams')
            .update({
              waiver_priority: 999, // Will be reset later to maintain order
            })
            .eq('id', claim.team_id)

          processedPlayerIds.add(claim.player_id)
          processedCount++
        } catch (error) {
          // Mark claim as failed
          await supabase
            .from('waiver_claims')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', claim.id)
        }
      }

      // Reset waiver priorities to maintain proper order
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId)
        .order('waiver_priority')

      if (allTeams) {
        for (let i = 0; i < allTeams.length; i++) {
          await supabase
            .from('teams')
            .update({ waiver_priority: i + 1 })
            .eq('id', allTeams[i].id)
        }
      }

      return { success: true, processed: processedCount }
    } catch (error) {
      console.error('Error processing waivers:', error)
      return {
        success: false,
        processed: 0,
        error: error instanceof Error ? error.message : 'Failed to process waivers'
      }
    }
  }

  async getTeamFAABBudget(teamId: string): Promise<{ budget: number; spent: number; remaining: number; error?: string }> {
    try {
      // Get total FAAB budget from league settings (assume $100 default)
      const totalBudget = 100

      // Calculate spent amount from successful waiver claims
      const { data: claims, error } = await supabase
        .from('waiver_claims')
        .select('bid_amount')
        .eq('team_id', teamId)
        .eq('status', 'successful')

      if (error) throw error

      const spent = (claims || []).reduce((total, claim) => total + (claim.bid_amount || 0), 0)
      const remaining = totalBudget - spent

      return {
        budget: totalBudget,
        spent,
        remaining,
      }
    } catch (error) {
      console.error('Error fetching FAAB budget:', error)
      return {
        budget: 100,
        spent: 0,
        remaining: 100,
        error: error instanceof Error ? error.message : 'Failed to fetch budget'
      }
    }
  }
}

const waiverService = new WaiverService()
export default waiverService