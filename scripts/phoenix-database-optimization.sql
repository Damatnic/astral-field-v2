-- Phoenix Database Optimization Script
-- High-performance indexes and optimizations for AstralField authentication
-- Execute in order for optimal performance improvements

-- ========================================
-- AUTHENTICATION PERFORMANCE INDEXES
-- ========================================

-- Critical: User email lookup optimization (covering index)
-- This is the most important index for authentication performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_auth_covering 
  ON users(email) 
  INCLUDE (id, name, image, role, "teamName", "hashedPassword", "updatedAt")
  WHERE email IS NOT NULL;

-- User ID lookup optimization for session validation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_id_session_data 
  ON users(id) 
  INCLUDE (email, name, role, "updatedAt")
  WHERE id IS NOT NULL;

-- Last activity tracking for session management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_updated_at_active 
  ON users("updatedAt" DESC) 
  WHERE role IS NOT NULL AND email IS NOT NULL;

-- Role-based queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
  ON users(role, email) 
  WHERE role IS NOT NULL;

-- ========================================
-- SESSION AND SECURITY INDEXES
-- ========================================

-- User preferences lookup optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preferences_user_id 
  ON user_preferences("userId") 
  INCLUDE (theme, notifications, "emailUpdates")
  WHERE "userId" IS NOT NULL;

-- ========================================
-- SPORTS DATA PERFORMANCE INDEXES
-- ========================================

-- Team ownership queries (dashboard performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_owner_league_covering 
  ON teams("ownerId", "leagueId") 
  INCLUDE (id, name, wins, losses, ties, "createdAt")
  WHERE "ownerId" IS NOT NULL;

-- League team queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_league_active 
  ON teams("leagueId") 
  INCLUDE (id, name, "ownerId", wins, losses, ties)
  WHERE "leagueId" IS NOT NULL;

-- Player stats lookup by player and week
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_stats_player_week_season 
  ON player_stats("playerId", week, season DESC) 
  INCLUDE ("fantasyPoints", stats)
  WHERE "playerId" IS NOT NULL;

-- Current season player stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_stats_current_season 
  ON player_stats(season DESC, week DESC, "playerId") 
  WHERE season >= 2024;

-- Roster queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roster_players_team_position 
  ON roster_players("teamId", position, "isStarter") 
  INCLUDE ("playerId")
  WHERE "teamId" IS NOT NULL;

-- Player roster lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roster_players_player_team 
  ON roster_players("playerId") 
  INCLUDE ("teamId", position, "isStarter")
  WHERE "playerId" IS NOT NULL;

-- ========================================
-- MATCHUP AND SCORING INDEXES
-- ========================================

-- Current week matchups (live scoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchups_week_season_league 
  ON matchups(week, season DESC, "leagueId") 
  INCLUDE ("homeTeamId", "awayTeamId", "homeScore", "awayScore", "isComplete")
  WHERE week IS NOT NULL AND season IS NOT NULL;

-- Team matchup history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchups_team_history 
  ON matchups("homeTeamId", "awayTeamId", season DESC, week DESC) 
  INCLUDE ("homeScore", "awayScore", "isComplete")
  WHERE "homeTeamId" IS NOT NULL OR "awayTeamId" IS NOT NULL;

-- League matchups for current season
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matchups_league_current_season 
  ON matchups("leagueId", season DESC, week DESC) 
  WHERE season >= 2024 AND "leagueId" IS NOT NULL;

-- ========================================
-- PLAYER DATA INDEXES
-- ========================================

-- Player search and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_position_team_relevant 
  ON players(position, "nflTeam", "isFantasyRelevant") 
  INCLUDE (id, name, adp, rank)
  WHERE "isFantasyRelevant" = true;

-- Player name search (GIN index for full-text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_name_search 
  ON players USING gin(to_tsvector('english', name))
  WHERE "isFantasyRelevant" = true;

-- Player rankings and ADP
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_adp_rank 
  ON players(position, adp NULLS LAST, rank NULLS LAST) 
  WHERE "isFantasyRelevant" = true;

-- ========================================
-- CHAT AND COMMUNICATION INDEXES
-- ========================================

-- Chat messages by league and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_league_time 
  ON chat_messages("leagueId", "createdAt" DESC) 
  INCLUDE ("userId", content, type)
  WHERE "leagueId" IS NOT NULL;

-- User chat history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_user_time 
  ON chat_messages("userId", "createdAt" DESC) 
  INCLUDE ("leagueId", content, type)
  WHERE "userId" IS NOT NULL;

-- ========================================
-- TRADE SYSTEM INDEXES
-- ========================================

-- Active trade proposals by team
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_proposals_proposing_team_status 
  ON trade_proposals("proposingTeamId", status, "createdAt" DESC) 
  WHERE status IN ('PENDING', 'ACCEPTED');

-- Receiving team trade proposals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_proposals_receiving_team_status 
  ON trade_proposals("receivingTeamId", status, "createdAt" DESC) 
  WHERE status IN ('PENDING', 'ACCEPTED');

-- ========================================
-- PERFORMANCE STATISTICS VIEWS
-- ========================================

-- Materialized view for user dashboard data
CREATE MATERIALIZED VIEW IF NOT EXISTS user_dashboard_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.role,
  COUNT(DISTINCT t.id) as total_teams,
  COUNT(DISTINCT t."leagueId") as leagues_count,
  SUM(t.wins) as total_wins,
  SUM(t.losses) as total_losses,
  SUM(t.ties) as total_ties,
  COALESCE(AVG(t.wins::float / NULLIF(t.wins + t.losses + t.ties, 0)), 0) as win_percentage,
  MAX(t."updatedAt") as last_team_activity
FROM users u
LEFT JOIN teams t ON u.id = t."ownerId"
WHERE u.email IS NOT NULL
GROUP BY u.id, u.email, u.name, u.role;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_dashboard_stats_user_id 
  ON user_dashboard_stats(user_id);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY user_dashboard_stats;

-- ========================================
-- QUERY PERFORMANCE OPTIMIZATIONS
-- ========================================

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE teams;
ANALYZE players;
ANALYZE player_stats;
ANALYZE matchups;
ANALYZE roster_players;
ANALYZE chat_messages;
ANALYZE trade_proposals;

-- ========================================
-- DATABASE CONFIGURATION OPTIMIZATIONS
-- ========================================

-- Increase shared buffers for better caching (adjust based on available RAM)
-- This should be set in postgresql.conf, but can be checked
SELECT name, setting, unit, context 
FROM pg_settings 
WHERE name IN (
  'shared_buffers',
  'effective_cache_size',
  'work_mem',
  'maintenance_work_mem',
  'checkpoint_completion_target',
  'wal_buffers',
  'default_statistics_target'
);

-- ========================================
-- MONITORING QUERIES
-- ========================================

-- Query to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Query to find slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  rows,
  100.0 * total_exec_time / sum(total_exec_time) OVER () as percentage
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC
LIMIT 20;

-- ========================================
-- MAINTENANCE TASKS
-- ========================================

-- Create a function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_dashboard_stats;
  RAISE NOTICE 'Dashboard stats refreshed at %', now();
END;
$$ LANGUAGE plpgsql;

-- Schedule materialized view refresh (run this periodically)
-- This could be done via pg_cron or application-level scheduling
-- SELECT refresh_dashboard_stats();

-- ========================================
-- PERFORMANCE VALIDATION QUERIES
-- ========================================

-- Test authentication query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, email, name, image, role, "teamName", "hashedPassword", "updatedAt"
FROM users 
WHERE email = 'test@example.com';

-- Test dashboard query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM user_dashboard_stats WHERE user_id = 'test-user-id';

-- Test team roster query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  rp."playerId",
  rp.position,
  rp."isStarter",
  p.name as player_name,
  p."nflTeam",
  ps."fantasyPoints"
FROM roster_players rp
JOIN players p ON rp."playerId" = p.id
LEFT JOIN player_stats ps ON p.id = ps."playerId" AND ps.week = 1 AND ps.season = 2025
WHERE rp."teamId" = 'test-team-id'
ORDER BY rp."isStarter" DESC, rp.position;

-- ========================================
-- SUCCESS CONFIRMATION
-- ========================================

SELECT 
  'Phoenix Database Optimization Complete' as status,
  count(*) as total_indexes_created
FROM pg_indexes 
WHERE indexname LIKE 'idx_%';

-- Verify critical indexes exist
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE indexname IN (
  'idx_users_email_auth_covering',
  'idx_users_id_session_data',
  'idx_teams_owner_league_covering',
  'idx_player_stats_player_week_season',
  'idx_matchups_week_season_league'
)
ORDER BY indexname;