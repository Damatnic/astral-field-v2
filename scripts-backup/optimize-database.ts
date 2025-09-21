/**
 * Database performance optimization script
 * Adds indexes and optimizations to improve query performance
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPerformanceIndexes() {
  console.log('Starting database performance optimization');

  try {
    // Add indexes for commonly queried fields
    const queries = [
      // User queries optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_auth0_id" ON "users" ("auth0Id");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_email" ON "users" ("email");`,
      
      // League queries optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_leagues_season_active" ON "leagues" ("season", "isActive");`,
      
      // Team queries optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_teams_league_owner" ON "teams" ("leagueId", "ownerId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_teams_league_points" ON "teams" ("leagueId", "pointsFor" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_teams_league_wins" ON "teams" ("leagueId", "wins" DESC, "pointsFor" DESC);`,
      
      // Roster queries optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_roster_players_team_slot" ON "roster_players" ("teamId", "rosterSlot");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_roster_players_player" ON "roster_players" ("playerId");`,
      
      // Player queries optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_players_position_team" ON "players" ("position", "nflTeam");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_players_status" ON "players" ("status");`,
      
      // Player stats optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_player_stats_player_week" ON "player_stats" ("playerId", "week", "season");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_player_stats_week_season" ON "player_stats" ("week", "season");`,
      
      // Player projections optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_player_projections_player_week" ON "player_projections" ("playerId", "week", "season");`,
      
      // Trade queries optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trades_league_status" ON "trades" ("leagueId", "status");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trades_league_created" ON "trades" ("leagueId", "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trades_proposer" ON "trades" ("proposerId");`,
      
      // Trade items optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trade_items_trade" ON "trade_items" ("tradeId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trade_items_player" ON "trade_items" ("playerId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trade_items_teams" ON "trade_items" ("fromTeamId", "toTeamId");`,
      
      // Waiver claims optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_waiver_claims_league_status" ON "waiver_claims" ("leagueId", "status");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_waiver_claims_team_priority" ON "waiver_claims" ("teamId", "priority");`,
      
      // Matchup queries optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_matchups_league_week" ON "matchups" ("leagueId", "week", "season");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_matchups_teams" ON "matchups" ("homeTeamId", "awayTeamId");`,
      
      // League members optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_league_members_user_league" ON "league_members" ("userId", "leagueId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_league_members_league_role" ON "league_members" ("leagueId", "role");`,
      
      // Settings optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_settings_league" ON "settings" ("leagueId");`,
      
      // Notifications optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("userId", "isRead");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_created" ON "notifications" ("createdAt" DESC);`,
      
      // Messages optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_league_created" ON "messages" ("leagueId", "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_user" ON "messages" ("userId");`,
      
      // Transactions optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_league_type" ON "transactions" ("leagueId", "type");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transactions_processed" ON "transactions" ("processedAt");`,
      
      // Audit logs optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_league_created" ON "audit_logs" ("leagueId", "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_user_action" ON "audit_logs" ("userId", "action");`
    ];

    // Execute index creation queries
    for (const query of queries) {
      try {
        await prisma.$executeRawUnsafe(query);
        console.log(`Index created successfully: ${query.substring(0, 100)}`);
      } catch (error) {
        // Skip if index already exists
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`Index already exists, skipping: ${query.substring(0, 100)}`);
        } else {
          console.warn(`Failed to create index: ${query.substring(0, 100)}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Add partial indexes for commonly filtered data
    const partialIndexes = [
      // Active leagues only
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_leagues_active_season" ON "leagues" ("season" DESC) WHERE "isActive" = true;`,
      
      // Active players only
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_players_active_position" ON "players" ("position", "nflTeam") WHERE "status" = 'ACTIVE';`,
      
      // Pending trades only
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trades_pending_league" ON "trades" ("leagueId", "createdAt" DESC) WHERE "status" = 'PENDING';`,
      
      // Unread notifications
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_unread_user" ON "notifications" ("userId", "createdAt" DESC) WHERE "isRead" = false;`
    ];

    for (const query of partialIndexes) {
      try {
        await prisma.$executeRawUnsafe(query);
        console.log(`Partial index created successfully: ${query.substring(0, 100)}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`Partial index already exists, skipping: ${query.substring(0, 100)}`);
        } else {
          console.warn(`Failed to create partial index: ${query.substring(0, 100)}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    console.log('Database performance optimization completed successfully');

  } catch (error) {
    console.error('Database performance optimization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
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