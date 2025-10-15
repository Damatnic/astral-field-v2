/**
 * Vortex Analytics Data Seeder
 * Populates weeks 1-3 with realistic fantasy football data for comprehensive analytics
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PlayerData {
  name: string;
  position: string;
  nflTeam: string;
  adp: number;
  tier: 'ELITE' | 'HIGH' | 'MID' | 'LOW';
}

interface WeeklyPerformance {
  week: number;
  basePoints: number;
  variance: number;
}

export class VortexDataSeeder {
  private players: PlayerData[] = [
    // Elite QBs
    { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', adp: 12, tier: 'ELITE' },
    { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', adp: 18, tier: 'ELITE' },
    { name: 'Jalen Hurts', position: 'QB', nflTeam: 'PHI', adp: 24, tier: 'ELITE' },
    
    // Elite RBs
    { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', adp: 1, tier: 'ELITE' },
    { name: 'Austin Ekeler', position: 'RB', nflTeam: 'LAC', adp: 3, tier: 'ELITE' },
    { name: 'Saquon Barkley', position: 'RB', nflTeam: 'NYG', adp: 5, tier: 'ELITE' },
    { name: 'Derrick Henry', position: 'RB', nflTeam: 'TEN', adp: 8, tier: 'ELITE' },
    { name: 'Nick Chubb', position: 'RB', nflTeam: 'CLE', adp: 10, tier: 'ELITE' },
    
    // Elite WRs
    { name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', adp: 6, tier: 'ELITE' },
    { name: 'Davante Adams', position: 'WR', nflTeam: 'LV', adp: 7, tier: 'ELITE' },
    { name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', adp: 9, tier: 'ELITE' },
    { name: 'Stefon Diggs', position: 'WR', nflTeam: 'BUF', adp: 11, tier: 'ELITE' },
    
    // High-tier players
    { name: 'Patrick Mahomes', position: 'QB', nflTeam: 'KC', adp: 36, tier: 'HIGH' },
    { name: 'Joe Burrow', position: 'QB', nflTeam: 'CIN', adp: 42, tier: 'HIGH' },
    { name: 'Josh Jacobs', position: 'RB', nflTeam: 'LV', adp: 15, tier: 'HIGH' },
    { name: 'Alvin Kamara', position: 'RB', nflTeam: 'NO', adp: 20, tier: 'HIGH' },
    { name: 'Joe Mixon', position: 'RB', nflTeam: 'CIN', adp: 22, tier: 'HIGH' },
    { name: 'Amon-Ra St. Brown', position: 'WR', nflTeam: 'DET', adp: 25, tier: 'HIGH' },
    { name: 'CeeDee Lamb', position: 'WR', nflTeam: 'DAL', adp: 28, tier: 'HIGH' },
    { name: 'A.J. Brown', position: 'WR', nflTeam: 'PHI', adp: 30, tier: 'HIGH' },
    
    // Elite TEs
    { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', adp: 13, tier: 'ELITE' },
    { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', adp: 32, tier: 'HIGH' },
    { name: 'George Kittle', position: 'TE', nflTeam: 'SF', adp: 48, tier: 'HIGH' },
    
    // Mid-tier players
    { name: 'Tua Tagovailoa', position: 'QB', nflTeam: 'MIA', adp: 65, tier: 'MID' },
    { name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', adp: 72, tier: 'MID' },
    { name: 'Tony Pollard', position: 'RB', nflTeam: 'DAL', adp: 45, tier: 'MID' },
    { name: 'Kenneth Walker III', position: 'RB', nflTeam: 'SEA', adp: 50, tier: 'MID' },
    { name: 'Najee Harris', position: 'RB', nflTeam: 'PIT', adp: 55, tier: 'MID' },
    { name: 'Mike Evans', position: 'WR', nflTeam: 'TB', adp: 38, tier: 'MID' },
    { name: 'Chris Godwin', position: 'WR', nflTeam: 'TB', adp: 40, tier: 'MID' },
    { name: 'Keenan Allen', position: 'WR', nflTeam: 'LAC', adp: 44, tier: 'MID' },
    { name: 'DK Metcalf', position: 'WR', nflTeam: 'SEA', adp: 52, tier: 'MID' },
    { name: 'T.J. Hockenson', position: 'TE', nflTeam: 'MIN', adp: 68, tier: 'MID' },
    { name: 'Kyle Pitts', position: 'TE', nflTeam: 'ATL', adp: 75, tier: 'MID' },
    
    // Breakout candidates / sleepers
    { name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', adp: 180, tier: 'LOW' },
    { name: 'Tank Dell', position: 'WR', nflTeam: 'HOU', adp: 220, tier: 'LOW' },
    { name: 'Zay Flowers', position: 'WR', nflTeam: 'BAL', adp: 95, tier: 'LOW' },
    { name: 'Jordan Addison', position: 'WR', nflTeam: 'MIN', adp: 110, tier: 'LOW' },
    { name: 'De\'Von Achane', position: 'RB', nflTeam: 'MIA', adp: 150, tier: 'LOW' },
    { name: 'Kyren Williams', position: 'RB', nflTeam: 'LAR', adp: 120, tier: 'LOW' },
    
    // Kickers and DSTs
    { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', adp: 200, tier: 'HIGH' },
    { name: 'Daniel Carlson', position: 'K', nflTeam: 'LV', adp: 210, tier: 'MID' },
    { name: 'Jason Sanders', position: 'K', nflTeam: 'MIA', adp: 220, tier: 'MID' },
    { name: 'Bills DST', position: 'DST', nflTeam: 'BUF', adp: 180, tier: 'HIGH' },
    { name: '49ers DST', position: 'DST', nflTeam: 'SF', adp: 190, tier: 'HIGH' },
    { name: 'Eagles DST', position: 'DST', nflTeam: 'PHI', adp: 200, tier: 'MID' }
  ];

  /**
   * Seed complete analytics data for weeks 1-3
   */
  async seedAnalyticsData(season: number = 2025): Promise<void> {
    try {
      // Step 1: Create players
      await this.createPlayers();
      
      // Step 2: Create teams if they don't exist
      await this.createTeams();
      
      // Step 3: Populate rosters
      await this.populateRosters();
      
      // Step 4: Generate weeks 1-3 data
      for (let week = 1; week <= 3; week++) {
        await this.generateWeekData(week, season);
      }
      
      // Step 5: Calculate derived analytics
      await this.calculateDerivedAnalytics(season);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('❌ Data seeding failed:', error);

      }
      throw error;
    }
  }

  /**
   * Create players in database
   */
  private async createPlayers(): Promise<void> {
    for (const playerData of this.players) {
      await prisma.player.upsert({
        where: { id: playerData.name } as any,
        update: {
          position: playerData.position,
          nflTeam: playerData.nflTeam,
          adp: playerData.adp,
          isFantasyRelevant: true
        },
        create: {
          name: playerData.name,
          position: playerData.position,
          nflTeam: playerData.nflTeam,
          adp: playerData.adp,
          isFantasyRelevant: true,
          rank: playerData.adp
        }
      });
    }
  }

  /**
   * Create fantasy teams
   */
  private async createTeams(): Promise<void> {
    const league = await prisma.league.findFirst() || await prisma.league.create({
      data: {
        name: 'AstralField Championship League',
        description: 'Elite fantasy football competition',
        maxTeams: 12,
        currentWeek: 3
      }
    });

    const teamNames = [
      'Thunder Bolts', 'Gridiron Warriors', 'Touchdown Titans', 'Fantasy Legends',
      'Championship Chasers', 'Elite Competitors', 'Victory Formation', 'Draft Masters',
      'Playoff Bound', 'League Dominators', 'Fantasy Phenoms', 'Ultimate Champions'
    ];

    const users = await prisma.user.findMany({ take: 12 });
    
    for (let i = 0; i < Math.min(teamNames.length, users.length); i++) {
      await prisma.team.upsert({
        where: {
          ownerId_leagueId: {
            ownerId: users[i].id,
            leagueId: league.id
          }
        },
        update: {
          name: teamNames[i]
        },
        create: {
          name: teamNames[i],
          ownerId: users[i].id,
          leagueId: league.id
        }
      });
    }
  }

  /**
   * Populate team rosters
   */
  private async populateRosters(): Promise<void> {
    const teams = await prisma.team.findMany();
    const players = await prisma.player.findMany({
      orderBy: { adp: 'asc' }
    });

    // Simple snake draft simulation
    let currentTeamIndex = 0;
    let direction = 1;
    let round = 1;
    
    for (const player of players.slice(0, teams.length * 16)) { // 16 players per team
      const team = teams[currentTeamIndex];
      
      // Determine if starter based on position and draft order
      const isStarter = this.determineStarterStatus(player.position, round);
      
      await prisma.rosterPlayer.create({
        data: {
          teamId: team.id,
          playerId: player.id,
          position: this.getLineupPosition(player.position, isStarter),
          isStarter
        }
      });
      
      // Snake draft logic
      if (direction === 1) {
        currentTeamIndex++;
        if (currentTeamIndex >= teams.length) {
          currentTeamIndex = teams.length - 1;
          direction = -1;
          round++;
        }
      } else {
        currentTeamIndex--;
        if (currentTeamIndex < 0) {
          currentTeamIndex = 0;
          direction = 1;
          round++;
        }
      }
    }
  }

  /**
   * Generate realistic data for a specific week
   */
  private async generateWeekData(week: number, season: number): Promise<void> {
    const players = await prisma.player.findMany({
      include: {
        roster: {
          include: { team: true }
        }
      }
    });

    // Generate player stats and analytics
    for (const player of players) {
      const performance = this.generatePlayerPerformance(player, week);
      
      // Create player stats
      await prisma.playerStats.upsert({
        where: {
          playerId_week_season: {
            playerId: player.id,
            week,
            season
          }
        },
        update: {
          fantasyPoints: performance.fantasyPoints,
          stats: JSON.stringify(performance.stats)
        },
        create: {
          playerId: player.id,
          week,
          season,
          fantasyPoints: performance.fantasyPoints,
          stats: JSON.stringify(performance.stats)
        }
      });

      // Create player projections for next week
      if (week < 17) {
        const projection = this.generateProjection(player, week + 1);
        await prisma.playerProjection.upsert({
          where: {
            playerId_week_season: {
              playerId: player.id,
              week: week + 1,
              season
            }
          },
          update: {
            projectedPoints: projection.points,
            confidence: projection.confidence
          },
          create: {
            playerId: player.id,
            week: week + 1,
            season,
            projectedPoints: projection.points,
            confidence: projection.confidence
          }
        });
      }

      // Create weekly analytics
      const analytics = this.calculatePlayerAnalytics(player, performance, week);
      await prisma.playerWeeklyAnalytics.upsert({
        where: {
          playerId_week_season: {
            playerId: player.id,
            week,
            season
          }
        },
        update: analytics,
        create: {
          playerId: player.id,
          week,
          season,
          ...analytics
        }
      });
    }

    // Generate team stats
    await this.generateTeamStats(week, season);
    
    // Generate matchups and analytics
    await this.generateMatchups(week, season);
    
    // Generate waiver wire analytics
    await this.generateWaiverAnalytics(week, season);
  }

  /**
   * Generate realistic player performance
   */
  private generatePlayerPerformance(player: any, week: number) {
    const playerData = this.players.find(p => p.name === player.name);
    const tier = playerData?.tier || 'MID';
    
    // Base points by position and tier
    const basePoints = this.getBasePoints(player.position, tier);
    
    // Add week-to-week variance
    const variance = this.getVariance(player.position, tier);
    const weeklyMultiplier = 0.8 + (Math.random() * 0.4); // 0.8x to 1.2x
    const randomFactor = 1 + ((Math.random() - 0.5) * variance);
    
    const fantasyPoints = Math.max(0, basePoints * weeklyMultiplier * randomFactor);
    
    // Generate position-specific stats
    const stats = this.generatePositionStats(player.position, fantasyPoints);
    
    return {
      fantasyPoints: Math.round(fantasyPoints * 10) / 10,
      stats
    };
  }

  private getBasePoints(position: string, tier: string): number {
    const baselines = {
      QB: { ELITE: 22, HIGH: 18, MID: 15, LOW: 12 },
      RB: { ELITE: 18, HIGH: 14, MID: 10, LOW: 6 },
      WR: { ELITE: 16, HIGH: 12, MID: 9, LOW: 5 },
      TE: { ELITE: 14, HIGH: 10, MID: 7, LOW: 4 },
      K: { ELITE: 9, HIGH: 8, MID: 7, LOW: 5 },
      DST: { ELITE: 10, HIGH: 8, MID: 6, LOW: 3 }
    };
    
    const posBaselines = baselines[position as keyof typeof baselines] as any
    return posBaselines?.[tier] || 5;
  }

  private getVariance(position: string, tier: string): number {
    // Higher variance for skill positions, lower for consistent players
    const variances = {
      QB: { ELITE: 0.3, HIGH: 0.4, MID: 0.5, LOW: 0.6 },
      RB: { ELITE: 0.4, HIGH: 0.5, MID: 0.6, LOW: 0.7 },
      WR: { ELITE: 0.5, HIGH: 0.6, MID: 0.7, LOW: 0.8 },
      TE: { ELITE: 0.4, HIGH: 0.5, MID: 0.6, LOW: 0.7 },
      K: { ELITE: 0.6, HIGH: 0.7, MID: 0.8, LOW: 0.9 },
      DST: { ELITE: 0.5, HIGH: 0.6, MID: 0.7, LOW: 0.8 }
    };
    
    const posVariances = variances[position as keyof typeof variances] as any
    return posVariances?.[tier] || 0.5;
  }

  private generatePositionStats(position: string, fantasyPoints: number) {
    switch (position) {
      case 'QB':
        const passingYards = Math.floor(fantasyPoints * 12 + Math.random() * 100);
        const passingTds = Math.floor(fantasyPoints * 0.15 + Math.random() * 2);
        const interceptions = Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0;
        const rushingYards = Math.floor(Math.random() * 50);
        const rushingTds = Math.random() > 0.8 ? 1 : 0;
        
        return {
          passingYards,
          passingTds,
          interceptions,
          rushingYards,
          rushingTds,
          fumbles: Math.random() > 0.9 ? 1 : 0
        };
        
      case 'RB':
        const carries = Math.floor(fantasyPoints * 0.8 + Math.random() * 10);
        const rushYards = Math.floor(fantasyPoints * 5 + Math.random() * 50);
        const receptions = Math.floor(Math.random() * 8);
        const recYards = Math.floor(receptions * 8 + Math.random() * 30);
        
        return {
          rushingAttempts: carries,
          rushingYards: rushYards,
          rushingTds: Math.floor(fantasyPoints * 0.1 + Math.random()),
          receptions,
          receivingYards: recYards,
          receivingTds: Math.random() > 0.85 ? 1 : 0,
          targets: receptions + Math.floor(Math.random() * 3),
          fumbles: Math.random() > 0.92 ? 1 : 0
        };
        
      case 'WR':
        const targets = Math.floor(fantasyPoints * 0.7 + Math.random() * 8);
        const recs = Math.floor(targets * (0.6 + Math.random() * 0.3));
        const yards = Math.floor(recs * 12 + Math.random() * 40);
        
        return {
          targets,
          receptions: recs,
          receivingYards: yards,
          receivingTds: Math.floor(fantasyPoints * 0.12 + Math.random() * 0.8),
          fumbles: Math.random() > 0.95 ? 1 : 0
        };
        
      case 'TE':
        const teTargets = Math.floor(fantasyPoints * 0.6 + Math.random() * 6);
        const teRecs = Math.floor(teTargets * (0.65 + Math.random() * 0.25));
        
        return {
          targets: teTargets,
          receptions: teRecs,
          receivingYards: Math.floor(teRecs * 10 + Math.random() * 30),
          receivingTds: Math.floor(fantasyPoints * 0.1 + Math.random() * 0.6),
          fumbles: Math.random() > 0.96 ? 1 : 0
        };
        
      default:
        return {};
    }
  }

  private generateProjection(player: any, week: number) {
    const playerData = this.players.find(p => p.name === player.name);
    const tier = playerData?.tier || 'MID';
    const basePoints = this.getBasePoints(player.position, tier);
    
    // Add some uncertainty to projections
    const uncertainty = 0.1 + (Math.random() * 0.2); // 10-30% uncertainty
    const projectedPoints = basePoints * (1 + ((Math.random() - 0.5) * uncertainty));
    
    return {
      points: Math.max(0, Math.round(projectedPoints * 10) / 10),
      confidence: 0.6 + (Math.random() * 0.3) // 60-90% confidence
    };
  }

  private calculatePlayerAnalytics(player: any, performance: any, week: number) {
    const playerData = this.players.find(p => p.name === player.name);
    const tier = playerData?.tier || 'MID';
    
    // Calculate various analytics scores
    const consistencyScore = this.calculateConsistency(tier);
    const trendScore = (Math.random() - 0.5) * 0.4; // -0.2 to +0.2
    const volumeScore = this.calculateVolumeScore(player.position, performance.stats);
    const efficiencyScore = this.calculateEfficiencyScore(performance.fantasyPoints, performance.stats);
    
    return {
      fantasyPoints: performance.fantasyPoints,
      projectedPoints: this.generateProjection(player, week).points,
      target: performance.stats.targets || 0,
      receptions: performance.stats.receptions || 0,
      rushingYards: performance.stats.rushingYards || 0,
      passingYards: performance.stats.passingYards || 0,
      touchdowns: (performance.stats.passingTds || 0) + (performance.stats.rushingTds || 0) + (performance.stats.receivingTds || 0),
      snapPercentage: 65 + Math.random() * 30, // 65-95%
      redZoneTargets: Math.floor(Math.random() * 4),
      goalLineCarries: Math.floor(Math.random() * 3),
      ownership: this.calculateOwnership(tier),
      consistencyScore,
      volumeScore,
      efficiencyScore,
      trendScore
    };
  }

  private calculateConsistency(tier: string): number {
    const baseConsistency = {
      ELITE: 0.85,
      HIGH: 0.75,
      MID: 0.65,
      LOW: 0.55
    };
    
    return baseConsistency[tier as keyof typeof baseConsistency] + (Math.random() * 0.2 - 0.1);
  }

  private calculateVolumeScore(position: string, stats: any): number {
    const touches = (stats.rushingAttempts || 0) + (stats.targets || 0);
    const snapPercentage = 65 + Math.random() * 30;
    
    return Math.min(1, (touches * 0.02) + (snapPercentage * 0.01));
  }

  private calculateEfficiencyScore(fantasyPoints: number, stats: any): number {
    const touches = (stats.rushingAttempts || 0) + (stats.targets || 0);
    if (touches === 0) return 0;
    
    const pointsPerTouch = fantasyPoints / touches;
    return Math.min(1, pointsPerTouch / 2);
  }

  private calculateOwnership(tier: string): number {
    const baseOwnership = {
      ELITE: 95,
      HIGH: 80,
      MID: 60,
      LOW: 25
    };
    
    return baseOwnership[tier as keyof typeof baseOwnership] + (Math.random() * 10 - 5);
  }

  private async generateTeamStats(week: number, season: number): Promise<void> {
    const teams = await prisma.team.findMany({
      include: {
        roster: {
          where: { isStarter: true },
          include: {
            player: {
              include: {
                stats: {
                  where: { week, season }
                }
              }
            }
          }
        }
      }
    });

    for (const team of teams) {
      let totalPoints = 0;
      let projectedPoints = 0;
      
      for (const rosterPlayer of team.roster) {
        const playerStats = rosterPlayer.player.stats[0];
        if (playerStats) {
          totalPoints += playerStats.fantasyPoints;
        }
        
        // Add projected points (simplified)
        projectedPoints += this.getBasePoints(rosterPlayer.player.position, 'MID');
      }
      
      // Calculate optimal points (would be more complex in reality)
      const optimalPoints = totalPoints * (1.1 + Math.random() * 0.1);
      
      await prisma.weeklyTeamStats.upsert({
        where: {
          teamId_week_season: {
            teamId: team.id,
            week,
            season
          }
        },
        update: {
          totalPoints,
          projectedPoints,
          benchPoints: Math.random() * 30,
          optimalPoints,
          rank: 1, // Will be calculated later
          movingAverage: totalPoints // Simplified
        },
        create: {
          teamId: team.id,
          week,
          season,
          totalPoints,
          projectedPoints,
          benchPoints: Math.random() * 30,
          optimalPoints,
          rank: 1,
          movingAverage: totalPoints
        }
      });
    }
  }

  private async generateMatchups(week: number, season: number): Promise<void> {
    const teams = await prisma.team.findMany();
    
    // Create simple round-robin style matchups
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        const homeTeam = teams[i];
        const awayTeam = teams[i + 1];
        
        const homeStats = await prisma.weeklyTeamStats.findFirst({
          where: { teamId: homeTeam.id, week, season }
        });
        
        const awayStats = await prisma.weeklyTeamStats.findFirst({
          where: { teamId: awayTeam.id, week, season }
        });
        
        const matchup = await prisma.matchup.upsert({
          where: {
            week_season_homeTeamId_awayTeamId: {
              week,
              season,
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id
            }
          },
          update: {
            homeScore: homeStats?.totalPoints || 0,
            awayScore: awayStats?.totalPoints || 0,
            isComplete: true
          },
          create: {
            week,
            season,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeScore: homeStats?.totalPoints || 0,
            awayScore: awayStats?.totalPoints || 0,
            isComplete: true,
            leagueId: homeTeam.leagueId
          }
        });
        
        // Create matchup analytics
        await prisma.matchupAnalytics.upsert({
          where: {
            matchupId_week_season: {
              matchupId: matchup.id,
              week,
              season
            }
          },
          update: {
            homeTeamProjection: homeStats?.projectedPoints || 0,
            awayTeamProjection: awayStats?.projectedPoints || 0,
            winProbability: Math.random(),
            volatility: Math.random() * 0.3,
            confidenceLevel: 0.7 + Math.random() * 0.3,
            keyPlayers: JSON.stringify(['player1', 'player2']),
            weatherImpact: 0,
            injuryRisk: 0
          },
          create: {
            matchupId: matchup.id,
            week,
            season,
            homeTeamProjection: homeStats?.projectedPoints || 0,
            awayTeamProjection: awayStats?.projectedPoints || 0,
            winProbability: Math.random(),
            volatility: Math.random() * 0.3,
            confidenceLevel: 0.7 + Math.random() * 0.3,
            keyPlayers: JSON.stringify(['player1', 'player2']),
            weatherImpact: 0,
            injuryRisk: 0
          }
        });
      }
    }
  }

  private async generateWaiverAnalytics(week: number, season: number): Promise<void> {
    // Get unrostered players
    const unrosteredPlayers = await prisma.player.findMany({
      where: {
        roster: {
          none: {}
        },
        isFantasyRelevant: true
      },
      take: 20
    });

    for (const player of unrosteredPlayers) {
      const addPercentage = Math.random() * 30;
      const dropPercentage = Math.random() * 15;
      const isEmerging = Math.random() > 0.8;
      const isBreakout = Math.random() > 0.9;
      
      await prisma.waiverWireAnalytics.upsert({
        where: {
          playerId_week_season: {
            playerId: player.id,
            week,
            season
          }
        },
        update: {
          addPercentage,
          dropPercentage,
          faabSpent: Math.floor(addPercentage * 2),
          emergingPlayer: isEmerging,
          breakoutCandidate: isBreakout,
          sleeper: (player.adp ?? 0) > 150 && isEmerging,
          injuryReplacement: false,
          streamingOption: ['K', 'DST'].includes(player.position),
          priorityLevel: isBreakout ? 5 : isEmerging ? 4 : Math.floor(addPercentage / 7) + 1,
          reasonsToAdd: JSON.stringify([
            isEmerging && 'Emerging player',
            isBreakout && 'Breakout candidate',
            addPercentage > 15 && 'High add percentage'
          ].filter(Boolean)),
          expectedOwnership: Math.min(100, addPercentage * 3),
          upcomingSchedule: JSON.stringify([])
        },
        create: {
          playerId: player.id,
          week,
          season,
          addPercentage,
          dropPercentage,
          faabSpent: Math.floor(addPercentage * 2),
          emergingPlayer: isEmerging,
          breakoutCandidate: isBreakout,
          sleeper: (player.adp ?? 0) > 150 && isEmerging,
          injuryReplacement: false,
          streamingOption: ['K', 'DST'].includes(player.position),
          priorityLevel: isBreakout ? 5 : isEmerging ? 4 : Math.floor(addPercentage / 7) + 1,
          reasonsToAdd: JSON.stringify([
            isEmerging && 'Emerging player',
            isBreakout && 'Breakout candidate',
            addPercentage > 15 && 'High add percentage'
          ].filter(Boolean)),
          expectedOwnership: Math.min(100, addPercentage * 3),
          upcomingSchedule: JSON.stringify([])
        }
      });
    }
  }

  private async calculateDerivedAnalytics(season: number): Promise<void> {
    // Update team rankings
    for (let week = 1; week <= 3; week++) {
      const teamStats = await prisma.weeklyTeamStats.findMany({
        where: { week, season },
        orderBy: { totalPoints: 'desc' }
      });
      
      for (let i = 0; i < teamStats.length; i++) {
        await prisma.weeklyTeamStats.update({
          where: { id: teamStats[i].id },
          data: { rank: i + 1 }
        });
      }
    }
    
    // Calculate player consistency
    const players = await prisma.player.findMany({
      include: {
        stats: {
          where: { season },
          orderBy: { week: 'asc' }
        }
      }
    });
    
    for (const player of players) {
      if (player.stats.length > 0) {
        const points = player.stats.map(s => s.fantasyPoints);
        const totalPoints = points.reduce((a, b) => a + b, 0);
        const averagePoints = totalPoints / points.length;
        const variance = points.reduce((sum, p) => sum + Math.pow(p - averagePoints, 2), 0) / points.length;
        const standardDeviation = Math.sqrt(variance);
        
        await prisma.playerConsistency.upsert({
          where: {
            playerId_season: {
              playerId: player.id,
              season
            }
          },
          update: {
            weekCount: points.length,
            totalPoints,
            averagePoints,
            standardDeviation,
            coefficient: averagePoints > 0 ? standardDeviation / averagePoints : 0,
            floorScore: Math.min(...points),
            ceilingScore: Math.max(...points),
            busts: points.filter(p => p < averagePoints * 0.5).length,
            booms: points.filter(p => p > averagePoints * 1.5).length,
            reliability: points.filter(p => p >= averagePoints * 0.8 && p <= averagePoints * 1.2).length / points.length
          },
          create: {
            playerId: player.id,
            season,
            weekCount: points.length,
            totalPoints,
            averagePoints,
            standardDeviation,
            coefficient: averagePoints > 0 ? standardDeviation / averagePoints : 0,
            floorScore: Math.min(...points),
            ceilingScore: Math.max(...points),
            busts: points.filter(p => p < averagePoints * 0.5).length,
            booms: points.filter(p => p > averagePoints * 1.5).length,
            reliability: points.filter(p => p >= averagePoints * 0.8 && p <= averagePoints * 1.2).length / points.length
          }
        });
      }
    }
  }

  private determineStarterStatus(position: string, round: number): boolean {
    // Simple logic for determining starters
    if (position === 'QB') return round <= 1;
    if (position === 'RB') return round <= 2;
    if (position === 'WR') return round <= 3;
    if (position === 'TE') return round <= 1;
    if (position === 'K') return round <= 1;
    if (position === 'DST') return round <= 1;
    return false;
  }

  private getLineupPosition(position: string, isStarter: boolean): string {
    return isStarter ? position : 'BENCH';
  }
}

// Export for use in scripts
export async function seedVortexData() {
  const seeder = new VortexDataSeeder();
  await seeder.seedAnalyticsData();
}

export default VortexDataSeeder;
