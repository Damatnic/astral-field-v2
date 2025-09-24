import { prisma } from '@/lib/db';

export interface PlayoffBracket {
  id: string;
  leagueId: string;
  season: number;
  format: 'single_elimination' | 'double_elimination' | 'custom';
  startWeek: number;
  endWeek: number; // Championship week
  teams: PlayoffTeam[];
  rounds: PlayoffRound[];
  champion?: string;
  runnerUp?: string;
  thirdPlace?: string;
  consolationChampion?: string;
  settings: PlayoffSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayoffTeam {
  teamId: string;
  teamName: string;
  seed: number;
  regularSeasonRecord: {
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
  };
  playoffRecord: {
    wins: number;
    losses: number;
  };
  eliminated: boolean;
  eliminatedRound?: number;
  consolationBracket: boolean;
}

export interface PlayoffRound {
  roundNumber: number;
  week: number;
  name: string; // "Wild Card", "Divisional", "Championship", etc.
  matchups: PlayoffMatchup[];
  isConsolation: boolean;
  completed: boolean;
}

export interface PlayoffMatchup {
  id: string;
  roundNumber: number;
  matchupNumber: number; // Position in bracket
  higherSeedTeamId: string;
  lowerSeedTeamId: string;
  higherSeedScore?: number;
  lowerSeedScore?: number;
  winnerId?: string;
  loserId?: string;
  isBye: boolean;
  isConsolation: boolean;
  nextMatchupId?: string; // Where winner advances
  consolationMatchupId?: string; // Where loser goes (if consolation)
  completed: boolean;
}

export interface PlayoffSettings {
  numberOfTeams: number;
  wildCardTeams: number;
  byeWeeks: number;
  reseedAfterRound: boolean;
  homeFieldAdvantage: boolean;
  homeFieldPoints: number;
  twoWeekChampionship: boolean;
  consolationBracket: boolean;
  thirdPlaceGame: boolean;
  tiebreakers: string[]; // ['head_to_head', 'points_for', 'points_against', 'division_record']
}

export class PlayoffBracketService {
  async generatePlayoffBracket(
    leagueId: string,
    season: number = new Date().getFullYear()
  ): Promise<PlayoffBracket> {
    // Get league settings and standings
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          include: {
            wins: true,
            losses: true,
            ties: true
          }
        }
      }
    });

    if (!league) {
      throw new Error('League not found');
    }

    const playoffSettings = this.getPlayoffSettings(league);
    const qualifiedTeams = await this.determinePlayoffTeams(league, playoffSettings);
    const bracket = this.createBracketStructure(qualifiedTeams, playoffSettings);

    // Save bracket to database
    const savedBracket = await this.saveBracket(bracket);

    return savedBracket;
  }

  private getPlayoffSettings(league: any): PlayoffSettings {
    const settings = league.settings?.playoffs || {};
    
    return {
      numberOfTeams: settings.numberOfTeams || 6,
      wildCardTeams: settings.wildCardTeams || 2,
      byeWeeks: settings.byeWeeks || 2,
      reseedAfterRound: settings.reseedAfterRound ?? true,
      homeFieldAdvantage: settings.homeFieldAdvantage ?? false,
      homeFieldPoints: settings.homeFieldPoints || 0,
      twoWeekChampionship: settings.twoWeekChampionship ?? false,
      consolationBracket: settings.consolationBracket ?? true,
      thirdPlaceGame: settings.thirdPlaceGame ?? true,
      tiebreakers: settings.tiebreakers || ['head_to_head', 'points_for', 'points_against']
    };
  }

  private async determinePlayoffTeams(league: any, settings: PlayoffSettings): Promise<PlayoffTeam[]> {
    // Calculate standings
    const standings = league.teams.map((team: any) => {
      const wins = team.wins.length;
      const losses = team.losses.length;
      const ties = team.ties.length;
      const pointsFor = team.wins.concat(team.losses, team.ties)
        .reduce((sum: number, game: any) => sum + (game.pointsFor || 0), 0);
      const pointsAgainst = team.wins.concat(team.losses, team.ties)
        .reduce((sum: number, game: any) => sum + (game.pointsAgainst || 0), 0);

      return {
        teamId: team.id,
        teamName: team.name,
        wins,
        losses,
        ties,
        pointsFor,
        pointsAgainst,
        winPercentage: (wins + ties * 0.5) / (wins + losses + ties)
      };
    });

    // Sort by win percentage, then by tiebreakers
    standings.sort((a: any, b: any) => {
      if (a.winPercentage !== b.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      
      // Apply tiebreakers
      for (const tiebreaker of settings.tiebreakers) {
        switch (tiebreaker) {
          case 'points_for':
            if (a.pointsFor !== b.pointsFor) {
              return b.pointsFor - a.pointsFor;
            }
            break;
          case 'points_against':
            if (a.pointsAgainst !== b.pointsAgainst) {
              return a.pointsAgainst - b.pointsAgainst;
            }
            break;
          case 'head_to_head':
            const h2h = await this.getHeadToHeadRecord(a.teamId, b.teamId);
            if (h2h !== 0) return h2h;
            break;
        }
      }
      
      return 0;
    });

    // Select playoff teams
    const playoffTeams: PlayoffTeam[] = standings
      .slice(0, settings.numberOfTeams)
      .map((team: any, index: number) => ({
        teamId: team.teamId,
        teamName: team.teamName,
        seed: index + 1,
        regularSeasonRecord: {
          wins: team.wins,
          losses: team.losses,
          ties: team.ties,
          pointsFor: team.pointsFor,
          pointsAgainst: team.pointsAgainst
        },
        playoffRecord: {
          wins: 0,
          losses: 0
        },
        eliminated: false,
        consolationBracket: false
      }));

    return playoffTeams;
  }

  private createBracketStructure(
    teams: PlayoffTeam[],
    settings: PlayoffSettings
  ): PlayoffBracket {
    const bracket: PlayoffBracket = {
      id: `bracket_${Date.now()}`,
      leagueId: teams[0]?.teamId ? 'league_id' : '', // Will be set properly
      season: new Date().getFullYear(),
      format: 'single_elimination',
      startWeek: 15, // Standard playoff start week
      endWeek: settings.twoWeekChampionship ? 18 : 17,
      teams,
      rounds: [],
      settings,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Determine number of rounds
    const numberOfRounds = Math.ceil(Math.log2(settings.numberOfTeams));
    
    // Create rounds
    for (let roundNum = 1; roundNum <= numberOfRounds; roundNum++) {
      const week = 14 + roundNum; // Playoffs start week 15
      const round = this.createRound(roundNum, week, teams, settings);
      bracket.rounds.push(round);
    }

    // Add consolation rounds if enabled
    if (settings.consolationBracket) {
      const consolationRounds = this.createConsolationBracket(teams, settings);
      bracket.rounds.push(...consolationRounds);
    }

    return bracket;
  }

  private createRound(
    roundNumber: number,
    week: number,
    teams: PlayoffTeam[],
    settings: PlayoffSettings
  ): PlayoffRound {
    const roundNames = ['Wild Card', 'Divisional', 'Conference Championship', 'Championship'];
    const totalRounds = Math.ceil(Math.log2(settings.numberOfTeams));
    const roundName = roundNames[totalRounds - roundNumber] || `Round ${roundNumber}`;

    const matchups: PlayoffMatchup[] = [];
    const teamsInRound = Math.pow(2, totalRounds - roundNumber + 1);
    const numberOfMatchups = teamsInRound / 2;

    // Handle byes for top seeds in first round
    const byeTeams = roundNumber === 1 ? settings.byeWeeks : 0;
    
    for (let i = 0; i < numberOfMatchups; i++) {
      const higherSeedIndex = i;
      const lowerSeedIndex = teamsInRound - 1 - i;

      if (higherSeedIndex < byeTeams && roundNumber === 1) {
        // Create bye matchup
        matchups.push({
          id: `matchup_${roundNumber}_${i}`,
          roundNumber,
          matchupNumber: i,
          higherSeedTeamId: teams[higherSeedIndex]?.teamId || '',
          lowerSeedTeamId: 'BYE',
          winnerId: teams[higherSeedIndex]?.teamId,
          isBye: true,
          isConsolation: false,
          completed: true
        });
      } else if (teams[higherSeedIndex] && teams[lowerSeedIndex]) {
        // Regular matchup
        matchups.push({
          id: `matchup_${roundNumber}_${i}`,
          roundNumber,
          matchupNumber: i,
          higherSeedTeamId: teams[higherSeedIndex].teamId,
          lowerSeedTeamId: teams[lowerSeedIndex].teamId,
          isBye: false,
          isConsolation: false,
          completed: false
        });
      }
    }

    return {
      roundNumber,
      week,
      name: roundName,
      matchups,
      isConsolation: false,
      completed: false
    };
  }

  private createConsolationBracket(
    teams: PlayoffTeam[],
    settings: PlayoffSettings
  ): PlayoffRound[] {
    const consolationRounds: PlayoffRound[] = [];
    
    // Create consolation bracket for eliminated teams
    const consolationTeams = teams.slice(settings.numberOfTeams / 2);
    
    if (consolationTeams.length >= 2) {
      // Consolation semifinals
      const consolationSemis: PlayoffRound = {
        roundNumber: 101, // Use 100+ for consolation rounds
        week: 16,
        name: 'Consolation Semifinals',
        matchups: [],
        isConsolation: true,
        completed: false
      };

      for (let i = 0; i < consolationTeams.length / 2; i++) {
        consolationSemis.matchups.push({
          id: `consolation_semi_${i}`,
          roundNumber: 101,
          matchupNumber: i,
          higherSeedTeamId: consolationTeams[i * 2]?.teamId || '',
          lowerSeedTeamId: consolationTeams[i * 2 + 1]?.teamId || '',
          isBye: false,
          isConsolation: true,
          completed: false
        });
      }

      consolationRounds.push(consolationSemis);

      // Consolation championship
      if (settings.thirdPlaceGame) {
        const consolationFinal: PlayoffRound = {
          roundNumber: 102,
          week: 17,
          name: 'Consolation Championship',
          matchups: [{
            id: 'consolation_final',
            roundNumber: 102,
            matchupNumber: 0,
            higherSeedTeamId: '', // Will be filled by consolation semi winners
            lowerSeedTeamId: '',
            isBye: false,
            isConsolation: true,
            completed: false
          }],
          isConsolation: true,
          completed: false
        };

        consolationRounds.push(consolationFinal);
      }
    }

    return consolationRounds;
  }

  async updateMatchupScore(
    bracketId: string,
    matchupId: string,
    higherSeedScore: number,
    lowerSeedScore: number
  ): Promise<void> {
    // Update matchup with scores
    const bracket = await this.getBracket(bracketId);
    if (!bracket) throw new Error('Bracket not found');

    const round = bracket.rounds.find(r => 
      r.matchups.some(m => m.id === matchupId)
    );
    
    if (!round) throw new Error('Matchup not found');

    const matchup = round.matchups.find(m => m.id === matchupId);
    if (!matchup) throw new Error('Matchup not found');

    // Update scores
    matchup.higherSeedScore = higherSeedScore;
    matchup.lowerSeedScore = lowerSeedScore;

    // Determine winner
    if (higherSeedScore > lowerSeedScore) {
      matchup.winnerId = matchup.higherSeedTeamId;
      matchup.loserId = matchup.lowerSeedTeamId;
    } else {
      matchup.winnerId = matchup.lowerSeedTeamId;
      matchup.loserId = matchup.higherSeedTeamId;
    }

    matchup.completed = true;

    // Advance winner to next round
    await this.advanceWinner(bracket, matchup);

    // Move loser to consolation if applicable
    if (bracket.settings.consolationBracket && !matchup.isConsolation) {
      await this.moveToConsolation(bracket, matchup.loserId!);
    }

    // Check if round is complete
    if (round.matchups.every(m => m.completed)) {
      round.completed = true;
      
      // Check if tournament is complete
      if (bracket.rounds.filter(r => !r.isConsolation).every(r => r.completed)) {
        await this.finalizeBracket(bracket);
      }
    }

    await this.saveBracket(bracket);
  }

  private async advanceWinner(bracket: PlayoffBracket, matchup: PlayoffMatchup): Promise<void> {
    if (!matchup.winnerId || matchup.isConsolation) return;

    const nextRound = bracket.rounds.find(r => 
      r.roundNumber === matchup.roundNumber + 1 && !r.isConsolation
    );

    if (nextRound) {
      // Find the appropriate matchup in next round
      const nextMatchupIndex = Math.floor(matchup.matchupNumber / 2);
      const nextMatchup = nextRound.matchups[nextMatchupIndex];

      if (nextMatchup) {
        // Determine if winner is higher or lower seed
        const winnerTeam = bracket.teams.find(t => t.teamId === matchup.winnerId);
        const isHigherSeed = matchup.matchupNumber % 2 === 0;

        if (isHigherSeed) {
          nextMatchup.higherSeedTeamId = matchup.winnerId;
        } else {
          nextMatchup.lowerSeedTeamId = matchup.winnerId;
        }

        // Update playoff record
        if (winnerTeam) {
          winnerTeam.playoffRecord.wins++;
        }

        const loserTeam = bracket.teams.find(t => t.teamId === matchup.loserId);
        if (loserTeam) {
          loserTeam.playoffRecord.losses++;
          loserTeam.eliminated = true;
          loserTeam.eliminatedRound = matchup.roundNumber;
        }
      }
    }
  }

  private async moveToConsolation(bracket: PlayoffBracket, teamId: string): Promise<void> {
    const team = bracket.teams.find(t => t.teamId === teamId);
    if (!team) return;

    team.consolationBracket = true;

    // Find appropriate consolation matchup
    const consolationRound = bracket.rounds.find(r => 
      r.roundNumber === 101 && r.isConsolation
    );

    if (consolationRound) {
      // Find empty slot in consolation bracket
      for (const matchup of consolationRound.matchups) {
        if (!matchup.higherSeedTeamId || matchup.higherSeedTeamId === '') {
          matchup.higherSeedTeamId = teamId;
          break;
        } else if (!matchup.lowerSeedTeamId || matchup.lowerSeedTeamId === '') {
          matchup.lowerSeedTeamId = teamId;
          break;
        }
      }
    }
  }

  private async finalizeBracket(bracket: PlayoffBracket): Promise<void> {
    // Find championship matchup
    const championshipRound = bracket.rounds
      .filter(r => !r.isConsolation)
      .sort((a, b) => b.roundNumber - a.roundNumber)[0];

    if (championshipRound && championshipRound.matchups[0]) {
      const champMatchup = championshipRound.matchups[0];
      bracket.champion = champMatchup.winnerId;
      bracket.runnerUp = champMatchup.loserId;
    }

    // Find third place if applicable
    if (bracket.settings.thirdPlaceGame) {
      const thirdPlaceRound = bracket.rounds.find(r => 
        r.name === 'Third Place Game' || r.roundNumber === 103
      );

      if (thirdPlaceRound && thirdPlaceRound.matchups[0]) {
        bracket.thirdPlace = thirdPlaceRound.matchups[0].winnerId;
      }
    }

    // Find consolation champion
    const consolationFinal = bracket.rounds.find(r => 
      r.name === 'Consolation Championship' || r.roundNumber === 102
    );

    if (consolationFinal && consolationFinal.matchups[0]) {
      bracket.consolationChampion = consolationFinal.matchups[0].winnerId;
    }
  }

  private async getHeadToHeadRecord(teamA: string, teamB: string): Promise<number> {
    // Get head-to-head matchups between teams
    const matchups = await prisma.matchup.findMany({
      where: {
        OR: [
          { homeTeamId: teamA, awayTeamId: teamB },
          { homeTeamId: teamB, awayTeamId: teamA }
        ],
        status: 'COMPLETED'
      }
    });

    let teamAWins = 0;
    let teamBWins = 0;

    matchups.forEach(matchup => {
      if ((matchup.homeTeamId === teamA && matchup.homeScore > matchup.awayScore) ||
          (matchup.awayTeamId === teamA && matchup.awayScore > matchup.homeScore)) {
        teamAWins++;
      } else {
        teamBWins++;
      }
    });

    return teamAWins - teamBWins;
  }

  private async saveBracket(bracket: PlayoffBracket): Promise<PlayoffBracket> {
    // In a real implementation, save to database
    await prisma.playoffBracket.upsert({
      where: { id: bracket.id },
      create: {
        id: bracket.id,
        leagueId: bracket.leagueId,
        season: bracket.season,
        format: bracket.format,
        startWeek: bracket.startWeek,
        endWeek: bracket.endWeek,
        data: JSON.stringify(bracket),
        champion: bracket.champion,
        runnerUp: bracket.runnerUp,
        thirdPlace: bracket.thirdPlace
      },
      update: {
        data: JSON.stringify(bracket),
        champion: bracket.champion,
        runnerUp: bracket.runnerUp,
        thirdPlace: bracket.thirdPlace,
        updatedAt: new Date()
      }
    });

    return bracket;
  }

  async getBracket(bracketId: string): Promise<PlayoffBracket | null> {
    const bracket = await prisma.playoffBracket.findUnique({
      where: { id: bracketId }
    });

    if (!bracket) return null;

    return JSON.parse(bracket.data as string);
  }

  async getLeagueBracket(leagueId: string, season?: number): Promise<PlayoffBracket | null> {
    const bracket = await prisma.playoffBracket.findFirst({
      where: {
        leagueId,
        season: season || new Date().getFullYear()
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!bracket) return null;

    return JSON.parse(bracket.data as string);
  }

  async simulatePlayoffScenarios(
    leagueId: string,
    currentWeek: number
  ): Promise<any> {
    // Get current standings and remaining schedule
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: true,
        matchups: {
          where: {
            week: { gte: currentWeek }
          }
        }
      }
    });

    if (!league) throw new Error('League not found');

    // Run Monte Carlo simulations
    const simulations = 1000;
    const playoffOdds: Map<string, number> = new Map();
    const seedDistribution: Map<string, number[]> = new Map();

    for (let i = 0; i < simulations; i++) {
      const simulatedStandings = this.simulateSeason(league, currentWeek);
      const playoffTeams = simulatedStandings.slice(0, 6); // Top 6 make playoffs

      playoffTeams.forEach((team: any, seed: number) => {
        // Track playoff appearances
        const currentOdds = playoffOdds.get(team.teamId) || 0;
        playoffOdds.set(team.teamId, currentOdds + 1);

        // Track seed distribution
        const seeds = seedDistribution.get(team.teamId) || new Array(6).fill(0);
        seeds[seed]++;
        seedDistribution.set(team.teamId, seeds);
      });
    }

    // Calculate percentages
    const results = Array.from(playoffOdds.entries()).map(([teamId, count]) => ({
      teamId,
      playoffProbability: (count / simulations) * 100,
      seedDistribution: (seedDistribution.get(teamId) || []).map(s => (s / simulations) * 100)
    }));

    return results.sort((a, b) => b.playoffProbability - a.playoffProbability);
  }

  private simulateSeason(league: any, startWeek: number): any[] {
    // Simulate remaining games with random outcomes weighted by team strength
    // This is a simplified simulation - in production, use more sophisticated models
    const standings = league.teams.map((team: any) => {
      const randomWins = Math.floor(Math.random() * (18 - startWeek));
      return {
        teamId: team.id,
        projectedWins: team.wins.length + randomWins
      };
    });

    return standings.sort((a: any, b: any) => b.projectedWins - a.projectedWins);
  }
}

export const playoffBracketService = new PlayoffBracketService();