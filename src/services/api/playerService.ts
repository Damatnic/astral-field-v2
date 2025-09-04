import { createClient } from '@/lib/supabase'
import type { Database } from '@/types/database'
import sportsDataService from '@/services/external/sportsDataService'

type Player = Database['public']['Tables']['players']['Row']
type PlayerInsert = Database['public']['Tables']['players']['Insert']

export interface PlayerStats {
  week: number
  season: number
  passingYards?: number
  passingTDs?: number
  passingINTs?: number
  rushingYards?: number
  rushingTDs?: number
  receivingYards?: number
  receivingTDs?: number
  receptions?: number
  fantasyPoints: number
}

export interface PlayerProjections {
  season: number
  passingYards?: number
  passingTDs?: number
  rushingYards?: number
  rushingTDs?: number
  receivingYards?: number
  receivingTDs?: number
  receptions?: number
  projectedPoints: number
  confidence: number
}

export interface PlayerResponse {
  player: Player | null
  error: string | null
}

export interface PlayersResponse {
  players: Player[]
  total: number
  error: string | null
}

export interface PlayerFilters {
  position?: string
  team?: string
  search?: string
  available?: boolean
  leagueId?: string
}

export interface PlayerSortOptions {
  field: 'name' | 'position' | 'team' | 'projectedPoints' | 'fantasyPoints'
  direction: 'asc' | 'desc'
}

class PlayerService {
  private supabase = createClient()

  async getPlayers(
    filters: PlayerFilters = {},
    sort: PlayerSortOptions = { field: 'name', direction: 'asc' },
    limit: number = 50,
    offset: number = 0
  ): Promise<PlayersResponse> {
    try {
      let query = this.supabase
        .from('players')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters.position) {
        query = query.eq('position', filters.position)
      }

      if (filters.team) {
        query = query.eq('nfl_team', filters.team)
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      // Apply sorting
      const ascending = sort.direction === 'asc'
      if (sort.field === 'projectedPoints' || sort.field === 'fantasyPoints') {
        // For JSON fields, we'd need custom sorting logic
        query = query.order('name', { ascending })
      } else {
        query = query.order(sort.field, { ascending })
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data: players, error, count } = await query

      if (error) throw error

      return { players: players || [], total: count || 0, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch players'
      return { players: [], total: 0, error: message }
    }
  }

  async getPlayerById(playerId: string): Promise<PlayerResponse> {
    try {
      const { data: player, error } = await this.supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (error) throw error

      return { player, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch player'
      return { player: null, error: message }
    }
  }

  async searchPlayers(searchTerm: string, limit: number = 20): Promise<PlayersResponse> {
    try {
      const { data: players, error } = await this.supabase
        .from('players')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,nfl_team.ilike.%${searchTerm}%`)
        .limit(limit)
        .order('name')

      if (error) throw error

      return { players: players || [], total: players?.length || 0, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to search players'
      return { players: [], total: 0, error: message }
    }
  }

  async getPlayersByPosition(position: string): Promise<PlayersResponse> {
    return this.getPlayers({ position }, { field: 'name', direction: 'asc' }, 100)
  }

  async getAvailablePlayers(leagueId: string, filters: PlayerFilters = {}): Promise<PlayersResponse> {
    try {
      // This would require a more complex query to exclude players already on teams
      // For now, return all players with the filter applied
      return this.getPlayers({ ...filters, available: true, leagueId })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch available players'
      return { players: [], total: 0, error: message }
    }
  }

  async createPlayer(playerData: PlayerInsert): Promise<PlayerResponse> {
    try {
      const { data: player, error } = await this.supabase
        .from('players')
        .insert(playerData as any)
        .select()
        .single()

      if (error) throw error

      return { player, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create player'
      return { player: null, error: message }
    }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<PlayerResponse> {
    try {
      const { data: player, error } = await (this.supabase as any)
        .from('players')
        .update(updates)
        .eq('id', playerId)
        .select()
        .single()

      if (error) throw error

      return { player, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update player'
      return { player: null, error: message }
    }
  }

  async updatePlayerStats(playerId: string, stats: PlayerStats): Promise<PlayerResponse> {
    try {
      const { data: player, error } = await (this.supabase as any)
        .from('players')
        .update({
          stats: stats,
          updated_at: new Date().toISOString(),
        })
        .eq('id', playerId)
        .select()
        .single()

      if (error) throw error

      return { player, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update player stats'
      return { player: null, error: message }
    }
  }

  async updatePlayerProjections(playerId: string, projections: PlayerProjections): Promise<PlayerResponse> {
    try {
      const { data: player, error } = await (this.supabase as any)
        .from('players')
        .update({
          projections: projections,
          updated_at: new Date().toISOString(),
        })
        .eq('id', playerId)
        .select()
        .single()

      if (error) throw error

      return { player, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update player projections'
      return { player: null, error: message }
    }
  }

  getPositionDisplayName(position: string): string {
    const positionMap: Record<string, string> = {
      'QB': 'Quarterback',
      'RB': 'Running Back',
      'WR': 'Wide Receiver',
      'TE': 'Tight End',
      'K': 'Kicker',
      'DST': 'Defense/ST',
    }
    return positionMap[position] || position
  }

  getPositionColor(position: string): string {
    const colorMap: Record<string, string> = {
      'QB': 'text-red-400',
      'RB': 'text-green-400',
      'WR': 'text-blue-400',
      'TE': 'text-yellow-400',
      'K': 'text-purple-400',
      'DST': 'text-gray-400',
    }
    return colorMap[position] || 'text-gray-400'
  }

  async syncPlayersFromSportsData(): Promise<{ synced: number; error: string | null }> {
    try {
      console.log('Starting player data sync from SportsDataIO...')
      
      const transformedPlayers = await sportsDataService.syncPlayersToDatabase()
      let syncedCount = 0

      for (const playerData of transformedPlayers) {
        try {
          // Check if player already exists by external_id
          const { data: existingPlayer } = await this.supabase
            .from('players')
            .select('id')
            .eq('name', playerData.name)
            .single()

          const playerInsert: PlayerInsert = {
            name: playerData.name,
            position: playerData.position,
            nfl_team: playerData.nfl_team,
            bye_week: playerData.bye_week || 0,
            injury_status: playerData.injury_status,
            stats: playerData.stats,
            projections: playerData.projections,
          }

          if (existingPlayer) {
            // Update existing player
            await (this.supabase as any)
              .from('players')
              .update({
                nfl_team: playerData.nfl_team,
                bye_week: playerData.bye_week || 0,
                injury_status: playerData.injury_status,
                stats: playerData.stats,
                projections: playerData.projections,
                updated_at: new Date().toISOString(),
              })
              .eq('id', (existingPlayer as any).id)
          } else {
            // Create new player
            await this.createPlayer(playerInsert)
          }
          
          syncedCount++
        } catch (playerError) {
          console.warn(`Failed to sync player ${playerData.name}:`, playerError)
          // Continue with other players
        }
      }

      console.log(`Successfully synced ${syncedCount} players`)
      return { synced: syncedCount, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sync players from SportsData'
      console.error('Player sync error:', message)
      return { synced: 0, error: message }
    }
  }

  async initializeSamplePlayers(): Promise<{ error: string | null }> {
    // Try to sync from SportsDataIO first
    const { synced, error: syncError } = await this.syncPlayersFromSportsData()
    
    if (syncError || synced === 0) {
      console.log('SportsData sync failed, using sample data...')
      
      try {
        const samplePlayers: PlayerInsert[] = [
          {
            name: 'Josh Allen',
            position: 'QB',
            nfl_team: 'BUF',
            bye_week: 12,
            injury_status: 'Healthy',
            stats: {
              season: 2024,
              passingYards: 3200,
              passingTDs: 28,
              passingINTs: 12,
              rushingYards: 450,
              rushingTDs: 8,
              fantasyPoints: 285.5
            },
            projections: {
              season: 2024,
              passingYards: 4100,
              passingTDs: 35,
              rushingYards: 600,
              rushingTDs: 10,
              projectedPoints: 385,
              confidence: 0.85
            }
          },
          {
            name: 'Christian McCaffrey',
            position: 'RB',
            nfl_team: 'SF',
            bye_week: 9,
            injury_status: 'Healthy',
            stats: {
              season: 2024,
              rushingYards: 1150,
              rushingTDs: 12,
              receivingYards: 380,
              receivingTDs: 3,
              receptions: 42,
              fantasyPoints: 245.8
            },
            projections: {
              season: 2024,
              rushingYards: 1400,
              rushingTDs: 15,
              receivingYards: 450,
              receivingTDs: 4,
              receptions: 55,
              projectedPoints: 295,
              confidence: 0.82
            }
          }
        ]

        for (const player of samplePlayers) {
          await this.createPlayer(player)
        }

        return { error: null }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to initialize sample players'
        return { error: message }
      }
    }
    
    return { error: null }
  }
}

const playerService = new PlayerService()
export default playerService