import { neonServerless } from '@/lib/neon-serverless'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type League = Tables<'leagues'>
export type LeagueInsert = TablesInsert<'leagues'>
export type LeagueUpdate = TablesUpdate<'leagues'>
export type Team = Tables<'teams'>
export type User = Tables<'users'>

export interface LeagueSettings {
  maxTeams: number
  rounds: number
  playoffTeams: number
  playoffWeeks: number
  regularSeasonWeeks: number
  tradeDeadline: string
  waiverPeriod: number
  draftType: 'snake' | 'linear'
  draftOrder: string[]
  benchSlots: number
  startingLineup: {
    QB: number
    RB: number
    WR: number
    TE: number
    FLEX: number
    K: number
    DST: number
  }
}

export interface ScoringSystem {
  passingYards: number
  passingTD: number
  passingINT: number
  rushingYards: number
  rushingTD: number
  receivingYards: number
  receivingTD: number
  receptions: number
  fumblesLost: number
  kickingFG: number
  kickingXP: number
  defenseINT: number
  defenseFumble: number
  defenseSack: number
  defenseTD: number
  defenseYardsAllowed: number
  defensePointsAllowed: number
}

export interface CreateLeagueData {
  name: string
  settings: LeagueSettings
  scoringSystem: ScoringSystem
  draftDate?: string
  seasonYear?: number
}

export interface LeagueResponse {
  league: League | null
  error: string | null
}

export interface LeaguesResponse {
  leagues: League[]
  error: string | null
}

export interface LeagueWithTeams extends League {
  teams: (Team & { users: User })[]
}

export interface TeamResponse {
  team: Team | null
  error: string | null
}

export interface TeamsResponse {
  teams: (Team & { users: User })[]
  error: string | null
}

export class LeagueService {
  async createLeague(userId: string, data: CreateLeagueData): Promise<LeagueResponse> {
    try {
      const leagueInsert: LeagueInsert = {
        name: data.name,
        commissioner_id: userId,
        settings: data.settings as any,
        scoring_system: data.scoringSystem as any,
        draft_date: data.draftDate || null,
        season_year: data.seasonYear || new Date().getFullYear(),
      }

      const result = await db.insert('leagues', leagueInsert)
      
      if (result.error) throw result.error

      return { league: result.data, error: null }
    } catch (error: any) {
      console.error('Create league error:', error)
      return { league: null, error: error.message || 'Failed to create league' }
    }
  }

  async getLeague(leagueId: string): Promise<LeagueResponse> {
    try {
      const result = await db.selectSingle('leagues', {
        eq: { id: leagueId }
      })

      if (result.error) throw result.error

      return { league: result.data, error: null }
    } catch (error: any) {
      console.error('Get league error:', error)
      return { league: null, error: error.message || 'Failed to get league' }
    }
  }

  async getLeagueWithTeams(leagueId: string): Promise<{ league: LeagueWithTeams | null; error: string | null }> {
    try {
      const result = await db.selectWithJoins('leagues', `
        *,
        teams!inner (
          *,
          users!inner (username, email, avatar_url)
        )
      `, {
        eq: { id: leagueId }
      })

      if (result.error) throw result.error
      if (!result.data || result.data.length === 0) {
        return { league: null, error: 'League not found' }
      }

      return { league: result.data[0], error: null }
    } catch (error: any) {
      console.error('Get league with teams error:', error)
      return { league: null, error: error.message || 'Failed to get league details' }
    }
  }

  async getUserLeagues(userId: string): Promise<LeaguesResponse> {
    try {
      // Get leagues where user is commissioner
      const commissionerResult = await db.select('leagues', {
        eq: { commissioner_id: userId }
      })

      // Get leagues where user has a team
      const teamResult = await db.selectWithJoins('teams', `
        leagues (*)
      `, {
        eq: { user_id: userId }
      })

      if (commissionerResult.error || teamResult.error) {
        throw commissionerResult.error || teamResult.error
      }

      const commissionerLeagues = commissionerResult.data || []
      const teamLeagues = teamResult.data?.map((team: any) => team.leagues).filter(Boolean) || []

      // Combine and deduplicate leagues
      const allLeagues = [...commissionerLeagues, ...teamLeagues]
      const uniqueLeagues = allLeagues.filter((league, index, self) =>
        index === self.findIndex(l => l.id === league.id)
      )

      return { leagues: uniqueLeagues, error: null }
    } catch (error: any) {
      console.error('Get user leagues error:', error)
      return { leagues: [], error: error.message || 'Failed to get leagues' }
    }
  }

  async updateLeague(leagueId: string, updates: LeagueUpdate): Promise<LeagueResponse> {
    try {
      const result = await db.update('leagues', updates, { id: leagueId })
      
      if (result.error) throw result.error

      return { league: result.data, error: null }
    } catch (error: any) {
      console.error('Update league error:', error)
      return { league: null, error: error.message || 'Failed to update league' }
    }
  }

  async deleteLeague(leagueId: string, userId: string): Promise<{ error: string | null }> {
    try {
      // Verify user is commissioner
      const leagueResult = await db.selectSingle('leagues', {
        eq: { id: leagueId }
      })

      if (leagueResult.error) throw leagueResult.error
      if (!leagueResult.data) throw new Error('League not found')
      if (leagueResult.data.commissioner_id !== userId) {
        throw new Error('Only the commissioner can delete the league')
      }

      const result = await db.delete('leagues', { id: leagueId })
      
      if (result.error) throw result.error

      return { error: null }
    } catch (error: any) {
      console.error('Delete league error:', error)
      return { error: error.message || 'Failed to delete league' }
    }
  }

  async joinLeague(leagueId: string, userId: string, teamName: string): Promise<{ error: string | null }> {
    try {
      // Check if league exists and has space
      const leagueResult = await db.selectSingle('leagues', {
        eq: { id: leagueId }
      })

      if (leagueResult.error) throw leagueResult.error
      if (!leagueResult.data) throw new Error('League not found')

      const league = leagueResult.data
      const settings = league.settings as unknown as LeagueSettings

      // Get current teams
      const teamsResult = await db.select('teams', {
        eq: { league_id: leagueId }
      })

      if (teamsResult.error) throw teamsResult.error

      const teams = teamsResult.data || []

      if (teams.length >= settings.maxTeams) {
        throw new Error('League is full')
      }

      // Check if user already has a team in this league
      const existingTeam = teams.find(team => team.user_id === userId)
      if (existingTeam) {
        throw new Error('You already have a team in this league')
      }

      // Create team
      const teamResult = await db.insert('teams', {
        league_id: leagueId,
        user_id: userId,
        team_name: teamName,
        waiver_priority: teams.length + 1,
      })

      if (teamResult.error) throw teamResult.error

      return { error: null }
    } catch (error: any) {
      console.error('Join league error:', error)
      return { error: error.message || 'Failed to join league' }
    }
  }

  async leaveLeague(leagueId: string, userId: string): Promise<{ error: string | null }> {
    try {
      // Find user's team in the league
      const teamResult = await db.selectSingle('teams', {
        eq: { league_id: leagueId, user_id: userId }
      })

      if (teamResult.error) throw teamResult.error
      if (!teamResult.data) throw new Error('Team not found')

      // Delete the team (this should cascade to delete roster entries, etc.)
      const deleteResult = await db.delete('teams', {
        id: teamResult.data.id
      })

      if (deleteResult.error) throw deleteResult.error

      return { error: null }
    } catch (error: any) {
      console.error('Leave league error:', error)
      return { error: error.message || 'Failed to leave league' }
    }
  }

  async getLeagueTeams(leagueId: string): Promise<TeamsResponse> {
    try {
      const result = await db.selectWithJoins('teams', `
        *,
        users!inner(username, email, avatar_url)
      `, {
        eq: { league_id: leagueId },
        order: { column: 'draft_position', ascending: true }
      })

      if (result.error) throw result.error

      return { teams: result.data || [], error: null }
    } catch (error: any) {
      console.error('Get league teams error:', error)
      return { teams: [], error: error.message || 'Failed to get league teams' }
    }
  }

  async updateTeam(teamId: string, updates: { team_name?: string; draft_position?: number }): Promise<TeamResponse> {
    try {
      const result = await db.update('teams', updates, { id: teamId })
      
      if (result.error) throw result.error

      return { team: result.data, error: null }
    } catch (error: any) {
      console.error('Update team error:', error)
      return { team: null, error: error.message || 'Failed to update team' }
    }
  }

  async searchPublicLeagues(query?: string, limit = 20): Promise<LeaguesResponse> {
    try {
      const result = await db.select('leagues', {
        limit,
        order: { column: 'created_at', ascending: false }
      })

      if (result.error) throw result.error

      let leagues = result.data || []

      // Filter by search query if provided
      if (query) {
        const searchTerm = query.toLowerCase()
        leagues = leagues.filter(league =>
          league.name.toLowerCase().includes(searchTerm)
        )
      }

      return { leagues, error: null }
    } catch (error: any) {
      console.error('Search public leagues error:', error)
      return { leagues: [], error: error.message || 'Failed to search leagues' }
    }
  }

  async getLeagueStandings(leagueId: string): Promise<{ standings: any[]; error: string | null }> {
    try {
      // This would need to be implemented based on your scoring/matchup system
      // For now, return mock standings
      const teamsResult = await this.getLeagueTeams(leagueId)
      
      if (teamsResult.error) throw new Error(teamsResult.error)

      const standings = teamsResult.teams.map((team, index) => ({
        rank: index + 1,
        teamId: team.id,
        teamName: team.team_name,
        wins: Math.max(0, 10 - index),
        losses: Math.min(index + 2, 12),
        ties: 0,
        pointsFor: 1500 - (index * 50),
        pointsAgainst: 1400 - (index * 30),
        owner: team.users.username
      }))

      return { standings, error: null }
    } catch (error: any) {
      console.error('Get league standings error:', error)
      return { standings: [], error: error.message || 'Failed to get standings' }
    }
  }

  getDefaultSettings(): LeagueSettings {
    return {
      maxTeams: 10,
      rounds: 16,
      playoffTeams: 4,
      playoffWeeks: 3,
      regularSeasonWeeks: 14,
      tradeDeadline: '2024-11-15',
      waiverPeriod: 1,
      draftType: 'snake',
      draftOrder: [],
      benchSlots: 6,
      startingLineup: {
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        FLEX: 1,
        K: 1,
        DST: 1
      }
    }
  }

  getDefaultScoringSystem(): ScoringSystem {
    return {
      passingYards: 0.04,
      passingTD: 6,
      passingINT: -2,
      rushingYards: 0.1,
      rushingTD: 6,
      receivingYards: 0.1,
      receivingTD: 6,
      receptions: 1,
      fumblesLost: -2,
      kickingFG: 3,
      kickingXP: 1,
      defenseINT: 2,
      defenseFumble: 2,
      defenseSack: 1,
      defenseTD: 6,
      defenseYardsAllowed: 0,
      defensePointsAllowed: 0
    }
  }
}

export default new LeagueService()