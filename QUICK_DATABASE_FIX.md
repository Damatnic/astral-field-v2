# 🚀 Quick Database Fix - 3 Simple Steps

## The Problem
You're getting **"Could not find table 'public.users'"** because the database tables don't exist yet.

## The Solution - 3 Steps in Supabase

### Step 1: Open Supabase SQL Editor
1. Go to **https://supabase.com/dashboard**
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Run Table Creation (Copy & Paste This)
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);
```

### Step 3: Click "Run" 
- Hit the **"Run"** button to execute
- You should see success messages

## ✅ Test Login
Now try logging in again:
- **Email**: `nicholas.damato@astralfield.com`
- **Password**: `AstralField2024!`

Your user profile will be created automatically on first successful login!

## 🏆 What's Next
Once login works, you can create the full league structure through the app interface. The basic `users` table is all you need to get started.

**That's it! Your login should work now.** 🎉