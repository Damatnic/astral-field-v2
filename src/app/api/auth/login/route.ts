import { NextResponse, NextRequest } from 'next/server'
import { neonDb } from '@/lib/neon-database'
import bcrypt from 'bcryptjs'
import { ensureInitialized } from '@/lib/auto-init'

export async function POST(request: NextRequest) {
  try {
    // Auto-initialize demo users if they don't exist
    await ensureInitialized()
    
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Check if user exists in our database
    const result = await neonDb.selectSingle('users', {
      where: { email }
    })

    if (result.error || !result.data) {
      return NextResponse.json({ 
        user: null, 
        error: 'Invalid email or password' 
      }, { status: 401 })
    }

    const user = result.data

    // Check if user has a password set
    if (!user.password_hash) {
      return NextResponse.json({ 
        user: null, 
        error: 'Password not set for this user' 
      }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    
    if (!isPasswordValid) {
      return NextResponse.json({ 
        user: null, 
        error: 'Invalid email or password' 
      }, { status: 401 })
    }

    // Return user without password hash for security
    const { password_hash, ...userWithoutPassword } = user
    return NextResponse.json({
      user: { ...userWithoutPassword, password_hash: null },
      error: null
    })

  } catch (error: any) {
    console.error('Login API error:', error)
    return NextResponse.json({ 
      user: null,
      error: 'Internal server error'
    }, { status: 500 })
  }
}