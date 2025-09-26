-- PHOENIX DATABASE OPTIMIZATION - ENHANCED CONSTRAINTS AND RELATIONSHIPS
-- Migration: 003_enhanced_constraints_and_relationships
-- Deployed: 2025-09-26
-- Purpose: Add advanced data integrity, relationships, and business logic constraints

BEGIN;

-- ========================================
-- DATA INTEGRITY CONSTRAINTS
-- ========================================

-- League constraints
ALTER TABLE leagues 
  ADD CONSTRAINT chk_leagues_current_week_valid 
  CHECK (currentWeek BETWEEN 1 AND 18);

ALTER TABLE leagues 
  ADD CONSTRAINT chk_leagues_season_valid 
  CHECK (season::INTEGER BETWEEN 2020 AND 2030);

-- Team constraints  
ALTER TABLE teams 
  ADD CONSTRAINT chk_teams_record_non_negative 
  CHECK (wins >= 0 AND losses >= 0 AND ties >= 0);

ALTER TABLE teams 
  ADD CONSTRAINT chk_teams_points_non_negative 
  CHECK (pointsFor >= 0 AND pointsAgainst >= 0);

ALTER TABLE teams 
  ADD CONSTRAINT chk_teams_standing_valid 
  CHECK (standing > 0 AND standing <= 20);

ALTER TABLE teams 
  ADD CONSTRAINT chk_teams_waiver_priority_valid 
  CHECK (waiverPriority BETWEEN 1 AND 20);

ALTER TABLE teams 
  ADD CONSTRAINT chk_teams_faab_budget_valid 
  CHECK (faabBudget >= 0 AND faabSpent >= 0 AND faabSpent <= faabBudget);

-- Player constraints
ALTER TABLE players 
  ADD CONSTRAINT chk_players_age_realistic 
  CHECK (age IS NULL OR (age BETWEEN 18 AND 50));

ALTER TABLE players 
  ADD CONSTRAINT chk_players_experience_valid 
  CHECK (experience IS NULL OR (experience BETWEEN 0 AND 25));

ALTER TABLE players 
  ADD CONSTRAINT chk_players_jersey_number_valid 
  CHECK (jerseyNumber IS NULL OR (jerseyNumber BETWEEN 0 AND 99));

ALTER TABLE players 
  ADD CONSTRAINT chk_players_bye_week_valid 
  CHECK (byeWeek IS NULL OR (byeWeek BETWEEN 1 AND 18));

ALTER TABLE players 
  ADD CONSTRAINT chk_players_rank_positive 
  CHECK (rank IS NULL OR rank > 0);

ALTER TABLE players 
  ADD CONSTRAINT chk_players_adp_positive 
  CHECK (adp IS NULL OR adp > 0);

-- Player stats constraints
ALTER TABLE player_stats 
  ADD CONSTRAINT chk_player_stats_week_valid 
  CHECK (week BETWEEN 1 AND 18);

ALTER TABLE player_stats 
  ADD CONSTRAINT chk_player_stats_season_valid 
  CHECK (season IN ('2023', '2024', '2025'));

ALTER TABLE player_stats 
  ADD CONSTRAINT chk_player_stats_fantasy_points_realistic 
  CHECK (fantasyPoints >= -10 AND fantasyPoints <= 100);

-- Matchup constraints
ALTER TABLE matchups 
  ADD CONSTRAINT chk_matchups_week_valid 
  CHECK (week BETWEEN 1 AND 18);

ALTER TABLE matchups 
  ADD CONSTRAINT chk_matchups_scores_non_negative 
  CHECK (homeScore >= 0 AND awayScore >= 0);

ALTER TABLE matchups 
  ADD CONSTRAINT chk_matchups_scores_realistic 
  CHECK (homeScore <= 300 AND awayScore <= 300);

ALTER TABLE matchups 
  ADD CONSTRAINT chk_matchups_different_teams 
  CHECK (homeTeamId != awayTeamId);

-- Draft constraints
ALTER TABLE drafts 
  ADD CONSTRAINT chk_drafts_round_valid 
  CHECK (currentRound >= 1 AND totalRounds >= 1 AND currentRound <= totalRounds);

ALTER TABLE drafts 
  ADD CONSTRAINT chk_drafts_pick_valid 
  CHECK (currentPick >= 1);

ALTER TABLE drafts 
  ADD CONSTRAINT chk_drafts_time_valid 
  CHECK (timeRemaining >= 0 AND timePerPick > 0);

ALTER TABLE draft_picks 
  ADD CONSTRAINT chk_draft_picks_order_valid 
  CHECK (pickNumber > 0 AND round > 0 AND pickInRound > 0);

ALTER TABLE draft_picks 
  ADD CONSTRAINT chk_draft_picks_time_used_valid 
  CHECK (timeUsed >= 0);

ALTER TABLE draft_order 
  ADD CONSTRAINT chk_draft_order_pick_order_valid 
  CHECK (pickOrder > 0);

-- Roster constraints
ALTER TABLE roster 
  ADD CONSTRAINT chk_roster_acquisition_date_valid 
  CHECK (acquisitionDate <= NOW());

ALTER TABLE roster_players 
  ADD CONSTRAINT chk_roster_players_acquisition_date_valid 
  CHECK (acquisitionDate <= NOW());

-- Transaction constraints
ALTER TABLE transactions 
  ADD CONSTRAINT chk_transactions_week_valid 
  CHECK (week IS NULL OR (week BETWEEN 1 AND 18));

-- Feedback constraints
ALTER TABLE feedback 
  ADD CONSTRAINT chk_feedback_rating_valid 
  CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));

-- ========================================
-- UNIQUE CONSTRAINTS FOR DATA INTEGRITY
-- ========================================

-- Ensure unique league codes
ALTER TABLE leagues 
  ADD CONSTRAINT unq_leagues_league_code 
  UNIQUE (commissionerId, season) 
  DEFERRABLE INITIALLY DEFERRED;

-- Ensure unique team names within league
-- (Already exists in schema, but ensuring it's properly defined)
-- ALTER TABLE teams 
--   ADD CONSTRAINT unq_teams_name_per_league 
--   UNIQUE (leagueId, name);

-- Ensure unique draft picks
-- (Already exists as @@unique in schema)

-- Ensure unique roster positions per team
CREATE UNIQUE INDEX IF NOT EXISTS unq_roster_team_player 
  ON roster(teamId, playerId);

CREATE UNIQUE INDEX IF NOT EXISTS unq_roster_players_team_player 
  ON roster_players(teamId, playerId);

-- Ensure unique matchups per week
-- (Already exists as @@unique in schema)

-- Ensure unique user emails
-- (Already exists as @unique in schema)

-- ========================================
-- FOREIGN KEY CONSTRAINTS VALIDATION
-- ========================================

-- Verify all foreign key relationships are properly indexed
-- These should already exist from the schema, but we'll verify critical ones

-- Add missing foreign key indexes if needed
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(userId);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(userId);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(ownerId);
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON teams(leagueId);
CREATE INDEX IF NOT EXISTS idx_roster_team_id ON roster(teamId);
CREATE INDEX IF NOT EXISTS idx_roster_player_id ON roster(playerId);
CREATE INDEX IF NOT EXISTS idx_matchups_home_team_id ON matchups(homeTeamId);
CREATE INDEX IF NOT EXISTS idx_matchups_away_team_id ON matchups(awayTeamId);
CREATE INDEX IF NOT EXISTS idx_matchups_league_id ON matchups(leagueId);
CREATE INDEX IF NOT EXISTS idx_transactions_team_id ON transactions(teamId);
CREATE INDEX IF NOT EXISTS idx_transactions_league_id ON transactions(leagueId);
CREATE INDEX IF NOT EXISTS idx_draft_picks_draft_id ON draft_picks(draftId);
CREATE INDEX IF NOT EXISTS idx_draft_picks_team_id ON draft_picks(teamId);
CREATE INDEX IF NOT EXISTS idx_draft_picks_player_id ON draft_picks(playerId);

-- ========================================
-- BUSINESS LOGIC CONSTRAINTS
-- ========================================

-- Fantasy sports specific business rules

-- Roster size constraints (prevent roster overflow)
CREATE OR REPLACE FUNCTION check_roster_size() 
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) 
    FROM roster 
    WHERE teamId = NEW.teamId
  ) >= 20 THEN -- Maximum roster size
    RAISE EXCEPTION 'Roster size cannot exceed 20 players';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_roster_size ON roster;
CREATE TRIGGER trg_check_roster_size
  BEFORE INSERT ON roster
  FOR EACH ROW
  EXECUTE FUNCTION check_roster_size();

-- Lineup validation (ensure proper starting lineup)
CREATE OR REPLACE FUNCTION validate_starting_lineup() 
RETURNS TRIGGER AS $$
DECLARE
  qb_count INTEGER;
  rb_count INTEGER;
  wr_count INTEGER;
  te_count INTEGER;
  k_count INTEGER;
  def_count INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE position = 'QB' AND isStarter = true),
    COUNT(*) FILTER (WHERE position = 'RB' AND isStarter = true),
    COUNT(*) FILTER (WHERE position = 'WR' AND isStarter = true),
    COUNT(*) FILTER (WHERE position = 'TE' AND isStarter = true),
    COUNT(*) FILTER (WHERE position = 'K' AND isStarter = true),
    COUNT(*) FILTER (WHERE position IN ('DEF', 'DST') AND isStarter = true)
  INTO qb_count, rb_count, wr_count, te_count, k_count, def_count
  FROM roster 
  WHERE teamId = NEW.teamId;

  -- Standard lineup validation (1 QB, 2 RB, 2 WR, 1 TE, 1 K, 1 DEF)
  IF qb_count > 1 THEN
    RAISE EXCEPTION 'Cannot start more than 1 quarterback';
  END IF;
  
  IF rb_count > 3 THEN -- 2 RB + 1 FLEX
    RAISE EXCEPTION 'Cannot start more than 3 running backs';
  END IF;
  
  IF wr_count > 4 THEN -- 2 WR + 1 FLEX + 1 SUPER_FLEX
    RAISE EXCEPTION 'Cannot start more than 4 wide receivers';
  END IF;
  
  IF te_count > 2 THEN -- 1 TE + 1 FLEX
    RAISE EXCEPTION 'Cannot start more than 2 tight ends';
  END IF;
  
  IF k_count > 1 THEN
    RAISE EXCEPTION 'Cannot start more than 1 kicker';
  END IF;
  
  IF def_count > 1 THEN
    RAISE EXCEPTION 'Cannot start more than 1 defense';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_starting_lineup ON roster;
CREATE TRIGGER trg_validate_starting_lineup
  AFTER INSERT OR UPDATE ON roster
  FOR EACH ROW
  WHEN (NEW.isStarter = true)
  EXECUTE FUNCTION validate_starting_lineup();

-- Draft pick validation
CREATE OR REPLACE FUNCTION validate_draft_pick() 
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure player hasn't been drafted already
  IF EXISTS (
    SELECT 1 FROM draft_picks 
    WHERE draftId = NEW.draftId 
      AND playerId = NEW.playerId 
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Player has already been drafted in this draft';
  END IF;
  
  -- Ensure pick number is sequential
  IF NEW.pickNumber != (
    SELECT COALESCE(MAX(pickNumber), 0) + 1 
    FROM draft_picks 
    WHERE draftId = NEW.draftId
  ) THEN
    RAISE EXCEPTION 'Draft picks must be made in sequential order';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_draft_pick ON draft_picks;
CREATE TRIGGER trg_validate_draft_pick
  BEFORE INSERT ON draft_picks
  FOR EACH ROW
  EXECUTE FUNCTION validate_draft_pick();

-- Transaction validation
CREATE OR REPLACE FUNCTION validate_transaction() 
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure transaction doesn't exceed roster limits
  IF NEW.type = 'waiver' OR NEW.type = 'free_agent' THEN
    IF (
      SELECT COUNT(*) 
      FROM roster 
      WHERE teamId = NEW.teamId
    ) >= 20 THEN
      RAISE EXCEPTION 'Cannot add player: roster is full';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_transaction ON transactions;
CREATE TRIGGER trg_validate_transaction
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction();

-- ========================================
-- AUDIT TRAIL ENHANCEMENTS
-- ========================================

-- Enhanced audit logging for critical table changes
CREATE OR REPLACE FUNCTION audit_critical_changes() 
RETURNS TRIGGER AS $$
DECLARE
  user_id TEXT;
  action_type TEXT;
BEGIN
  -- Get current user (this would be set by application context)
  user_id := current_setting('app.current_user_id', true);
  
  IF TG_OP = 'INSERT' THEN
    action_type := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
  END IF;
  
  INSERT INTO audit_logs (
    id,
    userId,
    action,
    details,
    createdAt
  ) VALUES (
    'audit-' || extract(epoch from now()) || '-' || floor(random() * 1000000),
    COALESCE(user_id, 'system'),
    TG_TABLE_NAME || '_' || action_type,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'old_values', CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
      'new_values', CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
      'timestamp', now()
    ),
    now()
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_roster_changes ON roster;
CREATE TRIGGER audit_roster_changes
  AFTER INSERT OR UPDATE OR DELETE ON roster
  FOR EACH ROW
  EXECUTE FUNCTION audit_critical_changes();

DROP TRIGGER IF EXISTS audit_draft_picks_changes ON draft_picks;
CREATE TRIGGER audit_draft_picks_changes
  AFTER INSERT OR UPDATE OR DELETE ON draft_picks
  FOR EACH ROW
  EXECUTE FUNCTION audit_critical_changes();

DROP TRIGGER IF EXISTS audit_transactions_changes ON transactions;
CREATE TRIGGER audit_transactions_changes
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION audit_critical_changes();

DROP TRIGGER IF EXISTS audit_matchups_changes ON matchups;
CREATE TRIGGER audit_matchups_changes
  AFTER UPDATE ON matchups
  FOR EACH ROW
  WHEN (OLD.homeScore != NEW.homeScore OR OLD.awayScore != NEW.awayScore)
  EXECUTE FUNCTION audit_critical_changes();

-- ========================================
-- PERFORMANCE OPTIMIZATION TRIGGERS
-- ========================================

-- Auto-update team standings when matchups are completed
CREATE OR REPLACE FUNCTION update_team_standings() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the matchup was just completed
  IF OLD.isComplete = false AND NEW.isComplete = true THEN
    
    -- Update home team record
    UPDATE teams 
    SET 
      wins = wins + CASE WHEN NEW.homeScore > NEW.awayScore THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN NEW.homeScore < NEW.awayScore THEN 1 ELSE 0 END,
      ties = ties + CASE WHEN NEW.homeScore = NEW.awayScore THEN 1 ELSE 0 END,
      pointsFor = pointsFor + NEW.homeScore,
      pointsAgainst = pointsAgainst + NEW.awayScore,
      updatedAt = now()
    WHERE id = NEW.homeTeamId;
    
    -- Update away team record
    UPDATE teams 
    SET 
      wins = wins + CASE WHEN NEW.awayScore > NEW.homeScore THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN NEW.awayScore < NEW.homeScore THEN 1 ELSE 0 END,
      ties = ties + CASE WHEN NEW.awayScore = NEW.homeScore THEN 1 ELSE 0 END,
      pointsFor = pointsFor + NEW.awayScore,
      pointsAgainst = pointsAgainst + NEW.homeScore,
      updatedAt = now()
    WHERE id = NEW.awayTeamId;
    
    -- Recalculate standings for the entire league
    WITH team_rankings AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          ORDER BY wins DESC, 
                   pointsFor DESC, 
                   pointsAgainst ASC
        ) as new_standing
      FROM teams 
      WHERE leagueId = NEW.leagueId
    )
    UPDATE teams 
    SET standing = tr.new_standing
    FROM team_rankings tr 
    WHERE teams.id = tr.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_team_standings ON matchups;
CREATE TRIGGER trg_update_team_standings
  AFTER UPDATE ON matchups
  FOR EACH ROW
  EXECUTE FUNCTION update_team_standings();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to relevant tables
DROP TRIGGER IF EXISTS update_leagues_modtime ON leagues;
CREATE TRIGGER update_leagues_modtime 
  BEFORE UPDATE ON leagues 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_teams_modtime ON teams;
CREATE TRIGGER update_teams_modtime 
  BEFORE UPDATE ON teams 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_players_modtime ON players;
CREATE TRIGGER update_players_modtime 
  BEFORE UPDATE ON players 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_player_stats_modtime ON player_stats;
CREATE TRIGGER update_player_stats_modtime 
  BEFORE UPDATE ON player_stats 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_matchups_modtime ON matchups;
CREATE TRIGGER update_matchups_modtime 
  BEFORE UPDATE ON matchups 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_drafts_modtime ON drafts;
CREATE TRIGGER update_drafts_modtime 
  BEFORE UPDATE ON drafts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_roster_players_modtime ON roster_players;
CREATE TRIGGER update_roster_players_modtime 
  BEFORE UPDATE ON roster_players 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

-- ========================================
-- DATA CONSISTENCY VIEWS
-- ========================================

-- View for checking data consistency issues
CREATE OR REPLACE VIEW v_data_consistency_check AS
WITH consistency_issues AS (
  -- Check for teams without owners
  SELECT 'team_without_owner' as issue_type, t.id as entity_id, 'Team has no valid owner' as description
  FROM teams t
  LEFT JOIN users u ON t.ownerId = u.id
  WHERE u.id IS NULL
  
  UNION ALL
  
  -- Check for invalid roster sizes
  SELECT 'invalid_roster_size' as issue_type, r.teamId as entity_id, 
         'Team has ' || COUNT(*) || ' players (should be <= 20)' as description
  FROM roster r
  GROUP BY r.teamId
  HAVING COUNT(*) > 20
  
  UNION ALL
  
  -- Check for matchups with same team
  SELECT 'invalid_matchup' as issue_type, m.id as entity_id, 
         'Matchup has same team playing itself' as description
  FROM matchups m
  WHERE m.homeTeamId = m.awayTeamId
  
  UNION ALL
  
  -- Check for negative scores
  SELECT 'negative_score' as issue_type, m.id as entity_id, 
         'Matchup has negative scores' as description
  FROM matchups m
  WHERE m.homeScore < 0 OR m.awayScore < 0
  
  UNION ALL
  
  -- Check for duplicate draft picks
  SELECT 'duplicate_draft_pick' as issue_type, dp.draftId as entity_id,
         'Player ' || dp.playerId || ' drafted multiple times' as description
  FROM draft_picks dp
  GROUP BY dp.draftId, dp.playerId
  HAVING COUNT(*) > 1
)
SELECT * FROM consistency_issues;

-- ========================================
-- PERFORMANCE STATISTICS UPDATE
-- ========================================

-- Update table statistics for optimal query planning
ANALYZE leagues;
ANALYZE teams;
ANALYZE players;
ANALYZE player_stats;
ANALYZE matchups;
ANALYZE roster;
ANALYZE roster_players;
ANALYZE draft_picks;
ANALYZE drafts;
ANALYZE transactions;
ANALYZE chat_messages;
ANALYZE users;

-- Success message
SELECT 'Phoenix Database Constraints Complete' as status,
       'Enhanced data integrity and business logic constraints deployed' as message,
       'Database now enforces proper fantasy sports rules and relationships' as impact;

COMMIT;

-- ========================================
-- POST-DEPLOYMENT VERIFICATION QUERIES
-- ========================================

/*
-- Run these queries after deployment to verify constraints are working:

-- Check constraint violations
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE contype = 'c' 
  AND conname LIKE 'chk_%'
ORDER BY conrelid::regclass::text;

-- Test data consistency
SELECT * FROM v_data_consistency_check LIMIT 10;

-- Verify triggers are active
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%audit%' OR trigger_name LIKE '%validate%'
ORDER BY event_object_table, trigger_name;

-- Check function definitions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%validate%' OR routine_name LIKE '%audit%' OR routine_name LIKE '%update%'
ORDER BY routine_name;
*/