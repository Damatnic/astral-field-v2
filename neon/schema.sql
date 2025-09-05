-- Neon Database Schema for Astral Field Fantasy Football
-- Run this in your Neon console or via psql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (works with Stack Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stack_user_id TEXT UNIQUE, -- Stack Auth user ID
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    commissioner_id UUID REFERENCES users(id) NOT NULL,
    settings JSONB DEFAULT '{}',
    scoring_system JSONB DEFAULT '{}',
    draft_date TIMESTAMPTZ,
    season_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    team_name TEXT NOT NULL,
    draft_position INTEGER,
    waiver_priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, user_id),
    UNIQUE(league_id, team_name)
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    nfl_team TEXT NOT NULL,
    stats JSONB DEFAULT '{}',
    projections JSONB DEFAULT '{}',
    injury_status TEXT,
    bye_week INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, nfl_team, position)
);

-- Rosters table (players owned by teams)
CREATE TABLE IF NOT EXISTS rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES players(id) NOT NULL,
    position_slot TEXT NOT NULL, -- STARTER, BENCH, IR
    acquired_date TIMESTAMPTZ DEFAULT NOW(),
    dropped_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lineup entries table (weekly lineups)
CREATE TABLE IF NOT EXISTS lineup_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    week INTEGER NOT NULL,
    player_id UUID REFERENCES players(id) NOT NULL,
    position_slot TEXT NOT NULL, -- QB, RB, WR, TE, FLEX, K, DST, BENCH
    points_scored DECIMAL(6,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, week, position_slot)
);

-- Draft picks table
CREATE TABLE IF NOT EXISTS draft_picks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES players(id) NOT NULL,
    round INTEGER NOT NULL,
    pick INTEGER NOT NULL,
    overall_pick INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, overall_pick)
);

-- Waiver claims table
CREATE TABLE IF NOT EXISTS waiver_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    player_add_id UUID REFERENCES players(id) NOT NULL,
    player_drop_id UUID REFERENCES players(id),
    waiver_priority INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processed, failed
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposing_team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    receiving_team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    proposed_players JSONB NOT NULL DEFAULT '[]',
    requested_players JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, countered
    expires_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player projections table
CREATE TABLE IF NOT EXISTS player_projections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    season_year INTEGER NOT NULL,
    week INTEGER, -- NULL for season projections
    fantasy_points DECIMAL(6,2) NOT NULL,
    adp DECIMAL(5,1), -- Average Draft Position
    projected_stats JSONB DEFAULT '{}',
    confidence DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, season_year, week)
);

-- Player stats table (actual game stats)
CREATE TABLE IF NOT EXISTS player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    season_year INTEGER NOT NULL,
    week INTEGER NOT NULL,
    game_stats JSONB DEFAULT '{}',
    fantasy_points DECIMAL(6,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, season_year, week)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stack_user_id ON users(stack_user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);
CREATE INDEX IF NOT EXISTS idx_rosters_team_id ON rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_rosters_player_id ON rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_lineup_entries_team_week ON lineup_entries(team_id, week);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_nfl_team ON players(nfl_team);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_season ON player_stats(player_id, season_year);
CREATE INDEX IF NOT EXISTS idx_player_projections_player_season ON player_projections(player_id, season_year);

-- Functions for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rosters_updated_at BEFORE UPDATE ON rosters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lineup_entries_updated_at BEFORE UPDATE ON lineup_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waiver_claims_updated_at BEFORE UPDATE ON waiver_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_projections_updated_at BEFORE UPDATE ON player_projections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();