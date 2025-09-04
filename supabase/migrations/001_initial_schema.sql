-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create leagues table
CREATE TABLE IF NOT EXISTS public.leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    commissioner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    scoring_system JSONB DEFAULT '{"passing_td": 4, "passing_yards": 0.04, "rushing_td": 6, "rushing_yards": 0.1, "receiving_td": 6, "receiving_yards": 0.1, "receptions": 0.5}',
    draft_date TIMESTAMP WITH TIME ZONE,
    season_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    draft_position INTEGER,
    waiver_priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(league_id, user_id)
);

-- Create players table
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    nfl_team TEXT NOT NULL,
    stats JSONB DEFAULT '{}',
    projections JSONB DEFAULT '{}',
    injury_status TEXT,
    bye_week INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create draft_picks table
CREATE TABLE IF NOT EXISTS public.draft_picks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    pick INTEGER NOT NULL,
    overall_pick INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(league_id, player_id),
    UNIQUE(league_id, round, pick)
);

-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    proposed_by UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    trade_details JSONB NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lineup_entries table
CREATE TABLE IF NOT EXISTS public.lineup_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    week INTEGER NOT NULL CHECK (week >= 1 AND week <= 18),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    position_slot TEXT NOT NULL,
    points_scored DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, week, position_slot)
);

-- Create roster_players table (for managing team rosters)
CREATE TABLE IF NOT EXISTS public.roster_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    acquired_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    acquisition_type TEXT DEFAULT 'draft' CHECK (acquisition_type IN ('draft', 'trade', 'waiver', 'free_agent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, player_id)
);

-- Create waiver_claims table
CREATE TABLE IF NOT EXISTS public.waiver_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    player_to_add UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    player_to_drop UUID REFERENCES public.players(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL,
    faab_amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'cancelled')),
    process_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create matchups table
CREATE TABLE IF NOT EXISTS public.matchups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    week INTEGER NOT NULL CHECK (week >= 1 AND week <= 18),
    home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    home_score DECIMAL(10, 2) DEFAULT 0,
    away_score DECIMAL(10, 2) DEFAULT 0,
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(league_id, week, home_team_id),
    UNIQUE(league_id, week, away_team_id)
);

-- Create league_messages table
CREATE TABLE IF NOT EXISTS public.league_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'trade', 'announcement', 'trash_talk')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_teams_league_id ON public.teams(league_id);
CREATE INDEX idx_teams_user_id ON public.teams(user_id);
CREATE INDEX idx_draft_picks_league_id ON public.draft_picks(league_id);
CREATE INDEX idx_draft_picks_team_id ON public.draft_picks(team_id);
CREATE INDEX idx_trades_league_id ON public.trades(league_id);
CREATE INDEX idx_trades_proposed_by ON public.trades(proposed_by);
CREATE INDEX idx_lineup_entries_team_id ON public.lineup_entries(team_id);
CREATE INDEX idx_lineup_entries_week ON public.lineup_entries(week);
CREATE INDEX idx_roster_players_team_id ON public.roster_players(team_id);
CREATE INDEX idx_waiver_claims_team_id ON public.waiver_claims(team_id);
CREATE INDEX idx_matchups_league_week ON public.matchups(league_id, week);
CREATE INDEX idx_league_messages_league_id ON public.league_messages(league_id);
CREATE INDEX idx_players_position ON public.players(position);
CREATE INDEX idx_players_nfl_team ON public.players(nfl_team);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_leagues BEFORE UPDATE ON public.leagues
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_teams BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_players BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_trades BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_lineup_entries BEFORE UPDATE ON public.lineup_entries
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineup_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_messages ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY users_select ON public.users FOR SELECT USING (true);
CREATE POLICY users_update ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY leagues_select ON public.leagues FOR SELECT USING (true);
CREATE POLICY leagues_insert ON public.leagues FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY leagues_update ON public.leagues FOR UPDATE USING (auth.uid() = commissioner_id);

CREATE POLICY teams_select ON public.teams FOR SELECT USING (true);
CREATE POLICY teams_manage ON public.teams FOR ALL USING (auth.uid() = user_id OR auth.uid() IN (SELECT commissioner_id FROM public.leagues WHERE id = league_id));

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;