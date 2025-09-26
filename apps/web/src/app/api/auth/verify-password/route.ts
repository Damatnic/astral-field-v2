import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { password, hashedPassword } = await request.json()
    
    if (!password || !hashedPassword) {
      return NextResponse.json({ valid: false, error: 'Missing parameters' }, { status: 400 })
    }
    
    const isValid = await bcrypt.compare(password, hashedPassword)
    
    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error('Password verification error:', error)
    return NextResponse.json({ valid: false, error: 'Verification failed' }, { status: 500 })
  }
}