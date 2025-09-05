import { NextResponse, NextRequest } from 'next/server'
import { neonServerless } from '@/lib/neon-serverless'
import bcrypt from 'bcryptjs'

// API endpoint to set up demo users with password hashes
export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or with admin key
    const isDev = process.env.NODE_ENV === 'development'
    const hasAdminKey = request.headers.get('Authorization') === `Bearer ${process.env.ADMIN_SETUP_KEY || 'astral2025'}`
    
    // Also check for setup key in URL query parameter (for browser access)
    const url = new URL(request.url)
    const queryKey = url.searchParams.get('key')
    const hasQueryKey = queryKey === (process.env.ADMIN_SETUP_KEY || 'astral2025')
    
    if (!isDev && !hasAdminKey && !hasQueryKey) {
      return NextResponse.json({ 
        error: 'Unauthorized. Use Authorization: Bearer <ADMIN_SETUP_KEY> or ?key=<ADMIN_SETUP_KEY>',
        hint: 'Try visiting: /api/setup-users?key=astral2025'
      }, { status: 401 })
    }

    console.log('🚀 Setting up demo users...')

    const testUsers = [
      { email: 'nicholas.damato@astralfield.com', username: 'Nicholas D\'Amato', password: 'astral2025' },
      { email: 'brittany.bergum@astralfield.com', username: 'Brittany Bergum', password: 'astral2025' },
      { email: 'cason.minor@astralfield.com', username: 'Cason Minor', password: 'astral2025' },
      { email: 'david.jarvey@astralfield.com', username: 'David Jarvey', password: 'astral2025' },
      { email: 'jack.mccaigue@astralfield.com', username: 'Jack McCaigue', password: 'astral2025' },
      { email: 'jon.kornbeck@astralfield.com', username: 'Jon Kornbeck', password: 'astral2025' },
      { email: 'kaity.lorbiecki@astralfield.com', username: 'Kaity Lorbiecki', password: 'astral2025' },
      { email: 'larry.mccaigue@astralfield.com', username: 'Larry McCaigue', password: 'astral2025' },
      { email: 'nick.hartley@astralfield.com', username: 'Nick Hartley', password: 'astral2025' },
      { email: 'renee.mccaigue@astralfield.com', username: 'Renee McCaigue', password: 'astral2025' }
    ]

    let createdCount = 0
    let updatedCount = 0
    const results = []

    for (const user of testUsers) {
      try {
        // Hash the password
        const passwordHash = await bcrypt.hash(user.password, 10)
        
        // Check if user already exists
        const existingUser = await neonServerless.selectSingle('users', {
          where: { email: user.email }
        })
        
        if (existingUser.data) {
          // Update existing user with password hash
          const updateResult = await neonServerless.update('users', 
            { password_hash: passwordHash }, 
            { email: user.email }
          )
          
          if (updateResult.error) {
            throw updateResult.error
          }
          
          results.push({ email: user.email, status: 'updated', id: existingUser.data.id })
          updatedCount++
        } else {
          // Create new user
          const createResult = await neonServerless.insert('users', {
            email: user.email,
            username: user.username,
            password_hash: passwordHash,
            stack_user_id: null
          })
          
          if (createResult.error) {
            throw createResult.error
          }
          
          results.push({ email: user.email, status: 'created', id: createResult.data?.id })
          createdCount++
        }
        
      } catch (userError: any) {
        console.error(`Error processing user ${user.email}:`, userError)
        results.push({ email: user.email, status: 'error', error: userError.message })
      }
    }

    // Final verification - count total users
    const allUsersResult = await neonServerless.select('users', {})
    const totalUsers = allUsersResult.data?.length || 0

    console.log(`✅ Setup complete: Created ${createdCount}, Updated ${updatedCount}, Total: ${totalUsers}`)

    return NextResponse.json({
      success: true,
      message: 'Demo users setup complete',
      summary: {
        created: createdCount,
        updated: updatedCount,
        total: totalUsers
      },
      users: results,
      testCredentials: {
        email: 'nicholas.damato@astralfield.com',
        password: 'astral2025',
        note: 'All @astralfield.com emails use password: astral2025'
      }
    })

  } catch (error: any) {
    console.error('Setup users error:', error)
    return NextResponse.json({ 
      error: 'Failed to set up users', 
      message: error.message 
    }, { status: 500 })
  }
}

// Also allow GET requests for easier browser access
export async function GET(request: NextRequest) {
  return POST(request)
}