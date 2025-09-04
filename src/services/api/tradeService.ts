'use client'

import { createClient } from '@/lib/supabase'

const supabase = createClient()
import type { Database } from '@/types/database'

type Trade = Database['public']['Tables']['trades']['Row']
type TradeInsert = Database['public']['Tables']['trades']['Insert']
type TradeParticipant = Database['public']['Tables']['trade_participants']['Row']
type TradeItem = Database['public']['Tables']['trade_items']['Row']

export interface CreateTradeData {
  initiatorTeamId: string
  receiverTeamId: string
  offeredPlayers: string[]
  requestedPlayers: string[]
  message?: string
}

export interface TradeProposal {
  id: string
  initiatorTeam: {
    id: string
    name: string
    user: string
  }
  receiverTeam: {
    id: string
    name: string
    user: string
  }
  offeredPlayers: Array<{
    id: string
    name: string
    position: string
    team: string
  }>
  requestedPlayers: Array<{
    id: string
    name: string
    position: string
    team: string
  }>
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  message?: string
  createdAt: string
  expiresAt: string
}

export interface TradeAnalysis {
  fairnessScore: number
  initiatorAdvantage: number
  receiverAdvantage: number
  positionBalance: {
    initiator: Record<string, number>
    receiver: Record<string, number>
  }
  valueComparison: {
    offered: number
    requested: number
    difference: number
  }
  recommendation: 'accept' | 'reject' | 'consider'
  reasoning: string[]
}

class TradeService {
  async createTrade(leagueId: string, data: CreateTradeData): Promise<{ success: boolean; tradeId?: string; error?: string }> {
    try {
      // Validate teams are in the same league
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, league_id')
        .in('id', [data.initiatorTeamId, data.receiverTeamId])

      if (teamsError) throw teamsError

      if (!teams || teams.length !== 2 || !teams.every(team => team.league_id === leagueId)) {
        return { success: false, error: 'Invalid teams for trade' }
      }

      // Validate player ownership
      const { data: playerOwnerships, error: ownershipError } = await supabase
        .from('roster_players')
        .select('player_id, team_id')
        .in('player_id', [...data.offeredPlayers, ...data.requestedPlayers])

      if (ownershipError) throw ownershipError

      // Verify offered players belong to initiator
      const offeredOwnership = playerOwnerships?.filter(p => data.offeredPlayers.includes(p.player_id))
      if (!offeredOwnership || !offeredOwnership.every(p => p.team_id === data.initiatorTeamId)) {
        return { success: false, error: 'You can only trade players you own' }
      }

      // Verify requested players belong to receiver
      const requestedOwnership = playerOwnerships?.filter(p => data.requestedPlayers.includes(p.player_id))
      if (!requestedOwnership || !requestedOwnership.every(p => p.team_id === data.receiverTeamId)) {
        return { success: false, error: 'Requested players must belong to the other team' }
      }

      // Create trade proposal
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiration

      const tradeInsert: TradeInsert = {
        league_id: leagueId,
        initiator_team_id: data.initiatorTeamId,
        receiver_team_id: data.receiverTeamId,
        status: 'pending',
        message: data.message || null,
        expires_at: expiresAt.toISOString(),
      }

      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .insert(tradeInsert)
        .select()
        .single()

      if (tradeError) throw tradeError

      // Add trade items
      const tradeItems = [
        ...data.offeredPlayers.map(playerId => ({
          trade_id: trade.id,
          player_id: playerId,
          from_team_id: data.initiatorTeamId,
          to_team_id: data.receiverTeamId,
        })),
        ...data.requestedPlayers.map(playerId => ({
          trade_id: trade.id,
          player_id: playerId,
          from_team_id: data.receiverTeamId,
          to_team_id: data.initiatorTeamId,
        }))
      ]

      const { error: itemsError } = await supabase
        .from('trade_items')
        .insert(tradeItems)

      if (itemsError) throw itemsError

      return { success: true, tradeId: trade.id }
    } catch (error) {
      console.error('Error creating trade:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create trade' 
      }
    }
  }

  async getTeamTrades(teamId: string): Promise<{ trades: TradeProposal[]; error?: string }> {
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select(`
          id,
          status,
          message,
          created_at,
          expires_at,
          initiator_team:teams!trades_initiator_team_id_fkey(
            id,
            team_name,
            users(username)
          ),
          receiver_team:teams!trades_receiver_team_id_fkey(
            id,
            team_name,
            users(username)
          ),
          trade_items(
            player_id,
            from_team_id,
            to_team_id,
            players(
              id,
              name,
              position,
              team
            )
          )
        `)
        .or(`initiator_team_id.eq.${teamId},receiver_team_id.eq.${teamId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedTrades: TradeProposal[] = (trades || []).map(trade => ({
        id: trade.id,
        initiatorTeam: {
          id: (trade.initiator_team as any).id,
          name: (trade.initiator_team as any).team_name,
          user: (trade.initiator_team as any).users.username,
        },
        receiverTeam: {
          id: (trade.receiver_team as any).id,
          name: (trade.receiver_team as any).team_name,
          user: (trade.receiver_team as any).users.username,
        },
        offeredPlayers: trade.trade_items
          .filter(item => item.from_team_id === (trade.initiator_team as any).id)
          .map(item => ({
            id: (item.players as any).id,
            name: (item.players as any).name,
            position: (item.players as any).position,
            team: (item.players as any).team,
          })),
        requestedPlayers: trade.trade_items
          .filter(item => item.from_team_id === (trade.receiver_team as any).id)
          .map(item => ({
            id: (item.players as any).id,
            name: (item.players as any).name,
            position: (item.players as any).position,
            team: (item.players as any).team,
          })),
        status: trade.status as any,
        message: trade.message || undefined,
        createdAt: trade.created_at,
        expiresAt: trade.expires_at,
      }))

      return { trades: formattedTrades }
    } catch (error) {
      console.error('Error fetching trades:', error)
      return { 
        trades: [], 
        error: error instanceof Error ? error.message : 'Failed to fetch trades' 
      }
    }
  }

  async respondToTrade(tradeId: string, response: 'accepted' | 'rejected'): Promise<{ success: boolean; error?: string }> {
    try {
      if (response === 'accepted') {
        // Execute the trade
        const success = await this.executeTrade(tradeId)
        if (!success) {
          return { success: false, error: 'Failed to execute trade' }
        }
      }

      // Update trade status
      const { error } = await supabase
        .from('trades')
        .update({ 
          status: response,
          processed_at: new Date().toISOString(),
        })
        .eq('id', tradeId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error responding to trade:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to respond to trade' 
      }
    }
  }

  private async executeTrade(tradeId: string): Promise<boolean> {
    try {
      // Get trade items
      const { data: tradeItems, error } = await supabase
        .from('trade_items')
        .select('*')
        .eq('trade_id', tradeId)

      if (error || !tradeItems) return false

      // Update roster_players for each trade item
      for (const item of tradeItems) {
        const { error: updateError } = await supabase
          .from('roster_players')
          .update({ team_id: item.to_team_id })
          .eq('player_id', item.player_id)
          .eq('team_id', item.from_team_id)

        if (updateError) {
          console.error('Error updating roster player:', updateError)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Error executing trade:', error)
      return false
    }
  }

  async analyzeTrade(
    offeredPlayers: string[], 
    requestedPlayers: string[]
  ): Promise<{ analysis: TradeAnalysis; error?: string }> {
    try {
      // Get player data and projections
      const { data: players, error } = await supabase
        .from('players')
        .select(`
          id,
          name,
          position,
          team,
          projections:player_projections(
            fantasy_points,
            adp
          )
        `)
        .in('id', [...offeredPlayers, ...requestedPlayers])

      if (error) throw error

      const offeredData = players?.filter(p => offeredPlayers.includes(p.id)) || []
      const requestedData = players?.filter(p => requestedPlayers.includes(p.id)) || []

      // Calculate values
      const offeredValue = offeredData.reduce((sum, player) => {
        const projection = (player.projections as any)?.[0]
        return sum + (projection?.fantasy_points || 0)
      }, 0)

      const requestedValue = requestedData.reduce((sum, player) => {
        const projection = (player.projections as any)?.[0]
        return sum + (projection?.fantasy_points || 0)
      }, 0)

      const valueDifference = requestedValue - offeredValue
      const fairnessScore = Math.max(0, 100 - Math.abs(valueDifference) * 2)

      // Position balance analysis
      const getPositionCounts = (playerList: any[]) => {
        return playerList.reduce((acc, player) => {
          acc[player.position] = (acc[player.position] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      const analysis: TradeAnalysis = {
        fairnessScore,
        initiatorAdvantage: Math.max(0, valueDifference),
        receiverAdvantage: Math.max(0, -valueDifference),
        positionBalance: {
          initiator: getPositionCounts(requestedData),
          receiver: getPositionCounts(offeredData),
        },
        valueComparison: {
          offered: offeredValue,
          requested: requestedValue,
          difference: valueDifference,
        },
        recommendation: fairnessScore >= 70 ? 'accept' : fairnessScore >= 40 ? 'consider' : 'reject',
        reasoning: this.generateTradeReasoning(fairnessScore, valueDifference, offeredData, requestedData),
      }

      return { analysis }
    } catch (error) {
      console.error('Error analyzing trade:', error)
      return {
        analysis: {
          fairnessScore: 50,
          initiatorAdvantage: 0,
          receiverAdvantage: 0,
          positionBalance: { initiator: {}, receiver: {} },
          valueComparison: { offered: 0, requested: 0, difference: 0 },
          recommendation: 'consider',
          reasoning: ['Unable to analyze trade due to data error'],
        },
        error: error instanceof Error ? error.message : 'Failed to analyze trade'
      }
    }
  }

  private generateTradeReasoning(
    fairnessScore: number, 
    valueDifference: number, 
    offeredData: any[], 
    requestedData: any[]
  ): string[] {
    const reasoning: string[] = []

    if (fairnessScore >= 80) {
      reasoning.push('This is a very fair trade with balanced value on both sides.')
    } else if (fairnessScore >= 60) {
      reasoning.push('This trade shows reasonable value balance.')
    } else if (fairnessScore >= 40) {
      reasoning.push('This trade has some value imbalance that should be considered.')
    } else {
      reasoning.push('This trade shows significant value imbalance.')
    }

    if (Math.abs(valueDifference) > 20) {
      const favored = valueDifference > 0 ? 'receiver' : 'initiator'
      reasoning.push(`The ${favored} appears to gain significantly more value in this trade.`)
    }

    if (offeredData.length !== requestedData.length) {
      const morePlayer = offeredData.length > requestedData.length ? 'offering' : 'receiving'
      reasoning.push(`Consider that one side is ${morePlayer} more players, which affects roster depth.`)
    }

    return reasoning
  }

  async cancelTrade(tradeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('trades')
        .update({ status: 'cancelled' })
        .eq('id', tradeId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error cancelling trade:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel trade' 
      }
    }
  }
}

const tradeService = new TradeService()
export default tradeService