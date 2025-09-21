import { PrismaClient, Matchup, Team, User, League } from '@prisma/client';
import { config } from 'dotenv';
import { z } from 'zod';
import pino from 'pino';
import { performance } from 'perf_hooks';

// Modern configuration with validation
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  MATCHUP_FETCH_LIMIT: z.coerce.number().positive().default(10),
  ENABLE_CACHE: z.coerce.boolean().default(true),
  CACHE_TTL: z.coerce.number().positive().default(300000), // 5 minutes
});

// Type definitions
interface MatchupWithRelations extends Matchup {
  homeTeam: TeamWithOwner;
  awayTeam: TeamWithOwner;
  league: LeagueInfo;
}

interface TeamWithOwner extends Pick<Team, 'id' | 'name'> {
  owner: Pick<User, 'name' | 'email'>;
}

interface LeagueInfo extends Pick<League, 'id' | 'name' | 'currentWeek' | 'season'> {}

interface MatchupStats {
  totalMatchups: number;
  completedMatchups: number;
  inProgressMatchups: number;
  averageHomeScore: number;
  averageAwayScore: number;
  highestScoringMatchup: MatchupWithRelations | null;
  executionTime: number;
}

// Cache implementation
class MatchupCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Modern service class with proper patterns
export class MatchupService {
  private prisma: PrismaClient;
  private logger: pino.Logger;
  private cache: MatchupCache;
  private config: z.infer<typeof envSchema>;
  private connectionRetries = 3;
  private retryDelay = 1000;

  constructor() {
    // Load and validate environment
    config({ path: '.env.local' });
    this.config = this.validateEnvironment();
    
    // Initialize services
    this.prisma = this.initializePrisma();
    this.logger = this.initializeLogger();
    this.cache = new MatchupCache(this.config.CACHE_TTL);
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  private validateEnvironment(): z.infer<typeof envSchema> {
    try {
      return envSchema.parse(process.env);
    } catch (error) {
      console.error('Invalid environment configuration:', error);
      process.exit(1);
    }
  }

  private initializePrisma(): PrismaClient {
    return new PrismaClient({
      log: this.config.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'colorless',
    });
  }

  private initializeLogger(): pino.Logger {
    return pino({
      level: this.config.LOG_LEVEL,
      transport: this.config.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        }
      } : undefined,
      base: {
        env: this.config.NODE_ENV,
        service: 'matchup-checker',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info({ signal }, 'Shutting down gracefully');
      
      try {
        await this.prisma.$disconnect();
        this.cache.clear();
        this.logger.info('Cleanup completed successfully');
        process.exit(0);
      } catch (error) {
        this.logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      this.logger.fatal({ error }, 'Uncaught exception');
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.fatal({ reason, promise }, 'Unhandled rejection');
      shutdown('unhandledRejection');
    });
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.connectionRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn({
          error,
          attempt,
          operationName,
          maxRetries: this.connectionRetries,
        }, 'Operation failed, retrying...');
        
        if (attempt < this.connectionRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    this.logger.error({
      error: lastError,
      operationName,
    }, 'Operation failed after all retries');
    
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async fetchRecentMatchups(): Promise<MatchupWithRelations[]> {
    const cacheKey = `matchups:recent:${this.config.MATCHUP_FETCH_LIMIT}`;
    
    if (this.config.ENABLE_CACHE) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached matchups');
        return cached;
      }
    }

    const startTime = performance.now();
    
    try {
      const matchups = await this.withRetry(
        () => this.prisma.matchup.findMany({
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: { name: true, email: true }
                }
              }
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: { name: true, email: true }
                }
              }
            },
            league: {
              select: {
                id: true,
                name: true,
                currentWeek: true,
                season: true
              }
            }
          },
          orderBy: [
            { week: 'desc' },
            { createdAt: 'desc' }
          ],
          take: this.config.MATCHUP_FETCH_LIMIT
        }),
        'fetchRecentMatchups'
      );

      const executionTime = performance.now() - startTime;
      this.logger.info({
        count: matchups.length,
        executionTime: `${executionTime.toFixed(2)}ms`
      }, 'Matchups fetched successfully');

      if (this.config.ENABLE_CACHE) {
        this.cache.set(cacheKey, matchups);
      }

      return matchups as MatchupWithRelations[];
    } catch (error) {
      this.logger.error({ error }, 'Failed to fetch matchups');
      throw new Error(`Failed to fetch matchups: ${(error as Error).message}`);
    }
  }

  public async fetchLeagueInfo(): Promise<LeagueInfo[]> {
    const cacheKey = 'leagues:all';
    
    if (this.config.ENABLE_CACHE) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached league info');
        return cached;
      }
    }

    try {
      const leagues = await this.withRetry(
        () => this.prisma.league.findMany({
          select: {
            id: true,
            name: true,
            currentWeek: true,
            season: true
          },
          orderBy: { name: 'asc' }
        }),
        'fetchLeagueInfo'
      );

      if (this.config.ENABLE_CACHE) {
        this.cache.set(cacheKey, leagues);
      }

      return leagues;
    } catch (error) {
      this.logger.error({ error }, 'Failed to fetch league info');
      throw new Error(`Failed to fetch league info: ${(error as Error).message}`);
    }
  }

  public calculateMatchupStats(matchups: MatchupWithRelations[]): MatchupStats {
    const startTime = performance.now();
    
    const stats: MatchupStats = {
      totalMatchups: matchups.length,
      completedMatchups: 0,
      inProgressMatchups: 0,
      averageHomeScore: 0,
      averageAwayScore: 0,
      highestScoringMatchup: null,
      executionTime: 0
    };

    if (matchups.length === 0) {
      stats.executionTime = performance.now() - startTime;
      return stats;
    }

    let totalHomeScore = 0;
    let totalAwayScore = 0;
    let homeScoreCount = 0;
    let awayScoreCount = 0;
    let highestTotal = 0;

    for (const matchup of matchups) {
      // Count statuses
      if (matchup.status === 'COMPLETED') {
        stats.completedMatchups++;
      } else if (matchup.status === 'IN_PROGRESS') {
        stats.inProgressMatchups++;
      }

      // Calculate scores
      if (matchup.homeScore !== null) {
        totalHomeScore += matchup.homeScore;
        homeScoreCount++;
      }
      
      if (matchup.awayScore !== null) {
        totalAwayScore += matchup.awayScore;
        awayScoreCount++;
      }

      // Find highest scoring matchup
      const matchupTotal = (matchup.homeScore || 0) + (matchup.awayScore || 0);
      if (matchupTotal > highestTotal) {
        highestTotal = matchupTotal;
        stats.highestScoringMatchup = matchup;
      }
    }

    stats.averageHomeScore = homeScoreCount > 0 
      ? Math.round((totalHomeScore / homeScoreCount) * 100) / 100 
      : 0;
    
    stats.averageAwayScore = awayScoreCount > 0 
      ? Math.round((totalAwayScore / awayScoreCount) * 100) / 100 
      : 0;

    stats.executionTime = performance.now() - startTime;
    
    return stats;
  }

  public formatMatchupDisplay(matchup: MatchupWithRelations): string {
    const homeScore = matchup.homeScore?.toFixed(2) || '0.00';
    const awayScore = matchup.awayScore?.toFixed(2) || '0.00';
    
    return `
Week ${matchup.week} - ${matchup.league.name}
────────────────────────────────────────
${matchup.homeTeam.name.padEnd(25)} ${homeScore.padStart(8)} pts
  Owner: ${matchup.homeTeam.owner.name}
  
${matchup.awayTeam.name.padEnd(25)} ${awayScore.padStart(8)} pts
  Owner: ${matchup.awayTeam.owner.name}
  
Status: ${matchup.status}
${matchup.status === 'COMPLETED' ? `Winner: ${this.determineWinner(matchup)}` : ''}
`;
  }

  private determineWinner(matchup: MatchupWithRelations): string {
    const homeScore = matchup.homeScore || 0;
    const awayScore = matchup.awayScore || 0;
    
    if (homeScore > awayScore) {
      return `${matchup.homeTeam.name} (${matchup.homeTeam.owner.name})`;
    } else if (awayScore > homeScore) {
      return `${matchup.awayTeam.name} (${matchup.awayTeam.owner.name})`;
    } else {
      return 'Tie';
    }
  }

  public async generateReport(): Promise<void> {
    this.logger.info('Generating matchup report...');
    
    try {
      // Fetch data in parallel
      const [matchups, leagues] = await Promise.all([
        this.fetchRecentMatchups(),
        this.fetchLeagueInfo()
      ]);

      // Calculate statistics
      const stats = this.calculateMatchupStats(matchups);

      // Display report header
      console.log('\n╔══════════════════════════════════════════════════════╗');
      console.log('║           FANTASY FOOTBALL MATCHUP REPORT            ║');
      console.log('╚══════════════════════════════════════════════════════╝\n');

      // Display statistics
      console.log('📊 STATISTICS');
      console.log('─────────────────────────────────────────────');
      console.log(`Total Matchups:        ${stats.totalMatchups}`);
      console.log(`Completed:             ${stats.completedMatchups}`);
      console.log(`In Progress:           ${stats.inProgressMatchups}`);
      console.log(`Average Home Score:    ${stats.averageHomeScore.toFixed(2)} pts`);
      console.log(`Average Away Score:    ${stats.averageAwayScore.toFixed(2)} pts`);
      console.log(`Analysis Time:         ${stats.executionTime.toFixed(2)}ms\n`);

      // Display highest scoring matchup
      if (stats.highestScoringMatchup) {
        console.log('🏆 HIGHEST SCORING MATCHUP');
        console.log('─────────────────────────────────────────────');
        console.log(this.formatMatchupDisplay(stats.highestScoringMatchup));
      }

      // Display recent matchups
      console.log('📅 RECENT MATCHUPS');
      console.log('─────────────────────────────────────────────');
      
      for (const matchup of matchups) {
        console.log(this.formatMatchupDisplay(matchup));
      }

      // Display league information
      console.log('\n🏈 LEAGUE INFORMATION');
      console.log('─────────────────────────────────────────────');
      
      for (const league of leagues) {
        console.log(`${league.name.padEnd(30)} Week ${String(league.currentWeek).padStart(2)} | Season ${league.season}`);
      }

      console.log('\n✅ Report generated successfully\n');
      
      // Log metrics
      this.logger.info({
        matchupsAnalyzed: stats.totalMatchups,
        leaguesProcessed: leagues.length,
        cacheEnabled: this.config.ENABLE_CACHE,
        executionTime: stats.executionTime,
      }, 'Report generation completed');

    } catch (error) {
      this.logger.error({ error }, 'Failed to generate report');
      console.error('\n❌ Failed to generate report:', (error as Error).message);
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    this.logger.info('Starting cleanup...');
    
    try {
      await this.prisma.$disconnect();
      this.cache.clear();
      this.logger.info('Cleanup completed successfully');
    } catch (error) {
      this.logger.error({ error }, 'Cleanup failed');
      throw error;
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const service = new MatchupService();
  
  try {
    await service.generateReport();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await service.cleanup();
  }
}

// Only run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
export default MatchupService;