-- Step 2: Create Remaining Tables
-- Run this after Step 1 is successful

-- Rosters table (players owned by teams)
CREATE TABLE IF NOT EXISTS public.rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES public.players(id) NOT NULL,
    position_slot TEXT NOT NULL,
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
    position_slot TEXT NOT NULL,
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
    status TEXT DEFAULT 'pending',
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
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);