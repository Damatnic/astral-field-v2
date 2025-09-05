-- Create database schema for Astral Field Fantasy Football
-- Run this entire script in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leagues table
CREATE TABLE IF NOT EXISTS public.leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    commissioner_id UUID REFERENCES public.users(id) NOT NULL,
    settings JSONB DEFAULT '{}',
    scoring_system JSONB DEFAULT '{}',
    draft_date TIMESTAMPTZ,
    season_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    team_name TEXT NOT NULL,
    draft_position INTEGER,
    waiver_priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, user_id),
    UNIQUE(league_id, team_name)
);

-- Players table
CREATE TABLE IF NOT EXISTS public.players (
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
CREATE TABLE IF NOT EXISTS public.rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES public.players(id) NOT NULL,
    position_slot TEXT NOT NULL, -- STARTER, BENCH, IR
    acquired_date TIMESTAMPTZ DEFAULT NOW(),
    dropped_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lineup entries table (weekly lineups)
CREATE TABLE IF NOT EXISTS public.lineup_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    week INTEGER NOT NULL,
    player_id UUID REFERENCES public.players(id) NOT NULL,
    position_slot TEXT NOT NULL, -- QB, RB, WR, TE, FLEX, K, DST, BENCH
    points_scored DECIMAL(6,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, week, position_slot)
);

-- Draft picks table
CREATE TABLE IF NOT EXISTS public.draft_picks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES public.players(id) NOT NULL,
    round INTEGER NOT NULL,
    pick INTEGER NOT NULL,
    overall_pick INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, overall_pick)
);

-- Waiver claims table
CREATE TABLE IF NOT EXISTS public.waiver_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    player_add_id UUID REFERENCES public.players(id) NOT NULL,
    player_drop_id UUID REFERENCES public.players(id),
    waiver_priority INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processed, failed
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposing_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    receiving_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    proposed_players JSONB NOT NULL DEFAULT '[]',
    requested_players JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, countered
    expires_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player projections table
CREATE TABLE IF NOT EXISTS public.player_projections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
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
CREATE TABLE IF NOT EXISTS public.player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    season_year INTEGER NOT NULL,
    week INTEGER NOT NULL,
    game_stats JSONB DEFAULT '{}',
    fantasy_points DECIMAL(6,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, season_year, week)
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineup_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and update it
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- League policies - users can read leagues they're part of
CREATE POLICY "Users can read leagues they participate in" ON public.leagues
    FOR SELECT USING (
        id IN (
            SELECT league_id FROM public.teams 
            WHERE user_id = auth.uid()
        )
    );

-- Teams policies
CREATE POLICY "Users can read teams in their leagues" ON public.teams
    FOR SELECT USING (
        league_id IN (
            SELECT league_id FROM public.teams 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own teams" ON public.teams
    FOR UPDATE USING (user_id = auth.uid());

-- Players are public (everyone can read)
CREATE POLICY "Players are public" ON public.players
    FOR SELECT TO authenticated USING (true);

-- Rosters can be read by league members
CREATE POLICY "League members can read rosters" ON public.rosters
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM public.teams 
            WHERE league_id IN (
                SELECT league_id FROM public.teams 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Users can manage their own roster
CREATE POLICY "Users can manage own roster" ON public.rosters
    FOR ALL USING (
        team_id IN (
            SELECT id FROM public.teams 
            WHERE user_id = auth.uid()
        )
    );

-- Similar policies for other tables...
CREATE POLICY "League members can read lineup entries" ON public.lineup_entries
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM public.teams 
            WHERE league_id IN (
                SELECT league_id FROM public.teams 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage own lineup" ON public.lineup_entries
    FOR ALL USING (
        team_id IN (
            SELECT id FROM public.teams 
            WHERE user_id = auth.uid()
        )
    );

-- Draft picks are visible to league members
CREATE POLICY "League members can read draft picks" ON public.draft_picks
    FOR SELECT USING (
        league_id IN (
            SELECT league_id FROM public.teams 
            WHERE user_id = auth.uid()
        )
    );

-- Player projections and stats are public
CREATE POLICY "Player projections are public" ON public.player_projections
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Player stats are public" ON public.player_stats
    FOR SELECT TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON public.teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON public.teams(user_id);
CREATE INDEX IF NOT EXISTS idx_rosters_team_id ON public.rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_rosters_player_id ON public.rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_lineup_entries_team_week ON public.lineup_entries(team_id, week);
CREATE INDEX IF NOT EXISTS idx_players_position ON public.players(position);
CREATE INDEX IF NOT EXISTS idx_players_nfl_team ON public.players(nfl_team);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_season ON public.player_stats(player_id, season_year);
CREATE INDEX IF NOT EXISTS idx_player_projections_player_season ON public.player_projections(player_id, season_year);

-- Functions for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON public.leagues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rosters_updated_at BEFORE UPDATE ON public.rosters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lineup_entries_updated_at BEFORE UPDATE ON public.lineup_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waiver_claims_updated_at BEFORE UPDATE ON public.waiver_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_projections_updated_at BEFORE UPDATE ON public.player_projections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();