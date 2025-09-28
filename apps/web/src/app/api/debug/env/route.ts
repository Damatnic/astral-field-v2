import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Guardian Security: Only allow in development or for authenticated admin users
    if (process.env.NODE_ENV === 'production') {
      const session = await auth()
      
      if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Environment debug disabled in production' },
          { status: 403 }
        )
      }
    }
    
    console.log('🔍 Environment Variable Debug Check')
    
    // Guardian Security: Only expose safe environment information
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET (PostgreSQL)' : 'NOT SET',
      DEMO_MODE: process.env.DEMO_MODE || 'false',
      // Remove sensitive credential exposure
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
      security: {
        environment: process.env.NODE_ENV,
        protection: 'enabled',
        note: 'Sensitive credentials are masked for security'
      },
      recommendation: missing.length > 0 
        ? 'Configure missing environment variables in deployment settings'
        : 'Environment appears correctly configured'
    })
    
  } catch (error: any) {
    console.error('Environment check failed:', error)
    return NextResponse.json({ 
      error: 'Environment check failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    }, { status: 500 })
  }
}