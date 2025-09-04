interface SportsDataPlayer {
  PlayerID: number
  Team: string
  Number: number
  FirstName: string
  LastName: string
  Position: string
  Height: string
  Weight: number
  BirthDate: string
  College: string
  Experience: number
  FantasyPosition: string
  Active: boolean
  InjuryStatus: string
  InjuryBodyPart: string
  InjuryStartDate: string
  InjuryNotes: string
  PhotoUrl: string
  ByeWeek: number
  UpcomingGameOpponent: string
  UpcomingGameWeek: number
}

interface SportsDataProjection {
  PlayerID: number
  Season: number
  SeasonType: number
  Week: number
  Name: string
  Team: string
  Position: string
  Number: number
  PassingYards: number
  PassingTouchdowns: number
  PassingInterceptions: number
  RushingYards: number
  RushingTouchdowns: number
  ReceivingYards: number
  Receptions: number
  ReceivingTouchdowns: number
  FieldGoalsMade: number
  ExtraPointsMade: number
  DefensiveTouchdowns: number
  SpecialTeamsTouchdowns: number
  FantasyPoints: number
  FantasyPointsPerGame: number
  FantasyPointsDraftKings: number
  FantasyPointsFanDuel: number
  FantasyPointsSuperdraft: number
  FantasyPointsYahoo: number
}

interface SportsDataStats {
  PlayerID: number
  Season: number
  SeasonType: number
  Week: number
  Name: string
  Team: string
  Position: string
  PassingYards: number
  PassingTouchdowns: number
  PassingInterceptions: number
  RushingYards: number
  RushingTouchdowns: number
  ReceivingYards: number
  Receptions: number
  ReceivingTouchdowns: number
  FieldGoalsMade: number
  ExtraPointsMade: number
  FantasyPoints: number
  Updated: string
}

class SportsDataService {
  private apiKey: string
  private baseUrl = 'https://api.sportsdata.io/v3/nfl'

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_SPORTSDATA_API_KEY || ''
  }

  private async fetchData<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}?key=${this.apiKey}`)
    
    if (!response.ok) {
      throw new Error(`SportsData API error: ${response.status}`)
    }
    
    return response.json()
  }

  async getActivePlayers(): Promise<SportsDataPlayer[]> {
    try {
      return await this.fetchData<SportsDataPlayer[]>('/players')
    } catch (error) {
      console.error('Failed to fetch active players:', error)
      return []
    }
  }

  async getPlayerProjections(season: number, week?: number): Promise<SportsDataProjection[]> {
    try {
      const endpoint = week 
        ? `/projections/${season}/${week}` 
        : `/projections/${season}`
      
      return await this.fetchData<SportsDataProjection[]>(endpoint)
    } catch (error) {
      console.error('Failed to fetch projections:', error)
      return []
    }
  }

  async getPlayerStats(season: number, week?: number): Promise<SportsDataStats[]> {
    try {
      const endpoint = week 
        ? `/stats/players/${season}/${week}` 
        : `/stats/players/${season}`
      
      return await this.fetchData<SportsDataStats[]>(endpoint)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      return []
    }
  }

  async getFantasyPlayersByWeek(season: number, week: number): Promise<SportsDataProjection[]> {
    try {
      return await this.fetchData<SportsDataProjection[]>(`/projections/${season}/${week}`)
    } catch (error) {
      console.error('Failed to fetch fantasy players:', error)
      return []
    }
  }

  async getPlayerById(playerId: number): Promise<SportsDataPlayer | null> {
    try {
      const players = await this.getActivePlayers()
      return players.find(p => p.PlayerID === playerId) || null
    } catch (error) {
      console.error('Failed to fetch player by ID:', error)
      return null
    }
  }

  // Transform SportsData player to our format
  transformPlayer(sportsDataPlayer: SportsDataPlayer, projections?: SportsDataProjection, stats?: SportsDataStats) {
    return {
      // Use external ID as reference
      external_id: sportsDataPlayer.PlayerID.toString(),
      name: `${sportsDataPlayer.FirstName} ${sportsDataPlayer.LastName}`,
      position: sportsDataPlayer.FantasyPosition || sportsDataPlayer.Position,
      nfl_team: sportsDataPlayer.Team,
      bye_week: sportsDataPlayer.ByeWeek,
      injury_status: sportsDataPlayer.InjuryStatus || 'Healthy',
      stats: stats ? {
        season: stats.Season,
        week: stats.Week,
        passingYards: stats.PassingYards,
        passingTDs: stats.PassingTouchdowns,
        passingINTs: stats.PassingInterceptions,
        rushingYards: stats.RushingYards,
        rushingTDs: stats.RushingTouchdowns,
        receivingYards: stats.ReceivingYards,
        receivingTDs: stats.ReceivingTouchdowns,
        receptions: stats.Receptions,
        fantasyPoints: stats.FantasyPoints
      } : null,
      projections: projections ? {
        season: projections.Season,
        passingYards: projections.PassingYards,
        passingTDs: projections.PassingTouchdowns,
        rushingYards: projections.RushingYards,
        rushingTDs: projections.RushingTouchdowns,
        receivingYards: projections.ReceivingYards,
        receivingTDs: projections.ReceivingTouchdowns,
        receptions: projections.Receptions,
        projectedPoints: projections.FantasyPoints,
        confidence: 0.8 // Default confidence
      } : null
    }
  }

  // Get current NFL season
  getCurrentSeason(): number {
    const now = new Date()
    const year = now.getFullYear()
    // NFL season typically starts in September
    return now.getMonth() >= 8 ? year : year - 1
  }

  // Get current NFL week (approximate)
  getCurrentWeek(): number {
    const now = new Date()
    const seasonStart = new Date(this.getCurrentSeason(), 8, 1) // September 1st
    const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    
    // NFL regular season is weeks 1-18, playoffs are weeks 19-22
    return Math.min(Math.max(weeksSinceStart + 1, 1), 22)
  }

  // Sync players from SportsData to our database
  async syncPlayersToDatabase() {
    try {
      const [players, projections, stats] = await Promise.all([
        this.getActivePlayers(),
        this.getPlayerProjections(this.getCurrentSeason()),
        this.getPlayerStats(this.getCurrentSeason())
      ])

      const transformedPlayers = players.map(player => {
        const playerProjections = projections.find(p => p.PlayerID === player.PlayerID)
        const playerStats = stats.find(s => s.PlayerID === player.PlayerID)
        
        return this.transformPlayer(player, playerProjections, playerStats)
      })

      return transformedPlayers
    } catch (error) {
      console.error('Failed to sync players:', error)
      return []
    }
  }

  // Get injury report
  async getInjuryReport(): Promise<SportsDataPlayer[]> {
    try {
      const players = await this.getActivePlayers()
      return players.filter(p => p.InjuryStatus && p.InjuryStatus !== 'Healthy')
    } catch (error) {
      console.error('Failed to fetch injury report:', error)
      return []
    }
  }

  // Get players by position
  async getPlayersByPosition(position: string): Promise<SportsDataPlayer[]> {
    try {
      const players = await this.getActivePlayers()
      return players.filter(p => p.FantasyPosition === position || p.Position === position)
    } catch (error) {
      console.error('Failed to fetch players by position:', error)
      return []
    }
  }
}

const sportsDataService = new SportsDataService()
export default sportsDataService