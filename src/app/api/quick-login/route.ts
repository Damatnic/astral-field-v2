import { NextResponse } from 'next/server'
import { neonServerless } from '@/lib/neon-serverless'

const demoUsers = [
  { name: 'Alice Johnson', email: 'user1@demo.com', id: 1 },
  { name: 'Bob Smith', email: 'user2@demo.com', id: 2 },
  { name: 'Carol Davis', email: 'user3@demo.com', id: 3 },
  { name: 'David Wilson', email: 'user4@demo.com', id: 4 },
  { name: 'Emma Brown', email: 'user5@demo.com', id: 5 },
  { name: 'Frank Miller', email: 'user6@demo.com', id: 6 },
  { name: 'Grace Taylor', email: 'user7@demo.com', id: 7 },
  { name: 'Henry Clark', email: 'user8@demo.com', id: 8 },
  { name: 'Ivy Martinez', email: 'user9@demo.com', id: 9 },
  { name: 'Jack Thompson', email: 'user10@demo.com', id: 10 }
]

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    
    if (!userId || userId < 1 || userId > 10) {
      return NextResponse.json({
        error: 'Invalid user ID. Must be 1-10',
        availableUsers: demoUsers
      }, { status: 400 })
    }

    const demoUser = demoUsers.find(u => u.id === userId)
    if (!demoUser) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 })
    }

    // Try to find the user in database
    const result = await neonServerless.selectSingle('users', {
      eq: { email: demoUser.email }
    })

    if (result.error) {
      return NextResponse.json({
        error: 'Database error. Please create demo users first.',
        hint: 'Visit /api/create-demo-users first'
      }, { status: 500 })
    }

    if (!result.data) {
      return NextResponse.json({
        error: 'Demo users not found in database. Please create them first.',
        hint: 'Visit /api/create-demo-users first'
      }, { status: 404 })
    }

    // Successful login - return user data
    return NextResponse.json({
      success: true,
      message: `Welcome ${demoUser.name}!`,
      user: {
        id: result.data.id,
        email: result.data.email,
        username: result.data.username
      },
      loginTime: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Quick login failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    availableUsers: demoUsers,
    instructions: 'POST with {"userId": 1} to login as Alice, {"userId": 2} for Bob, etc.',
    note: 'Users 1-10 are available for instant login'
  })
}