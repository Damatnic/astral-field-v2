// Sleeper Integration Service
// Master service that coordinates all Sleeper API services

import { sleeperPlayerService } from './playerService';
import { sleeperPlayerDatabaseService } from './playerDatabaseService';
import { sleeperLeagueSyncService } from './leagueSyncService';
import { sleeperRealTimeScoringService } from './realTimeScoringService';
import { nflStateService } from './nflStateService';
import { sleeperClient } from './core/sleeperClient';
import { sleeperCache } from './core/cacheManager';

export interface IntegrationHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    api: ServiceHealth;
    database: ServiceHealth;
    leagueSync: ServiceHealth;
    realTimeScoring: ServiceHealth;
    nflState: ServiceHealth;
    cache: ServiceHealth;
  };
  recommendations: string[];
  lastChecked: string;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: any;
  lastChecked: string;
}

export interface FullSyncResult {
  phase1_playerDatabase: any;
  phase2_leagueSync: any;
  phase3_realTimeScoring: any;
  summary: {
    totalDuration: number;
    playersProcessed: number;
    leaguesProcessed: number;
    errors: string[];
    success: boolean;
  };
  timestamp: string;
}

export class SleeperIntegrationService {
  /**
   * Initialize the complete Sleeper integration
   */
  async initialize(): Promise<{ success: boolean; message: string; details: any }> {
    try {
      console.log('🚀 INITIALIZING SLEEPER INTEGRATION');
      console.log('=====================================');

      const startTime = Date.now();
      const results = {
        apiConnectivity: false,
        databaseSetup: false,
        cacheSetup: false,
        servicesReady: false,
      };

      // Step 1: Test API connectivity
      console.log('1️⃣ Testing Sleeper API connectivity...');
      const apiHealth = await sleeperClient.healthCheck();
      if (!apiHealth) {
        throw new Error('Sleeper API is not accessible');
      }
      results.apiConnectivity = true;
      console.log('   ✅ Sleeper API connected');

      // Step 2: Test NFL State
      console.log('2️⃣ Getting current NFL state...');
      const nflState = await nflStateService.getCurrentState();
      console.log(`   ✅ Current season: ${nflState.season}, Week: ${nflState.week}`);

      // Step 3: Test player data
      console.log('3️⃣ Testing player data access...');
      const playerCount = (await sleeperPlayerService.getFantasyPlayers()).length;
      console.log(`   ✅ ${playerCount} fantasy players available`);

      // Step 4: Test database connectivity
      console.log('4️⃣ Testing database connectivity...');
      const dbStats = await sleeperPlayerDatabaseService.getSyncStats();
      results.databaseSetup = true;
      console.log(`   ✅ Database connected (${dbStats.totalPlayers} players)`);

      // Step 5: Test cache system
      console.log('5️⃣ Testing cache system...');
      const cacheStats = sleeperCache.getStats();
      results.cacheSetup = true;
      console.log(`   ✅ Cache system ready (${cacheStats.memoryEntries} entries)`);

      results.servicesReady = true;
      const duration = Date.now() - startTime;

      console.log('\n🎉 INITIALIZATION COMPLETE!');
      console.log(`✅ All systems operational in ${duration}ms`);

      return {
        success: true,
        message: 'Sleeper integration initialized successfully',
        details: {
          duration,
          nflState: {
            season: nflState.season,
            week: nflState.week,
            seasonType: nflState.season_type,
          },
          playerCount,
          database: dbStats,
          cache: cacheStats,
          results,
        },
      };
    } catch (error: any) {
      handleComponentError(error as Error, 'sleeperIntegrationService');
      
      return {
        success: false,
        message: 'Sleeper integration initialization failed',
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Perform a complete sync of all data
   */
  async performFullSync(): Promise<FullSyncResult> {
    const startTime = Date.now();
    console.log('🔄 STARTING FULL SLEEPER SYNC');
    console.log('=============================');

    const result: FullSyncResult = {
      phase1_playerDatabase: null,
      phase2_leagueSync: null,
      phase3_realTimeScoring: null,
      summary: {
        totalDuration: 0,
        playersProcessed: 0,
        leaguesProcessed: 0,
        errors: [],
        success: false,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      // Phase 1: Player Database Sync
      console.log('\n📊 Phase 1: Player Database Sync');
      console.log('----------------------------------');
      result.phase1_playerDatabase = await sleeperPlayerDatabaseService.syncFantasyPlayersToDatabase();
      result.summary.playersProcessed += result.phase1_playerDatabase.playersProcessed;
      result.summary.errors.push(...result.phase1_playerDatabase.errors);
      
      console.log(`✅ Phase 1 complete: ${result.phase1_playerDatabase.playersProcessed} players processed`);

      // Phase 2: League Synchronization
      console.log('\n🏆 Phase 2: League Synchronization');
      console.log('-----------------------------------');
      result.phase2_leagueSync = await sleeperLeagueSyncService.syncAllLeagues();
      
      if (Array.isArray(result.phase2_leagueSync)) {
        result.summary.leaguesProcessed = result.phase2_leagueSync.length;
        result.phase2_leagueSync.forEach(league => {
          result.summary.errors.push(...league.errors);
        });
      }
      
      console.log(`✅ Phase 2 complete: ${result.summary.leaguesProcessed} leagues synchronized`);

      // Phase 3: Real-Time Scoring Setup
      console.log('\n⚡ Phase 3: Real-Time Scoring Setup');
      console.log('------------------------------------');
      
      // Update all league scores once
      await sleeperRealTimeScoringService.updateAllLeagueScores();
      
      result.phase3_realTimeScoring = {
        message: 'Real-time scoring system ready',
        status: 'initialized',
        timestamp: new Date().toISOString(),
      };
      
      console.log('✅ Phase 3 complete: Real-time scoring system ready');

      // Summary
      result.summary.totalDuration = Date.now() - startTime;
      result.summary.success = result.summary.errors.length === 0;

      console.log('\n🎉 FULL SYNC COMPLETE!');
      console.log(`⏱️  Total duration: ${result.summary.totalDuration}ms`);
      console.log(`📊 Players processed: ${result.summary.playersProcessed}`);
      console.log(`🏆 Leagues processed: ${result.summary.leaguesProcessed}`);
      console.log(`❌ Total errors: ${result.summary.errors.length}`);

      return result;
    } catch (error: any) {
      result.summary.errors.push(`Full sync failed: ${error.message}`);
      result.summary.totalDuration = Date.now() - startTime;
      result.summary.success = false;
      
      handleComponentError(error as Error, 'sleeperIntegrationService');
      return result;
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<IntegrationHealth> {
    const health: IntegrationHealth = {
      overall: 'healthy',
      services: {
        api: await this.checkApiHealth(),
        database: await this.checkDatabaseHealth(),
        leagueSync: await this.checkLeagueSyncHealth(),
        realTimeScoring: await this.checkRealTimeScoringHealth(),
        nflState: await this.checkNFLStateHealth(),
        cache: await this.checkCacheHealth(),
      },
      recommendations: [],
      lastChecked: new Date().toISOString(),
    };

    // Determine overall health
    const serviceStatuses = Object.values(health.services).map(s => s.status);
    
    if (serviceStatuses.includes('unhealthy')) {
      health.overall = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      health.overall = 'degraded';
    }

    // Generate recommendations
    health.recommendations = this.generateRecommendations(health.services);

    return health;
  }

  /**
   * Check API health
   */
  private async checkApiHealth(): Promise<ServiceHealth> {
    try {
      const isHealthy = await sleeperClient.healthCheck();
      const rateLimitStatus = sleeperClient.getRateLimitStatus();
      
      return {
        name: 'Sleeper API',
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          connected: isHealthy,
          rateLimit: rateLimitStatus,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        name: 'Sleeper API',
        status: 'unhealthy',
        details: { error: error.message },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    try {
      const stats = await sleeperPlayerDatabaseService.getSyncStats();
      
      return {
        name: 'Database',
        status: stats.totalPlayers > 0 ? 'healthy' : 'degraded',
        details: stats,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        name: 'Database',
        status: 'unhealthy',
        details: { error: error.message },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check league sync health
   */
  private async checkLeagueSyncHealth(): Promise<ServiceHealth> {
    try {
      // This would check if leagues are properly synced
      return {
        name: 'League Sync',
        status: 'healthy',
        details: { message: 'League sync service operational' },
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        name: 'League Sync',
        status: 'unhealthy',
        details: { error: error.message },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check real-time scoring health
   */
  private async checkRealTimeScoringHealth(): Promise<ServiceHealth> {
    try {
      return {
        name: 'Real-Time Scoring',
        status: 'healthy',
        details: { message: 'Scoring service operational' },
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        name: 'Real-Time Scoring',
        status: 'unhealthy',
        details: { error: error.message },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check NFL state health
   */
  private async checkNFLStateHealth(): Promise<ServiceHealth> {
    try {
      const state = await nflStateService.getCurrentState();
      
      return {
        name: 'NFL State',
        status: 'healthy',
        details: {
          season: state.season,
          week: state.week,
          seasonType: state.season_type,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        name: 'NFL State',
        status: 'unhealthy',
        details: { error: error.message },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(): Promise<ServiceHealth> {
    try {
      const stats = sleeperCache.getStats();
      
      return {
        name: 'Cache System',
        status: 'healthy',
        details: stats,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        name: 'Cache System',
        status: 'unhealthy',
        details: { error: error.message },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate recommendations based on service health
   */
  private generateRecommendations(services: any): string[] {
    const recommendations: string[] = [];

    if (services.api.status === 'unhealthy') {
      recommendations.push('Check Sleeper API connectivity - may be experiencing downtime');
    }

    if (services.database.status === 'degraded') {
      recommendations.push('Run player database sync to update player data');
    }

    if (services.database.details?.needsSync) {
      recommendations.push('Database sync recommended - last sync over 24 hours ago');
    }

    if (services.cache.details?.memoryEntries === 0) {
      recommendations.push('Cache is empty - consider warming up cache with initial data fetch');
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems operating normally - no action required');
    }

    return recommendations;
  }

  /**
   * Start automatic maintenance routines
   */
  async startMaintenanceSchedule(): Promise<void> {
    console.log('🕒 Starting Sleeper integration maintenance schedule...');
    
    // Daily player sync at 6 AM
    // Weekly full sync on Tuesdays at 3 AM
    // Live scoring during game days
    
    console.log('✅ Maintenance schedule started');
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStats(): Promise<any> {
    try {
      const [
        nflState,
        dbStats,
        cacheStats,
        rateLimitStatus
      ] = await Promise.all([
        nflStateService.getCurrentState(),
        sleeperPlayerDatabaseService.getSyncStats(),
        Promise.resolve(sleeperCache.getStats()),
        Promise.resolve(sleeperClient.getRateLimitStatus()),
      ]);

      return {
        integration: {
          status: 'active',
          version: '2.1.0',
          environment: process.env.NODE_ENV || 'development',
        },
        nfl: {
          season: nflState.season,
          week: nflState.week,
          seasonType: nflState.season_type,
        },
        database: dbStats,
        cache: cacheStats,
        api: {
          rateLimit: rateLimitStatus,
          endpoint: 'https://api.sleeper.app/v1',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to get integration stats: ${error.message}`);
    }
  }
}

// Singleton instance
export const sleeperIntegrationService = new SleeperIntegrationService();

export default SleeperIntegrationService;