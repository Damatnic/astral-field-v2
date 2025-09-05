-- Step 3: Enable Row Level Security
-- Run this after tables are created

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineup_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Basic policies for users table
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Players are public (everyone can read)
CREATE POLICY "Players are public" ON public.players
    FOR SELECT TO authenticated USING (true);

-- Basic league policies
CREATE POLICY "Users can read leagues they participate in" ON public.leagues
    FOR SELECT USING (
        id IN (
            SELECT league_id FROM public.teams 
            WHERE user_id = auth.uid()
        )
    );

-- Basic team policies  
CREATE POLICY "Users can read teams in their leagues" ON public.teams
    FOR SELECT USING (
        league_id IN (
            SELECT league_id FROM public.teams 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own teams" ON public.teams
    FOR UPDATE USING (user_id = auth.uid());