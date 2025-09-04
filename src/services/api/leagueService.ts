import { createClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type League = Database['public']['Tables']['leagues']['Row']
type LeagueInsert = Database['public']['Tables']['leagues']['Insert']
type LeagueUpdate = Database['public']['Tables']['leagues']['Update']
type Team = Database['public']['Tables']['teams']['Row']

export interface LeagueSettings {
  rosterSize: number
  startingLineup: {
    QB: number
    RB: number
    WR: number
    TE: number
    FLEX: number
    DST: number
    K: number
    BENCH: number
  }
  waiverType: 'FAAB' | 'Rolling' | 'Reverse'
  tradeDeadline: string
  playoffWeeks: number[]
  maxTeams: number
}

export interface ScoringSystem {
  passing: {
    yards: number
    touchdowns: number
    interceptions: number
  }
  rushing: {
    yards: number
    touchdowns: number
  }
  receiving: {
    yards: number
    touchdowns: number
    receptions: number
  }
  kicking: {
    fieldGoals: {
      '0-39': number
      '40-49': number
      '50+': number
    }
    extraPoints: number
  }
  defense: {
    touchdown: number
    interception: number
    fumbleRecovery: number
    sack: number
    safety: number
    pointsAllowed: {
      '0': number
      '1-6': number
      '7-13': number
      '14-20': number
      '21-27': number
      '28-34': number
      '35+': number
    }
  }
}

export interface CreateLeagueData {
  name: string
  settings: LeagueSettings
  scoringSystem: ScoringSystem
  draftDate?: string
  seasonYear: number
}

export interface LeagueResponse {
  league: League | null
  error: string | null
}

export interface LeaguesResponse {
  leagues: League[]
  error: string | null
}

export interface TeamsResponse {
  teams: Team[]
  error: string | null
}

class LeagueService {
  private supabase = createClient()

  async createLeague(userId: string, data: CreateLeagueData): Promise<LeagueResponse> {
    try {
      const leagueInsert: LeagueInsert = {
        name: data.name,
        commissioner_id: userId,
        settings: data.settings as any,
        scoring_system: data.scoringSystem as any,
        draft_date: data.draftDate || null,
        season_year: data.seasonYear,
      }

      const { data: league, error } = await this.supabase
        .from('leagues')
        .insert(leagueInsert as any)
        .select()
        .single()

      if (error) throw error

      return { league, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create league'
      return { league: null, error: message }
    }
  }

  async getUserLeagues(userId: string): Promise<LeaguesResponse> {
    try {
      // Get leagues where user is commissioner or has a team
      const { data: leagues, error } = await this.supabase
        .from('leagues')
        .select(`
          *,
          teams!inner(user_id)
        `)
        .or(`commissioner_id.eq.${userId},teams.user_id.eq.${userId}`)

      if (error) throw error

      return { leagues: leagues || [], error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch leagues'
      return { leagues: [], error: message }
    }
  }

  async getLeagueById(leagueId: string): Promise<LeagueResponse> {
    try {
      const { data: league, error } = await this.supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single()

      if (error) throw error

      return { league, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch league'
      return { league: null, error: message }
    }
  }

  async updateLeague(leagueId: string, updates: LeagueUpdate): Promise<LeagueResponse> {
    try {
      const { data: league, error } = await (this.supabase as any)
        .from('leagues')
        .update(updates)
        .eq('id', leagueId)
        .select()
        .single()

      if (error) throw error

      return { league, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update league'
      return { league: null, error: message }
    }
  }

  async deleteLeague(leagueId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId)

      if (error) throw error

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete league'
      return { error: message }
    }
  }

  async joinLeague(leagueId: string, userId: string, teamName: string): Promise<{ error: string | null }> {
    try {
      // Check if league has space
      const { data: teams, error: teamsError } = await this.supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)

      if (teamsError) throw teamsError

      const { data: league, error: leagueError } = await this.supabase
        .from('leagues')
        .select('settings')
        .eq('id', leagueId)
        .single()

      if (leagueError) throw leagueError

      const settings = (league as any).settings as LeagueSettings
      if (teams && teams.length >= settings.maxTeams) {
        throw new Error('League is full')
      }

      // Check if user already has a team in this league
      const existingTeam = teams?.find((team: any) => team.user_id === userId)
      if (existingTeam) {
        throw new Error('You already have a team in this league')
      }

      // Create team
      const { error: insertError } = await (this.supabase as any)
        .from('teams')
        .insert({
          league_id: leagueId,
          user_id: userId,
          team_name: teamName,
          waiver_priority: (teams?.length || 0) + 1,
        })

      if (insertError) throw insertError

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to join league'
      return { error: message }
    }
  }

  async getLeagueTeams(leagueId: string): Promise<TeamsResponse> {
    try {
      const { data: teams, error } = await this.supabase
        .from('teams')
        .select(`
          *,
          users!inner(username, email, avatar_url)
        `)
        .eq('league_id', leagueId)
        .order('draft_position', { nullsFirst: false })

      if (error) throw error

      return { teams: teams || [], error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch teams'
      return { teams: [], error: message }
    }
  }

  async leaveLeague(leagueId: string, userId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase
        .from('teams')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', userId)

      if (error) throw error

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to leave league'
      return { error: message }
    }
  }

  getDefaultSettings(): LeagueSettings {
    return {
      rosterSize: 16,
      startingLineup: {
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        FLEX: 1,
        DST: 1,
        K: 1,
        BENCH: 6,
      },
      waiverType: 'FAAB',
      tradeDeadline: '2024-11-19',
      playoffWeeks: [15, 16, 17],
      maxTeams: 12,
    }
  }

  getDefaultScoringSystem(): ScoringSystem {
    return {
      passing: {
        yards: 0.04,
        touchdowns: 4,
        interceptions: -2,
      },
      rushing: {
        yards: 0.1,
        touchdowns: 6,
      },
      receiving: {
        yards: 0.1,
        touchdowns: 6,
        receptions: 1, // PPR
      },
      kicking: {
        fieldGoals: {
          '0-39': 3,
          '40-49': 4,
          '50+': 5,
        },
        extraPoints: 1,
      },
      defense: {
        touchdown: 6,
        interception: 2,
        fumbleRecovery: 2,
        sack: 1,
        safety: 2,
        pointsAllowed: {
          '0': 10,
          '1-6': 7,
          '7-13': 4,
          '14-20': 1,
          '21-27': 0,
          '28-34': -1,
          '35+': -4,
        },
      },
    }
  }
}

const leagueService = new LeagueService()
export default leagueService