'use client'

import predictionEngine, { type PlayerPrediction } from './predictionEngine'

export interface TradePlayer {
  playerId: string
  name: string
  position: string
  team: string
  currentValue: number
  projectedValue: number
  injuryRisk: number
  consistencyScore: number
  upside: number
  scheduleStrength: number
}

export interface TradeProposal {
  id: string
  sendingTeamId: string
  receivingTeamId: string
  playersOffered: TradePlayer[]
  playersRequested: TradePlayer[]
  createdAt: string
}

export interface TradeAnalysis {
  tradeId: string
  overallRating: 'excellent' | 'good' | 'fair' | 'poor' | 'terrible'
  fairnessScore: number
  winnerTeamId: string | null
  valueGap: number
  
  analysis: {
    sendingTeam: {
      currentValue: number
      projectedValue: number
      riskLevel: 'low' | 'medium' | 'high'
      positionImpact: Record<string, number>
      strengthsGained: string[]
      weaknessesCreated: string[]
    }
    receivingTeam: {
      currentValue: number
      projectedValue: number
      riskLevel: 'low' | 'medium' | 'high'
      positionImpact: Record<string, number>
      strengthsGained: string[]
      weaknessesCreated: string[]
    }
  }
  
  recommendations: {
    shouldAccept: boolean
    reasons: string[]
    counterOffers?: {
      playerId: string
      reason: string
    }[]
    timing: 'accept_now' | 'wait' | 'reject'
  }
  
  marketContext: {
    similarTrades: Array<{
      players: string[]
      fairnessScore: number
      date: string
    }>
    playerTrends: Record<string, 'rising' | 'falling' | 'stable'>
    injuryReports: Record<string, string>
  }
}

export interface LineupOptimization {
  teamId: string
  week: number
  lineup: {
    quarterback: string
    runningBacks: string[]
    wideReceivers: string[]
    tightEnd: string
    flex: string[]
    defense: string
    kicker: string
    bench: string[]
  }
  projectedPoints: number
  confidence: number
  alternatives: Array<{
    position: string
    currentPlayer: string
    suggestedPlayer: string
    pointsGain: number
    reason: string
  }>
  matchupAdvice: Array<{
    playerId: string
    advice: string
    reasoning: string
  }>
}

class TradeAnalyzerService {
  private playerCache: Map<string, TradePlayer> = new Map()
  private analysisCache: Map<string, TradeAnalysis> = new Map()

  async analyzeTrade(proposal: TradeProposal): Promise<TradeAnalysis> {
    const cacheKey = `${proposal.id}_${proposal.playersOffered.map(p => p.playerId).join(',')}_${proposal.playersRequested.map(p => p.playerId).join(',')}`
    
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!
    }

    try {
      const [offeredPlayersAnalysis, requestedPlayersAnalysis] = await Promise.all([
        this.analyzePlayerGroup(proposal.playersOffered),
        this.analyzePlayerGroup(proposal.playersRequested)
      ])

      const analysis = await this.performTradeAnalysis(
        proposal,
        offeredPlayersAnalysis,
        requestedPlayersAnalysis
      )

      this.analysisCache.set(cacheKey, analysis)
      return analysis
    } catch (error) {
      console.error('Trade analysis failed:', error)
      return this.getFallbackAnalysis(proposal)
    }
  }

  private async analyzePlayerGroup(players: TradePlayer[]) {
    const predictions = await Promise.all(
      players.map(player => predictionEngine.predictPlayerPerformance(player.playerId))
    )

    return players.map((player, index) => ({
      ...player,
      prediction: predictions[index],
      riskFactors: this.calculateRiskFactors(player, predictions[index]),
      marketTrend: this.analyzePlayerMarketTrend(player)
    }))
  }

  private async performTradeAnalysis(
    proposal: TradeProposal,
    offeredAnalysis: any[],
    requestedAnalysis: any[]
  ): Promise<TradeAnalysis> {
    const offeredValue = this.calculateTotalValue(offeredAnalysis)
    const requestedValue = this.calculateTotalValue(requestedAnalysis)
    const valueGap = Math.abs(offeredValue.total - requestedValue.total)
    const fairnessScore = Math.max(0, 100 - (valueGap / Math.max(offeredValue.total, requestedValue.total)) * 100)

    const overallRating = this.getRatingFromScore(fairnessScore)
    const winnerTeamId = offeredValue.total > requestedValue.total ? proposal.sendingTeamId : 
                        requestedValue.total > offeredValue.total ? proposal.receivingTeamId : null

    return {
      tradeId: proposal.id,
      overallRating,
      fairnessScore,
      winnerTeamId,
      valueGap,
      analysis: {
        sendingTeam: {
          currentValue: offeredValue.current,
          projectedValue: offeredValue.projected,
          riskLevel: this.calculateRiskLevel(offeredAnalysis),
          positionImpact: this.calculatePositionImpact(proposal.playersOffered, 'losing'),
          strengthsGained: this.identifyStrengths(requestedAnalysis),
          weaknessesCreated: this.identifyWeaknesses(offeredAnalysis)
        },
        receivingTeam: {
          currentValue: requestedValue.current,
          projectedValue: requestedValue.projected,
          riskLevel: this.calculateRiskLevel(requestedAnalysis),
          positionImpact: this.calculatePositionImpact(proposal.playersRequested, 'losing'),
          strengthsGained: this.identifyStrengths(offeredAnalysis),
          weaknessesCreated: this.identifyWeaknesses(requestedAnalysis)
        }
      },
      recommendations: await this.generateRecommendations(proposal, offeredAnalysis, requestedAnalysis, fairnessScore),
      marketContext: await this.getMarketContext(proposal)
    }
  }

  private calculateTotalValue(playerAnalyses: any[]) {
    const current = playerAnalyses.reduce((sum, p) => sum + p.currentValue, 0)
    const projected = playerAnalyses.reduce((sum, p) => sum + p.projectedValue, 0)
    const upside = playerAnalyses.reduce((sum, p) => sum + p.upside, 0)
    const risk = playerAnalyses.reduce((sum, p) => sum + p.injuryRisk, 0) / playerAnalyses.length

    return {
      current,
      projected,
      upside,
      risk,
      total: (current * 0.4 + projected * 0.4 + upside * 0.2) * (1 - risk / 100)
    }
  }

  private calculateRiskFactors(player: TradePlayer, prediction: PlayerPrediction | null) {
    const factors = []
    
    if (player.injuryRisk > 30) factors.push('High injury risk')
    if (player.consistencyScore < 60) factors.push('Inconsistent performance')
    if (player.scheduleStrength > 70) factors.push('Difficult remaining schedule')
    if (prediction && (prediction as any).projectedPoints < (prediction as any).seasonAverage * 0.9) {
      factors.push('Declining performance trend')
    }

    return factors
  }

  private analyzePlayerMarketTrend(player: TradePlayer): 'rising' | 'falling' | 'stable' {
    const trendScore = (player.projectedValue - player.currentValue) / player.currentValue
    
    if (trendScore > 0.1) return 'rising'
    if (trendScore < -0.1) return 'falling'
    return 'stable'
  }

  private calculatePositionImpact(players: TradePlayer[], type: 'gaining' | 'losing'): Record<string, number> {
    const impact: Record<string, number> = {}
    
    players.forEach(player => {
      const positionValue = player.currentValue + player.projectedValue
      impact[player.position] = type === 'losing' ? -positionValue : positionValue
    })
    
    return impact
  }

  private identifyStrengths(playerAnalyses: any[]): string[] {
    const strengths = []
    
    const avgValue = playerAnalyses.reduce((sum, p) => sum + p.currentValue, 0) / playerAnalyses.length
    if (avgValue > 75) strengths.push('High-value players')
    
    const hasLowRisk = playerAnalyses.every(p => p.injuryRisk < 25)
    if (hasLowRisk) strengths.push('Low injury risk')
    
    const hasConsistency = playerAnalyses.every(p => p.consistencyScore > 70)
    if (hasConsistency) strengths.push('Consistent performers')
    
    return strengths
  }

  private identifyWeaknesses(playerAnalyses: any[]): string[] {
    const weaknesses = []
    
    const avgValue = playerAnalyses.reduce((sum, p) => sum + p.currentValue, 0) / playerAnalyses.length
    if (avgValue < 50) weaknesses.push('Lower-tier players')
    
    const hasHighRisk = playerAnalyses.some(p => p.injuryRisk > 40)
    if (hasHighRisk) weaknesses.push('Injury concerns')
    
    const hasInconsistency = playerAnalyses.some(p => p.consistencyScore < 60)
    if (hasInconsistency) weaknesses.push('Inconsistent production')
    
    return weaknesses
  }

  private async generateRecommendations(
    proposal: TradeProposal,
    offeredAnalysis: any[],
    requestedAnalysis: any[],
    fairnessScore: number
  ) {
    const shouldAccept = fairnessScore > 60
    const reasons = []
    
    if (fairnessScore > 80) {
      reasons.push('Excellent value proposition')
    } else if (fairnessScore > 60) {
      reasons.push('Fair trade with slight advantage')
    } else if (fairnessScore > 40) {
      reasons.push('Acceptable but could be better')
    } else {
      reasons.push('Unfavorable trade value')
    }

    const timing: 'accept_now' | 'wait' | 'reject' = fairnessScore > 70 ? 'accept_now' : 
                   fairnessScore > 50 ? 'wait' : 'reject'

    return {
      shouldAccept,
      reasons,
      timing,
      counterOffers: fairnessScore < 60 ? await this.generateCounterOffers(proposal) : undefined
    }
  }

  private async generateCounterOffers(proposal: TradeProposal) {
    return [
      {
        playerId: proposal.playersOffered[0]?.playerId || '',
        reason: 'Consider adding this player to balance the trade'
      }
    ]
  }

  private async getMarketContext(proposal: TradeProposal) {
    return {
      similarTrades: [
        {
          players: proposal.playersOffered.map(p => p.name),
          fairnessScore: 72,
          date: '2024-01-15'
        }
      ],
      playerTrends: proposal.playersOffered.reduce((trends, player) => ({
        ...trends,
        [player.playerId]: this.analyzePlayerMarketTrend(player)
      }), {} as Record<string, 'rising' | 'falling' | 'stable'>),
      injuryReports: {}
    }
  }

  private getRatingFromScore(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'terrible' {
    if (score >= 90) return 'excellent'
    if (score >= 75) return 'good'
    if (score >= 60) return 'fair'
    if (score >= 40) return 'poor'
    return 'terrible'
  }

  private calculateRiskLevel(playerAnalyses: any[]): 'low' | 'medium' | 'high' {
    const avgRisk = playerAnalyses.reduce((sum, p) => sum + p.injuryRisk, 0) / playerAnalyses.length
    if (avgRisk < 20) return 'low'
    if (avgRisk < 35) return 'medium'
    return 'high'
  }

  private getFallbackAnalysis(proposal: TradeProposal): TradeAnalysis {
    return {
      tradeId: proposal.id,
      overallRating: 'fair',
      fairnessScore: 50,
      winnerTeamId: null,
      valueGap: 0,
      analysis: {
        sendingTeam: {
          currentValue: 100,
          projectedValue: 100,
          riskLevel: 'medium',
          positionImpact: {},
          strengthsGained: [],
          weaknessesCreated: []
        },
        receivingTeam: {
          currentValue: 100,
          projectedValue: 100,
          riskLevel: 'medium',
          positionImpact: {},
          strengthsGained: [],
          weaknessesCreated: []
        }
      },
      recommendations: {
        shouldAccept: false,
        reasons: ['Analysis temporarily unavailable'],
        timing: 'wait'
      },
      marketContext: {
        similarTrades: [],
        playerTrends: {},
        injuryReports: {}
      }
    }
  }

  // Lineup Optimizer Methods
  async optimizeLineup(teamId: string, week: number): Promise<LineupOptimization> {
    try {
      const players = await this.getTeamPlayers(teamId)
      const predictions = await Promise.all(
        players.map(p => predictionEngine.predictPlayerPerformance(p.playerId))
      )

      const optimization = this.calculateOptimalLineup(players, predictions, week)
      return optimization
    } catch (error) {
      console.error('Lineup optimization failed:', error)
      return this.getFallbackLineup(teamId, week)
    }
  }

  private async getTeamPlayers(teamId: string): Promise<TradePlayer[]> {
    // This would typically fetch from the database
    // For now, return mock data
    return [
      {
        playerId: '1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        currentValue: 95,
        projectedValue: 98,
        injuryRisk: 15,
        consistencyScore: 85,
        upside: 40,
        scheduleStrength: 60
      },
      {
        playerId: '2',
        name: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        currentValue: 92,
        projectedValue: 90,
        injuryRisk: 25,
        consistencyScore: 78,
        upside: 35,
        scheduleStrength: 45
      }
    ]
  }

  private calculateOptimalLineup(
    players: TradePlayer[],
    predictions: (PlayerPrediction | null)[],
    week: number
  ): LineupOptimization {
    const qbs = players.filter(p => p.position === 'QB')
    const rbs = players.filter(p => p.position === 'RB')
    const wrs = players.filter(p => p.position === 'WR')
    const tes = players.filter(p => p.position === 'TE')
    const dsts = players.filter(p => p.position === 'DST')
    const ks = players.filter(p => p.position === 'K')

    // Simple optimization - pick highest projected players
    const lineup = {
      quarterback: this.selectBestPlayer(qbs, predictions),
      runningBacks: this.selectBestPlayers(rbs, predictions, 2),
      wideReceivers: this.selectBestPlayers(wrs, predictions, 2),
      tightEnd: this.selectBestPlayer(tes, predictions),
      flex: this.selectFlexPlayers([...rbs, ...wrs, ...tes], predictions, 1),
      defense: this.selectBestPlayer(dsts, predictions),
      kicker: this.selectBestPlayer(ks, predictions),
      bench: []
    }

    const projectedPoints = this.calculateLineupPoints(lineup, players, predictions)

    return {
      teamId: '',
      week,
      lineup,
      projectedPoints,
      confidence: 75,
      alternatives: this.generateAlternatives(lineup, players, predictions),
      matchupAdvice: this.generateMatchupAdvice(lineup, players)
    }
  }

  private selectBestPlayer(players: TradePlayer[], predictions: (PlayerPrediction | null)[]): string {
    if (players.length === 0) return ''
    
    const playerWithIndex = players.map((player, index) => ({
      player,
      prediction: predictions.find(p => p?.playerId === player.playerId)
    }))

    const sorted = playerWithIndex.sort((a, b) => {
      const aPoints = (a.prediction as any)?.projectedPoints || a.player.projectedValue
      const bPoints = (b.prediction as any)?.projectedPoints || b.player.projectedValue
      return bPoints - aPoints
    })

    return sorted[0]?.player.playerId || ''
  }

  private selectBestPlayers(players: TradePlayer[], predictions: (PlayerPrediction | null)[], count: number): string[] {
    const sorted = players
      .map(player => ({
        player,
        prediction: predictions.find(p => p?.playerId === player.playerId)
      }))
      .sort((a, b) => {
        const aPoints = (a.prediction as any)?.projectedPoints || a.player.projectedValue
        const bPoints = (b.prediction as any)?.projectedPoints || b.player.projectedValue
        return bPoints - aPoints
      })

    return sorted.slice(0, count).map(item => item.player.playerId)
  }

  private selectFlexPlayers(players: TradePlayer[], predictions: (PlayerPrediction | null)[], count: number): string[] {
    return this.selectBestPlayers(players, predictions, count)
  }

  private calculateLineupPoints(lineup: any, players: TradePlayer[], predictions: (PlayerPrediction | null)[]): number {
    let total = 0
    
    Object.values(lineup).flat().forEach((playerId: any) => {
      if (typeof playerId === 'string' && playerId) {
        const prediction = predictions.find(p => p?.playerId === playerId)
        const player = players.find(p => p.playerId === playerId)
        total += (prediction as any)?.projectedPoints || player?.projectedValue || 0
      }
    })
    
    return total
  }

  private generateAlternatives(lineup: any, players: TradePlayer[], predictions: (PlayerPrediction | null)[]) {
    return [
      {
        position: 'RB',
        currentPlayer: 'Current RB',
        suggestedPlayer: 'Alternative RB',
        pointsGain: 2.5,
        reason: 'Better matchup this week'
      }
    ]
  }

  private generateMatchupAdvice(lineup: any, players: TradePlayer[]) {
    return [
      {
        playerId: lineup.quarterback,
        advice: 'Start with confidence',
        reasoning: 'Favorable passing matchup expected'
      }
    ]
  }

  private getFallbackLineup(teamId: string, week: number): LineupOptimization {
    return {
      teamId,
      week,
      lineup: {
        quarterback: '',
        runningBacks: [],
        wideReceivers: [],
        tightEnd: '',
        flex: [],
        defense: '',
        kicker: '',
        bench: []
      },
      projectedPoints: 0,
      confidence: 0,
      alternatives: [],
      matchupAdvice: []
    }
  }
}

const tradeAnalyzer = new TradeAnalyzerService()
export default tradeAnalyzer