# Supabase Setup Tasks

## 1. Project Creation
- [ ] Create new Supabase project
- [ ] Configure project settings
- [ ] Generate and secure API keys
- [ ] Update .env.local with credentials

## 2. Database Schema Deployment

### Core Tables
- [ ] users (extends auth.users)
- [ ] leagues
- [ ] league_members
- [ ] teams
- [ ] players (NFL player database)
- [ ] rosters
- [ ] roster_players
- [ ] trades
- [ ] waivers
- [ ] scoring_settings
- [ ] matchups
- [ ] player_stats
- [ ] league_settings

### Authentication & Security
- [ ] Set up RLS policies for all tables
- [ ] Configure user roles and permissions
- [ ] Set up email templates
- [ ] Configure OAuth providers (optional)

### Functions & Triggers
- [ ] Auto-assign team on league join
- [ ] Calculate weekly scores
- [ ] Process waiver claims
- [ ] Handle trade logic
- [ ] Update player rankings

## 3. Testing Setup
- [ ] Create test database
- [ ] Set up database connection tests
- [ ] Create mock data generators
- [ ] Set up integration test suite

## SQL Schema (Foundation)

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leagues table
CREATE TABLE public.leagues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  commissioner_id UUID REFERENCES public.users(id) NOT NULL,
  max_teams INTEGER DEFAULT 12,
  draft_date TIMESTAMP WITH TIME ZONE,
  season_year INTEGER NOT NULL,
  league_type TEXT DEFAULT 'standard', -- standard, ppr, dynasty
  scoring_settings JSONB DEFAULT '{}',
  league_settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft', -- draft, active, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- League members
CREATE TABLE public.league_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- Teams
CREATE TABLE public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  points_for DECIMAL(10,2) DEFAULT 0,
  points_against DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, owner_id)
);
```