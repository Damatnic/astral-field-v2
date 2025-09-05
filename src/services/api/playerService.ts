// @ts-nocheck
import { neonServerless } from '@/lib/neon-serverless'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Player = Tables<'players'>
export type PlayerInsert = TablesInsert<'players'>
export type PlayerUpdate = TablesUpdate<'players'>
export type PlayerProjection = Tables<'player_projections'>
export type PlayerStat = Tables<'player_stats'>

export interface PlayerStats {
  season: number
  week: number
  passingYards: number
  passingTDs: number
  passingINTs: number
  rushingYards: number
  rushingTDs: number
  receivingYards: number
  receivingTDs: number
  receptions: number
  fantasyPoints: number
}

export interface PlayerProjections {
  season: number
  week?: number
  fantasyPoints: number
  adp?: number
  confidence: number
  projectedStats: Record<string, number>
}

export interface PlayerResponse {
  player: Player | null
  error: string | null
}

export interface PlayersResponse {
  players: Player[]
  error: string | null
}

export interface PlayerWithProjections {
  id: string
  name: string
  position: string
  nfl_team: string
  injury_status?: string | null
  bye_week?: number
  created_at?: string
  updated_at?: string
  projections?: PlayerProjection[]
  stats?: PlayerStat[]
}

export class PlayerService {
  async getPlayer(playerId: string): Promise<PlayerResponse> {
    try {
      const result = await neonServerless.selectSingle('players', {
        eq: { id: playerId }
      })

      if (result.error) throw result.error

      return { player: result.data, error: null }
    } catch (error: any) {
      console.error('Get player error:', error)
      return { player: null, error: error.message || 'Failed to get player' }
    }
  }

  async getPlayerWithDetails(playerId: string): Promise<{ player: PlayerWithProjections | null; error: string | null }> {
    try {
      const result = await neonServerless.selectWithJoins('players', `
        *,
        player_projections (*),
        player_stats (*)
      `, {
        eq: { id: playerId }
      })

      if (result.error) throw result.error
      if (!result.data || result.data.length === 0) {
        return { player: null, error: 'Player not found' }
      }

      return { player: result.data[0], error: null }
    } catch (error: any) {
      console.error('Get player with details error:', error)
      return { player: null, error: error.message || 'Failed to get player details' }
    }
  }

  async getPlayers(options?: {
    position?: string
    team?: string
    limit?: number
    search?: string
  }): Promise<PlayersResponse> {
    try {
      const queryOptions: any = {}
      
      if (options?.position) {
        queryOptions.eq = { ...queryOptions.eq, position: options.position }
      }
      
      if (options?.team) {
        queryOptions.eq = { ...queryOptions.eq, nfl_team: options.team }
      }

      if (options?.limit) {
        queryOptions.limit = options.limit
      }

      // Add ordering by name
      queryOptions.order = { column: 'name', ascending: true }

      const result = await neonServerless.select('players', queryOptions)

      if (result.error) throw result.error

      let players = result.data || []

      // Filter by search term if provided
      if (options?.search) {
        const searchTerm = options.search.toLowerCase()
        players = players.filter(player => 
          player.name.toLowerCase().includes(searchTerm) ||
          player.position.toLowerCase().includes(searchTerm) ||
          player.nfl_team.toLowerCase().includes(searchTerm)
        )
      }

      return { players, error: null }
    } catch (error: any) {
      console.error('Get players error:', error)
      return { players: [], error: error.message || 'Failed to get players' }
    }
  }

  async createPlayer(playerData: PlayerInsert): Promise<PlayerResponse> {
    try {
      const result = await neonServerless.insert('players', playerData)
      
      if (result.error) throw result.error

      return { player: result.data, error: null }
    } catch (error: any) {
      console.error('Create player error:', error)
      return { player: null, error: error.message || 'Failed to create player' }
    }
  }

  async updatePlayer(playerId: string, updates: PlayerUpdate): Promise<PlayerResponse> {
    try {
      const result = await neonServerless.update('players', updates, { id: playerId })
      
      if (result.error) throw result.error

      return { player: result.data, error: null }
    } catch (error: any) {
      console.error('Update player error:', error)
      return { player: null, error: error.message || 'Failed to update player' }
    }
  }

  async updatePlayerStats(playerId: string, stats: PlayerStats): Promise<PlayerResponse> {
    try {
      // First insert the stats
      const statsResult = await neonServerless.insert('player_stats', {
        player_id: playerId,
        season_year: stats.season,
        week: stats.week,
        game_stats: stats as any, // Convert to JSON
        fantasy_points: stats.fantasyPoints
      })

      if (statsResult.error) throw statsResult.error

      // Then update the player's stats JSON field
      const playerResult = await neonServerless.update('players', {
        stats: stats as any,
        updated_at: new Date().toISOString(),
      }, { id: playerId })

      if (playerResult.error) throw playerResult.error

      return { player: playerResult.data, error: null }
    } catch (error: any) {
      console.error('Update player stats error:', error)
      return { player: null, error: error.message || 'Failed to update player stats' }
    }
  }

  async updatePlayerProjections(playerId: string, projections: PlayerProjections): Promise<PlayerResponse> {
    try {
      // First insert/update the projections
      const projectionsResult = await neonServerless.insert('player_projections', {
        player_id: playerId,
        season_year: projections.season,
        week: projections.week || null,
        fantasy_points: projections.fantasyPoints,
        adp: projections.adp || null,
        projected_stats: projections.projectedStats as any,
        confidence: projections.confidence
      })

      if (projectionsResult.error) throw projectionsResult.error

      // Then update the player's projections JSON field
      const playerResult = await neonServerless.update('players', {
        projections: projections as any,
        updated_at: new Date().toISOString(),
      }, { id: playerId })

      if (playerResult.error) throw playerResult.error

      return { player: playerResult.data, error: null }
    } catch (error: any) {
      console.error('Update player projections error:', error)
      return { player: null, error: error.message || 'Failed to update player projections' }
    }
  }

  async getPlayersByPosition(position: string, limit = 50): Promise<PlayersResponse> {
    return this.getPlayers({ position, limit })
  }

  async searchPlayers(query: string, limit = 20): Promise<PlayersResponse> {
    return this.getPlayers({ search: query, limit })
  }

  async getTopPlayers(limit = 100): Promise<PlayersResponse> {
    try {
      const result = await neonServerless.selectWithJoins('players', `
        *,
        player_projections!inner(fantasy_points)
      `, {
        order: { column: 'player_projections.fantasy_points', ascending: false },
        limit
      })

      if (result.error) throw result.error

      return { players: result.data || [], error: null }
    } catch (error: any) {
      console.error('Get top players error:', error)
      return { players: [], error: error.message || 'Failed to get top players' }
    }
  }

  async syncPlayersFromExternal(playersData: any[]): Promise<{ success: number; failed: number; error: string | null }> {
    let success = 0
    let failed = 0

    try {
      for (const playerData of playersData) {
        try {
          const playerInsert: PlayerInsert = {
            name: playerData.name,
            position: playerData.position,
            nfl_team: playerData.nfl_team,
            injury_status: playerData.injury_status || null,
            bye_week: playerData.bye_week || 0,
            stats: playerData.stats || null,
            projections: playerData.projections || null,
          }

          // Check if player exists
          const existingResult = await neonServerless.selectSingle('players', {
            eq: { name: playerData.name, nfl_team: playerData.nfl_team }
          })

          if (existingResult.data) {
            // Update existing player
            await neonServerless.update('players', {
              nfl_team: playerData.nfl_team,
              bye_week: playerData.bye_week || 0,
              injury_status: playerData.injury_status || null,
              stats: playerData.stats || null,
              projections: playerData.projections || null,
              updated_at: new Date().toISOString(),
            }, { id: existingResult.data.id })
          } else {
            // Create new player
            await this.createPlayer(playerInsert)
          }
          
          success++
        } catch (error) {
          console.error(`Failed to sync player ${playerData.name}:`, error)
          failed++
        }
      }

      return { success, failed, error: null }
    } catch (error: any) {
      console.error('Sync players error:', error)
      return { success, failed, error: error.message || 'Failed to sync players' }
    }
  }

  // Utility methods
  getPositionColor(position: string): string {
    const colors: Record<string, string> = {
      QB: 'text-red-400',
      RB: 'text-green-400',
      WR: 'text-blue-400',
      TE: 'text-yellow-400',
      K: 'text-orange-400',
      DST: 'text-purple-400'
    }
    return colors[position] || 'text-gray-400'
  }

  getPositionPriority(position: string): number {
    const priorities: Record<string, number> = {
      QB: 1,
      RB: 2,
      WR: 3,
      TE: 4,
      K: 5,
      DST: 6
    }
    return priorities[position] || 7
  }

  formatPlayerName(player: Player): string {
    return `${player.name} (${player.position} - ${player.nfl_team})`
  }
}

export default new PlayerService()