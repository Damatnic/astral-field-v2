import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface KeeperSettings {
  leagueId: string;
  maxKeepers: number;
  keeperDeadline: Date;
  keeperCostIncrease: number;
  allowTradingKeepers: boolean;
  rookieKeeperYears: number;
  keeperDraftPenalty: number;
  allowSameRoundKeepers: boolean;
  maxYearsKept: number;
  keeperValueCalculation: 'draft_round' | 'auction_value' | 'custom';
  customKeeperRules?: string;
}

export interface KeeperPlayer {
  id: string;
  playerId: string;
  teamId: string;
  leagueId: string;
  season: number;
  originalDraftRound?: number;
  originalAuctionValue?: number;
  yearsKept: number;
  currentKeeperCost: number;
  nextYearCost: number;
  canBeKept: boolean;
  keeperDeadline: Date;
  isRookie: boolean;
  contractYearsRemaining?: number;
}

export interface KeeperDecision {
  teamId: string;
  playerId: string;
  keeperCost: number;
  draftRoundPenalty: number;
  decision: 'keep' | 'release';
  decisionDate: Date;
  reason?: string;
}

export interface KeeperHistory {
  playerId: string;
  teamId: string;
  seasons: number[];
  totalYearsKept: number;
  originalTeam: string;
  keeperValue: number[];
  performance: {
    averagePoints: number;
    totalPoints: number;
    gamesPlayed: number;
    peakSeason: number;
  };
}

export interface KeeperAnalysis {
  playerId: string;
  playerName: string;
  position: string;
  projectedPoints: number;
  currentValue: number;
  keeperCost: number;
  valueOverCost: number;
  recommendation: 'strong_keep' | 'keep' | 'consider' | 'release';
  reasoning: string[];
  comparablePlayers: Array<{
    name: string;
    projectedPoints: number;
    expectedDraftPosition: number;
  }>;
  historicalPerformance: {
    lastSeasonPoints: number;
    lastSeasonRank: number;
    trend: 'rising' | 'stable' | 'declining';
  };
}

export interface KeeperTradeOffer {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  offeringKeepers: string[];
  requestingKeepers: string[];
  draftPicksOffered?: Array<{
    round: number;
    year: number;
  }>;
  draftPicksRequested?: Array<{
    round: number;
    year: number;
  }>;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: Date;
  notes?: string;
}

export class KeeperLeagueService {
  async getKeeperSettings(leagueId: string): Promise<KeeperSettings | null> {
    const cacheKey = `keeper:settings:${leagueId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const settings = await prisma.keeperSettings.findUnique({
      where: { leagueId }
    });

    if (settings) {
      await redis.setex(cacheKey, 3600, JSON.stringify(settings));
    }

    return settings;
  }

  async updateKeeperSettings(leagueId: string, settings: Partial<KeeperSettings>): Promise<KeeperSettings> {
    const updated = await prisma.keeperSettings.upsert({
      where: { leagueId },
      update: settings,
      create: {
        leagueId,
        maxKeepers: settings.maxKeepers || 3,
        keeperDeadline: settings.keeperDeadline || this.getDefaultKeeperDeadline(),
        keeperCostIncrease: settings.keeperCostIncrease || 1,
        allowTradingKeepers: settings.allowTradingKeepers ?? true,
        rookieKeeperYears: settings.rookieKeeperYears || 3,
        keeperDraftPenalty: settings.keeperDraftPenalty || 1,
        allowSameRoundKeepers: settings.allowSameRoundKeepers ?? false,
        maxYearsKept: settings.maxYearsKept || 3,
        keeperValueCalculation: settings.keeperValueCalculation || 'draft_round',
        customKeeperRules: settings.customKeeperRules
      }
    });

    await redis.del(`keeper:settings:${leagueId}`);
    return updated;
  }

  async getEligibleKeepers(teamId: string, season: number): Promise<KeeperPlayer[]> {
    const cacheKey = `keeper:eligible:${teamId}:${season}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        league: {
          include: {
            keeperSettings: true
          }
        },
        roster: {
          include: {
            player: true,
            keeperInfo: true
          }
        },
        draftPicks: {
          where: {
            season: season - 1
          }
        },
        transactions: {
          where: {
            type: 'TRADE',
            season: season - 1
          }
        }
      }
    });

    if (!team || !team.league.keeperSettings) {
      return [];
    }

    const settings = team.league.keeperSettings;
    const eligibleKeepers: KeeperPlayer[] = [];

    for (const rosterSpot of team.roster) {
      const keeperInfo = await this.calculateKeeperInfo(
        rosterSpot.player,
        team.id,
        team.leagueId,
        season,
        settings
      );

      if (keeperInfo.canBeKept) {
        eligibleKeepers.push(keeperInfo);
      }
    }

    eligibleKeepers.sort((a, b) => a.currentKeeperCost - b.currentKeeperCost);

    await redis.setex(cacheKey, 1800, JSON.stringify(eligibleKeepers));
    return eligibleKeepers;
  }

  private async calculateKeeperInfo(
    player: any,
    teamId: string,
    leagueId: string,
    season: number,
    settings: KeeperSettings
  ): Promise<KeeperPlayer> {
    const previousKeeperInfo = await prisma.keeperHistory.findFirst({
      where: {
        playerId: player.id,
        teamId,
        season: season - 1
      }
    });

    const draftInfo = await prisma.draftPick.findFirst({
      where: {
        playerId: player.id,
        teamId,
        season: season - 1
      }
    });

    const yearsKept = previousKeeperInfo ? previousKeeperInfo.yearsKept + 1 : 0;
    const originalDraftRound = draftInfo?.round || previousKeeperInfo?.originalDraftRound;
    const originalAuctionValue = draftInfo?.auctionValue || previousKeeperInfo?.originalAuctionValue;

    let currentKeeperCost = 0;
    let nextYearCost = 0;

    if (settings.keeperValueCalculation === 'draft_round' && originalDraftRound) {
      currentKeeperCost = Math.max(1, originalDraftRound - (settings.keeperDraftPenalty * yearsKept));
      nextYearCost = Math.max(1, currentKeeperCost - settings.keeperDraftPenalty);
    } else if (settings.keeperValueCalculation === 'auction_value' && originalAuctionValue) {
      currentKeeperCost = originalAuctionValue + (settings.keeperCostIncrease * yearsKept);
      nextYearCost = currentKeeperCost + settings.keeperCostIncrease;
    } else {
      currentKeeperCost = await this.getCustomKeeperCost(player.id, teamId, yearsKept);
      nextYearCost = currentKeeperCost + settings.keeperCostIncrease;
    }

    const isRookie = await this.isRookiePlayer(player.id, season);
    const canBeKept = yearsKept < settings.maxYearsKept && 
                      (!isRookie || yearsKept < settings.rookieKeeperYears);

    return {
      id: `${teamId}-${player.id}-${season}`,
      playerId: player.id,
      teamId,
      leagueId,
      season,
      originalDraftRound,
      originalAuctionValue,
      yearsKept,
      currentKeeperCost,
      nextYearCost,
      canBeKept,
      keeperDeadline: settings.keeperDeadline,
      isRookie,
      contractYearsRemaining: isRookie ? settings.rookieKeeperYears - yearsKept : undefined
    };
  }

  async submitKeeperDecisions(teamId: string, decisions: KeeperDecision[]): Promise<void> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        league: {
          include: {
            keeperSettings: true
          }
        }
      }
    });

    if (!team || !team.league.keeperSettings) {
      throw new Error('Invalid team or league settings');
    }

    const settings = team.league.keeperSettings;
    const keptPlayers = decisions.filter(d => d.decision === 'keep');

    if (keptPlayers.length > settings.maxKeepers) {
      throw new Error(`Cannot keep more than ${settings.maxKeepers} players`);
    }

    const now = new Date();
    if (now > settings.keeperDeadline) {
      throw new Error('Keeper deadline has passed');
    }

    if (!settings.allowSameRoundKeepers) {
      const rounds = keptPlayers.map(d => d.draftRoundPenalty);
      const uniqueRounds = new Set(rounds);
      if (rounds.length !== uniqueRounds.size) {
        throw new Error('Cannot keep multiple players with the same draft round penalty');
      }
    }

    for (const decision of decisions) {
      await prisma.keeperDecision.upsert({
        where: {
          teamId_playerId_season: {
            teamId,
            playerId: decision.playerId,
            season: new Date().getFullYear()
          }
        },
        update: {
          decision: decision.decision,
          keeperCost: decision.keeperCost,
          draftRoundPenalty: decision.draftRoundPenalty,
          decisionDate: now,
          reason: decision.reason
        },
        create: {
          teamId,
          playerId: decision.playerId,
          season: new Date().getFullYear(),
          decision: decision.decision,
          keeperCost: decision.keeperCost,
          draftRoundPenalty: decision.draftRoundPenalty,
          decisionDate: now,
          reason: decision.reason
        }
      });

      if (decision.decision === 'keep') {
        await prisma.keeperHistory.create({
          data: {
            playerId: decision.playerId,
            teamId,
            season: new Date().getFullYear(),
            keeperCost: decision.keeperCost,
            yearsKept: await this.getYearsKept(decision.playerId, teamId) + 1
          }
        });
      }
    }

    await redis.del(`keeper:eligible:${teamId}:*`);
    await redis.del(`keeper:decisions:${teamId}:*`);
  }

  async getKeeperDecisions(teamId: string, season: number): Promise<KeeperDecision[]> {
    const cacheKey = `keeper:decisions:${teamId}:${season}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const decisions = await prisma.keeperDecision.findMany({
      where: {
        teamId,
        season
      },
      include: {
        player: true
      }
    });

    await redis.setex(cacheKey, 1800, JSON.stringify(decisions));
    return decisions;
  }

  async analyzeKeeperValue(playerId: string, teamId: string): Promise<KeeperAnalysis> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        stats: {
          orderBy: { season: 'desc' },
          take: 3
        },
        projections: {
          where: {
            season: new Date().getFullYear()
          }
        }
      }
    });

    if (!player) {
      throw new Error('Player not found');
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        league: {
          include: {
            keeperSettings: true
          }
        }
      }
    });

    if (!team || !team.league.keeperSettings) {
      throw new Error('Invalid team or league settings');
    }

    const keeperInfo = await this.calculateKeeperInfo(
      player,
      teamId,
      team.leagueId,
      new Date().getFullYear(),
      team.league.keeperSettings
    );

    const projectedPoints = player.projections[0]?.projectedPoints || 0;
    const currentValue = await this.calculatePlayerValue(player, team.league.scoringSystem);
    const valueOverCost = currentValue - keeperInfo.currentKeeperCost;

    const comparablePlayers = await this.findComparablePlayers(player, team.leagueId);
    const historicalPerformance = await this.getHistoricalPerformance(player);

    let recommendation: KeeperAnalysis['recommendation'];
    const reasoning: string[] = [];

    if (valueOverCost > 3) {
      recommendation = 'strong_keep';
      reasoning.push(`Excellent value: ${valueOverCost.toFixed(1)} rounds better than cost`);
    } else if (valueOverCost > 1) {
      recommendation = 'keep';
      reasoning.push(`Good value: ${valueOverCost.toFixed(1)} rounds better than cost`);
    } else if (valueOverCost > -1) {
      recommendation = 'consider';
      reasoning.push('Neutral value proposition');
    } else {
      recommendation = 'release';
      reasoning.push(`Poor value: ${Math.abs(valueOverCost).toFixed(1)} rounds worse than cost`);
    }

    if (keeperInfo.yearsKept >= 2) {
      reasoning.push(`Already kept for ${keeperInfo.yearsKept} years`);
    }

    if (keeperInfo.isRookie) {
      reasoning.push('Rookie with potential upside');
      if (recommendation === 'consider') {
        recommendation = 'keep';
      }
    }

    if (historicalPerformance.trend === 'declining') {
      reasoning.push('Performance trending downward');
      if (recommendation === 'keep') {
        recommendation = 'consider';
      }
    } else if (historicalPerformance.trend === 'rising') {
      reasoning.push('Performance trending upward');
      if (recommendation === 'consider') {
        recommendation = 'keep';
      }
    }

    if (player.age && player.age > 30 && ['RB', 'WR'].includes(player.position)) {
      reasoning.push('Age concern for position');
      if (recommendation === 'strong_keep') {
        recommendation = 'keep';
      }
    }

    return {
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      projectedPoints,
      currentValue,
      keeperCost: keeperInfo.currentKeeperCost,
      valueOverCost,
      recommendation,
      reasoning,
      comparablePlayers,
      historicalPerformance
    };
  }

  async createKeeperTradeOffer(offer: Omit<KeeperTradeOffer, 'id' | 'status'>): Promise<KeeperTradeOffer> {
    const league = await prisma.team.findUnique({
      where: { id: offer.fromTeamId },
      select: {
        league: {
          select: {
            keeperSettings: true
          }
        }
      }
    });

    if (!league?.league.keeperSettings?.allowTradingKeepers) {
      throw new Error('Keeper trading is not allowed in this league');
    }

    const createdOffer = await prisma.keeperTradeOffer.create({
      data: {
        ...offer,
        status: 'pending',
        createdAt: new Date()
      }
    });

    await this.notifyTeamOfKeeperTradeOffer(offer.toTeamId, createdOffer.id);

    return createdOffer;
  }

  async respondToKeeperTradeOffer(
    offerId: string,
    teamId: string,
    response: 'accept' | 'reject',
    counterOffer?: Partial<KeeperTradeOffer>
  ): Promise<void> {
    const offer = await prisma.keeperTradeOffer.findUnique({
      where: { id: offerId }
    });

    if (!offer || offer.toTeamId !== teamId) {
      throw new Error('Invalid offer or unauthorized');
    }

    if (offer.status !== 'pending') {
      throw new Error('Offer is no longer pending');
    }

    if (new Date() > offer.expiresAt) {
      await prisma.keeperTradeOffer.update({
        where: { id: offerId },
        data: { status: 'expired' }
      });
      throw new Error('Offer has expired');
    }

    if (response === 'accept') {
      await this.executeKeeperTrade(offer);
      await prisma.keeperTradeOffer.update({
        where: { id: offerId },
        data: { status: 'accepted', respondedAt: new Date() }
      });
    } else if (response === 'reject') {
      await prisma.keeperTradeOffer.update({
        where: { id: offerId },
        data: { status: 'rejected', respondedAt: new Date() }
      });

      if (counterOffer) {
        await this.createKeeperTradeOffer({
          fromTeamId: teamId,
          toTeamId: offer.fromTeamId,
          ...counterOffer
        } as Omit<KeeperTradeOffer, 'id' | 'status'>);
      }
    }

    await this.notifyTeamOfTradeResponse(offer.fromTeamId, offerId, response);
  }

  private async executeKeeperTrade(offer: KeeperTradeOffer): Promise<void> {
    for (const keeperId of offer.offeringKeepers) {
      await prisma.keeperRights.update({
        where: {
          playerId_teamId: {
            playerId: keeperId,
            teamId: offer.fromTeamId
          }
        },
        data: {
          teamId: offer.toTeamId,
          tradedFrom: offer.fromTeamId,
          tradedAt: new Date()
        }
      });
    }

    for (const keeperId of offer.requestingKeepers) {
      await prisma.keeperRights.update({
        where: {
          playerId_teamId: {
            playerId: keeperId,
            teamId: offer.toTeamId
          }
        },
        data: {
          teamId: offer.fromTeamId,
          tradedFrom: offer.toTeamId,
          tradedAt: new Date()
        }
      });
    }

    if (offer.draftPicksOffered && offer.draftPicksOffered.length > 0) {
      for (const pick of offer.draftPicksOffered) {
        await prisma.futureDraftPick.update({
          where: {
            teamId_round_year: {
              teamId: offer.fromTeamId,
              round: pick.round,
              year: pick.year
            }
          },
          data: {
            ownerId: offer.toTeamId,
            tradedAt: new Date()
          }
        });
      }
    }

    if (offer.draftPicksRequested && offer.draftPicksRequested.length > 0) {
      for (const pick of offer.draftPicksRequested) {
        await prisma.futureDraftPick.update({
          where: {
            teamId_round_year: {
              teamId: offer.toTeamId,
              round: pick.round,
              year: pick.year
            }
          },
          data: {
            ownerId: offer.fromTeamId,
            tradedAt: new Date()
          }
        });
      }
    }

    await redis.del(`keeper:eligible:${offer.fromTeamId}:*`);
    await redis.del(`keeper:eligible:${offer.toTeamId}:*`);
  }

  async getKeeperHistory(playerId: string, leagueId: string): Promise<KeeperHistory> {
    const history = await prisma.keeperHistory.findMany({
      where: {
        playerId,
        team: {
          leagueId
        }
      },
      include: {
        team: true
      },
      orderBy: {
        season: 'asc'
      }
    });

    const playerStats = await prisma.playerStats.groupBy({
      by: ['playerId'],
      where: {
        playerId,
        season: {
          in: history.map(h => h.season)
        }
      },
      _avg: {
        points: true
      },
      _sum: {
        points: true,
        gamesPlayed: true
      },
      _max: {
        points: true,
        season: true
      }
    });

    return {
      playerId,
      teamId: history[history.length - 1]?.teamId || '',
      seasons: history.map(h => h.season),
      totalYearsKept: history.length,
      originalTeam: history[0]?.team.name || '',
      keeperValue: history.map(h => h.keeperCost),
      performance: {
        averagePoints: playerStats[0]?._avg?.points || 0,
        totalPoints: playerStats[0]?._sum?.points || 0,
        gamesPlayed: playerStats[0]?._sum?.gamesPlayed || 0,
        peakSeason: playerStats[0]?._max?.season || 0
      }
    };
  }

  async getLeagueKeeperReport(leagueId: string, season: number): Promise<any> {
    const teams = await prisma.team.findMany({
      where: { leagueId },
      include: {
        keeperDecisions: {
          where: {
            season,
            decision: 'keep'
          },
          include: {
            player: true
          }
        }
      }
    });

    const report = {
      leagueId,
      season,
      totalKeepersUsed: 0,
      averageKeeperCost: 0,
      positionBreakdown: {} as Record<string, number>,
      topKeptPlayers: [] as any[],
      teamSummaries: [] as any[]
    };

    let totalCost = 0;
    const keptPlayers: any[] = [];

    for (const team of teams) {
      const teamKeepers = team.keeperDecisions;
      report.totalKeepersUsed += teamKeepers.length;

      for (const keeper of teamKeepers) {
        totalCost += keeper.keeperCost;
        keptPlayers.push({
          player: keeper.player,
          team: team.name,
          cost: keeper.keeperCost
        });

        const position = keeper.player.position;
        report.positionBreakdown[position] = (report.positionBreakdown[position] || 0) + 1;
      }

      report.teamSummaries.push({
        teamId: team.id,
        teamName: team.name,
        keepersUsed: teamKeepers.length,
        totalKeeperCost: teamKeepers.reduce((sum, k) => sum + k.keeperCost, 0),
        keepers: teamKeepers.map(k => ({
          playerName: k.player.name,
          position: k.player.position,
          cost: k.keeperCost
        }))
      });
    }

    report.averageKeeperCost = report.totalKeepersUsed > 0 
      ? totalCost / report.totalKeepersUsed 
      : 0;

    report.topKeptPlayers = keptPlayers
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 10);

    return report;
  }

  async suggestOptimalKeepers(teamId: string): Promise<KeeperDecision[]> {
    const eligibleKeepers = await this.getEligibleKeepers(teamId, new Date().getFullYear());
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        league: {
          include: {
            keeperSettings: true
          }
        }
      }
    });

    if (!team || !team.league.keeperSettings) {
      return [];
    }

    const maxKeepers = team.league.keeperSettings.maxKeepers;
    const keeperAnalyses: KeeperAnalysis[] = [];

    for (const keeper of eligibleKeepers) {
      const analysis = await this.analyzeKeeperValue(keeper.playerId, teamId);
      keeperAnalyses.push(analysis);
    }

    keeperAnalyses.sort((a, b) => b.valueOverCost - a.valueOverCost);

    const optimalKeepers = keeperAnalyses
      .slice(0, maxKeepers)
      .filter(a => a.recommendation !== 'release');

    return optimalKeepers.map(analysis => ({
      teamId,
      playerId: analysis.playerId,
      keeperCost: analysis.keeperCost,
      draftRoundPenalty: Math.max(1, 16 - analysis.keeperCost),
      decision: 'keep' as const,
      decisionDate: new Date(),
      reason: analysis.reasoning.join('. ')
    }));
  }

  private async getDefaultKeeperDeadline(): Promise<Date> {
    const nextSeason = new Date().getFullYear() + 1;
    return new Date(`${nextSeason}-08-15`);
  }

  private async getCustomKeeperCost(playerId: string, teamId: string, yearsKept: number): Promise<number> {
    const customCost = await prisma.customKeeperCost.findFirst({
      where: {
        playerId,
        teamId,
        season: new Date().getFullYear()
      }
    });

    return customCost?.cost || (16 - yearsKept * 2);
  }

  private async isRookiePlayer(playerId: string, season: number): Promise<boolean> {
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    return player?.rookieYear === season || player?.rookieYear === season - 1;
  }

  private async getYearsKept(playerId: string, teamId: string): Promise<number> {
    const history = await prisma.keeperHistory.count({
      where: {
        playerId,
        teamId
      }
    });

    return history;
  }

  private async calculatePlayerValue(player: any, scoringSystem: string): Promise<number> {
    const projectedPoints = player.projections[0]?.projectedPoints || 0;
    const positionRank = await prisma.player.count({
      where: {
        position: player.position,
        projections: {
          some: {
            projectedPoints: {
              gt: projectedPoints
            }
          }
        }
      }
    });

    const baseValue = 16;
    let adjustedValue = baseValue;

    if (positionRank <= 5) adjustedValue = 1;
    else if (positionRank <= 10) adjustedValue = 2;
    else if (positionRank <= 20) adjustedValue = 3;
    else if (positionRank <= 30) adjustedValue = 4;
    else if (positionRank <= 40) adjustedValue = 5;
    else if (positionRank <= 50) adjustedValue = 6;
    else if (positionRank <= 70) adjustedValue = 8;
    else if (positionRank <= 90) adjustedValue = 10;
    else if (positionRank <= 110) adjustedValue = 12;
    else adjustedValue = 14;

    return adjustedValue;
  }

  private async findComparablePlayers(player: any, leagueId: string): Promise<any[]> {
    const projectedPoints = player.projections[0]?.projectedPoints || 0;
    
    const comparables = await prisma.player.findMany({
      where: {
        position: player.position,
        id: { not: player.id },
        projections: {
          some: {
            projectedPoints: {
              gte: projectedPoints * 0.9,
              lte: projectedPoints * 1.1
            }
          }
        }
      },
      include: {
        projections: {
          where: {
            season: new Date().getFullYear()
          }
        },
        adp: {
          where: {
            source: 'consensus'
          }
        }
      },
      take: 5
    });

    return comparables.map(p => ({
      name: p.name,
      projectedPoints: p.projections[0]?.projectedPoints || 0,
      expectedDraftPosition: p.adp[0]?.adp || 200
    }));
  }

  private async getHistoricalPerformance(player: any): Promise<any> {
    const recentStats = player.stats.slice(0, 3);
    
    if (recentStats.length === 0) {
      return {
        lastSeasonPoints: 0,
        lastSeasonRank: 999,
        trend: 'stable' as const
      };
    }

    const lastSeason = recentStats[0];
    const lastSeasonRank = await prisma.playerStats.count({
      where: {
        season: lastSeason.season,
        position: player.position,
        totalPoints: {
          gt: lastSeason.totalPoints
        }
      }
    });

    let trend: 'rising' | 'stable' | 'declining' = 'stable';
    if (recentStats.length >= 2) {
      const pointsChange = lastSeason.totalPoints - recentStats[1].totalPoints;
      if (pointsChange > lastSeason.totalPoints * 0.1) {
        trend = 'rising';
      } else if (pointsChange < -lastSeason.totalPoints * 0.1) {
        trend = 'declining';
      }
    }

    return {
      lastSeasonPoints: lastSeason.totalPoints,
      lastSeasonRank: lastSeasonRank + 1,
      trend
    };
  }

  private async notifyTeamOfKeeperTradeOffer(teamId: string, offerId: string): Promise<void> {
    await prisma.notification.create({
      data: {
        teamId,
        type: 'KEEPER_TRADE_OFFER',
        title: 'New Keeper Trade Offer',
        message: 'You have received a new keeper trade offer',
        actionUrl: `/keeper-trades/${offerId}`,
        createdAt: new Date()
      }
    });
  }

  private async notifyTeamOfTradeResponse(teamId: string, offerId: string, response: string): Promise<void> {
    await prisma.notification.create({
      data: {
        teamId,
        type: 'KEEPER_TRADE_RESPONSE',
        title: `Keeper Trade ${response === 'accept' ? 'Accepted' : 'Rejected'}`,
        message: `Your keeper trade offer has been ${response}ed`,
        actionUrl: `/keeper-trades/${offerId}`,
        createdAt: new Date()
      }
    });
  }
}

export const keeperLeagueService = new KeeperLeagueService();