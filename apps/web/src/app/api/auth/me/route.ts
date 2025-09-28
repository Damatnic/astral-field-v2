import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json({ user: null, error: 'Not authenticated' }, { status: 401 })
    }

    // Return user data from session
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: (session.user as any).role,
        teamName: (session.user as any).teamName
      }
    })
  } catch (error) {
    console.error('Auth me endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error', user: null }, 
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'