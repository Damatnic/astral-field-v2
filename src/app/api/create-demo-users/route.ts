import { NextResponse } from 'next/server'
import { neonServerless } from '@/lib/neon-serverless'

export async function POST() {
  try {
    const demoUsers = [
      { email: 'nicholas.damato@astralfield.com', username: 'Nicholas D\'Amato', password: '1234' },
      { email: 'brittany.bergum@astralfield.com', username: 'Brittany Bergum', password: '2345' },
      { email: 'cason.minor@astralfield.com', username: 'Cason Minor', password: '3456' },
      { email: 'david.jarvey@astralfield.com', username: 'David Jarvey', password: '4567' },
      { email: 'jack.mccaigue@astralfield.com', username: 'Jack McCaigue', password: '5678' },
      { email: 'jon.kornbeck@astralfield.com', username: 'Jon Kornbeck', password: '6789' },
      { email: 'kaity.lorbiecki@astralfield.com', username: 'Kaity Lorbiecki', password: '7890' },
      { email: 'larry.mccaigue@astralfield.com', username: 'Larry McCaigue', password: '8901' },
      { email: 'nick.hartley@astralfield.com', username: 'Nick Hartley', password: '9012' },
      { email: 'renee.mccaigue@astralfield.com', username: 'Renee McCaigue', password: '0123' }
    ]

    const results = []
    let created = 0
    let updated = 0

    for (const user of demoUsers) {
      try {
        // Check if user exists
        const existingResult = await neonServerless.selectSingle('users', {
          eq: { email: user.email }
        })

        if (existingResult.data) {
          // Update existing user
          const updateResult = await neonServerless.update('users', {
            username: user.username,
            password_hash: user.password, // Simple storage for demo
            updated_at: new Date().toISOString()
          }, { email: user.email })

          if (updateResult.error) {
            results.push({ email: user.email, status: 'update_error', error: updateResult.error })
          } else {
            results.push({ email: user.email, status: 'updated' })
            updated++
          }
        } else {
          // Create new user
          const insertResult = await neonServerless.insert('users', {
            email: user.email,
            username: user.username,
            password_hash: user.password, // Simple storage for demo
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

          if (insertResult.error) {
            results.push({ email: user.email, status: 'create_error', error: insertResult.error })
          } else {
            results.push({ email: user.email, status: 'created' })
            created++
          }
        }
      } catch (error) {
        results.push({ 
          email: user.email, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Demo users setup complete! Created ${created}, Updated ${updated}`,
      summary: { created, updated, total: created + updated },
      results,
      loginCredentials: {
        users: [
          { name: 'Alice Johnson', email: 'user1@demo.com', password: '1234' },
          { name: 'Bob Smith', email: 'user2@demo.com', password: '2345' },
          { name: 'Carol Davis', email: 'user3@demo.com', password: '3456' },
          { name: 'David Wilson', email: 'user4@demo.com', password: '4567' },
          { name: 'Emma Brown', email: 'user5@demo.com', password: '5678' },
          { name: 'Frank Miller', email: 'user6@demo.com', password: '6789' },
          { name: 'Grace Taylor', email: 'user7@demo.com', password: '7890' },
          { name: 'Henry Clark', email: 'user8@demo.com', password: '8901' },
          { name: 'Ivy Martinez', email: 'user9@demo.com', password: '9012' },
          { name: 'Jack Thompson', email: 'user10@demo.com', password: '0123' }
        ],
        note: 'Simple 4-digit passwords for quick testing - just click a name to login!'
      }
    })

  } catch (error) {
    console.error('❌ Failed to create demo users:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // List all current users
    const result = await neonServerless.select('users', {
      order: { column: 'created_at', ascending: false }
    })

    return NextResponse.json({
      success: true,
      users: result.data || [],
      count: result.data?.length || 0
    })
  } catch (error) {
    console.error('❌ Failed to get users:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}