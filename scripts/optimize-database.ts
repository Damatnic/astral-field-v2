/**
 * Phoenix Database Performance Optimization Script
 * Architect the perfect database backend for player authentication and management
 * Focus: Authentication performance, session management, player data relationships
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPerformanceIndexes() {
  console.log('🔥 Phoenix: Starting elite database performance optimization for player authentication');

  try {
    // ===== AUTHENTICATION & USER MANAGEMENT OPTIMIZATION =====
    const authQueries = [
      // Primary authentication indexes - optimized for lightning-fast login
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_email_hash_lookup" ON "users" ("email") INCLUDE ("hashedPassword", "role", "id");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_auth_active" ON "users" ("email", "updatedAt") WHERE "hashedPassword" IS NOT NULL;`,
      
      // Session management optimization - critical for player authentication
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sessions_user_expires" ON "sessions" ("userId", "expires" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sessions_token_active" ON "sessions" ("sessionToken") WHERE "expires" > NOW();`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_sessions_active" ON "user_sessions" ("userId", "expiresAt", "isActive") WHERE "isActive" = true;`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_sessions_cleanup" ON "user_sessions" ("expiresAt") WHERE "isActive" = true;`,
      
      // Account management for OAuth providers
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_accounts_user_provider" ON "accounts" ("userId", "provider", "providerAccountId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_accounts_provider_lookup" ON "accounts" ("provider", "providerAccountId") INCLUDE ("userId");`,
    ];

    // ===== PLAYER DATA & TEAM RELATIONSHIP OPTIMIZATION =====
    const playerQueries = [
      // Core player lookup optimization - position-based queries are critical
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_players_position_active" ON "players" ("position", "status", "isActive") WHERE "isFantasyRelevant" = true;`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_players_nfl_team_position" ON "players" ("nflTeam", "position", "status") WHERE "isActive" = true;`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_players_sleeper_lookup" ON "players" ("sleeperPlayerId") WHERE "sleeperPlayerId" IS NOT NULL;`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_players_search" ON "players" USING gin(to_tsvector('english', name || ' ' || COALESCE(firstName, '') || ' ' || COALESCE(lastName, '')));`,
      
      // Player stats optimization for performance dashboards
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_player_stats_week_season_perf" ON "player_stats" ("week", "season", "fantasyPoints" DESC) INCLUDE ("playerId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_player_stats_player_current" ON "player_stats" ("playerId", "season", "week" DESC);`,
      
      // Roster management optimization - critical for team operations
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_roster_team_position_starter" ON "roster" ("teamId", "position", "isStarter") INCLUDE ("playerId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_roster_players_team_pos" ON "roster_players" ("teamId", "position", "isStarter") INCLUDE ("playerId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_roster_player_teams" ON "roster" ("playerId") INCLUDE ("teamId", "position");`,
      
      // League and team optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_leagues_season_active" ON "leagues" ("season", "isActive");`,
      
      // Team relationship optimization - critical for player ownership
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_teams_league_owner" ON "teams" ("leagueId", "ownerId") INCLUDE ("name", "wins", "pointsFor");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_teams_league_standings" ON "teams" ("leagueId", "wins" DESC, "pointsFor" DESC) INCLUDE ("name", "ownerId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_teams_owner_lookup" ON "teams" ("ownerId") INCLUDE ("leagueId", "name");`,
    ];

    // ===== PERFORMANCE & CACHING OPTIMIZATION =====
    const performanceQueries = [
      // Matchup optimization for real-time scoring
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_matchups_league_week_season" ON "matchups" ("leagueId", "week", "season") INCLUDE ("homeTeamId", "awayTeamId", "homeScore", "awayScore");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_matchups_current_week" ON "matchups" ("leagueId", "week") WHERE "isComplete" = false;`,
      
      // Fantasy tracking optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_player_projections_current" ON "player_projections" ("playerId", "week", "season") INCLUDE ("points", "confidence");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_player_news_recent" ON "player_news" ("playerId", "publishedAt" DESC) INCLUDE ("headline", "body");`,
      
      // Transaction and trade optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_league_recent" ON "transactions" ("leagueId", "createdAt" DESC) WHERE "status" = 'processed';`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trade_proposals_active" ON "trade_proposals" ("status", "createdAt" DESC) WHERE "status" = 'pending';`,
      
      // Chat and messaging optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_chat_messages_league_recent" ON "chat_messages" ("leagueId", "createdAt" DESC) WHERE "deleted" = false;`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_league_recent" ON "messages" ("leagueId", "createdAt" DESC);`,
      
      // Notification optimization for real-time updates
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" ("userId", "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notification_delivery_status" ON "notification_delivery" ("userId", "status", "createdAt" DESC);`,
    ];

    console.log('🔥 Phoenix: Executing authentication optimization queries...');
    await executeQueries(authQueries, 'Authentication');
    
    console.log('🔥 Phoenix: Executing player data optimization queries...');
    await executeQueries(playerQueries, 'Player Data');
    
    console.log('🔥 Phoenix: Executing performance optimization queries...');
    await executeQueries(performanceQueries, 'Performance');

    // ===== MATERIALIZED VIEWS FOR ULTRA-FAST QUERIES =====
    await createMaterializedViews();

    // ===== DATABASE STATISTICS UPDATE =====
    await updateDatabaseStatistics();

    console.log('🔥 Phoenix: Elite database optimization completed successfully!');

  } catch (error) {
    console.error('❌ Phoenix: Database optimization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function executeQueries(queries: string[], category: string) {
  console.log(`  📊 Optimizing ${category} indexes...`);
  for (const query of queries) {
    try {
      await prisma.$executeRawUnsafe(query);
      console.log(`    ✅ ${query.substring(0, 80)}...`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log(`    ⏭️  Index exists: ${query.substring(50, 100)}...`);
      } else {
        console.warn(`    ⚠️  Failed: ${query.substring(0, 80)}, Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  }
}

async function createMaterializedViews() {
  console.log('🔥 Phoenix: Creating materialized views for lightning-fast queries...');
  
  const views = [
    // Player performance summary for quick lookups
    {
      name: 'player_performance_summary',
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS player_performance_summary AS
        SELECT 
          p.id,
          p.name,
          p.position,
          p.nflTeam,
          p.status,
          COALESCE(AVG(ps.fantasyPoints), 0) as avg_fantasy_points,
          COALESCE(SUM(ps.fantasyPoints), 0) as total_fantasy_points,
          COUNT(ps.id) as games_played,
          MAX(ps.week) as last_game_week
        FROM players p
        LEFT JOIN player_stats ps ON p.id = ps.playerId AND ps.season = '2024'
        WHERE p.isFantasyRelevant = true
        GROUP BY p.id, p.name, p.position, p.nflTeam, p.status;
      `
    },
    // Team standings for quick dashboard loading
    {
      name: 'team_standings_summary',
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS team_standings_summary AS
        SELECT 
          t.id,
          t.name,
          t.leagueId,
          t.ownerId,
          u.name as owner_name,
          t.wins,
          t.losses,
          t.ties,
          t.pointsFor,
          t.pointsAgainst,
          (t.pointsFor - t.pointsAgainst) as point_differential,
          ROW_NUMBER() OVER (PARTITION BY t.leagueId ORDER BY t.wins DESC, t.pointsFor DESC) as standing
        FROM teams t
        JOIN users u ON t.ownerId = u.id
        JOIN leagues l ON t.leagueId = l.id
        WHERE l.isActive = true;
      `
    }
  ];

  for (const view of views) {
    try {
      await prisma.$executeRawUnsafe(view.query);
      console.log(`    ✅ Created materialized view: ${view.name}`);
    } catch (error) {
      console.warn(`    ⚠️  Failed to create view ${view.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
}

async function updateDatabaseStatistics() {
  console.log('🔥 Phoenix: Updating database statistics for optimal query planning...');
  
  try {
    await prisma.$executeRawUnsafe('ANALYZE;');
    console.log('    ✅ Database statistics updated successfully');
  } catch (error) {
    console.warn(`    ⚠️  Failed to update statistics: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

// Run optimization if called directly
if (require.main === module) {
  addPerformanceIndexes()
    .then(() => {
      console.log('Database optimization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database optimization failed:', error);
      process.exit(1);
    });
}

export { addPerformanceIndexes };