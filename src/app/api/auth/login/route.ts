import { NextResponse, NextRequest } from 'next/server'
import stackAuthService from '@/services/api/stackAuthService'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const result = await stackAuthService.login({ email, password })
    
    if (result.error) {
      return NextResponse.json(result, { status: 401 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Login API error:', error)
    return NextResponse.json({ 
      user: null,
      error: 'Internal server error'
    }, { status: 500 })
  }
}