# 🗄️ Database Setup Instructions

## Step 1: Create Database Schema

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `udqlhdagqjbhkswzgitj`

2. **Run the SQL Schema**
   - Click on **"SQL Editor"** in the left sidebar
   - Click **"New Query"**
   - Copy the contents of `supabase/schema.sql` 
   - Paste it into the SQL editor
   - Click **"Run"** to execute

## Step 2: Verify Tables Created

After running the schema, you should see these tables in your **"Table Editor"**:
- ✅ `users`
- ✅ `leagues` 
- ✅ `teams`
- ✅ `players`
- ✅ `rosters`
- ✅ `lineup_entries`
- ✅ `draft_picks`
- ✅ `waiver_claims`
- ✅ `trades`
- ✅ `player_projections`
- ✅ `player_stats`

## Step 3: Populate Initial Data

Run this command to add players and league data:
```bash
node scripts/setup-database.js
```

## Step 4: Test Login

Now you can test login with:
- **Email**: `nicholas.damato@astralfield.com`
- **Password**: `AstralField2024!`

The user profile will be automatically created on first successful login.

## ⚠️ Important Notes

- **RLS (Row Level Security)** is enabled for data protection
- **Authentication** uses Supabase Auth with email/password
- **User profiles** are created automatically when users first sign in
- **All 10 user accounts** are already created in Supabase Auth

## 🔧 Troubleshooting

If you get **"Could not find table"** errors:
1. Make sure you ran the `schema.sql` file completely
2. Check the Supabase logs for any SQL errors
3. Verify all tables appear in the Table Editor

## 🚀 What Happens Next

Once the database is set up:
1. ✅ Users can log in with their credentials
2. ✅ User profiles are auto-created on first login  
3. ✅ You can create the league and teams through the app
4. ✅ Auto-draft functionality will work properly

Your fantasy football league will be fully functional! 🏈