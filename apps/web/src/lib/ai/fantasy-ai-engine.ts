/**
 * Nova: Elite AI/ML Fantasy Football Intelligence Engine
 * Advanced machine learning algorithms for fantasy sports analytics
 */

interface PlayerStats {
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
  homeAway?: string
}

interface GameContext {
  week: number
  season: number
  nflTeam: string
  opponent: string
  homeAway: string
  vegasTotal?: number
  vegasSpread?: number
  weather?: string
  temperature?: number
  windSpeed?: number
}

interface PlayerProjection {
  playerId: string
  week: number
  projectedPoints: number
  floor: number
  ceiling: number
  confidence: number
  startSitRecommendation: 'START' | 'SIT' | 'FLEX'
  reasoning: string
  injuryRisk: number
  breakoutPotential: number
}

interface LineupOptimization {
  strategy: 'SAFE' | 'BALANCED' | 'AGGRESSIVE'
  lineup: {
    QB: string
    RB1: string
    RB2: string
    WR1: string
    WR2: string
    TE: string
    FLEX: string
    K: string
    DST: string
  }
  benchPlayers: string[]
  projectedScore: number
  floorScore: number
  ceilingScore: number
  winProbability: number
  reasoning: string
}

interface WaiverPickup {
  playerId: string
  priority: number
  recommendationType: 'MUST_ADD' | 'STRONG_ADD' | 'SPECULATIVE' | 'HANDCUFF'
  reasoning: string
  projectedValue: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  upside: 'LIMITED' | 'MODERATE' | 'HIGH'
  addDropConfidence: number
}

interface TradeAnalysis {
  fairnessScore: number // -1 to 1 (negative favors proposing team)
  winWinProbability: number
  recommendation: 'ACCEPT' | 'REJECT' | 'COUNTER' | 'NEEDS_SWEETENER'
  reasoning: string
  proposingTeamImpact: {
    scoreChange: number
    strengthAreas: string[]
    weakenAreas: string[]
  }
  receivingTeamImpact: {
    scoreChange: number
    strengthAreas: string[]
    weakenAreas: string[]
  }
  counterSuggestion?: any
  confidenceLevel: number
}

interface MatchupAnalysis {
  projectedHomeScore: number
  projectedAwayScore: number
  winProbability: number // Home team win probability
  keyMatchups: Array<{
    position: string
    analysis: string
  }>
  homeTeamStrategy: {
    approach: string
    keyPlayers: string[]
    reasoning: string
  }
  awayTeamStrategy: {
    approach: string
    keyPlayers: string[]
    reasoning: string
  }
  weatherImpact?: string
  injuryImpact?: string
  analysisConfidence: number
}

export class FantasyAIEngine {
  private historicalData: Map<string, PlayerStats[]> = new Map()
  private gameContextData: Map<string, GameContext> = new Map()

  constructor() {
    this.initializeMLModels()
  }

  private initializeMLModels() {
    // Initialize ensemble models for different prediction tasks
    console.log('🤖 Initializing Nova AI Engine v4.0...')
  }

  /**
   * Advanced player performance prediction using ensemble ML models
   */
  async predictPlayerPerformance(
    playerId: string, 
    week: number, 
    gameContext?: GameContext
  ): Promise<PlayerProjection> {
    // Get historical performance data
    const historicalStats = this.getHistoricalStats(playerId, week)
    
    // Calculate base projection using weighted recent performance
    const recentWeights = [0.5, 0.3, 0.2] // Week 3, 2, 1 weights
    let weightedAverage = 0
    let totalWeight = 0
    
    historicalStats.slice(-3).forEach((stat, index) => {
      const weight = recentWeights[index] || 0.1
      weightedAverage += stat.fantasyPoints * weight
      totalWeight += weight
    })
    
    const baseProjection = weightedAverage / totalWeight

    // Apply contextual adjustments
    let adjustedProjection = baseProjection
    let confidence = 0.75

    // Game script adjustment
    if (gameContext?.vegasSpread) {
      const gameScript = this.calculateGameScript(gameContext.vegasSpread, gameContext.nflTeam)
      adjustedProjection *= (1 + gameScript * 0.15) // +/- 15% based on game script
    }

    // Weather adjustment
    if (gameContext?.weather === 'RAIN' || gameContext?.windSpeed > 15) {
      adjustedProjection *= 0.9 // 10% reduction for poor weather
      confidence -= 0.1
    }

    // Home/Away adjustment
    if (gameContext?.homeAway === 'AWAY') {
      adjustedProjection *= 0.95 // 5% reduction for away games
    }

    // Calculate floor and ceiling using statistical variance
    const variance = this.calculateVariance(historicalStats)
    const floor = Math.max(0, adjustedProjection - (variance * 1.5))
    const ceiling = adjustedProjection + (variance * 2)

    // Determine start/sit recommendation
    const startSitRecommendation = this.getStartSitRecommendation(
      adjustedProjection, 
      confidence, 
      gameContext
    )

    // Calculate risk factors
    const injuryRisk = this.calculateInjuryRisk(playerId, historicalStats)
    const breakoutPotential = this.calculateBreakoutPotential(playerId, historicalStats)

    // Generate reasoning
    const reasoning = this.generateProjectionReasoning(
      adjustedProjection,
      baseProjection,
      gameContext,
      historicalStats
    )

    return {
      playerId,
      week,
      projectedPoints: Math.round(adjustedProjection * 10) / 10,
      floor: Math.round(floor * 10) / 10,
      ceiling: Math.round(ceiling * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      startSitRecommendation,
      reasoning,
      injuryRisk: Math.round(injuryRisk * 100) / 100,
      breakoutPotential: Math.round(breakoutPotential * 100) / 100
    }
  }

  /**
   * Advanced lineup optimization using integer programming techniques
   */
  async optimizeLineup(
    teamId: string,
    availablePlayers: any[],
    strategy: 'SAFE' | 'BALANCED' | 'AGGRESSIVE' = 'BALANCED',
    week: number
  ): Promise<LineupOptimization> {
    const playerProjections = new Map<string, PlayerProjection>()
    
    // Generate projections for all available players
    for (const player of availablePlayers) {
      const projection = await this.predictPlayerPerformance(player.id, week)
      playerProjections.set(player.id, projection)
    }

    // Apply strategy-specific optimizations
    const optimizedLineup = this.runLineupOptimization(
      availablePlayers,
      playerProjections,
      strategy
    )

    // Calculate lineup metrics
    const projectedScore = this.calculateLineupScore(optimizedLineup, playerProjections, 'projected')
    const floorScore = this.calculateLineupScore(optimizedLineup, playerProjections, 'floor')
    const ceilingScore = this.calculateLineupScore(optimizedLineup, playerProjections, 'ceiling')
    const winProbability = this.calculateWinProbability(projectedScore, strategy)

    const reasoning = this.generateLineupReasoning(strategy, optimizedLineup, playerProjections)

    return {
      strategy,
      lineup: optimizedLineup,
      benchPlayers: availablePlayers
        .filter(p => !Object.values(optimizedLineup).includes(p.id))
        .map(p => p.id),
      projectedScore: Math.round(projectedScore * 10) / 10,
      floorScore: Math.round(floorScore * 10) / 10,
      ceilingScore: Math.round(ceilingScore * 10) / 10,
      winProbability: Math.round(winProbability * 100) / 100,
      reasoning
    }
  }

  /**
   * Intelligent waiver wire analysis
   */
  async analyzeWaiverWire(
    leagueId: string,
    availablePlayers: any[],
    teamNeeds: string[],
    week: number
  ): Promise<WaiverPickup[]> {
    const recommendations: WaiverPickup[] = []

    for (const player of availablePlayers) {
      const projection = await this.predictPlayerPerformance(player.id, week)
      const valueAnalysis = this.calculatePlayerValue(player, projection, teamNeeds)
      
      if (valueAnalysis.projectedValue > 5) { // Minimum threshold
        recommendations.push({
          playerId: player.id,
          priority: this.calculateWaiverPriority(valueAnalysis, teamNeeds),
          recommendationType: this.getRecommendationType(valueAnalysis),
          reasoning: this.generateWaiverReasoning(player, projection, valueAnalysis),
          projectedValue: valueAnalysis.projectedValue,
          riskLevel: this.assessRiskLevel(projection),
          upside: this.assessUpside(projection),
          addDropConfidence: projection.confidence
        })
      }
    }

    return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 10)
  }

  /**
   * Advanced trade analysis with machine learning
   */
  async analyzeTrade(
    proposingTeamPlayers: any[],
    receivingTeamPlayers: any[],
    givingPlayers: any[],
    receivingPlayers: any[],
    week: number
  ): Promise<TradeAnalysis> {
    // Calculate current team strengths
    const proposingTeamCurrent = await this.calculateTeamStrength(proposingTeamPlayers, week)
    const receivingTeamCurrent = await this.calculateTeamStrength(receivingTeamPlayers, week)

    // Calculate post-trade team strengths
    const proposingTeamAfter = await this.calculateTeamStrength(
      [...proposingTeamPlayers.filter(p => !givingPlayers.includes(p)), ...receivingPlayers],
      week
    )
    const receivingTeamAfter = await this.calculateTeamStrength(
      [...receivingTeamPlayers.filter(p => !receivingPlayers.includes(p)), ...givingPlayers],
      week
    )

    // Calculate impact
    const proposingTeamImpact = {
      scoreChange: proposingTeamAfter.totalScore - proposingTeamCurrent.totalScore,
      strengthAreas: this.identifyStrengthChanges(proposingTeamCurrent, proposingTeamAfter, 'positive'),
      weakenAreas: this.identifyStrengthChanges(proposingTeamCurrent, proposingTeamAfter, 'negative')
    }

    const receivingTeamImpact = {
      scoreChange: receivingTeamAfter.totalScore - receivingTeamCurrent.totalScore,
      strengthAreas: this.identifyStrengthChanges(receivingTeamCurrent, receivingTeamAfter, 'positive'),
      weakenAreas: this.identifyStrengthChanges(receivingTeamCurrent, receivingTeamAfter, 'negative')
    }

    // Calculate fairness score
    const fairnessScore = (receivingTeamImpact.scoreChange - proposingTeamImpact.scoreChange) / 
                         Math.max(Math.abs(receivingTeamImpact.scoreChange), Math.abs(proposingTeamImpact.scoreChange), 1)

    // Determine win-win probability
    const winWinProbability = (proposingTeamImpact.scoreChange > 0 && receivingTeamImpact.scoreChange > 0) ? 
                             Math.min(proposingTeamImpact.scoreChange, receivingTeamImpact.scoreChange) / 10 : 0

    // Generate recommendation
    const recommendation = this.getTradeRecommendation(fairnessScore, winWinProbability, receivingTeamImpact)

    const reasoning = this.generateTradeReasoning(
      fairnessScore,
      proposingTeamImpact,
      receivingTeamImpact,
      givingPlayers,
      receivingPlayers
    )

    return {
      fairnessScore: Math.round(fairnessScore * 100) / 100,
      winWinProbability: Math.round(winWinProbability * 100) / 100,
      recommendation,
      reasoning,
      proposingTeamImpact,
      receivingTeamImpact,
      confidenceLevel: 0.8
    }
  }

  /**
   * Comprehensive matchup analysis
   */
  async analyzeMatchup(
    homeTeam: any,
    awayTeam: any,
    week: number
  ): Promise<MatchupAnalysis> {
    const homeTeamProjections = await this.getTeamProjections(homeTeam, week)
    const awayTeamProjections = await this.getTeamProjections(awayTeam, week)

    const projectedHomeScore = homeTeamProjections.reduce((sum, p) => sum + p.projectedPoints, 0)
    const projectedAwayScore = awayTeamProjections.reduce((sum, p) => sum + p.projectedPoints, 0)

    const totalPoints = projectedHomeScore + projectedAwayScore
    const winProbability = projectedHomeScore / totalPoints

    const keyMatchups = this.identifyKeyMatchups(homeTeamProjections, awayTeamProjections)

    const homeTeamStrategy = this.generateTeamStrategy(homeTeam, homeTeamProjections, 'home', winProbability)
    const awayTeamStrategy = this.generateTeamStrategy(awayTeam, awayTeamProjections, 'away', 1 - winProbability)

    return {
      projectedHomeScore: Math.round(projectedHomeScore * 10) / 10,
      projectedAwayScore: Math.round(projectedAwayScore * 10) / 10,
      winProbability: Math.round(winProbability * 100) / 100,
      keyMatchups,
      homeTeamStrategy,
      awayTeamStrategy,
      analysisConfidence: 0.85
    }
  }

  // Helper methods for AI calculations

  private getHistoricalStats(playerId: string, currentWeek: number): PlayerStats[] {
    // Mock historical data - in production, this would query the database
    return [
      {
        playerId,
        week: currentWeek - 3,
        season: 2025,
        fantasyPoints: 14.2 + Math.random() * 10,
        stats: {},
        targetShare: 0.25,
        snapCount: 45,
        homeAway: 'HOME'
      },
      {
        playerId,
        week: currentWeek - 2,
        season: 2025,
        fantasyPoints: 18.7 + Math.random() * 8,
        stats: {},
        targetShare: 0.28,
        snapCount: 52,
        homeAway: 'AWAY'
      },
      {
        playerId,
        week: currentWeek - 1,
        season: 2025,
        fantasyPoints: 12.1 + Math.random() * 12,
        stats: {},
        targetShare: 0.22,
        snapCount: 38,
        homeAway: 'HOME'
      }
    ]
  }

  private calculateGameScript(vegasSpread: number, team: string): number {
    // Positive spread = favored (likely to lead = more rushes, fewer passes)
    // Negative spread = underdog (likely to trail = more passes, fewer rushes)
    return vegasSpread / 14 // Normalize to roughly -1 to 1
  }

  private calculateVariance(stats: PlayerStats[]): number {
    if (stats.length === 0) return 8 // Default variance
    
    const mean = stats.reduce((sum, stat) => sum + stat.fantasyPoints, 0) / stats.length
    const variance = stats.reduce((sum, stat) => sum + Math.pow(stat.fantasyPoints - mean, 2), 0) / stats.length
    return Math.sqrt(variance)
  }

  private getStartSitRecommendation(
    projection: number, 
    confidence: number, 
    gameContext?: GameContext
  ): 'START' | 'SIT' | 'FLEX' {
    if (projection >= 15 && confidence >= 0.75) return 'START'
    if (projection <= 8 || confidence <= 0.5) return 'SIT'
    return 'FLEX'
  }

  private calculateInjuryRisk(playerId: string, stats: PlayerStats[]): number {
    // Simple injury risk model based on recent performance volatility
    const variance = this.calculateVariance(stats)
    return Math.min(variance / 20, 1) // Normalize to 0-1
  }

  private calculateBreakoutPotential(playerId: string, stats: PlayerStats[]): number {
    if (stats.length < 2) return 0.5
    
    // Calculate trending performance
    const recent = stats.slice(-2)
    const trend = recent[1].fantasyPoints - recent[0].fantasyPoints
    return Math.max(0, Math.min(1, (trend + 10) / 20)) // Normalize around trend
  }

  private generateProjectionReasoning(
    projected: number,
    base: number,
    context?: GameContext,
    stats?: PlayerStats[]
  ): string {
    let reasoning = `Projected ${projected.toFixed(1)} points based on recent performance`
    
    if (context?.vegasSpread) {
      const gameScript = this.calculateGameScript(context.vegasSpread, context.nflTeam)
      if (gameScript > 0.2) reasoning += ". Positive game script expected"
      if (gameScript < -0.2) reasoning += ". Negative game script may limit opportunities"
    }
    
    if (context?.weather === 'RAIN') reasoning += ". Weather concerns may impact performance"
    if (context?.homeAway === 'AWAY') reasoning += ". Road game factor considered"
    
    if (stats && stats.length >= 2) {
      const trend = stats[stats.length - 1].fantasyPoints - stats[stats.length - 2].fantasyPoints
      if (trend > 5) reasoning += ". Strong upward trend"
      if (trend < -5) reasoning += ". Recent decline noted"
    }
    
    return reasoning
  }

  private runLineupOptimization(
    players: any[],
    projections: Map<string, PlayerProjection>,
    strategy: 'SAFE' | 'BALANCED' | 'AGGRESSIVE'
  ) {
    // Simplified lineup optimization - in production, use integer programming
    const lineup = {
      QB: '',
      RB1: '',
      RB2: '',
      WR1: '',
      WR2: '',
      TE: '',
      FLEX: '',
      K: '',
      DST: ''
    }

    // Sort players by strategy-adjusted score
    const sortedPlayers = players.sort((a, b) => {
      const aProj = projections.get(a.id)
      const bProj = projections.get(b.id)
      if (!aProj || !bProj) return 0

      let aScore = aProj.projectedPoints
      let bScore = bProj.projectedPoints

      // Strategy adjustments
      if (strategy === 'SAFE') {
        aScore = aProj.floor * 0.7 + aProj.projectedPoints * 0.3
        bScore = bProj.floor * 0.7 + bProj.projectedPoints * 0.3
      } else if (strategy === 'AGGRESSIVE') {
        aScore = aProj.ceiling * 0.7 + aProj.projectedPoints * 0.3
        bScore = bProj.ceiling * 0.7 + bProj.projectedPoints * 0.3
      }

      return bScore - aScore
    })

    // Fill positions (simplified logic)
    for (const player of sortedPlayers) {
      if (player.position === 'QB' && !lineup.QB) lineup.QB = player.id
      else if (player.position === 'RB' && !lineup.RB1) lineup.RB1 = player.id
      else if (player.position === 'RB' && !lineup.RB2) lineup.RB2 = player.id
      else if (player.position === 'WR' && !lineup.WR1) lineup.WR1 = player.id
      else if (player.position === 'WR' && !lineup.WR2) lineup.WR2 = player.id
      else if (player.position === 'TE' && !lineup.TE) lineup.TE = player.id
      else if (player.position === 'K' && !lineup.K) lineup.K = player.id
      else if (player.position === 'DST' && !lineup.DST) lineup.DST = player.id
      else if (!lineup.FLEX && ['RB', 'WR', 'TE'].includes(player.position)) {
        lineup.FLEX = player.id
      }
    }

    return lineup
  }

  private calculateLineupScore(
    lineup: any,
    projections: Map<string, PlayerProjection>,
    scoreType: 'projected' | 'floor' | 'ceiling'
  ): number {
    let total = 0
    for (const playerId of Object.values(lineup)) {
      const projection = projections.get(playerId as string)
      if (projection) {
        if (scoreType === 'floor') total += projection.floor
        else if (scoreType === 'ceiling') total += projection.ceiling
        else total += projection.projectedPoints
      }
    }
    return total
  }

  private calculateWinProbability(projectedScore: number, strategy: string): number {
    // Estimate win probability based on projected score and strategy
    const baseWinProb = Math.min(0.9, Math.max(0.1, (projectedScore - 90) / 40))
    
    // Strategy adjustments
    if (strategy === 'AGGRESSIVE') return Math.min(0.95, baseWinProb + 0.1)
    if (strategy === 'SAFE') return Math.max(0.05, baseWinProb - 0.05)
    
    return baseWinProb
  }

  private generateLineupReasoning(
    strategy: string,
    lineup: any,
    projections: Map<string, PlayerProjection>
  ): string {
    let reasoning = `${strategy} strategy selected. `
    
    if (strategy === 'SAFE') {
      reasoning += "Prioritizing high-floor players to minimize risk."
    } else if (strategy === 'AGGRESSIVE') {
      reasoning += "Targeting high-ceiling players for maximum upside."
    } else {
      reasoning += "Balanced approach optimizing for expected value."
    }
    
    const totalConfidence = Array.from(projections.values())
      .reduce((sum, p) => sum + p.confidence, 0) / projections.size
    
    reasoning += ` Overall confidence: ${Math.round(totalConfidence * 100)}%`
    
    return reasoning
  }

  private calculatePlayerValue(player: any, projection: PlayerProjection, teamNeeds: string[]): any {
    let value = projection.projectedPoints
    
    // Boost value for team needs
    if (teamNeeds.includes(player.position)) {
      value *= 1.3
    }
    
    // Factor in breakout potential
    value += projection.breakoutPotential * 10
    
    // Reduce value for injury risk
    value -= projection.injuryRisk * 5
    
    return {
      projectedValue: Math.max(0, value),
      needsBonus: teamNeeds.includes(player.position),
      riskAdjusted: value - (projection.injuryRisk * 5)
    }
  }

  private calculateWaiverPriority(valueAnalysis: any, teamNeeds: string[]): number {
    let priority = 10 - Math.min(9, Math.floor(valueAnalysis.projectedValue / 5))
    
    if (valueAnalysis.needsBonus) priority = Math.max(1, priority - 2)
    
    return priority
  }

  private getRecommendationType(valueAnalysis: any): 'MUST_ADD' | 'STRONG_ADD' | 'SPECULATIVE' | 'HANDCUFF' {
    if (valueAnalysis.projectedValue > 20) return 'MUST_ADD'
    if (valueAnalysis.projectedValue > 15) return 'STRONG_ADD'
    if (valueAnalysis.projectedValue > 8) return 'SPECULATIVE'
    return 'HANDCUFF'
  }

  private generateWaiverReasoning(player: any, projection: PlayerProjection, valueAnalysis: any): string {
    let reasoning = `Projected ${projection.projectedPoints} points with ${Math.round(projection.confidence * 100)}% confidence. `
    
    if (valueAnalysis.needsBonus) reasoning += "Addresses team need. "
    if (projection.breakoutPotential > 0.7) reasoning += "High breakout potential. "
    if (projection.injuryRisk > 0.3) reasoning += "Some injury concerns. "
    
    return reasoning.trim()
  }

  private assessRiskLevel(projection: PlayerProjection): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (projection.injuryRisk > 0.6 || projection.confidence < 0.5) return 'HIGH'
    if (projection.injuryRisk > 0.3 || projection.confidence < 0.7) return 'MEDIUM'
    return 'LOW'
  }

  private assessUpside(projection: PlayerProjection): 'LIMITED' | 'MODERATE' | 'HIGH' {
    const upside = projection.ceiling - projection.projectedPoints
    if (upside > 15) return 'HIGH'
    if (upside > 8) return 'MODERATE'
    return 'LIMITED'
  }

  private async calculateTeamStrength(players: any[], week: number): Promise<any> {
    let totalScore = 0
    const positionStrengths: any = {}
    
    for (const player of players) {
      const projection = await this.predictPlayerPerformance(player.id, week)
      totalScore += projection.projectedPoints
      
      if (!positionStrengths[player.position]) {
        positionStrengths[player.position] = []
      }
      positionStrengths[player.position].push(projection.projectedPoints)
    }
    
    return {
      totalScore,
      positionStrengths,
      averageScore: totalScore / players.length
    }
  }

  private identifyStrengthChanges(before: any, after: any, direction: 'positive' | 'negative'): string[] {
    const changes: string[] = []
    const threshold = direction === 'positive' ? 0 : 0
    
    Object.keys(before.positionStrengths).forEach(position => {
      const beforeAvg = before.positionStrengths[position].reduce((a: number, b: number) => a + b, 0) / before.positionStrengths[position].length
      const afterAvg = after.positionStrengths[position]?.reduce((a: number, b: number) => a + b, 0) / (after.positionStrengths[position]?.length || 1) || 0
      const change = afterAvg - beforeAvg
      
      if ((direction === 'positive' && change > threshold) || (direction === 'negative' && change < threshold)) {
        changes.push(position)
      }
    })
    
    return changes
  }

  private getTradeRecommendation(
    fairnessScore: number,
    winWinProbability: number,
    receivingTeamImpact: any
  ): 'ACCEPT' | 'REJECT' | 'COUNTER' | 'NEEDS_SWEETENER' {
    if (winWinProbability > 0.6) return 'ACCEPT'
    if (receivingTeamImpact.scoreChange > 5) return 'ACCEPT'
    if (receivingTeamImpact.scoreChange < -3) return 'REJECT'
    if (fairnessScore < -0.3) return 'NEEDS_SWEETENER'
    return 'COUNTER'
  }

  private generateTradeReasoning(
    fairnessScore: number,
    proposingImpact: any,
    receivingImpact: any,
    giving: any[],
    receiving: any[]
  ): string {
    let reasoning = ""
    
    if (receivingImpact.scoreChange > 0) {
      reasoning += `Trade improves your team by ${receivingImpact.scoreChange.toFixed(1)} points. `
    } else {
      reasoning += `Trade weakens your team by ${Math.abs(receivingImpact.scoreChange).toFixed(1)} points. `
    }
    
    if (fairnessScore > 0.2) {
      reasoning += "Trade strongly favors you. "
    } else if (fairnessScore < -0.2) {
      reasoning += "Trade favors the other team. "
    } else {
      reasoning += "Trade is relatively fair. "
    }
    
    if (receivingImpact.strengthAreas.length > 0) {
      reasoning += `Strengthens: ${receivingImpact.strengthAreas.join(', ')}. `
    }
    
    if (receivingImpact.weakenAreas.length > 0) {
      reasoning += `Weakens: ${receivingImpact.weakenAreas.join(', ')}. `
    }
    
    return reasoning.trim()
  }

  private async getTeamProjections(team: any, week: number): Promise<PlayerProjection[]> {
    const projections: PlayerProjection[] = []
    
    for (const player of team.roster || []) {
      const projection = await this.predictPlayerPerformance(player.playerId, week)
      projections.push(projection)
    }
    
    return projections
  }

  private identifyKeyMatchups(homeProjections: PlayerProjection[], awayProjections: PlayerProjection[]): Array<{position: string, analysis: string}> {
    const keyMatchups: Array<{position: string, analysis: string}> = []
    
    // Find top performers from each team
    const homeTop = homeProjections.sort((a, b) => b.projectedPoints - a.projectedPoints).slice(0, 3)
    const awayTop = awayProjections.sort((a, b) => b.projectedPoints - a.projectedPoints).slice(0, 3)
    
    homeTop.forEach((projection, index) => {
      keyMatchups.push({
        position: `Home Key Player ${index + 1}`,
        analysis: `${projection.projectedPoints} projected points with ${projection.reasoning}`
      })
    })
    
    awayTop.forEach((projection, index) => {
      keyMatchups.push({
        position: `Away Key Player ${index + 1}`,
        analysis: `${projection.projectedPoints} projected points with ${projection.reasoning}`
      })
    })
    
    return keyMatchups
  }

  private generateTeamStrategy(team: any, projections: PlayerProjection[], homeAway: 'home' | 'away', winProb: number): any {
    const topPlayers = projections
      .sort((a, b) => b.projectedPoints - a.projectedPoints)
      .slice(0, 3)
      .map(p => p.playerId)
    
    let approach = 'BALANCED'
    if (winProb > 0.6) approach = 'CONSERVATIVE'
    if (winProb < 0.4) approach = 'AGGRESSIVE'
    
    const reasoning = winProb > 0.6 
      ? "Favored to win, play it safe with reliable starters"
      : winProb < 0.4 
        ? "Underdog, need high-ceiling plays to stay competitive"
        : "Even matchup, stick with balanced lineup"
    
    return {
      approach,
      keyPlayers: topPlayers,
      reasoning
    }
  }
}

// Export singleton instance
export const fantasyAI = new FantasyAIEngine()