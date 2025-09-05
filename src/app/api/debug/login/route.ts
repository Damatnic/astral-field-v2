import { NextResponse, NextRequest } from 'next/server'
import { neonServerless } from '@/lib/neon-serverless'
import bcrypt from 'bcryptjs'

// Debug endpoint to test login functionality
export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with a special debug key
    const isDev = process.env.NODE_ENV === 'development'
    const hasDebugKey = process.env.DEBUG_KEY === 'astral2025'
    
    if (!isDev && !hasDebugKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    console.log('Debug login attempt for:', email)

    // Get user from database
    const result = await neonServerless.selectSingle('users', {
      where: { email }
    })

    if (result.error || !result.data) {
      console.log('Debug: User not found in database')
      return NextResponse.json({ 
        success: false, 
        error: 'User not found',
        debug: {
          userFound: false,
          dbError: result.error?.message
        }
      })
    }

    const user = result.data
    console.log('Debug: User found:', user.email, 'has password hash:', !!user.password_hash)

    if (!user.password_hash) {
      return NextResponse.json({ 
        success: false, 
        error: 'No password hash found for user',
        debug: {
          userFound: true,
          hasPasswordHash: false
        }
      })
    }

    // Test password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    console.log('Debug: Password valid:', isPasswordValid)

    return NextResponse.json({
      success: isPasswordValid,
      debug: {
        userFound: true,
        hasPasswordHash: true,
        passwordValid: isPasswordValid,
        userId: user.id
      }
    })

  } catch (error: any) {
    console.error('Debug login error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message 
    }, { status: 500 })
  }
}