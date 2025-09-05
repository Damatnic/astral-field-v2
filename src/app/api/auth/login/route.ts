import { NextResponse, NextRequest } from 'next/server'
import { neonServerless } from '@/lib/neon-serverless'
import bcrypt from 'bcryptjs'
import { ensureInitialized } from '@/lib/auto-init'
import { handleApiError, CommonErrors, validateRequiredFields } from '@/lib/api-error-handler'

export const POST = handleApiError(async (request: NextRequest) => {
  // Auto-initialize demo users if they don't exist
  await ensureInitialized()
  
  const body = await request.json()
  
  // Validate required fields
  validateRequiredFields(body, ['email', 'password'])
  
  const { email, password } = body

  // Check if user exists in our database
  const result = await neonServerless.selectSingle('users', {
    where: { email }
  })

  if (result.error || !result.data) {
    throw CommonErrors.Unauthorized('Invalid email or password')
  }

  const user = result.data

  // Check if user has a password set
  if (!user.password_hash) {
    throw CommonErrors.Unauthorized('Password not set for this user')
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash)
  
  if (!isPasswordValid) {
    throw CommonErrors.Unauthorized('Invalid email or password')
  }

  // Return user without password hash for security
  const { password_hash, ...userWithoutPassword } = user
  return NextResponse.json({
    user: { ...userWithoutPassword, password_hash: null },
    error: null
  })
})