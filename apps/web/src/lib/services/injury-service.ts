/**
 * Injury Service
 * Provides injury data and risk assessment for players
 */

export type InjuryStatus = 'HEALTHY' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'IR' | 'PUP'

export interface InjuryReport {
  playerId: string
  playerName: string
  status: InjuryStatus
  injury: string
  description: string
  lastUpdated: Date
  expectedReturn?: Date
  riskScore: number // 0-1, higher is more risky
}

export interface InjuryRiskAssessment {
  currentRisk: number
  historicalInjuries: number
  positionRisk: number
  ageRisk: number
  overallRisk: number
  recommendation: 'START' | 'MONITOR' | 'BENCH' | 'AVOID'
}

export class InjuryService {
  private cache: Map<string, { data: InjuryReport; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 1800000 // 30 minutes

  /**
   * Get injury report for a player
   */
  async getInjuryReport(playerId: string): Promise<InjuryReport | null> {
    const cached = this.cache.get(playerId)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    // In production, this would fetch from database or external API
    // For now, return null (healthy) or simulated data
    const report = await this.fetchInjuryData(playerId)
    
    if (report) {
      this.cache.set(playerId, {
        data: report,
        timestamp: Date.now()
      })
    }

    return report
  }

  /**
   * Calculate injury risk for a player
   */
  async calculateInjuryRisk(
    playerId: string,
    position: string,
    age?: number
  ): Promise<InjuryRiskAssessment> {
    const report = await this.getInjuryReport(playerId)
    
    // Current injury risk
    const currentRisk = report ? this.getStatusRisk(report.status) : 0
    
    // Position-based risk (RBs have higher injury risk)
    const positionRisk = this.getPositionRisk(position)
    
    // Age-based risk (older players have higher risk)
    const ageRisk = age ? this.getAgeRisk(age) : 0.1
    
    // Historical injury risk (would come from database)
    const historicalInjuries = 0 // Placeholder
    
    // Calculate overall risk
    const overallRisk = Math.min(1, (
      currentRisk * 0.5 +
      positionRisk * 0.2 +
      ageRisk * 0.2 +
      historicalInjuries * 0.1
    ))
    
    // Generate recommendation
    let recommendation: InjuryRiskAssessment['recommendation'] = 'START'
    if (overallRisk > 0.7) recommendation = 'AVOID'
    else if (overallRisk > 0.5) recommendation = 'BENCH'
    else if (overallRisk > 0.3) recommendation = 'MONITOR'
    
    return {
      currentRisk,
      historicalInjuries,
      positionRisk,
      ageRisk,
      overallRisk: Math.round(overallRisk * 100) / 100,
      recommendation
    }
  }

  /**
   * Check if player is injury replacement opportunity
   */
  async isInjuryReplacement(
    playerId: string,
    teamId: string
  ): Promise<boolean> {
    // In production, this would check if a starter on the same team is injured
    // and this player is their backup
    
    // For now, return false (would need team roster data)
    return false
  }

  /**
   * Get all injury reports for a week
   */
  async getWeeklyInjuryReports(
    week: number,
    season: number
  ): Promise<InjuryReport[]> {
    // In production, fetch from database
    // For now, return empty array
    return []
  }

  /**
   * Fetch injury data (placeholder for API integration)
   */
  private async fetchInjuryData(playerId: string): Promise<InjuryReport | null> {
    // In production, this would call an external API or database
    // For now, return null (healthy) for most players
    
    // Simulate 10% of players having some injury status
    if (Math.random() > 0.9) {
      const statuses: InjuryStatus[] = ['QUESTIONABLE', 'DOUBTFUL', 'OUT']
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      
      return {
        playerId,
        playerName: 'Player Name', // Would be fetched
        status,
        injury: this.getRandomInjury(),
        description: 'Day-to-day',
        lastUpdated: new Date(),
        riskScore: this.getStatusRisk(status)
      }
    }
    
    return null // Healthy
  }

  /**
   * Get risk score based on injury status
   */
  private getStatusRisk(status: InjuryStatus): number {
    const riskMap: Record<InjuryStatus, number> = {
      'HEALTHY': 0,
      'QUESTIONABLE': 0.3,
      'DOUBTFUL': 0.7,
      'OUT': 1.0,
      'IR': 1.0,
      'PUP': 1.0
    }
    return riskMap[status] || 0
  }

  /**
   * Get position-based injury risk
   */
  private getPositionRisk(position: string): number {
    const riskMap: Record<string, number> = {
      'RB': 0.4,  // Highest risk
      'WR': 0.25,
      'TE': 0.25,
      'QB': 0.2,
      'K': 0.05,  // Lowest risk
      'DEF': 0.15
    }
    return riskMap[position] || 0.2
  }

  /**
   * Get age-based injury risk
   */
  private getAgeRisk(age: number): number {
    if (age < 25) return 0.1
    if (age < 28) return 0.15
    if (age < 30) return 0.2
    if (age < 32) return 0.3
    return 0.4 // 32+
  }

  /**
   * Get random injury type (for simulation)
   */
  private getRandomInjury(): string {
    const injuries = [
      'Ankle', 'Knee', 'Hamstring', 'Shoulder', 'Concussion',
      'Groin', 'Back', 'Chest', 'Hand', 'Foot'
    ]
    return injuries[Math.floor(Math.random() * injuries.length)]
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const injuryService = new InjuryService()
