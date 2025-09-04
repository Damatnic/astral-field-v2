// Mock data for draft testing
const mockLeague = {
  id: 'league-123',
  name: 'Test League',
  max_teams: 12,
  draft_date: '2025-09-15T14:00:00Z',
  draft_settings: {
    type: 'snake',
    rounds: 16,
    pick_time_limit: 90,
    auto_pick_enabled: true
  }
}

const mockTeams = [
  { id: 'team-1', name: 'Team 1', owner_id: 'user-1', draft_position: 1 },
  { id: 'team-2', name: 'Team 2', owner_id: 'user-2', draft_position: 2 },
  { id: 'team-3', name: 'Team 3', owner_id: 'user-3', draft_position: 3 },
  { id: 'team-4', name: 'Team 4', owner_id: 'user-4', draft_position: 4 }
]

const mockPlayers = [
  { 
    id: 'player-1', 
    name: 'Christian McCaffrey', 
    position: 'RB', 
    team: 'SF', 
    adp: 1.2,
    projected_points: 285 
  },
  { 
    id: 'player-2', 
    name: 'Josh Allen', 
    position: 'QB', 
    team: 'BUF', 
    adp: 2.8,
    projected_points: 275 
  },
  { 
    id: 'player-3', 
    name: 'Tyreek Hill', 
    position: 'WR', 
    team: 'MIA', 
    adp: 3.1,
    projected_points: 265 
  },
  { 
    id: 'player-4', 
    name: 'Travis Kelce', 
    position: 'TE', 
    team: 'KC', 
    adp: 4.5,
    projected_points: 245 
  }
]

// Draft Service Mock
class DraftService {
  private currentPick: number = 1
  private currentRound: number = 1
  private draftPicks: any[] = []

  calculateTurnOrder(teams: any[], round: number): any[] {
    const numTeams = teams.length
    
    if (round % 2 === 1) {
      // Odd rounds: normal order (1, 2, 3, 4)
      return teams.sort((a, b) => a.draft_position - b.draft_position)
    } else {
      // Even rounds: reverse order (4, 3, 2, 1)
      return teams.sort((a, b) => b.draft_position - a.draft_position)
    }
  }

  getCurrentPickingTeam(teams: any[], round: number, pick: number): any {
    const turnOrder = this.calculateTurnOrder(teams, round)
    const pickInRound = ((pick - 1) % teams.length)
    return turnOrder[pickInRound]
  }

  validatePick(playerId: string, teamId: string): { valid: boolean; error?: string } {
    // Check if player is already drafted
    const alreadyDrafted = this.draftPicks.find(pick => pick.player_id === playerId)
    if (alreadyDrafted) {
      return { valid: false, error: 'Player already drafted' }
    }

    // Check if it's this team's turn
    const currentTeam = this.getCurrentPickingTeam(mockTeams, this.currentRound, this.currentPick)
    if (currentTeam.id !== teamId) {
      return { valid: false, error: 'Not your turn to pick' }
    }

    return { valid: true }
  }

  makePick(playerId: string, teamId: string): any {
    const validation = this.validatePick(playerId, teamId)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const pick = {
      id: `pick-${this.currentPick}`,
      round: this.currentRound,
      pick_number: this.currentPick,
      team_id: teamId,
      player_id: playerId,
      timestamp: new Date().toISOString()
    }

    this.draftPicks.push(pick)
    this.advancePick()
    
    return pick
  }

  private advancePick(): void {
    this.currentPick++
    const totalRounds = mockLeague.draft_settings.rounds
    const totalTeams = mockTeams.length
    
    if (this.currentPick > this.currentRound * totalTeams) {
      this.currentRound++
    }
  }

  getDraftBoard(): any {
    return {
      league: mockLeague,
      teams: mockTeams,
      picks: this.draftPicks,
      current_pick: this.currentPick,
      current_round: this.currentRound,
      current_picking_team: this.getCurrentPickingTeam(mockTeams, this.currentRound, this.currentPick)
    }
  }

  getPlayersByADP(position?: string): any[] {
    let players = [...mockPlayers]
    
    if (position) {
      players = players.filter(p => p.position === position)
    }
    
    return players.sort((a, b) => a.adp - b.adp)
  }
}

describe('Draft Specialist - Draft Logic', () => {
  let draftService: DraftService

  beforeEach(() => {
    draftService = new DraftService()
  })

  describe('Snake Draft Turn Order', () => {
    it('should calculate correct turn order for odd rounds', () => {
      const turnOrder = draftService.calculateTurnOrder(mockTeams, 1)
      
      expect(turnOrder[0].draft_position).toBe(1)
      expect(turnOrder[1].draft_position).toBe(2)
      expect(turnOrder[2].draft_position).toBe(3)
      expect(turnOrder[3].draft_position).toBe(4)
    })

    it('should calculate correct turn order for even rounds', () => {
      const turnOrder = draftService.calculateTurnOrder(mockTeams, 2)
      
      expect(turnOrder[0].draft_position).toBe(4)
      expect(turnOrder[1].draft_position).toBe(3)
      expect(turnOrder[2].draft_position).toBe(2)
      expect(turnOrder[3].draft_position).toBe(1)
    })

    it('should determine correct picking team', () => {
      // Round 1, Pick 1 should be Team 1
      const team1 = draftService.getCurrentPickingTeam(mockTeams, 1, 1)
      expect(team1.draft_position).toBe(1)

      // Round 1, Pick 4 should be Team 4
      const team4 = draftService.getCurrentPickingTeam(mockTeams, 1, 4)
      expect(team4.draft_position).toBe(4)

      // Round 2, Pick 5 should be Team 4 (snake draft reverses)
      const team4Round2 = draftService.getCurrentPickingTeam(mockTeams, 2, 5)
      expect(team4Round2.draft_position).toBe(4)
    })
  })

  describe('Pick Validation', () => {
    it('should validate correct picks', () => {
      const currentTeam = draftService.getCurrentPickingTeam(mockTeams, 1, 1)
      const validation = draftService.validatePick('player-1', currentTeam.id)
      
      expect(validation.valid).toBe(true)
      expect(validation.error).toBeUndefined()
    })

    it('should reject picks when not team\'s turn', () => {
      const wrongTeam = mockTeams.find(t => t.draft_position === 2)
      const validation = draftService.validatePick('player-1', wrongTeam!.id)
      
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('Not your turn to pick')
    })

    it('should reject already drafted players', () => {
      const currentTeam = draftService.getCurrentPickingTeam(mockTeams, 1, 1)
      
      // Make first pick
      draftService.makePick('player-1', currentTeam.id)
      
      // Try to pick same player again
      const nextTeam = draftService.getCurrentPickingTeam(mockTeams, 1, 2)
      const validation = draftService.validatePick('player-1', nextTeam.id)
      
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('Player already drafted')
    })
  })

  describe('Draft Picks', () => {
    it('should successfully make a pick', () => {
      const currentTeam = draftService.getCurrentPickingTeam(mockTeams, 1, 1)
      const pick = draftService.makePick('player-1', currentTeam.id)
      
      expect(pick).toMatchObject({
        round: 1,
        pick_number: 1,
        team_id: currentTeam.id,
        player_id: 'player-1'
      })
      expect(pick.id).toBeDefined()
      expect(pick.timestamp).toBeDefined()
    })

    it('should advance to next pick after successful pick', () => {
      const team1 = draftService.getCurrentPickingTeam(mockTeams, 1, 1)
      draftService.makePick('player-1', team1.id)
      
      const draftBoard = draftService.getDraftBoard()
      expect(draftBoard.current_pick).toBe(2)
      expect(draftBoard.current_picking_team.draft_position).toBe(2)
    })

    it('should advance to next round after completing a round', () => {
      // Complete round 1
      for (let i = 0; i < mockTeams.length; i++) {
        const currentTeam = draftService.getCurrentPickingTeam(mockTeams, 1, i + 1)
        draftService.makePick(mockPlayers[i].id, currentTeam.id)
      }
      
      const draftBoard = draftService.getDraftBoard()
      expect(draftBoard.current_round).toBe(2)
      expect(draftBoard.current_picking_team.draft_position).toBe(4) // Snake draft
    })
  })

  describe('Draft Board', () => {
    it('should provide complete draft state', () => {
      const team1 = draftService.getCurrentPickingTeam(mockTeams, 1, 1)
      draftService.makePick('player-1', team1.id)
      
      const draftBoard = draftService.getDraftBoard()
      
      expect(draftBoard).toMatchObject({
        league: mockLeague,
        teams: mockTeams,
        current_pick: 2,
        current_round: 1
      })
      expect(draftBoard.picks).toHaveLength(1)
      expect(draftBoard.current_picking_team).toBeDefined()
    })
  })

  describe('Player Rankings', () => {
    it('should return players sorted by ADP', () => {
      const players = draftService.getPlayersByADP()
      
      expect(players[0].adp).toBe(1.2)
      expect(players[1].adp).toBe(2.8)
      expect(players[2].adp).toBe(3.1)
      expect(players[3].adp).toBe(4.5)
    })

    it('should filter players by position', () => {
      const qbs = draftService.getPlayersByADP('QB')
      expect(qbs).toHaveLength(1)
      expect(qbs[0].position).toBe('QB')
      expect(qbs[0].name).toBe('Josh Allen')
    })
  })

  describe('Auto-Pick Logic', () => {
    it('should auto-pick highest ADP available player', () => {
      // Mock auto-pick logic
      const autoPick = (availablePlayers: any[]) => {
        return availablePlayers.sort((a, b) => a.adp - b.adp)[0]
      }

      const availablePlayers = mockPlayers.filter(p => !draftService['draftPicks'].find(pick => pick.player_id === p.id))
      const autoPickPlayer = autoPick(availablePlayers)
      
      expect(autoPickPlayer.id).toBe('player-1') // Lowest ADP
      expect(autoPickPlayer.adp).toBe(1.2)
    })
  })
})