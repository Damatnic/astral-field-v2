// THIS FILE NEEDS REFACTORING FOR NEON DATABASE - TEMPORARILY DISABLED
// @ts-nocheck
import { neonServerless } from '@/lib/neon-serverless'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import type { Database } from '@/types/database'

type DraftPick = Database['public']['Tables']['draft_picks']['Row']
type DraftPickInsert = Database['public']['Tables']['draft_picks']['Insert']
type Team = Database['public']['Tables']['teams']['Row']
type Player = Database['public']['Tables']['players']['Row']

export interface DraftSettings {
  type: 'snake' | 'auction'
  rounds: number
  pickTimeLimit: number // seconds
  draftOrder: string[] // team IDs in order
  allowTrades: boolean
  autoPickEnabled: boolean
}

export interface DraftState {
  id: string
  leagueId: string
  status: 'scheduled' | 'active' | 'paused' | 'completed'
  currentRound: number
  currentPick: number
  currentTeamId: string | null
  pickDeadline: Date | null
  settings: DraftSettings
  createdAt: Date
  completedAt: Date | null
}

export interface DraftPickWithDetails extends DraftPick {
  player: Player
  team: Team & {
    users: {
      username: string
    }
  }
}

export interface DraftBoardPlayer extends Player {
  isAvailable: boolean
  adp: number // Average Draft Position
  tier: number
  valueRating: 'reach' | 'value' | 'fair'
}

export interface DraftRecommendation {
  playerId: string
  player: Player
  reason: string
  priority: 'high' | 'medium' | 'low'
  value: number
}

class DraftService {

  async createDraft(leagueId: string, settings: DraftSettings): Promise<{ draftId: string | null; error: string | null }> {
    try {
      // Get teams in the league to create draft order
      const { data: teams, error: teamsError } = await this.supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)
        .order('draft_position', { nullsFirst: false })

      if (teamsError) throw teamsError
      if (!teams || teams.length === 0) throw new Error('No teams found in league')

      // Create draft order if not provided
      let draftOrder = settings.draftOrder
      if (!draftOrder || draftOrder.length === 0) {
        draftOrder = teams.map((team: any) => team.id)
      }

      // Create draft state record (we'll need to add this table)
      const draftState: DraftState = {
        id: crypto.randomUUID(),
        leagueId,
        status: 'scheduled',
        currentRound: 1,
        currentPick: 1,
        currentTeamId: draftOrder[0],
        pickDeadline: null,
        settings: {
          ...settings,
          draftOrder
        },
        createdAt: new Date(),
        completedAt: null
      }

      // For now, store in localStorage since we don't have a drafts table yet
      localStorage.setItem(`draft_${leagueId}`, JSON.stringify(draftState))

      return { draftId: draftState.id, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create draft'
      return { draftId: null, error: message }
    }
  }

  async getDraftState(leagueId: string): Promise<{ draft: DraftState | null; error: string | null }> {
    try {
      // For now, get from localStorage
      const stored = localStorage.getItem(`draft_${leagueId}`)
      if (!stored) {
        return { draft: null, error: 'Draft not found' }
      }

      const draft = JSON.parse(stored) as DraftState
      return { draft, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get draft state'
      return { draft: null, error: message }
    }
  }

  async updateDraftState(leagueId: string, updates: Partial<DraftState>): Promise<{ error: string | null }> {
    try {
      const { draft, error } = await this.getDraftState(leagueId)
      if (error || !draft) throw new Error(error || 'Draft not found')

      const updatedDraft = { ...draft, ...updates }
      localStorage.setItem(`draft_${leagueId}`, JSON.stringify(updatedDraft))

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update draft state'
      return { error: message }
    }
  }

  async makeDraftPick(
    leagueId: string,
    teamId: string,
    playerId: string
  ): Promise<{ pick: DraftPick | null; error: string | null }> {
    try {
      const { draft, error: draftError } = await this.getDraftState(leagueId)
      if (draftError || !draft) throw new Error(draftError || 'Draft not found')

      if (draft.currentTeamId !== teamId) {
        throw new Error('Not your turn to pick')
      }

      if (draft.status !== 'active') {
        throw new Error('Draft is not active')
      }

      // Check if player is already drafted
      const { data: existingPick } = await this.supabase
        .from('draft_picks')
        .select('id')
        .eq('league_id', leagueId)
        .eq('player_id', playerId)
        .single()

      if (existingPick) {
        throw new Error('Player already drafted')
      }

      // Calculate overall pick number
      const overallPick = ((draft.currentRound - 1) * draft.settings.draftOrder.length) + draft.currentPick

      // Create draft pick record
      const draftPickInsert: DraftPickInsert = {
        league_id: leagueId,
        team_id: teamId,
        player_id: playerId,
        round: draft.currentRound,
        pick: draft.currentPick,
        overall_pick: overallPick,
      }

      const { data: draftPick, error: pickError } = await this.supabase
        .from('draft_picks')
        .insert(draftPickInsert as any)
        .select()
        .single()

      if (pickError) throw pickError

      // Advance to next pick
      await this.advanceToNextPick(leagueId, draft)

      return { pick: draftPick, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to make draft pick'
      return { pick: null, error: message }
    }
  }

  private async advanceToNextPick(leagueId: string, currentDraft: DraftState): Promise<void> {
    const { draftOrder, rounds } = currentDraft.settings
    let { currentRound, currentPick } = currentDraft

    if (currentDraft.settings.type === 'snake') {
      // Snake draft logic
      if (currentRound % 2 === 1) {
        // Odd rounds: pick order 1, 2, 3, 4...
        if (currentPick < draftOrder.length) {
          currentPick++
        } else {
          currentRound++
          // currentPick stays the same for snake reversal
        }
      } else {
        // Even rounds: pick order 4, 3, 2, 1... (reversed)
        if (currentPick > 1) {
          currentPick--
        } else {
          currentRound++
          currentPick = 1
        }
      }
    } else {
      // Standard draft logic
      if (currentPick < draftOrder.length) {
        currentPick++
      } else {
        currentRound++
        currentPick = 1
      }
    }

    // Determine current team
    let currentTeamId: string | null = null
    let status = currentDraft.status

    if (currentRound <= rounds) {
      if (currentDraft.settings.type === 'snake' && currentRound % 2 === 0) {
        // Even round in snake draft - reversed order
        const reversedIndex = draftOrder.length - currentPick
        currentTeamId = draftOrder[reversedIndex]
      } else {
        // Odd round in snake or any round in standard
        currentTeamId = draftOrder[currentPick - 1]
      }

      // Set pick deadline
      const pickDeadline = new Date()
      pickDeadline.setSeconds(pickDeadline.getSeconds() + currentDraft.settings.pickTimeLimit)
    } else {
      // Draft completed
      status = 'completed'
    }

    await this.updateDraftState(leagueId, {
      currentRound,
      currentPick,
      currentTeamId,
      status,
      pickDeadline: status === 'completed' ? null : new Date(),
      completedAt: status === 'completed' ? new Date() : null
    })
  }

  async getDraftPicks(leagueId: string): Promise<{ picks: DraftPickWithDetails[]; error: string | null }> {
    try {
      const { data: picks, error } = await this.supabase
        .from('draft_picks')
        .select(`
          *,
          players!inner(*),
          teams!inner(*,
            users!inner(username)
          )
        `)
        .eq('league_id', leagueId)
        .order('overall_pick')

      if (error) throw error

      return { picks: picks || [], error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get draft picks'
      return { picks: [], error: message }
    }
  }

  async getAvailablePlayers(leagueId: string): Promise<{ players: DraftBoardPlayer[]; error: string | null }> {
    try {
      // Get all players
      const { data: allPlayers, error: playersError } = await this.supabase
        .from('players')
        .select('*')
        .order('name')

      if (playersError) throw playersError

      // Get drafted players
      const { data: draftedPlayers, error: draftsError } = await this.supabase
        .from('draft_picks')
        .select('player_id')
        .eq('league_id', leagueId)

      if (draftsError) throw draftsError

      const draftedPlayerIds = new Set(draftedPlayers?.map((pick: any) => pick.player_id) || [])

      // Transform to draft board players
      const availablePlayers: DraftBoardPlayer[] = (allPlayers || []).map((player: any, index: number) => ({
        ...player,
        isAvailable: !draftedPlayerIds.has(player.id),
        adp: index + 1, // Simple ADP based on order
        tier: Math.ceil((index + 1) / 12), // Simple tier calculation
        valueRating: 'fair' as const // Will enhance this later
      }))

      return { players: availablePlayers, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get available players'
      return { players: [], error: message }
    }
  }

  async getDraftRecommendations(
    leagueId: string, 
    teamId: string, 
    round: number
  ): Promise<{ recommendations: DraftRecommendation[]; error: string | null }> {
    try {
      const { players, error } = await this.getAvailablePlayers(leagueId)
      if (error) throw new Error(error)

      // Simple recommendation logic - prioritize by position need
      const availableOnly = players.filter(p => p.isAvailable)
      
      // Group by position
      const byPosition: Record<string, DraftBoardPlayer[]> = {}
      availableOnly.forEach(player => {
        if (!byPosition[player.position]) {
          byPosition[player.position] = []
        }
        byPosition[player.position].push(player)
      })

      const recommendations: DraftRecommendation[] = []

      // Early rounds: prioritize RB, WR
      if (round <= 6) {
        const topRBs = byPosition['RB']?.slice(0, 3) || []
        const topWRs = byPosition['WR']?.slice(0, 3) || []
        
        topRBs.forEach(player => {
          recommendations.push({
            playerId: player.id,
            player,
            reason: 'Top RB available - early round value',
            priority: 'high',
            value: 90
          })
        })

        topWRs.forEach(player => {
          recommendations.push({
            playerId: player.id,
            player,
            reason: 'Top WR available - early round value',
            priority: 'high',
            value: 85
          })
        })
      }

      // QB recommendations for middle rounds
      if (round >= 6 && round <= 10) {
        const topQBs = byPosition['QB']?.slice(0, 2) || []
        topQBs.forEach(player => {
          recommendations.push({
            playerId: player.id,
            player,
            reason: 'Quality QB available - good timing',
            priority: 'medium',
            value: 70
          })
        })
      }

      // Late round fliers
      if (round >= 10) {
        const sleepers = availableOnly.slice(0, 5)
        sleepers.forEach(player => {
          recommendations.push({
            playerId: player.id,
            player,
            reason: 'Late round potential - worth the risk',
            priority: 'low',
            value: 50
          })
        })
      }

      // Sort by value and limit to top 8
      const sortedRecommendations = recommendations
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)

      return { recommendations: sortedRecommendations, error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get draft recommendations'
      return { recommendations: [], error: message }
    }
  }

  async startDraft(leagueId: string): Promise<{ error: string | null }> {
    try {
      const { draft, error } = await this.getDraftState(leagueId)
      if (error || !draft) throw new Error(error || 'Draft not found')

      if (draft.status !== 'scheduled') {
        throw new Error('Draft cannot be started from current status')
      }

      // Set pick deadline for first pick
      const pickDeadline = new Date()
      pickDeadline.setSeconds(pickDeadline.getSeconds() + draft.settings.pickTimeLimit)

      await this.updateDraftState(leagueId, {
        status: 'active',
        pickDeadline
      })

      return { error: null }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start draft'
      return { error: message }
    }
  }

  async pauseDraft(leagueId: string): Promise<{ error: string | null }> {
    return this.updateDraftState(leagueId, { 
      status: 'paused',
      pickDeadline: null 
    })
  }

  async resumeDraft(leagueId: string): Promise<{ error: string | null }> {
    try {
      const { draft, error } = await this.getDraftState(leagueId)
      if (error || !draft) throw new Error(error || 'Draft not found')

      const pickDeadline = new Date()
      pickDeadline.setSeconds(pickDeadline.getSeconds() + draft.settings.pickTimeLimit)

      return this.updateDraftState(leagueId, { 
        status: 'active',
        pickDeadline 
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resume draft'
      return { error: message }
    }
  }

  getDefaultDraftSettings(teamCount: number): DraftSettings {
    return {
      type: 'snake',
      rounds: 16,
      pickTimeLimit: 90, // 90 seconds per pick
      draftOrder: [],
      allowTrades: false,
      autoPickEnabled: true
    }
  }
}

const draftService = new DraftService()
export default draftService