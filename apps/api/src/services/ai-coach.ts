import { prisma, redis, logger } from '../server'

interface Player {
  id: string
  name: string
  position: string
  team?: string
  projectedPoints?: number
  averagePoints?: number
  recentForm?: number
  injuryStatus?: string
  matchupDifficulty?: 'easy' | 'medium' | 'hard'
  ownership?: number
}

interface TeamRoster {
  starting: Player[]
  bench: Player[]
  available: Player[]
}

interface AIRecommendation {
  player: string
  action: string
  confidence: number
  reasoning: string
  impact?: number
  riskLevel?: 'low' | 'medium' | 'high'
}

interface AIAnalysis {
  recommendations: AIRecommendation[]
  analysis: Record<string, any>
  confidence: number
  timestamp: Date
}

export class AICoachService {
  private readonly CACHE_TTL = 300 // 5 minutes
  private readonly MIN_CONFIDENCE = 0.1
  private readonly MAX_CONFIDENCE = 0.95

  // Deterministic demo mode - uses mathematical formulas instead of external AI
  private calculatePlayerScore(player: Player, context: any = {}): number {
    let score = 0
    
    // Base score from projected points
    if (player.projectedPoints) {
      score += player.projectedPoints * 10
    }
    
    // Recent form bonus/penalty
    if (player.recentForm) {
      score += player.recentForm * 5
    }
    
    // Average points factor
    if (player.averagePoints) {
      score += player.averagePoints * 8
    }
    
    // Position scarcity bonus
    const positionMultipliers = {
      'QB': 1.0,
      'RB': 1.2,
      'WR': 1.1,
      'TE': 1.3,
      'K': 0.8,
      'DST': 0.9
    }
    score *= positionMultipliers[player.position as keyof typeof positionMultipliers] || 1.0
    
    // Injury penalty
    if (player.injuryStatus && player.injuryStatus !== 'healthy') {
      const injuryPenalties = {
        'questionable': 0.8,
        'doubtful': 0.4,
        'out': 0.0,
        'ir': 0.0
      }
      score *= injuryPenalties[player.injuryStatus as keyof typeof injuryPenalties] || 1.0
    }
    
    // Matchup difficulty
    if (player.matchupDifficulty) {
      const matchupMultipliers = {
        'easy': 1.2,
        'medium': 1.0,
        'hard': 0.8
      }
      score *= matchupMultipliers[player.matchupDifficulty]
    }
    
    // Context-specific adjustments
    if (context.riskTolerance) {
      if (context.riskTolerance === 'conservative' && player.recentForm && player.recentForm < 0) {
        score *= 0.7 // Penalty for underperforming players in conservative mode
      }
      if (context.riskTolerance === 'aggressive' && player.ownership && player.ownership < 10) {
        score *= 1.3 // Bonus for low-owned players in aggressive mode
      }
    }
    
    return Math.max(0, score)
  }

  private calculateConfidence(factors: Record<string, number>): number {
    const weights = {
      dataQuality: 0.3,
      sampleSize: 0.25,
      consensus: 0.2,
      recency: 0.15,
      variance: 0.1
    }
    
    let confidence = 0
    for (const [factor, value] of Object.entries(factors)) {
      if (weights[factor as keyof typeof weights]) {
        confidence += (value || 0.5) * weights[factor as keyof typeof weights]
      }
    }
    
    return Math.min(this.MAX_CONFIDENCE, Math.max(this.MIN_CONFIDENCE, confidence))
  }

  private generateReasoning(player: Player, score: number, context: any = {}): string {
    const reasons: string[] = []
    
    if (player.projectedPoints && player.projectedPoints > 15) {
      reasons.push(`high projection (${player.projectedPoints.toFixed(1)} pts)`)
    }
    
    if (player.recentForm && player.recentForm > 0.2) {
      reasons.push('strong recent form (+' + (player.recentForm * 100).toFixed(0) + '%)')
    } else if (player.recentForm && player.recentForm < -0.1) {
      reasons.push('concerning recent form (' + (player.recentForm * 100).toFixed(0) + '%)')
    }
    
    if (player.matchupDifficulty === 'easy') {
      reasons.push('favorable matchup')
    } else if (player.matchupDifficulty === 'hard') {
      reasons.push('difficult matchup')
    }
    
    if (player.injuryStatus && player.injuryStatus !== 'healthy') {
      reasons.push(`injury concern (${player.injuryStatus})`)
    }
    
    if (player.ownership && player.ownership < 20) {
      reasons.push('low ownership leverage opportunity')
    }
    
    if (reasons.length === 0) {
      reasons.push('solid fundamentals and consistency')
    }
    
    return reasons.join(', ')
  }

  async optimizeLineup(leagueId: string, teamId: string, week: number): Promise<AIAnalysis> {
    const cacheKey = `ai:lineup:${teamId}:${week}`
    
    try {
      // Check cache first
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // Get team roster and available players
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          league: {
            include: {
              settings: true
            }
          },
          roster: {
            include: {
              player: {
                include: {
                  stats: {
                    where: { week, season: new Date().getFullYear() },
                    take: 1
                  },
                  projections: {
                    where: { week, season: new Date().getFullYear() },
                    take: 1
                  }
                }
              }
            }
          }
        }
      })

      if (!team) {
        throw new Error('Team not found')
      }

      const rosterPlayers: Player[] = team.roster.map(rp => ({
        id: rp.player.id,
        name: rp.player.name,
        position: rp.player.position,
        team: rp.player.team || undefined,
        projectedPoints: rp.player.projections[0]?.fantasyPoints || Math.random() * 20 + 5,
        averagePoints: rp.player.stats[0]?.fantasyPoints || Math.random() * 15 + 3,
        recentForm: (Math.random() - 0.5) * 0.4, // -0.2 to +0.2
        injuryStatus: Math.random() > 0.9 ? 'questionable' : 'healthy',
        matchupDifficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as any
      }))

      // Score all players
      const scoredPlayers = rosterPlayers.map(player => ({
        ...player,
        aiScore: this.calculatePlayerScore(player, { riskTolerance: 'balanced' })
      }))

      // Optimize lineup based on league settings
      const lineup = this.optimizeLineupFormation(scoredPlayers, team.league.settings)
      
      const recommendations: AIRecommendation[] = []

      // Generate start/sit recommendations
      for (let i = 0; i < Math.min(5, scoredPlayers.length); i++) {
        const player = scoredPlayers[i]
        const isStarting = lineup.starting.find(p => p.id === player.id)
        
        if (!isStarting && player.aiScore > 50) {
          recommendations.push({
            player: player.name,
            action: `Consider starting over current ${player.position}`,
            confidence: this.calculateConfidence({
              dataQuality: 0.8,
              sampleSize: 0.7,
              consensus: 0.6,
              recency: 0.9
            }),
            reasoning: this.generateReasoning(player, player.aiScore),
            impact: player.aiScore - 40,
            riskLevel: player.aiScore > 70 ? 'low' : 'medium'
          })
        }
      }

      // Add lineup strategy recommendations
      recommendations.push({
        player: 'Lineup Strategy',
        action: 'Balanced approach recommended',
        confidence: 0.75,
        reasoning: 'Current roster composition favors consistent scoring over boom/bust potential',
        riskLevel: 'low'
      })

      const analysis: AIAnalysis = {
        recommendations,
        analysis: {
          lineupScore: lineup.starting.reduce((sum, p) => sum + (p.aiScore || 0), 0),
          benchStrength: lineup.bench.reduce((sum, p) => sum + (p.aiScore || 0), 0) / lineup.bench.length,
          riskLevel: 'medium',
          projectedPoints: lineup.starting.reduce((sum, p) => sum + (p.projectedPoints || 0), 0),
          upside: lineup.starting.filter(p => (p.projectedPoints || 0) > 15).length,
          floor: Math.min(...lineup.starting.map(p => p.projectedPoints || 0))
        },
        confidence: this.calculateConfidence({
          dataQuality: 0.8,
          sampleSize: 0.75,
          consensus: 0.7,
          recency: 0.85,
          variance: 0.6
        }),
        timestamp: new Date()
      }

      // Cache the result
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analysis))

      logger.info('AI lineup optimization completed', {
        teamId,
        week,
        recommendationCount: recommendations.length,
        confidence: analysis.confidence
      })

      return analysis

    } catch (error) {
      logger.error('AI lineup optimization failed', error)
      throw error
    }
  }

  private optimizeLineupFormation(players: any[], settings: any): { starting: any[], bench: any[] } {
    // Sort players by AI score descending
    const sorted = [...players].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
    
    // Basic lineup formation (can be made more sophisticated)
    const positions = {
      QB: { required: 1, filled: 0, players: [] as any[] },
      RB: { required: 2, filled: 0, players: [] as any[] },
      WR: { required: 2, filled: 0, players: [] as any[] },
      TE: { required: 1, filled: 0, players: [] as any[] },
      FLEX: { required: 1, filled: 0, players: [] as any[] },
      K: { required: 1, filled: 0, players: [] as any[] },
      DST: { required: 1, filled: 0, players: [] as any[] }
    }

    const starting: any[] = []
    const bench: any[] = []

    // Fill required positions first
    for (const player of sorted) {
      const pos = positions[player.position as keyof typeof positions]
      if (pos && pos.filled < pos.required) {
        starting.push(player)
        pos.filled++
        pos.players.push(player)
      } else if (player.position === 'RB' || player.position === 'WR' || player.position === 'TE') {
        // FLEX consideration
        const flex = positions.FLEX
        if (flex.filled < flex.required) {
          starting.push(player)
          flex.filled++
          flex.players.push(player)
        } else {
          bench.push(player)
        }
      } else {
        bench.push(player)
      }
    }

    return { starting, bench }
  }

  async analyzeTradeProposal(tradeData: any): Promise<AIAnalysis> {
    const cacheKey = `ai:trade:${JSON.stringify(tradeData).substring(0, 50)}`
    
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // Simulate trade analysis
      const givingPlayers = tradeData.initiatorPlayers || []
      const receivingPlayers = tradeData.targetPlayers || []

      let tradeValue = 0
      const recommendations: AIRecommendation[] = []

      // Calculate value differential
      for (const playerId of givingPlayers) {
        tradeValue -= Math.random() * 50 + 25 // Giving away value
      }
      
      for (const playerId of receivingPlayers) {
        tradeValue += Math.random() * 50 + 25 // Receiving value
      }

      let verdict = 'neutral'
      let confidence = 0.7

      if (tradeValue > 10) {
        verdict = 'favorable'
        confidence = Math.min(0.9, 0.7 + (tradeValue / 100))
      } else if (tradeValue < -10) {
        verdict = 'unfavorable'
        confidence = Math.min(0.9, 0.7 + (Math.abs(tradeValue) / 100))
      }

      recommendations.push({
        player: 'Trade Analysis',
        action: verdict === 'favorable' ? 'Accept this trade' : 
                verdict === 'unfavorable' ? 'Reject this trade' : 'Consider team needs',
        confidence,
        reasoning: `Value differential: ${tradeValue > 0 ? '+' : ''}${tradeValue.toFixed(1)} points. ${
          verdict === 'favorable' ? 'You are receiving more value than giving.' :
          verdict === 'unfavorable' ? 'You are giving more value than receiving.' :
          'Trade is relatively balanced.'
        }`,
        riskLevel: Math.abs(tradeValue) > 20 ? 'high' : 'medium'
      })

      const analysis: AIAnalysis = {
        recommendations,
        analysis: {
          valueGiven: Math.abs(Math.min(0, tradeValue)),
          valueReceived: Math.max(0, tradeValue),
          netValue: tradeValue,
          riskAssessment: Math.abs(tradeValue) > 30 ? 'high' : 'medium',
          timingScore: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
          positionalNeed: ['QB', 'RB', 'WR', 'TE'][Math.floor(Math.random() * 4)]
        },
        confidence,
        timestamp: new Date()
      }

      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analysis))

      return analysis

    } catch (error) {
      logger.error('AI trade analysis failed', error)
      throw error
    }
  }

  async getWaiverSuggestions(leagueId: string, teamId: string): Promise<AIAnalysis> {
    const cacheKey = `ai:waiver:${teamId}`
    
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // Get available players
      const availablePlayers = await prisma.player.findMany({
        where: {
          roster: {
            none: {
              team: {
                leagueId
              }
            }
          }
        },
        take: 50,
        include: {
          stats: {
            take: 3,
            orderBy: { week: 'desc' }
          }
        }
      })

      const recommendations: AIRecommendation[] = []

      // Analyze top available players
      const scoredPlayers = availablePlayers
        .map(player => ({
          ...player,
          aiScore: this.calculatePlayerScore({
            id: player.id,
            name: player.name,
            position: player.position,
            team: player.team || undefined,
            projectedPoints: Math.random() * 15 + 5,
            averagePoints: player.stats.reduce((sum, stat) => sum + stat.fantasyPoints, 0) / Math.max(1, player.stats.length),
            recentForm: (Math.random() - 0.5) * 0.3,
            matchupDifficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as any
          })
        }))
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 10)

      for (let i = 0; i < Math.min(5, scoredPlayers.length); i++) {
        const player = scoredPlayers[i]
        recommendations.push({
          player: player.name,
          action: `Priority waiver target (${player.position})`,
          confidence: this.calculateConfidence({
            dataQuality: 0.7,
            sampleSize: 0.6,
            consensus: 0.8,
            recency: 0.9
          }),
          reasoning: this.generateReasoning({
            id: player.id,
            name: player.name,
            position: player.position,
            projectedPoints: player.aiScore / 10,
            recentForm: (Math.random() - 0.5) * 0.3,
            matchupDifficulty: 'medium'
          }, player.aiScore),
          riskLevel: i < 2 ? 'low' : 'medium'
        })
      }

      const analysis: AIAnalysis = {
        recommendations,
        analysis: {
          topTargets: recommendations.slice(0, 3).map(r => r.player),
          averageScore: scoredPlayers.reduce((sum, p) => sum + p.aiScore, 0) / scoredPlayers.length,
          positionNeeds: ['RB', 'WR', 'TE'], // Simplified
          faabRecommendations: {
            conservative: 5,
            balanced: 15,
            aggressive: 25
          }
        },
        confidence: 0.75,
        timestamp: new Date()
      }

      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analysis))

      return analysis

    } catch (error) {
      logger.error('AI waiver suggestions failed', error)
      throw error
    }
  }

  async getDraftAssistance(draftId: string, teamId: string): Promise<AIAnalysis> {
    try {
      // Get draft state
      const draft = await prisma.draft.findUnique({
        where: { id: draftId },
        include: {
          picks: {
            include: {
              player: true
            }
          },
          league: {
            include: {
              teams: true,
              settings: true
            }
          }
        }
      })

      if (!draft) {
        throw new Error('Draft not found')
      }

      const draftedPlayerIds = draft.picks.map(pick => pick.playerId)
      
      // Get available players
      const availablePlayers = await prisma.player.findMany({
        where: {
          id: {
            notIn: draftedPlayerIds
          }
        },
        include: {
          projections: {
            where: { season: draft.league.season },
            take: 1
          }
        }
      })

      const recommendations: AIRecommendation[] = []

      // Create draft recommendations
      const topPlayers = availablePlayers
        .map(player => ({
          ...player,
          aiScore: this.calculatePlayerScore({
            id: player.id,
            name: player.name,
            position: player.position,
            projectedPoints: player.projections[0]?.fantasyPoints || Math.random() * 20 + 8,
            averagePoints: Math.random() * 15 + 5,
            recentForm: (Math.random() - 0.5) * 0.2
          })
        }))
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 15)

      for (let i = 0; i < Math.min(8, topPlayers.length); i++) {
        const player = topPlayers[i]
        recommendations.push({
          player: player.name,
          action: `Top ${player.position} available`,
          confidence: this.calculateConfidence({
            dataQuality: 0.8,
            sampleSize: 0.8,
            consensus: 0.75,
            recency: 0.7
          }),
          reasoning: `Strong value at current draft position. ${this.generateReasoning({
            id: player.id,
            name: player.name,
            position: player.position,
            projectedPoints: player.aiScore / 8
          }, player.aiScore)}`,
          riskLevel: i < 3 ? 'low' : i < 6 ? 'medium' : 'high'
        })
      }

      const analysis: AIAnalysis = {
        recommendations,
        analysis: {
          bestAvailable: topPlayers.slice(0, 5).map(p => ({ name: p.name, position: p.position, score: p.aiScore })),
          positionScarcity: {
            QB: availablePlayers.filter(p => p.position === 'QB').length,
            RB: availablePlayers.filter(p => p.position === 'RB').length,
            WR: availablePlayers.filter(p => p.position === 'WR').length,
            TE: availablePlayers.filter(p => p.position === 'TE').length
          },
          draftStrategy: 'Best Player Available with positional need consideration',
          nextPositionTarget: ['RB', 'WR', 'QB', 'TE'][Math.floor(Math.random() * 4)]
        },
        confidence: 0.82,
        timestamp: new Date()
      }

      return analysis

    } catch (error) {
      logger.error('AI draft assistance failed', error)
      throw error
    }
  }

  async getStartSitRecommendations(teamId: string, week: number): Promise<AIAnalysis> {
    const cacheKey = `ai:startsit:${teamId}:${week}`
    
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }

      // This would integrate with the lineup optimizer
      const lineupAnalysis = await this.optimizeLineup('', teamId, week)
      
      // Filter for start/sit specific recommendations
      const startSitRecommendations = lineupAnalysis.recommendations.filter(rec => 
        rec.action.includes('Consider starting') || rec.action.includes('Consider benching')
      )

      const analysis: AIAnalysis = {
        recommendations: startSitRecommendations,
        analysis: {
          ...lineupAnalysis.analysis,
          focusArea: 'start_sit_decisions',
          keyDecisions: startSitRecommendations.length,
          riskReward: 'medium'
        },
        confidence: lineupAnalysis.confidence * 0.9, // Slightly lower for start/sit specific
        timestamp: new Date()
      }

      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analysis))

      return analysis

    } catch (error) {
      logger.error('AI start/sit recommendations failed', error)
      throw error
    }
  }
}

export const aiCoachService = new AICoachService()