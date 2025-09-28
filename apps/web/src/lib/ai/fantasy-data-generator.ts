/**
 * Nova: Fantasy Football Data Generator
 * Creates realistic NFL player data for weeks 1-3 with sophisticated statistics
 */

interface PlayerData {
  id: string
  name: string
  position: string
  nflTeam: string
  isFantasyRelevant: boolean
  adp?: number
  rank?: number
}

interface WeeklyStats {
  playerId: string
  week: number
  season: number
  fantasyPoints: number
  stats: any
  targetShare?: number
  snapCount?: number
  redZoneCarries?: number
  gameScript?: number
  weather?: string
  homeAway: string
}

interface GameData {
  week: number
  season: number
  nflTeam: string
  opponent: string
  homeAway: string
  gameScript?: number
  weather?: string
  temperature?: number
  windSpeed?: number
  vegasTotal?: number
  vegasSpread?: number
}

const NFL_TEAMS = [
  'BUF', 'MIA', 'NE', 'NYJ',  // AFC East
  'BAL', 'CIN', 'CLE', 'PIT', // AFC North
  'HOU', 'IND', 'JAX', 'TEN', // AFC South
  'DEN', 'KC', 'LV', 'LAC',   // AFC West
  'DAL', 'NYG', 'PHI', 'WAS', // NFC East
  'CHI', 'DET', 'GB', 'MIN',  // NFC North
  'ATL', 'CAR', 'NO', 'TB',   // NFC South
  'ARI', 'LAR', 'SF', 'SEA'   // NFC West
]

const WEATHER_CONDITIONS = ['CLEAR', 'CLOUDY', 'RAIN', 'SNOW', 'WIND']

export class FantasyDataGenerator {
  private players: PlayerData[] = []
  private weeklyStats: WeeklyStats[] = []
  private gameData: GameData[] = []

  constructor() {
    this.generatePlayers()
    this.generateWeeklyData()
  }

  private generatePlayers() {
    // Elite Quarterbacks
    const qbs = [
      { name: 'Josh Allen', team: 'BUF', adp: 3, tier: 'elite' },
      { name: 'Lamar Jackson', team: 'BAL', adp: 5, tier: 'elite' },
      { name: 'Patrick Mahomes', team: 'KC', adp: 8, tier: 'elite' },
      { name: 'Jalen Hurts', team: 'PHI', adp: 12, tier: 'elite' },
      { name: 'Justin Herbert', team: 'LAC', adp: 45, tier: 'mid' },
      { name: 'Tua Tagovailoa', team: 'MIA', adp: 68, tier: 'mid' },
      { name: 'Dak Prescott', team: 'DAL', adp: 72, tier: 'mid' },
      { name: 'Aaron Rodgers', team: 'NYJ', adp: 89, tier: 'mid' },
      { name: 'Kirk Cousins', team: 'ATL', adp: 95, tier: 'low' },
      { name: 'Russell Wilson', team: 'PIT', adp: 112, tier: 'low' }
    ]

    // Elite Running Backs
    const rbs = [
      { name: 'Christian McCaffrey', team: 'SF', adp: 1, tier: 'elite' },
      { name: 'Breece Hall', team: 'NYJ', adp: 4, tier: 'elite' },
      { name: 'Bijan Robinson', team: 'ATL', adp: 6, tier: 'elite' },
      { name: 'Jahmyr Gibbs', team: 'DET', adp: 9, tier: 'elite' },
      { name: 'Saquon Barkley', team: 'PHI', adp: 11, tier: 'elite' },
      { name: 'Josh Jacobs', team: 'GB', adp: 15, tier: 'mid' },
      { name: 'Derrick Henry', team: 'BAL', adp: 18, tier: 'mid' },
      { name: 'Kenneth Walker III', team: 'SEA', adp: 22, tier: 'mid' },
      { name: 'De\'Von Achane', team: 'MIA', adp: 25, tier: 'mid' },
      { name: 'Jonathan Taylor', team: 'IND', adp: 28, tier: 'mid' },
      { name: 'David Montgomery', team: 'DET', adp: 35, tier: 'low' },
      { name: 'Tony Pollard', team: 'TEN', adp: 42, tier: 'low' },
      { name: 'Rachaad White', team: 'TB', adp: 48, tier: 'low' },
      { name: 'James Cook', team: 'BUF', adp: 52, tier: 'low' }
    ]

    // Elite Wide Receivers
    const wrs = [
      { name: 'Tyreek Hill', team: 'MIA', adp: 2, tier: 'elite' },
      { name: 'CeeDee Lamb', team: 'DAL', adp: 7, tier: 'elite' },
      { name: 'Ja\'Marr Chase', team: 'CIN', adp: 10, tier: 'elite' },
      { name: 'Amon-Ra St. Brown', team: 'DET', adp: 13, tier: 'elite' },
      { name: 'A.J. Brown', team: 'PHI', adp: 14, tier: 'elite' },
      { name: 'Stefon Diggs', team: 'HOU', adp: 16, tier: 'mid' },
      { name: 'Puka Nacua', team: 'LAR', adp: 17, tier: 'mid' },
      { name: 'Mike Evans', team: 'TB', adp: 19, tier: 'mid' },
      { name: 'Davante Adams', team: 'LV', adp: 20, tier: 'mid' },
      { name: 'DeVonta Smith', team: 'PHI', adp: 23, tier: 'mid' },
      { name: 'DK Metcalf', team: 'SEA', adp: 26, tier: 'mid' },
      { name: 'Chris Olave', team: 'NO', adp: 29, tier: 'mid' },
      { name: 'Keenan Allen', team: 'CHI', adp: 32, tier: 'low' },
      { name: 'Amari Cooper', team: 'CLE', adp: 38, tier: 'low' },
      { name: 'DeAndre Hopkins', team: 'TEN', adp: 41, tier: 'low' },
      { name: 'Diontae Johnson', team: 'CAR', adp: 44, tier: 'low' },
      { name: 'Tyler Lockett', team: 'SEA', adp: 47, tier: 'low' },
      { name: 'Courtland Sutton', team: 'DEN', adp: 50, tier: 'low' }
    ]

    // Elite Tight Ends
    const tes = [
      { name: 'Travis Kelce', team: 'KC', adp: 21, tier: 'elite' },
      { name: 'Mark Andrews', team: 'BAL', adp: 31, tier: 'elite' },
      { name: 'Sam LaPorta', team: 'DET', adp: 34, tier: 'elite' },
      { name: 'George Kittle', team: 'SF', adp: 37, tier: 'mid' },
      { name: 'Trey McBride', team: 'ARI', adp: 40, tier: 'mid' },
      { name: 'Kyle Pitts', team: 'ATL', adp: 43, tier: 'mid' },
      { name: 'Dallas Goedert', team: 'PHI', adp: 55, tier: 'low' },
      { name: 'Evan Engram', team: 'JAX', adp: 58, tier: 'low' },
      { name: 'David Njoku', team: 'CLE', adp: 61, tier: 'low' },
      { name: 'Jake Ferguson', team: 'DAL', adp: 75, tier: 'low' }
    ]

    // Kickers
    const ks = [
      { name: 'Justin Tucker', team: 'BAL', adp: 180, tier: 'elite' },
      { name: 'Harrison Butker', team: 'KC', adp: 185, tier: 'mid' },
      { name: 'Tyler Bass', team: 'BUF', adp: 190, tier: 'mid' },
      { name: 'Brandon McManus', team: 'GB', adp: 195, tier: 'low' },
      { name: 'Jake Elliott', team: 'PHI', adp: 200, tier: 'low' }
    ]

    // Defenses
    const dsts = [
      { name: 'San Francisco DST', team: 'SF', adp: 170, tier: 'elite' },
      { name: 'Dallas DST', team: 'DAL', adp: 175, tier: 'elite' },
      { name: 'Buffalo DST', team: 'BUF', adp: 178, tier: 'mid' },
      { name: 'Baltimore DST', team: 'BAL', adp: 182, tier: 'mid' },
      { name: 'Cleveland DST', team: 'CLE', adp: 187, tier: 'low' }
    ]

    // Generate player data
    const allPlayers = [
      ...qbs.map(p => ({ ...p, position: 'QB' })),
      ...rbs.map(p => ({ ...p, position: 'RB' })),
      ...wrs.map(p => ({ ...p, position: 'WR' })),
      ...tes.map(p => ({ ...p, position: 'TE' })),
      ...ks.map(p => ({ ...p, position: 'K' })),
      ...dsts.map(p => ({ ...p, position: 'DST' }))
    ]

    this.players = allPlayers.map((player, index) => ({
      id: `player_${index + 1}`,
      name: player.name,
      position: player.position,
      nflTeam: player.team,
      isFantasyRelevant: true,
      adp: player.adp,
      rank: index + 1
    }))
  }

  private generateWeeklyData() {
    // Generate game data for weeks 1-3
    for (let week = 1; week <= 3; week++) {
      this.generateWeeklyGames(week)
      this.generateWeeklyPlayerStats(week)
    }
  }

  private generateWeeklyGames(week: number) {
    // Generate matchups for the week
    const shuffledTeams = [...NFL_TEAMS].sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      const homeTeam = shuffledTeams[i]
      const awayTeam = shuffledTeams[i + 1]
      
      if (homeTeam && awayTeam) {
        // Generate game context
        const vegasTotal = 42 + Math.random() * 20 // 42-62 point totals
        const vegasSpread = (Math.random() - 0.5) * 14 // -7 to +7 spread
        const weather = WEATHER_CONDITIONS[Math.floor(Math.random() * WEATHER_CONDITIONS.length)]
        const temperature = weather === 'SNOW' ? 20 + Math.random() * 20 : 60 + Math.random() * 40
        const windSpeed = weather === 'WIND' ? 15 + Math.random() * 20 : Math.random() * 15

        // Home team game data
        this.gameData.push({
          week,
          season: 2025,
          nflTeam: homeTeam,
          opponent: awayTeam,
          homeAway: 'HOME',
          gameScript: vegasSpread / 14, // Normalize spread to game script
          weather,
          temperature: Math.round(temperature),
          windSpeed: Math.round(windSpeed),
          vegasTotal: Math.round(vegasTotal * 2) / 2,
          vegasSpread: Math.round(vegasSpread * 2) / 2
        })

        // Away team game data
        this.gameData.push({
          week,
          season: 2025,
          nflTeam: awayTeam,
          opponent: homeTeam,
          homeAway: 'AWAY',
          gameScript: -vegasSpread / 14, // Opposite game script
          weather,
          temperature: Math.round(temperature),
          windSpeed: Math.round(windSpeed),
          vegasTotal: Math.round(vegasTotal * 2) / 2,
          vegasSpread: Math.round(-vegasSpread * 2) / 2
        })
      }
    }
  }

  private generateWeeklyPlayerStats(week: number) {
    for (const player of this.players) {
      const gameContext = this.gameData.find(g => 
        g.week === week && g.nflTeam === player.nflTeam
      )

      const stats = this.generatePlayerStats(player, week, gameContext)
      this.weeklyStats.push(stats)
    }
  }

  private generatePlayerStats(player: PlayerData, week: number, gameContext?: GameData): WeeklyStats {
    const basePoints = this.getBaseFantasyPoints(player)
    
    // Add week-to-week variance (some players more consistent than others)
    const variance = this.getPlayerVariance(player)
    const weeklyVariation = (Math.random() - 0.5) * variance
    
    // Apply game context modifiers
    let contextModifier = 1.0
    
    if (gameContext) {
      // Game script impact
      if (player.position === 'RB' && gameContext.gameScript > 0.3) {
        contextModifier *= 1.2 // Positive game script helps RBs
      } else if (player.position === 'QB' && gameContext.gameScript < -0.3) {
        contextModifier *= 1.15 // Negative game script helps passing
      }
      
      // Weather impact
      if (gameContext.weather === 'RAIN' || gameContext.windSpeed > 15) {
        if (player.position === 'RB') contextModifier *= 1.1
        else if (['QB', 'WR'].includes(player.position)) contextModifier *= 0.9
      }
      
      // Home/Away impact
      if (gameContext.homeAway === 'HOME') {
        contextModifier *= 1.05
      }
      
      // High-scoring game bonus
      if (gameContext.vegasTotal > 52) {
        contextModifier *= 1.1
      }
    }
    
    const finalPoints = Math.max(0, (basePoints + weeklyVariation) * contextModifier)
    
    // Generate position-specific stats
    const positionStats = this.generatePositionStats(player, finalPoints)
    
    return {
      playerId: player.id,
      week,
      season: 2025,
      fantasyPoints: Math.round(finalPoints * 10) / 10,
      stats: positionStats,
      targetShare: player.position === 'WR' ? 0.15 + Math.random() * 0.25 : undefined,
      snapCount: ['QB', 'RB', 'WR', 'TE'].includes(player.position) ? 
        Math.round(35 + Math.random() * 30) : undefined,
      redZoneCarries: player.position === 'RB' ? Math.round(Math.random() * 5) : undefined,
      gameScript: gameContext?.gameScript,
      weather: gameContext?.weather,
      homeAway: gameContext?.homeAway || 'HOME'
    }
  }

  private getBaseFantasyPoints(player: PlayerData): number {
    const adp = player.adp || 100
    
    switch (player.position) {
      case 'QB':
        if (adp <= 20) return 22 + Math.random() * 8 // Elite QBs: 22-30
        if (adp <= 80) return 18 + Math.random() * 6 // Mid-tier: 18-24
        return 14 + Math.random() * 6 // Low-tier: 14-20
        
      case 'RB':
        if (adp <= 15) return 18 + Math.random() * 10 // Elite RBs: 18-28
        if (adp <= 40) return 12 + Math.random() * 8 // Mid-tier: 12-20
        return 8 + Math.random() * 6 // Low-tier: 8-14
        
      case 'WR':
        if (adp <= 20) return 16 + Math.random() * 8 // Elite WRs: 16-24
        if (adp <= 50) return 11 + Math.random() * 6 // Mid-tier: 11-17
        return 7 + Math.random() * 5 // Low-tier: 7-12
        
      case 'TE':
        if (adp <= 35) return 13 + Math.random() * 7 // Elite TEs: 13-20
        if (adp <= 70) return 9 + Math.random() * 5 // Mid-tier: 9-14
        return 6 + Math.random() * 4 // Low-tier: 6-10
        
      case 'K':
        return 7 + Math.random() * 6 // Kickers: 7-13
        
      case 'DST':
        return 8 + Math.random() * 8 // Defense: 8-16
        
      default:
        return 10
    }
  }

  private getPlayerVariance(player: PlayerData): number {
    // Some players are more consistent than others
    switch (player.position) {
      case 'QB': return 6 // Relatively consistent
      case 'RB': return 8 // More volatile due to game script
      case 'WR': return 10 // Most volatile due to target variance
      case 'TE': return 7 // Moderate consistency
      case 'K': return 5 // Fairly consistent
      case 'DST': return 12 // Very volatile
      default: return 8
    }
  }

  private generatePositionStats(player: PlayerData, fantasyPoints: number): any {
    switch (player.position) {
      case 'QB':
        const passingYards = Math.round(200 + (fantasyPoints / 25) * 150)
        const passingTDs = Math.round((fantasyPoints / 25) * 2.5)
        const rushingYards = Math.round((fantasyPoints / 25) * 30)
        const rushingTDs = fantasyPoints > 25 ? Math.round(Math.random()) : 0
        const interceptions = Math.random() < 0.3 ? 1 : 0
        
        return {
          passingYards,
          passingTDs,
          interceptions,
          rushingYards,
          rushingTDs,
          completions: Math.round(passingYards / 12),
          attempts: Math.round(passingYards / 8)
        }
        
      case 'RB':
        const rushYards = Math.round(50 + (fantasyPoints / 20) * 80)
        const rushTDs = Math.round((fantasyPoints / 20) * 1.2)
        const receptions = Math.round((fantasyPoints / 20) * 4)
        const recYards = Math.round(receptions * 8)
        const recTDs = fantasyPoints > 20 ? Math.round(Math.random() * 0.5) : 0
        
        return {
          rushingYards: rushYards,
          rushingTDs: rushTDs,
          receptions: receptions,
          receivingYards: recYards,
          receivingTDs: recTDs,
          carries: Math.round(rushYards / 4.2),
          targets: Math.round(receptions * 1.3)
        }
        
      case 'WR':
        const targets = Math.round(5 + (fantasyPoints / 15) * 8)
        const catches = Math.round(targets * 0.65)
        const yards = Math.round(catches * 12)
        const tds = Math.round((fantasyPoints / 15) * 0.8)
        
        return {
          targets,
          receptions: catches,
          receivingYards: yards,
          receivingTDs: tds,
          rushingYards: Math.random() < 0.1 ? Math.round(Math.random() * 20) : 0,
          rushingTDs: 0
        }
        
      case 'TE':
        const teTargets = Math.round(4 + (fantasyPoints / 12) * 6)
        const teCatches = Math.round(teTargets * 0.7)
        const teYards = Math.round(teCatches * 11)
        const teTDs = Math.round((fantasyPoints / 12) * 0.7)
        
        return {
          targets: teTargets,
          receptions: teCatches,
          receivingYards: teYards,
          receivingTDs: teTDs
        }
        
      case 'K':
        const fgMade = Math.round((fantasyPoints / 10) * 2)
        const fgAttempts = fgMade + (Math.random() < 0.2 ? 1 : 0)
        const extraPoints = Math.round((fantasyPoints / 10) * 2)
        
        return {
          fieldGoalsMade: fgMade,
          fieldGoalAttempts: fgAttempts,
          extraPointsMade: extraPoints,
          extraPointAttempts: extraPoints
        }
        
      case 'DST':
        const sacks = Math.round((fantasyPoints / 10) * 3)
        const defensiveInterceptions = Math.round((fantasyPoints / 10) * 1.5)
        const fumbleRecoveries = Math.round((fantasyPoints / 10) * 1)
        const defensiveTDs = fantasyPoints > 12 ? Math.round(Math.random() * 0.5) : 0
        const pointsAllowed = Math.round(25 - (fantasyPoints / 10) * 5)
        
        return {
          sacks,
          interceptions: defensiveInterceptions,
          fumbleRecoveries,
          defensiveTDs,
          pointsAllowed: Math.max(0, pointsAllowed),
          yardsAllowed: Math.round(350 - (fantasyPoints / 10) * 50)
        }
        
      default:
        return {}
    }
  }

  // Public methods to get generated data
  getPlayers(): PlayerData[] {
    return this.players
  }

  getWeeklyStats(): WeeklyStats[] {
    return this.weeklyStats
  }

  getGameData(): GameData[] {
    return this.gameData
  }

  getPlayerStats(playerId: string, week?: number): WeeklyStats[] {
    return this.weeklyStats.filter(stat => 
      stat.playerId === playerId && (week ? stat.week === week : true)
    )
  }

  getWeekStats(week: number): WeeklyStats[] {
    return this.weeklyStats.filter(stat => stat.week === week)
  }

  // Generate trending narratives for AI analysis
  generateTrendingInsights(): string[] {
    const insights = [
      "Josh Jacobs showing elite volume with 20+ carries in 2 of 3 games",
      "DeAndre Hopkins target share increasing each week (18% → 22% → 26%)",
      "Miami passing game struggling in road games (15% fewer yards away)",
      "Week 3 saw historically high red zone efficiency across the league",
      "Weather-impacted games showing 12% decrease in passing volume",
      "Young WRs breaking out: 3 rookie receivers with 15+ point games",
      "RB1 vs RB2 efficiency gap widening - handcuffs gaining value",
      "TE position showing more consistency than projections suggested",
      "Kickers in dome games significantly outperforming outdoor",
      "Defenses facing rookie QBs averaging 3.2 more fantasy points"
    ]

    return insights.sort(() => Math.random() - 0.5).slice(0, 5)
  }

  // Generate injury reports for risk analysis
  generateInjuryReports(): Array<{playerId: string, severity: string, impact: string}> {
    const randomPlayers = this.players
      .filter(p => ['QB', 'RB', 'WR', 'TE'].includes(p.position))
      .sort(() => Math.random() - 0.5)
      .slice(0, 8)

    const severities = ['QUESTIONABLE', 'DOUBTFUL', 'OUT', 'IR']
    const impacts = ['HIGH', 'MEDIUM', 'LOW']

    return randomPlayers.map(player => ({
      playerId: player.id,
      severity: severities[Math.floor(Math.random() * severities.length)],
      impact: impacts[Math.floor(Math.random() * impacts.length)]
    }))
  }
}

// Export singleton instance for use throughout the app
export const fantasyDataGenerator = new FantasyDataGenerator()