import { NextResponse } from 'next/server'
import { neonDb } from '@/lib/neon-database'

const testUsers = [
  { email: 'nicholas.damato@astralfield.com', username: 'Nicholas D\'Amato' },
  { email: 'brittany.bergum@astralfield.com', username: 'Brittany Bergum' },
  { email: 'cason.minor@astralfield.com', username: 'Cason Minor' },
  { email: 'david.jarvey@astralfield.com', username: 'David Jarvey' },
  { email: 'jack.mccaigue@astralfield.com', username: 'Jack McCaigue' },
  { email: 'jon.kornbeck@astralfield.com', username: 'Jon Kornbeck' },
  { email: 'kaity.lorbiecki@astralfield.com', username: 'Kaity Lorbiecki' },
  { email: 'larry.mccaigue@astralfield.com', username: 'Larry McCaigue' },
  { email: 'nick.hartley@astralfield.com', username: 'Nick Hartley' },
  { email: 'renee.mccaigue@astralfield.com', username: 'Renee McCaigue' }
]

export async function POST() {
  try {
    console.log('🚀 Creating user profiles in Netlify Neon database...')
    
    const results = {
      created: 0,
      existing: 0,
      errors: 0,
      users: [] as any[]
    }

    for (const user of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await neonDb.selectSingle('users', {
          where: { email: user.email }
        })

        if (existingUser.data) {
          console.log(`⚠️ User already exists: ${user.username}`)
          results.existing++
          results.users.push({ ...user, status: 'existing' })
        } else {
          // Create new user
          const newUser = await neonDb.insert('users', {
            email: user.email,
            username: user.username,
            stack_user_id: null,
            avatar_url: null
          })

          if (newUser.data) {
            console.log(`✅ Created user: ${user.username}`)
            results.created++
            results.users.push({ ...user, status: 'created', id: newUser.data.id })
          } else {
            console.error(`❌ Failed to create user: ${user.username}`)
            results.errors++
            results.users.push({ ...user, status: 'error', error: newUser.error })
          }
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.username}:`, error)
        results.errors++
        results.users.push({ ...user, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Profile setup complete! Created: ${results.created}, Existing: ${results.existing}, Errors: ${results.errors}`,
      results
    })

  } catch (error) {
    console.error('❌ Profile setup failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get all users from database
    const result = await neonDb.select('users', {
      select: 'id, email, username, stack_user_id, created_at'
    })

    if (result.error) {
      throw new Error(result.error.message)
    }

    return NextResponse.json({
      success: true,
      count: result.data?.length || 0,
      users: result.data
    })

  } catch (error) {
    console.error('❌ Failed to get users:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}