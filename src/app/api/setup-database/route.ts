import { NextResponse } from 'next/server'
import { neonServerless } from '@/lib/neon-serverless'

export async function POST() {
  try {
    console.log('🚀 Setting up Neon database tables...')
    
    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        stack_user_id TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    // Create players table
    const createPlayersTable = `
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
      )
    `

    // Create leagues table
    const createLeaguesTable = `
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
      )
    `

    // Create teams table
    const createTeamsTable = `
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
      )
    `

    // Enable UUID extension
    await neonServerless.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    // Create tables
    await neonServerless.query(createUsersTable)
    await neonServerless.query(createPlayersTable)
    await neonServerless.query(createLeaguesTable)
    await neonServerless.query(createTeamsTable)

    // Add password_hash column if it doesn't exist
    try {
      await neonServerless.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT')
    } catch (error) {
      console.log('password_hash column may already exist:', error)
    }

    // Get table count to verify
    const tablesResult = await neonServerless.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully!',
      tables: tablesResult.data?.map(row => row.table_name) || []
    })

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check database status
    const tablesResult = await neonServerless.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    const usersCount = await neonServerless.query('SELECT COUNT(*) FROM users')
    const playersCount = await neonServerless.query('SELECT COUNT(*) FROM players')

    return NextResponse.json({
      success: true,
      tables: tablesResult.data?.map(row => row.table_name) || [],
      counts: {
        users: parseInt(usersCount.data?.[0]?.count || '0'),
        players: parseInt(playersCount.data?.[0]?.count || '0')
      }
    })

  } catch (error) {
    console.error('❌ Failed to get database status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}