import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma, redis, logger } from '../server'
import { validateRequest, validateMultiple } from '../middleware/validation'
import {
  createUserSchema,
  loginSchema,
  changePasswordSchema,
  emailSchema
} from '../schemas'

const router = Router()

// Register new user
router.post('/register', validateRequest(createUserSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName, username, avatar } = req.validated

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        field: existingUser.email === email ? 'email' : 'username',
        timestamp: new Date().toISOString()
      })
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username,
        avatar,
        role: 'USER',
        isActive: true,
        emailVerified: false
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        role: true,
        createdAt: true
      }
    })

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // Store session in Redis
    await redis.setex(`session:${user.id}`, 7 * 24 * 60 * 60, token)

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      username: user.username
    })

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
      expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    })

  } catch (error) {
    logger.error('Registration failed', error)
    res.status(500).json({
      error: 'Registration failed',
      timestamp: new Date().toISOString()
    })
  }
})

// User login
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validated

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        role: true,
        isActive: true,
        loginAttempts: true,
        lockedUntil: true
      }
    })

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      })
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      return res.status(423).json({
        error: 'Account temporarily locked',
        message: 'Too many failed login attempts',
        lockedUntil: user.lockedUntil,
        timestamp: new Date().toISOString()
      })
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account deactivated',
        timestamp: new Date().toISOString()
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      // Increment login attempts
      const attempts = (user.loginAttempts || 0) + 1
      const updateData: any = { loginAttempts: attempts }

      // Lock account after 5 failed attempts
      if (attempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      })

      return res.status(401).json({
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      })
    }

    // Reset login attempts on successful login
    if (user.loginAttempts && user.loginAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date()
        }
      })
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // Store session in Redis
    await redis.setex(`session:${user.id}`, 7 * 24 * 60 * 60, token)

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatar: user.avatar,
      role: user.role
    }

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email
    })

    res.json({
      message: 'Login successful',
      user: userResponse,
      token,
      expiresIn: 7 * 24 * 60 * 60 * 1000
    })

  } catch (error) {
    logger.error('Login failed', error)
    res.status(500).json({
      error: 'Login failed',
      timestamp: new Date().toISOString()
    })
  }
})

// User logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ message: 'Logged out' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.decode(token) as any

    if (decoded && decoded.userId) {
      // Remove session from Redis
      await redis.del(`session:${decoded.userId}`)
      
      // Optionally blacklist the token
      await redis.setex(`blacklist:${token}`, 7 * 24 * 60 * 60, 'true')
    }

    res.json({ message: 'Logged out successfully' })

  } catch (error) {
    logger.error('Logout error', error)
    res.json({ message: 'Logged out' })
  }
})

// Change password
router.post('/change-password', validateRequest(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.validated
    
    // This would typically require authentication middleware
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      })
    }

    const token = authHeader.substring(7)
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid token',
        timestamp: new Date().toISOString()
      })
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        password: true
      }
    })

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        timestamp: new Date().toISOString()
      })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Current password is incorrect',
        timestamp: new Date().toISOString()
      })
    }

    // Hash new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date()
      }
    })

    // Invalidate all existing sessions
    await redis.del(`session:${user.id}`)

    logger.info('Password changed successfully', {
      userId: user.id
    })

    res.json({
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Password change failed', error)
    res.status(500).json({
      error: 'Password change failed',
      timestamp: new Date().toISOString()
    })
  }
})

// Request password reset
router.post('/forgot-password', validateRequest(z.object({ email: emailSchema })), async (req, res) => {
  try {
    const { email } = req.validated

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true }
    })

    // Always return success to prevent email enumeration
    const response = {
      message: 'If an account with that email exists, a password reset link has been sent.',
      timestamp: new Date().toISOString()
    }

    if (!user) {
      return res.json(response)
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    // Store reset token in Redis with 1 hour expiration
    await redis.setex(`password-reset:${user.id}`, 60 * 60, resetToken)

    // In a real application, you would send an email here
    logger.info('Password reset requested', {
      userId: user.id,
      email: user.email
    })

    res.json(response)

  } catch (error) {
    logger.error('Password reset request failed', error)
    res.status(500).json({
      error: 'Password reset request failed',
      timestamp: new Date().toISOString()
    })
  }
})

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        timestamp: new Date().toISOString()
      })
    }

    const token = authHeader.substring(7)
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid token',
        timestamp: new Date().toISOString()
      })
    }

    // Check if session exists in Redis
    const session = await redis.get(`session:${decoded.userId}`)
    if (!session) {
      return res.status(401).json({
        error: 'Session expired',
        timestamp: new Date().toISOString()
      })
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`)
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token invalidated',
        timestamp: new Date().toISOString()
      })
    }

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        role: true,
        isActive: true
      }
    })

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'User not found or inactive',
        timestamp: new Date().toISOString()
      })
    }

    res.json({
      valid: true,
      user,
      expiresAt: new Date(decoded.exp * 1000)
    })

  } catch (error) {
    logger.error('Token verification failed', error)
    res.status(500).json({
      error: 'Token verification failed',
      timestamp: new Date().toISOString()
    })
  }
})

export { router as authRoutes }