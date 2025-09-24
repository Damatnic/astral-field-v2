import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface LeagueRecord {
  id: string;
  leagueId: string;
  category: 'single_game' | 'weekly' | 'season' | 'playoff' | 'all_time';
  recordType: string;
  value: number;
  holderId: string;
  holderName: string;
  holderTeamId?: string;
  holderTeamName?: string;
  season: number;
  week?: number;
  gameId?: string;
  setDate: Date;
  previousValue?: number;
  previousHolderId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface SeasonSummary {
  season: number;
  championId: string;
  championName: string;
  runnerUpId: string;
  runnerUpName: string;
  regularSeasonWinnerId: string;
  regularSeasonWinnerName: string;
  totalPoints: number;
  totalGames: number;
  highestScore: number;
  lowestScore: number;
  closestGame: {
    week: number;
    teams: string[];
    margin: number;
  };
  biggestBlowout: {
    week: number;
    winner: string;
    loser: string;
    margin: number;
  };
  awards: SeasonAward[];
  milestones: SeasonMilestone[];
}

export interface SeasonAward {
  id: string;
  name: string;
  recipientId: string;
  recipientName: string;
  recipientTeamName?: string;
  value?: number;
  description: string;
}

export interface SeasonMilestone {
  id: string;
  type: string;
  achieverId: string;
  achieverName: string;
  value: number;
  week?: number;
  description: string;
  date: Date;
}

export interface TeamHistory {
  teamId: string;
  teamName: string;
  ownerId: string;
  ownerName: string;
  seasonsPlayed: number;
  championships: number;
  runnerUps: number;
  playoffAppearances: number;
  regularSeasonTitles: number;
  allTimeWins: number;
  allTimeLosses: number;
  allTimeTies: number;
  winPercentage: number;
  allTimePointsFor: number;
  allTimePointsAgainst: number;
  bestSeason: {
    season: number;
    wins: number;
    losses: number;
    pointsFor: number;
    finish: string;
  };
  worstSeason: {
    season: number;
    wins: number;
    losses: number;
    pointsFor: number;
    finish: string;
  };
  records: LeagueRecord[];
  rivalries: RivalryHistory[];
}

export interface RivalryHistory {
  rivalId: string;
  rivalName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  largestVictory: number;
  largestDefeat: number;
  currentStreak: {
    type: 'W' | 'L';
    count: number;
  };
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface HallOfFame {
  id: string;
  leagueId: string;
  inducteeId: string;
  inducteeName: string;
  inductionYear: number;
  category: 'owner' | 'team' | 'performance' | 'contributor';
  achievements: string[];
  stats: {
    championships: number;
    playoffAppearances: number;
    regularSeasonTitles: number;
    winPercentage: number;
    totalPoints: number;
    records: number;
  };
  citation: string;
  votes: number;
  inducted: boolean;
}

export interface HistoricalTransaction {
  id: string;
  type: 'trade' | 'waiver' | 'draft';
  season: number;
  week?: number;
  date: Date;
  teams: string[];
  players: string[];
  details: Record<string, any>;
  impact: {
    immediate: string;
    seasonal: string;
    longTerm?: string;
  };
  rating?: number;
}

export class LeagueHistoryService {
  async getLeagueRecords(leagueId: string, category?: string): Promise<LeagueRecord[]> {
    const cacheKey = `history:records:${leagueId}:${category || 'all'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where: any = { leagueId };
    if (category) where.category = category;

    const records = await prisma.leagueRecord.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { recordType: 'asc' },
        { value: 'desc' }
      ]
    });

    await redis.setex(cacheKey, 3600, JSON.stringify(records));
    return records;
  }

  async updateRecord(
    leagueId: string,
    category: LeagueRecord['category'],
    recordType: string,
    value: number,
    holder: {
      id: string;
      name: string;
      teamId?: string;
      teamName?: string;
    },
    context: {
      season: number;
      week?: number;
      gameId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<LeagueRecord | null> {
    const existingRecord = await prisma.leagueRecord.findFirst({
      where: {
        leagueId,
        category,
        recordType
      }
    });

    const shouldUpdate = !existingRecord || 
      (this.isNewRecordBetter(recordType, value, existingRecord.value));

    if (!shouldUpdate) {
      return null;
    }

    const newRecord = await prisma.leagueRecord.upsert({
      where: {
        leagueId_category_recordType: {
          leagueId,
          category,
          recordType
        }
      },
      update: {
        previousValue: existingRecord?.value,
        previousHolderId: existingRecord?.holderId,
        value,
        holderId: holder.id,
        holderName: holder.name,
        holderTeamId: holder.teamId,
        holderTeamName: holder.teamName,
        season: context.season,
        week: context.week,
        gameId: context.gameId,
        setDate: new Date(),
        metadata: context.metadata
      },
      create: {
        leagueId,
        category,
        recordType,
        value,
        holderId: holder.id,
        holderName: holder.name,
        holderTeamId: holder.teamId,
        holderTeamName: holder.teamName,
        season: context.season,
        week: context.week,
        gameId: context.gameId,
        setDate: new Date(),
        description: this.generateRecordDescription(recordType, value),
        metadata: context.metadata
      }
    });

    await redis.del(`history:records:${leagueId}:*`);
    
    if (existingRecord && existingRecord.value !== value) {
      await this.notifyRecordBroken(newRecord, existingRecord);
    }

    return newRecord;
  }

  async getSeasonSummary(leagueId: string, season: number): Promise<SeasonSummary> {
    const cacheKey = `history:season:${leagueId}:${season}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [
      champion,
      regularSeasonWinner,
      games,
      awards,
      milestones
    ] = await Promise.all([
      prisma.leagueChampion.findFirst({
        where: { leagueId, season },
        include: { team: true }
      }),
      prisma.regularSeasonWinner.findFirst({
        where: { leagueId, season },
        include: { team: true }
      }),
      prisma.game.findMany({
        where: { 
          leagueId,
          season,
          completed: true
        }
      }),
      this.getSeasonAwards(leagueId, season),
      this.getSeasonMilestones(leagueId, season)
    ]);

    const scores = games.flatMap(g => [g.homeScore, g.awayScore].filter(s => s !== null));
    const margins = games.map(g => Math.abs((g.homeScore || 0) - (g.awayScore || 0)));
    
    const closestGameIndex = margins.indexOf(Math.min(...margins));
    const biggestBlowoutIndex = margins.indexOf(Math.max(...margins));
    
    const closestGame = games[closestGameIndex];
    const biggestBlowout = games[biggestBlowoutIndex];

    const summary: SeasonSummary = {
      season,
      championId: champion?.teamId || '',
      championName: champion?.team.name || '',
      runnerUpId: champion?.runnerUpId || '',
      runnerUpName: champion?.runnerUpName || '',
      regularSeasonWinnerId: regularSeasonWinner?.teamId || '',
      regularSeasonWinnerName: regularSeasonWinner?.team.name || '',
      totalPoints: scores.reduce((a, b) => a + b, 0),
      totalGames: games.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      closestGame: {
        week: closestGame?.week || 0,
        teams: [closestGame?.homeTeamId || '', closestGame?.awayTeamId || ''],
        margin: margins[closestGameIndex] || 0
      },
      biggestBlowout: {
        week: biggestBlowout?.week || 0,
        winner: (biggestBlowout?.homeScore || 0) > (biggestBlowout?.awayScore || 0) 
          ? biggestBlowout?.homeTeamId || ''
          : biggestBlowout?.awayTeamId || '',
        loser: (biggestBlowout?.homeScore || 0) > (biggestBlowout?.awayScore || 0)
          ? biggestBlowout?.awayTeamId || ''
          : biggestBlowout?.homeTeamId || '',
        margin: margins[biggestBlowoutIndex] || 0
      },
      awards,
      milestones
    };

    await redis.setex(cacheKey, 3600, JSON.stringify(summary));
    return summary;
  }

  async getTeamHistory(teamId: string): Promise<TeamHistory> {
    const cacheKey = `history:team:${teamId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: true,
        seasons: {
          include: {
            games: {
              where: { completed: true }
            }
          }
        },
        championships: true,
        runnerUps: true,
        playoffAppearances: true,
        regularSeasonTitles: true,
        records: true
      }
    });

    if (!team) {
      throw new Error('Team not found');
    }

    let allTimeWins = 0;
    let allTimeLosses = 0;
    let allTimeTies = 0;
    let allTimePointsFor = 0;
    let allTimePointsAgainst = 0;
    let bestSeason = null;
    let worstSeason = null;

    for (const season of team.seasons) {
      allTimeWins += season.wins;
      allTimeLosses += season.losses;
      allTimeTies += season.ties || 0;
      allTimePointsFor += season.pointsFor;
      allTimePointsAgainst += season.pointsAgainst;

      const seasonWinPct = season.wins / (season.wins + season.losses);
      
      if (!bestSeason || seasonWinPct > (bestSeason.wins / (bestSeason.wins + bestSeason.losses))) {
        bestSeason = season;
      }
      
      if (!worstSeason || seasonWinPct < (worstSeason.wins / (worstSeason.wins + worstSeason.losses))) {
        worstSeason = season;
      }
    }

    const totalGames = allTimeWins + allTimeLosses + allTimeTies;
    const winPercentage = totalGames > 0 ? (allTimeWins / totalGames) * 100 : 0;

    const rivalries = await this.getTeamRivalries(teamId);
    const records = await this.getTeamRecords(teamId);

    const history: TeamHistory = {
      teamId,
      teamName: team.name,
      ownerId: team.userId,
      ownerName: team.owner.name || '',
      seasonsPlayed: team.seasons.length,
      championships: team.championships.length,
      runnerUps: team.runnerUps.length,
      playoffAppearances: team.playoffAppearances.length,
      regularSeasonTitles: team.regularSeasonTitles.length,
      allTimeWins,
      allTimeLosses,
      allTimeTies,
      winPercentage,
      allTimePointsFor,
      allTimePointsAgainst,
      bestSeason: bestSeason ? {
        season: bestSeason.season,
        wins: bestSeason.wins,
        losses: bestSeason.losses,
        pointsFor: bestSeason.pointsFor,
        finish: bestSeason.finalPosition || 'N/A'
      } : null,
      worstSeason: worstSeason ? {
        season: worstSeason.season,
        wins: worstSeason.wins,
        losses: worstSeason.losses,
        pointsFor: worstSeason.pointsFor,
        finish: worstSeason.finalPosition || 'N/A'
      } : null,
      records,
      rivalries
    };

    await redis.setex(cacheKey, 3600, JSON.stringify(history));
    return history;
  }

  async getHallOfFame(leagueId: string): Promise<HallOfFame[]> {
    const cacheKey = `history:hof:${leagueId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const hallOfFamers = await prisma.hallOfFame.findMany({
      where: {
        leagueId,
        inducted: true
      },
      orderBy: {
        inductionYear: 'desc'
      }
    });

    await redis.setex(cacheKey, 3600, JSON.stringify(hallOfFamers));
    return hallOfFamers;
  }

  async nominateForHallOfFame(
    leagueId: string,
    nomineeId: string,
    category: HallOfFame['category'],
    achievements: string[],
    citation: string
  ): Promise<HallOfFame> {
    const nominee = await prisma.user.findUnique({
      where: { id: nomineeId },
      include: {
        teams: {
          where: {
            leagueId
          },
          include: {
            championships: true,
            playoffAppearances: true,
            regularSeasonTitles: true,
            seasons: true
          }
        }
      }
    });

    if (!nominee) {
      throw new Error('Nominee not found');
    }

    const stats = this.calculateHallOfFameStats(nominee.teams);

    const nomination = await prisma.hallOfFame.create({
      data: {
        leagueId,
        inducteeId: nomineeId,
        inducteeName: nominee.name || '',
        inductionYear: new Date().getFullYear(),
        category,
        achievements,
        stats,
        citation,
        votes: 0,
        inducted: false
      }
    });

    await this.notifyLeagueOfNomination(leagueId, nomination);
    return nomination;
  }

  async voteForHallOfFame(nominationId: string, voterId: string): Promise<void> {
    const existingVote = await prisma.hallOfFameVote.findFirst({
      where: {
        nominationId,
        voterId
      }
    });

    if (existingVote) {
      throw new Error('Already voted for this nomination');
    }

    await prisma.hallOfFameVote.create({
      data: {
        nominationId,
        voterId,
        votedAt: new Date()
      }
    });

    const nomination = await prisma.hallOfFame.update({
      where: { id: nominationId },
      data: {
        votes: {
          increment: 1
        }
      }
    });

    const league = await prisma.league.findUnique({
      where: { id: nomination.leagueId },
      include: {
        members: true
      }
    });

    if (league) {
      const requiredVotes = Math.ceil(league.members.length * 0.75);
      if (nomination.votes >= requiredVotes) {
        await this.inductToHallOfFame(nominationId);
      }
    }
  }

  private async inductToHallOfFame(nominationId: string): Promise<void> {
    const nomination = await prisma.hallOfFame.update({
      where: { id: nominationId },
      data: {
        inducted: true,
        inductionDate: new Date()
      }
    });

    await this.notifyInductee(nomination);
    await redis.del(`history:hof:${nomination.leagueId}`);
  }

  async getHistoricalTransactions(
    leagueId: string,
    type?: HistoricalTransaction['type'],
    season?: number
  ): Promise<HistoricalTransaction[]> {
    const where: any = { leagueId };
    if (type) where.type = type;
    if (season) where.season = season;

    const transactions = await prisma.historicalTransaction.findMany({
      where,
      orderBy: {
        date: 'desc'
      },
      take: 100
    });

    return transactions;
  }

  async rateHistoricalTransaction(transactionId: string, rating: number): Promise<void> {
    await prisma.historicalTransaction.update({
      where: { id: transactionId },
      data: {
        rating: {
          increment: rating
        },
        ratingCount: {
          increment: 1
        }
      }
    });
  }

  async generateLeagueYearbook(leagueId: string, season: number): Promise<any> {
    const [
      summary,
      records,
      teams,
      transactions,
      hallOfFame
    ] = await Promise.all([
      this.getSeasonSummary(leagueId, season),
      this.getLeagueRecords(leagueId),
      this.getSeasonTeamStats(leagueId, season),
      this.getHistoricalTransactions(leagueId, undefined, season),
      this.getHallOfFame(leagueId)
    ]);

    const yearbook = {
      leagueId,
      season,
      cover: {
        champion: summary.championName,
        championImage: await this.getTeamImage(summary.championId),
        headline: `${summary.championName} Wins Championship!`,
        subheadline: `Defeats ${summary.runnerUpName} in Finals`
      },
      seasonSummary: summary,
      recordsSet: records.filter(r => r.season === season),
      teamPerformances: teams,
      notableTransactions: transactions.slice(0, 10),
      awards: summary.awards,
      milestones: summary.milestones,
      hallOfFame: hallOfFame.filter(h => h.inductionYear === season),
      statistics: {
        averageScore: summary.totalPoints / (summary.totalGames * 2),
        highestScoringWeek: await this.getHighestScoringWeek(leagueId, season),
        lowestScoringWeek: await this.getLowestScoringWeek(leagueId, season),
        mostPointsByPosition: await this.getMostPointsByPosition(leagueId, season)
      },
      funFacts: await this.generateFunFacts(leagueId, season)
    };

    return yearbook;
  }

  async compareSeasons(leagueId: string, season1: number, season2: number): Promise<any> {
    const [summary1, summary2] = await Promise.all([
      this.getSeasonSummary(leagueId, season1),
      this.getSeasonSummary(leagueId, season2)
    ]);

    return {
      seasons: [season1, season2],
      champions: [summary1.championName, summary2.championName],
      totalPoints: [summary1.totalPoints, summary2.totalPoints],
      averageScore: [
        summary1.totalPoints / (summary1.totalGames * 2),
        summary2.totalPoints / (summary2.totalGames * 2)
      ],
      highestScores: [summary1.highestScore, summary2.highestScore],
      lowestScores: [summary1.lowestScore, summary2.lowestScore],
      closestMargins: [summary1.closestGame.margin, summary2.closestGame.margin],
      biggestBlowouts: [summary1.biggestBlowout.margin, summary2.biggestBlowout.margin],
      totalAwards: [summary1.awards.length, summary2.awards.length],
      totalMilestones: [summary1.milestones.length, summary2.milestones.length]
    };
  }

  async getLeagueTimeline(leagueId: string): Promise<any[]> {
    const events = await prisma.leagueEvent.findMany({
      where: { leagueId },
      orderBy: { date: 'asc' }
    });

    const timeline = events.map(event => ({
      date: event.date,
      type: event.type,
      title: event.title,
      description: event.description,
      participants: event.participants,
      impact: event.impact
    }));

    const championships = await prisma.leagueChampion.findMany({
      where: { leagueId },
      include: { team: true }
    });

    for (const championship of championships) {
      timeline.push({
        date: new Date(`${championship.season}-12-31`),
        type: 'championship',
        title: `${championship.team.name} Wins Championship`,
        description: `Defeated ${championship.runnerUpName} in the finals`,
        participants: [championship.teamId, championship.runnerUpId],
        impact: 'high'
      });
    }

    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    return timeline;
  }

  private isNewRecordBetter(recordType: string, newValue: number, oldValue: number): boolean {
    const higherIsBetter = [
      'highest_score',
      'most_points_season',
      'longest_win_streak',
      'most_trades',
      'most_moves'
    ];

    const lowerIsBetter = [
      'lowest_score_win',
      'fewest_moves_championship'
    ];

    if (higherIsBetter.some(type => recordType.includes(type))) {
      return newValue > oldValue;
    }

    if (lowerIsBetter.some(type => recordType.includes(type))) {
      return newValue < oldValue;
    }

    return newValue > oldValue;
  }

  private generateRecordDescription(recordType: string, value: number): string {
    const descriptions: Record<string, (v: number) => string> = {
      highest_score_week: (v) => `Highest single week score: ${v.toFixed(2)} points`,
      most_points_season: (v) => `Most points in a season: ${v.toFixed(2)} points`,
      longest_win_streak: (v) => `Longest winning streak: ${v} games`,
      biggest_comeback: (v) => `Biggest comeback: ${v.toFixed(2)} points`,
      most_trades_season: (v) => `Most trades in a season: ${v}`,
      highest_scoring_matchup: (v) => `Highest scoring matchup: ${v.toFixed(2)} combined points`
    };

    return descriptions[recordType]?.(value) || `${recordType}: ${value}`;
  }

  private async getSeasonAwards(leagueId: string, season: number): Promise<SeasonAward[]> {
    const awards = await prisma.seasonAward.findMany({
      where: {
        leagueId,
        season
      }
    });

    return awards;
  }

  private async getSeasonMilestones(leagueId: string, season: number): Promise<SeasonMilestone[]> {
    const milestones = await prisma.seasonMilestone.findMany({
      where: {
        leagueId,
        season
      }
    });

    return milestones;
  }

  private async getTeamRivalries(teamId: string): Promise<RivalryHistory[]> {
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        completed: true
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    const rivalryMap = new Map<string, RivalryHistory>();

    for (const game of games) {
      const rivalId = game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId;
      const rivalName = game.homeTeamId === teamId ? game.awayTeam.name : game.homeTeam.name;
      
      if (!rivalryMap.has(rivalId)) {
        rivalryMap.set(rivalId, {
          rivalId,
          rivalName,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          largestVictory: 0,
          largestDefeat: 0,
          currentStreak: { type: 'W', count: 0 },
          longestWinStreak: 0,
          longestLossStreak: 0
        });
      }

      const rivalry = rivalryMap.get(rivalId)!;
      rivalry.gamesPlayed++;

      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const rivalScore = isHome ? game.awayScore : game.homeScore;

      rivalry.pointsFor += teamScore || 0;
      rivalry.pointsAgainst += rivalScore || 0;

      if (teamScore! > rivalScore!) {
        rivalry.wins++;
        const margin = teamScore! - rivalScore!;
        if (margin > rivalry.largestVictory) {
          rivalry.largestVictory = margin;
        }
      } else if (teamScore! < rivalScore!) {
        rivalry.losses++;
        const margin = rivalScore! - teamScore!;
        if (margin > rivalry.largestDefeat) {
          rivalry.largestDefeat = margin;
        }
      } else {
        rivalry.ties++;
      }
    }

    return Array.from(rivalryMap.values());
  }

  private async getTeamRecords(teamId: string): Promise<LeagueRecord[]> {
    return await prisma.leagueRecord.findMany({
      where: {
        holderTeamId: teamId
      }
    });
  }

  private calculateHallOfFameStats(teams: any[]): HallOfFame['stats'] {
    let championships = 0;
    let playoffAppearances = 0;
    let regularSeasonTitles = 0;
    let totalWins = 0;
    let totalGames = 0;
    let totalPoints = 0;
    let records = 0;

    for (const team of teams) {
      championships += team.championships.length;
      playoffAppearances += team.playoffAppearances.length;
      regularSeasonTitles += team.regularSeasonTitles.length;
      
      for (const season of team.seasons) {
        totalWins += season.wins;
        totalGames += season.wins + season.losses + (season.ties || 0);
        totalPoints += season.pointsFor;
      }
    }

    return {
      championships,
      playoffAppearances,
      regularSeasonTitles,
      winPercentage: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      totalPoints,
      records
    };
  }

  private async notifyRecordBroken(newRecord: LeagueRecord, oldRecord: LeagueRecord): Promise<void> {
    await prisma.notification.create({
      data: {
        leagueId: newRecord.leagueId,
        type: 'RECORD_BROKEN',
        title: 'New League Record!',
        message: `${newRecord.holderName} broke the ${newRecord.recordType} record with ${newRecord.value}! Previous record was ${oldRecord.value} by ${oldRecord.holderName}`,
        createdAt: new Date()
      }
    });
  }

  private async notifyLeagueOfNomination(leagueId: string, nomination: HallOfFame): Promise<void> {
    await prisma.notification.create({
      data: {
        leagueId,
        type: 'HOF_NOMINATION',
        title: 'Hall of Fame Nomination',
        message: `${nomination.inducteeName} has been nominated for the Hall of Fame!`,
        actionUrl: `/hall-of-fame/${nomination.id}`,
        createdAt: new Date()
      }
    });
  }

  private async notifyInductee(nomination: HallOfFame): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: nomination.inducteeId,
        type: 'HOF_INDUCTED',
        title: 'Hall of Fame Induction!',
        message: 'Congratulations! You have been inducted into the League Hall of Fame!',
        actionUrl: `/hall-of-fame`,
        createdAt: new Date()
      }
    });
  }

  private async getTeamImage(teamId: string): Promise<string> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { logo: true }
    });
    return team?.logo || '/default-team-logo.png';
  }

  private async getSeasonTeamStats(leagueId: string, season: number): Promise<any[]> {
    const teams = await prisma.teamSeason.findMany({
      where: {
        leagueId,
        season
      },
      include: {
        team: true
      },
      orderBy: {
        wins: 'desc'
      }
    });

    return teams.map(t => ({
      teamId: t.teamId,
      teamName: t.team.name,
      record: `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      finish: t.finalPosition
    }));
  }

  private async getHighestScoringWeek(leagueId: string, season: number): Promise<any> {
    const weeks = await prisma.game.groupBy({
      by: ['week'],
      where: {
        leagueId,
        season,
        completed: true
      },
      _sum: {
        homeScore: true,
        awayScore: true
      }
    });

    let highestWeek = { week: 0, totalPoints: 0 };
    for (const week of weeks) {
      const total = (week._sum.homeScore || 0) + (week._sum.awayScore || 0);
      if (total > highestWeek.totalPoints) {
        highestWeek = { week: week.week, totalPoints: total };
      }
    }

    return highestWeek;
  }

  private async getLowestScoringWeek(leagueId: string, season: number): Promise<any> {
    const weeks = await prisma.game.groupBy({
      by: ['week'],
      where: {
        leagueId,
        season,
        completed: true
      },
      _sum: {
        homeScore: true,
        awayScore: true
      }
    });

    let lowestWeek = { week: 0, totalPoints: Infinity };
    for (const week of weeks) {
      const total = (week._sum.homeScore || 0) + (week._sum.awayScore || 0);
      if (total < lowestWeek.totalPoints && total > 0) {
        lowestWeek = { week: week.week, totalPoints: total };
      }
    }

    return lowestWeek;
  }

  private async getMostPointsByPosition(leagueId: string, season: number): Promise<any> {
    const stats = await prisma.playerWeeklyStats.groupBy({
      by: ['position'],
      where: {
        team: {
          leagueId
        },
        season
      },
      _max: {
        points: true
      },
      _sum: {
        points: true
      }
    });

    return stats.map(s => ({
      position: s.position,
      maxPoints: s._max.points,
      totalPoints: s._sum.points
    }));
  }

  private async generateFunFacts(leagueId: string, season: number): Promise<string[]> {
    const facts: string[] = [];

    const mondayNightMiracles = await prisma.game.count({
      where: {
        leagueId,
        season,
        dayOfWeek: 'Monday',
        marginOfVictory: { lte: 5 }
      }
    });

    if (mondayNightMiracles > 0) {
      facts.push(`${mondayNightMiracles} games were decided by 5 points or less on Monday Night`);
    }

    const undefeatedWeeks = await prisma.teamWeek.groupBy({
      by: ['teamId'],
      where: {
        leagueId,
        season,
        wins: { gte: 17 }
      },
      _count: true
    });

    if (undefeatedWeeks.length > 0) {
      facts.push(`${undefeatedWeeks.length} team(s) had perfect regular seasons`);
    }

    const tradeDeadlineDeals = await prisma.trade.count({
      where: {
        leagueId,
        season,
        week: { gte: 10, lte: 12 }
      }
    });

    if (tradeDeadlineDeals > 5) {
      facts.push(`${tradeDeadlineDeals} trades were made around the trade deadline`);
    }

    const injuryReserveStints = await prisma.injuryReserve.count({
      where: {
        team: {
          leagueId
        },
        season
      }
    });

    facts.push(`Players spent a combined ${injuryReserveStints} weeks on injured reserve`);

    return facts;
  }
}

export const leagueHistoryService = new LeagueHistoryService();