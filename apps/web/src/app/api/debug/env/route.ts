import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Environment Variable Debug Check')
    
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
    }
    
    console.log('Environment variables:', envVars)
    
    // Check critical missing variables
    const missing = []
    if (!process.env.NEXTAUTH_SECRET) missing.push('NEXTAUTH_SECRET')
    if (!process.env.NEXTAUTH_URL) missing.push('NEXTAUTH_URL')
    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL')
    
    const status = missing.length === 0 ? 'OK' : 'MISSING_REQUIRED_VARS'
    
    return NextResponse.json({
      status,
      environment: envVars,
      missing,
      recommendation: missing.length > 0 
        ? 'Configure missing environment variables in Vercel dashboard'
        : 'Environment appears correctly configured'
    })
    
  } catch (error: any) {
    console.error('Environment check failed:', error)
    return NextResponse.json({ 
      error: 'Environment check failed', 
      details: error.message 
    }, { status: 500 })
  }
}