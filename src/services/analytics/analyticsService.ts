// THIS FILE NEEDS REFACTORING FOR NEON DATABASE - TEMPORARILY DISABLED
'use client'

import { createClient } from '@/lib/supabase'

const supabase = createClient()

export interface TeamAnalytics {
  teamId: string
  teamName: string
  season: {
    wins: number
    losses: number
    ties: number
    winPercentage: number
    pointsFor: number
    pointsAgainst: number
    pointsDifferential: number
    averagePointsFor: number
    averagePointsAgainst: number
  }
  trends: {
    lastFiveGames: Array<{ week: number; points: number; result: 'W' | 'L' | 'T' }>
    scoringTrend: 'improving' | 'declining' | 'consistent'
    consistencyScore: number // 0-100, higher = more consistent
    peakPerformance: { week: number; points: number }
    worstPerformance: { week: number; points: number }
  }
  positions: {
    [position: string]: {
      averagePoints: number
      consistency: number
      topPlayer: { name: string; points: number }
      weakness: boolean
    }
  }
  projections: {
    playoffProbability: number
    projectedWins: number
    projectedPointsFor: number
    strengthOfSchedule: number
  }
}

export interface LeagueAnalytics {
  leagueId: string
  leagueName: string
  currentWeek: number
  season: {
    totalGames: number
    averageScore: number
    highestScore: { teamName: string; points: number; week: number }
    lowestScore: { teamName: string; points: number; week: number }
    closestGame: { teams: string[]; differential: number; week: number }
    blowoutGame: { teams: string[]; differential: number; week: number }
  }
  standings: Array<{
    rank: number
    teamId: string
    teamName: string
    wins: number
    losses: number
    ties: number
    pointsFor: number
    pointsAgainst: number
    streak: { type: 'W' | 'L'; count: number }
  }>
  powerRankings: Array<{
    rank: number
    teamId: string
    teamName: string
    powerScore: number
    trend: 'up' | 'down' | 'stable'
    rankChange: number
  }>
  playoffRace: {
    clinched: string[]
    eliminated: string[]
    inTheHunt: Array<{
      teamId: string
      teamName: string
      playoffProbability: number
      magicNumber?: number
    }>
  }
  transactionAnalysis: {
    mostActiveManager: { teamName: string; transactions: number }
    bestPickup: { playerName: string; teamName: string; pointsAdded: number }
    worstDrop: { playerName: string; teamName: string; pointsLost: number }
    tradeAnalysis: Array<{
      teams: string[]
      winner: string
      pointsSwing: number
    }>
  }
}

export interface PlayerAnalytics {
  playerId: string
  playerName: string
  position: string
  nflTeam: string
  season: {
    gamesPlayed: number
    totalPoints: number
    averagePoints: number
    projectedPoints: number
    consistency: number
    ceiling: number // highest single-game score
    floor: number   // lowest single-game score
  }
  trends: {
    last4Weeks: number[]
    trendDirection: 'up' | 'down' | 'stable'
    hotStreak: boolean
    coldStreak: boolean
  }
  schedule: {
    upcomingOpponents: Array<{
      week: number
      opponent: string
      difficulty: 'easy' | 'medium' | 'hard'
      projectedPoints: number
    }>
    restOfSeasonProjection: number
    playoffSchedule: Array<{
      week: number
      opponent: string
      difficulty: 'easy' | 'medium' | 'hard'
    }>
  }
  ownership: {
    ownedPercentage: number
    startedPercentage: number
    addDropTrend: 'rising' | 'falling' | 'stable'
  }
}

class AnalyticsService {
  async getTeamAnalytics(teamId: string, season: number = new Date().getFullYear()): Promise<TeamAnalytics> {
    try {
      // Get team info
      const { data: team } = await supabase
        .from('teams')
        .select('id, team_name')
        .eq('id', teamId)
        .single()

      if (!team) throw new Error('Team not found')

      // Get season matchups and scores (this would need to be implemented)
      const seasonStats = await this.calculateSeasonStats(teamId, season)
      const trends = await this.calculateTrends(teamId, season)
      const positions = await this.calculatePositionAnalytics(teamId, season)
      const projections = await this.calculateProjections(teamId, season)

      return {
        teamId: (team as any).id,
        teamName: (team as any).team_name,
        season: seasonStats,
        trends,
        positions,
        projections
      }
    } catch (error) {
      console.error('Error fetching team analytics:', error)
      throw error
    }
  }

  async getLeagueAnalytics(leagueId: string, season: number = new Date().getFullYear()): Promise<LeagueAnalytics> {
    try {
      // Get league info
      const { data: league } = await supabase
        .from('leagues')
        .select('id, name')
        .eq('id', leagueId)
        .single()

      if (!league) throw new Error('League not found')

      // Get all teams in league
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)

      if (!teams) throw new Error('No teams found')

      const seasonStats = await this.calculateLeagueSeasonStats(leagueId, season)
      const standings = await this.calculateStandings(leagueId, season)
      const powerRankings = await this.calculatePowerRankings(leagueId, season)
      const playoffRace = await this.calculatePlayoffRace(leagueId, season)
      const transactionAnalysis = await this.calculateTransactionAnalysis(leagueId, season)

      return {
        leagueId: (league as any).id,
        leagueName: (league as any).name,
        currentWeek: this.getCurrentWeek(),
        season: seasonStats,
        standings,
        powerRankings,
        playoffRace,
        transactionAnalysis
      }
    } catch (error) {
      console.error('Error fetching league analytics:', error)
      throw error
    }
  }

  async getPlayerAnalytics(playerId: string, season: number = new Date().getFullYear()): Promise<PlayerAnalytics> {
    try {
      // Get player info
      const { data: player } = await supabase
        .from('players')
        .select(`
          id,
          name,
          position,
          nfl_team,
          player_projections(fantasy_points)
        `)
        .eq('id', playerId)
        .single()

      if (!player) throw new Error('Player not found')

      const seasonStats = await this.calculatePlayerSeasonStats(playerId, season)
      const trends = await this.calculatePlayerTrends(playerId, season)
      const schedule = await this.calculatePlayerSchedule(playerId, season)
      const ownership = await this.calculatePlayerOwnership(playerId)

      return {
        playerId: (player as any).id,
        playerName: (player as any).name,
        position: (player as any).position,
        nflTeam: (player as any).nfl_team,
        season: seasonStats,
        trends,
        schedule,
        ownership
      }
    } catch (error) {
      console.error('Error fetching player analytics:', error)
      throw error
    }
  }

  // Advanced analytics methods
  async calculateAdvancedMetrics(leagueId: string): Promise<{
    parityIndex: number // How competitive the league is (0-1, higher = more parity)
    lucksIndex: Array<{ teamId: string; luckScore: number }> // Positive = unlucky, Negative = lucky
    strengthOfSchedule: Array<{ teamId: string; sosRating: number }>
    predictiveModel: Array<{ teamId: string; projectedWins: number; confidence: number }>
  }> {
    try {
      const teams = await this.getLeagueTeams(leagueId)
      
      // Calculate parity index based on standard deviation of team scores
      const parityIndex = await this.calculateParityIndex(leagueId)
      
      // Calculate luck index (actual record vs. expected record based on points)
      const lucksIndex = await this.calculateLuckIndex(leagueId)
      
      // Calculate strength of schedule
      const strengthOfSchedule = await this.calculateStrengthOfSchedule(leagueId)
      
      // Build predictive model
      const predictiveModel = await this.buildPredictiveModel(leagueId)

      return {
        parityIndex,
        lucksIndex,
        strengthOfSchedule,
        predictiveModel
      }
    } catch (error) {
      console.error('Error calculating advanced metrics:', error)
      throw error
    }
  }

  // Helper methods (simplified implementations)
  private async calculateSeasonStats(teamId: string, season: number): Promise<TeamAnalytics['season']> {
    // This would query actual matchup results
    // For now, return simulated data
    return {
      wins: Math.floor(Math.random() * 10) + 2,
      losses: Math.floor(Math.random() * 10) + 2,
      ties: Math.floor(Math.random() * 2),
      winPercentage: 0.65,
      pointsFor: 1450.5,
      pointsAgainst: 1320.2,
      pointsDifferential: 130.3,
      averagePointsFor: 120.9,
      averagePointsAgainst: 110.0
    }
  }

  private async calculateTrends(teamId: string, season: number): Promise<TeamAnalytics['trends']> {
    return {
      lastFiveGames: [
        { week: 8, points: 125.4, result: 'W' },
        { week: 9, points: 98.2, result: 'L' },
        { week: 10, points: 134.7, result: 'W' },
        { week: 11, points: 156.8, result: 'W' },
        { week: 12, points: 142.1, result: 'W' }
      ],
      scoringTrend: 'improving',
      consistencyScore: 78,
      peakPerformance: { week: 11, points: 156.8 },
      worstPerformance: { week: 9, points: 98.2 }
    }
  }

  private async calculatePositionAnalytics(teamId: string, season: number): Promise<TeamAnalytics['positions']> {
    return {
      'QB': {
        averagePoints: 22.4,
        consistency: 85,
        topPlayer: { name: 'Josh Allen', points: 287.6 },
        weakness: false
      },
      'RB': {
        averagePoints: 18.7,
        consistency: 62,
        topPlayer: { name: 'Christian McCaffrey', points: 245.3 },
        weakness: true
      },
      'WR': {
        averagePoints: 15.8,
        consistency: 71,
        topPlayer: { name: 'Cooper Kupp', points: 298.4 },
        weakness: false
      }
    }
  }

  private async calculateProjections(teamId: string, season: number): Promise<TeamAnalytics['projections']> {
    return {
      playoffProbability: 0.78,
      projectedWins: 9.2,
      projectedPointsFor: 1650.4,
      strengthOfSchedule: 0.52
    }
  }

  private async calculateLeagueSeasonStats(leagueId: string, season: number): Promise<LeagueAnalytics['season']> {
    return {
      totalGames: 156,
      averageScore: 118.7,
      highestScore: { teamName: 'Lightning Bolts', points: 187.4, week: 6 },
      lowestScore: { teamName: 'Broken Dreams', points: 67.2, week: 9 },
      closestGame: { teams: ['Team A', 'Team B'], differential: 0.1, week: 11 },
      blowoutGame: { teams: ['Team C', 'Team D'], differential: 89.3, week: 4 }
    }
  }

  private async calculateStandings(leagueId: string, season: number): Promise<LeagueAnalytics['standings']> {
    const { data: teams } = await supabase
      .from('teams')
      .select('id, team_name')
      .eq('league_id', leagueId)

    return (teams || []).map((team: any, index: number) => ({
      rank: index + 1,
      teamId: team.id,
      teamName: team.team_name,
      wins: 10 - index,
      losses: index + 2,
      ties: 0,
      pointsFor: 1500 - (index * 50),
      pointsAgainst: 1300 + (index * 30),
      streak: { type: index < 3 ? 'W' : 'L', count: Math.floor(Math.random() * 4) + 1 } as { type: 'W' | 'L'; count: number }
    }))
  }

  private async calculatePowerRankings(leagueId: string, season: number): Promise<LeagueAnalytics['powerRankings']> {
    const standings = await this.calculateStandings(leagueId, season)
    
    return standings.map((team, index) => ({
      rank: index + 1,
      teamId: team.teamId,
      teamName: team.teamName,
      powerScore: 100 - (index * 8.5),
      trend: index < 4 ? 'up' : index > 8 ? 'down' : 'stable' as 'up' | 'down' | 'stable',
      rankChange: Math.floor(Math.random() * 6) - 3
    }))
  }

  private async calculatePlayoffRace(leagueId: string, season: number): Promise<LeagueAnalytics['playoffRace']> {
    const standings = await this.calculateStandings(leagueId, season)
    
    return {
      clinched: standings.slice(0, 2).map(team => team.teamId),
      eliminated: standings.slice(-3).map(team => team.teamId),
      inTheHunt: standings.slice(2, -3).map(team => ({
        teamId: team.teamId,
        teamName: team.teamName,
        playoffProbability: Math.random() * 0.8 + 0.1, // 10-90%
        magicNumber: Math.floor(Math.random() * 3) + 1
      }))
    }
  }

  private async calculateTransactionAnalysis(leagueId: string, season: number): Promise<LeagueAnalytics['transactionAnalysis']> {
    return {
      mostActiveManager: { teamName: 'Waiver Wire Warriors', transactions: 47 },
      bestPickup: { playerName: 'Puka Nacua', teamName: 'Lucky Breaks', pointsAdded: 156.7 },
      worstDrop: { playerName: 'Jonathan Taylor', teamName: 'Regret Central', pointsLost: 189.4 },
      tradeAnalysis: [
        { teams: ['Team A', 'Team B'], winner: 'Team A', pointsSwing: 34.2 },
        { teams: ['Team C', 'Team D'], winner: 'Team D', pointsSwing: 18.7 }
      ]
    }
  }

  private async calculatePlayerSeasonStats(playerId: string, season: number): Promise<PlayerAnalytics['season']> {
    return {
      gamesPlayed: 12,
      totalPoints: 198.7,
      averagePoints: 16.6,
      projectedPoints: 245.3,
      consistency: 73,
      ceiling: 31.4,
      floor: 4.2
    }
  }

  private async calculatePlayerTrends(playerId: string, season: number): Promise<PlayerAnalytics['trends']> {
    return {
      last4Weeks: [14.2, 18.7, 22.1, 19.8],
      trendDirection: 'up',
      hotStreak: true,
      coldStreak: false
    }
  }

  private async calculatePlayerSchedule(playerId: string, season: number): Promise<PlayerAnalytics['schedule']> {
    return {
      upcomingOpponents: [
        { week: 13, opponent: 'KC', difficulty: 'hard', projectedPoints: 12.4 },
        { week: 14, opponent: 'CLE', difficulty: 'medium', projectedPoints: 16.8 },
        { week: 15, opponent: 'MIA', difficulty: 'easy', projectedPoints: 21.2 }
      ],
      restOfSeasonProjection: 89.4,
      playoffSchedule: [
        { week: 15, opponent: 'MIA', difficulty: 'easy' },
        { week: 16, opponent: 'BUF', difficulty: 'medium' },
        { week: 17, opponent: 'NYJ', difficulty: 'hard' }
      ]
    }
  }

  private async calculatePlayerOwnership(playerId: string): Promise<PlayerAnalytics['ownership']> {
    return {
      ownedPercentage: 67.4,
      startedPercentage: 89.2,
      addDropTrend: 'rising'
    }
  }

  private async getLeagueTeams(leagueId: string): Promise<any[]> {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', leagueId)
    
    return data || []
  }

  private async calculateParityIndex(leagueId: string): Promise<number> {
    // Simplified calculation - would use actual game data
    return Math.random() * 0.4 + 0.6 // 0.6 to 1.0
  }

  private async calculateLuckIndex(leagueId: string): Promise<Array<{ teamId: string; luckScore: number }>> {
    const teams = await this.getLeagueTeams(leagueId)
    
    return teams.map(team => ({
      teamId: team.id,
      luckScore: (Math.random() - 0.5) * 4 // -2 to +2
    }))
  }

  private async calculateStrengthOfSchedule(leagueId: string): Promise<Array<{ teamId: string; sosRating: number }>> {
    const teams = await this.getLeagueTeams(leagueId)
    
    return teams.map(team => ({
      teamId: team.id,
      sosRating: Math.random() * 0.4 + 0.4 // 0.4 to 0.8
    }))
  }

  private async buildPredictiveModel(leagueId: string): Promise<Array<{ teamId: string; projectedWins: number; confidence: number }>> {
    const teams = await this.getLeagueTeams(leagueId)
    
    return teams.map(team => ({
      teamId: team.id,
      projectedWins: Math.random() * 10 + 4, // 4-14 wins
      confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
    }))
  }

  private getCurrentWeek(): number {
    const now = new Date()
    const seasonStart = new Date(now.getFullYear(), 8, 1) // September 1st
    const weeksDiff = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(18, weeksDiff + 1))
  }
}

const analyticsService = new AnalyticsService()
export default analyticsService