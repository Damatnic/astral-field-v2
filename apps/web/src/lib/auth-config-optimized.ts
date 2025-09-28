import { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from 'bcryptjs'

// Guardian Security: Simplified yet secure auth configuration for better compatibility
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
  console.error('🚨 CRITICAL: AUTH_SECRET must be at least 32 characters long')
  throw new Error('Invalid AUTH_SECRET: Must be at least 32 characters for security')
}

const AUTH_CONFIG = {
  secret: AUTH_SECRET,
  url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
  debug: process.env.AUTH_DEBUG === 'true' && process.env.NODE_ENV === 'development',
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400', 10), // 24 hours (extended for better UX)
  jwtMaxAge: parseInt(process.env.JWT_MAX_AGE || '86400', 10), // 24 hours
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

// Guardian Security: Optimized authentication configuration
export const authConfigOptimized = {
  secret: AUTH_CONFIG.secret,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Enhanced input validation
        if (!credentials?.email || !credentials?.password) {
          console.warn('Missing credentials in authorization attempt')
          throw new Error('INVALID_CREDENTIALS')
        }

        try {
          const email = (credentials.email as string).toLowerCase().trim()
          
          // Optimized user lookup
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              role: true,
              teamName: true,
              hashedPassword: true,
              loginAttempts: true,
              lockedUntil: true
            }
          })

          if (!user || !user.hashedPassword) {
            // Timing attack prevention
            await new Promise(resolve => setTimeout(resolve, 100))
            throw new Error('INVALID_CREDENTIALS')
          }

          // Basic account lockout check (simplified from Guardian system)
          if (user.lockedUntil && new Date() < user.lockedUntil) {
            const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000)
            throw new Error(`ACCOUNT_LOCKED:${remainingTime}`)
          }

          // Password verification
          const isPasswordValid = await verifyPassword(
            credentials.password as string,
            user.hashedPassword
          )

          if (!isPasswordValid) {
            // Update failed attempts (simplified)
            const newAttempts = (user.loginAttempts || 0) + 1
            const shouldLock = newAttempts >= 5

            await prisma.user.update({
              where: { id: user.id },
              data: {
                loginAttempts: newAttempts,
                lockedUntil: shouldLock 
                  ? new Date(Date.now() + 15 * 60 * 1000) // 15 minutes lockout
                  : undefined
              }
            })

            if (shouldLock) {
              throw new Error('ACCOUNT_LOCKED:900') // 15 minutes in seconds
            }
            
            throw new Error('INVALID_CREDENTIALS')
          }

          // Reset failed attempts on successful login
          if (user.loginAttempts && user.loginAttempts > 0) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                loginAttempts: 0,
                lockedUntil: null,
                updatedAt: new Date()
              }
            })
          }

          // Return user object for session
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            teamName: user.teamName || undefined
          }
        } catch (error) {
          console.error('Authentication error:', error?.message || error)
          if (error instanceof Error) {
            throw error
          }
          throw new Error('AUTHENTICATION_FAILED')
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: AUTH_CONFIG.sessionMaxAge,
    updateAge: Math.floor(AUTH_CONFIG.sessionMaxAge / 4), // Update every 1/4 of session duration
  },
  jwt: {
    maxAge: AUTH_CONFIG.jwtMaxAge,
  },
  callbacks: {
    async jwt({ token, user }) {
      // Store user data in JWT on sign in
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.teamName = (user as any).teamName
        token.iat = Math.floor(Date.now() / 1000)
      }

      // Check token age for security
      const tokenAge = Date.now() / 1000 - (token.iat as number || 0)
      if (tokenAge > AUTH_CONFIG.jwtMaxAge) {
        console.warn(`Token expired after ${tokenAge}s`)
        return null // Force re-authentication
      }

      return token
    },
    async session({ session, token }) {
      // Add user data to session from JWT
      if (token && token.id) {
        (session.user as any).id = token.id as string
        (session.user as any).role = token.role as string
        (session.user as any).teamName = token.teamName as string
      }
      return session
    },
    async signIn({ user, account }) {
      // Additional sign-in validation
      if (account?.provider === 'google' && user.email && !user.emailVerified) {
        return false
      }
      return true
    }
  },
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.id}`)
    },
    async signOut({ token }) {
      if (token?.id) {
        console.log(`User signed out: ${token.id}`)
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  debug: AUTH_CONFIG.debug,
  trustHost: AUTH_CONFIG.trustHost,
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax', // Changed from 'strict' for better compatibility
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: AUTH_CONFIG.sessionMaxAge
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.callback-url' 
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Host-next-auth.csrf-token' 
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  }
} satisfies NextAuthConfig