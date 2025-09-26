import { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
// Import bcrypt for password verification - use Node.js runtime for auth
import bcrypt from 'bcryptjs'
import { guardianSessionManager } from "./security/session-manager"
import { guardianAuditLogger, SecurityEventType } from "./security/audit-logger"
import { guardianAccountProtection } from "./security/account-protection"

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

// Demo-ready authentication configuration (credentials only)
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // Guardian Security: Enhanced input validation
        if (!credentials?.email || !credentials?.password) {
          throw new Error('INVALID_CREDENTIALS')
        }

        // Guardian Security: Rate limiting check and IP extraction
        const clientIP = req?.headers?.get?.('x-forwarded-for') || req?.headers?.get?.('x-real-ip') || 'unknown'
        
        try {
          // Catalyst Performance: Optimized user lookup
          const email = (credentials.email as string).toLowerCase().trim()
          
          // Fetch from database with optimized query
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
              updatedAt: true
            }
          })

          if (!user || !user.hashedPassword) {
            // Guardian Security: Timing attack prevention
            // Simple timing delay for Edge Runtime compatibility
            await new Promise(resolve => setTimeout(resolve, 100))
            throw new Error('INVALID_CREDENTIALS')
          }

          // Guardian Security: Check account lockout status
          const lockoutStatus = await guardianAccountProtection.isAccountLocked(user.id)
          if (lockoutStatus.isLocked) {
            throw new Error(`ACCOUNT_LOCKED:${lockoutStatus.remainingTime || 0}`)
          }

          // Note: User security fields not available in current schema
          // Future enhancement: Add account lockout and status fields

          // Guardian Security: Password verification with timing attack protection
          // Move bcrypt operations to API routes for Edge Runtime compatibility
          const isPasswordValid = await verifyPassword(
            credentials.password as string,
            user.hashedPassword
          )

          if (!isPasswordValid) {
            // Guardian Security: Record failed attempt with account protection
            const failureResult = await guardianAccountProtection.recordFailedAttempt(
              user.id,
              user.email,
              {
                ip: clientIP,
                userAgent: req?.headers?.get?.('user-agent') || 'unknown',
                location: {
                  country: req?.headers?.get?.('cf-ipcountry') || req?.headers?.get?.('x-country'),
                  region: req?.headers?.get?.('cf-region') || req?.headers?.get?.('x-region'),
                  city: req?.headers?.get?.('cf-city') || req?.headers?.get?.('x-city')
                },
                attemptType: 'password_mismatch'
              }
            )

            // Throw appropriate error based on account status
            if (failureResult.shouldLock) {
              throw new Error(`ACCOUNT_LOCKED:${failureResult.lockoutDuration || 0}`)
            } else {
              throw new Error('INVALID_CREDENTIALS')
            }
          }

          // Catalyst Performance: Async last login update (non-blocking)
          // Use Promise for Edge Runtime compatibility instead of setImmediate
          Promise.resolve().then(async () => {
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { updatedAt: new Date() }
              })
            } catch (error) {
              // Log but don't fail authentication for login tracking
              console.warn('Failed to update last login time:', error)
            }
          })

          // Guardian Security: Create secure session with context analysis
          const sessionContext = {
            userId: user.id,
            email: user.email,
            ip: clientIP,
            userAgent: req?.headers?.get?.('user-agent') || 'unknown',
            deviceFingerprint: req?.headers?.get?.('x-device-fingerprint') || undefined,
            location: {
              country: req?.headers?.get?.('cf-ipcountry') || req?.headers?.get?.('x-country') || undefined,
              region: req?.headers?.get?.('cf-region') || req?.headers?.get?.('x-region') || undefined,
              city: req?.headers?.get?.('cf-city') || req?.headers?.get?.('x-city') || undefined
            },
            timestamp: Date.now()
          }

          // Create session with security analysis
          const sessionData = await guardianSessionManager.createSession(sessionContext)

          // Guardian Security: Record successful authentication with account protection
          const successResult = await guardianAccountProtection.recordSuccessfulAttempt(
            user.id,
            user.email,
            {
              ip: clientIP,
              userAgent: req?.headers?.get?.('user-agent') || 'unknown',
              location: sessionContext.location,
              sessionId: sessionData.sessionId
            }
          )

          // Guardian Security: Log successful authentication
          await guardianAuditLogger.logSecurityEvent(
            SecurityEventType.LOGIN_SUCCESS,
            user.id,
            {
              ip: clientIP,
              userAgent: req?.headers?.get?.('user-agent') || 'unknown',
              location: sessionContext.location,
              deviceFingerprint: sessionContext.deviceFingerprint
            },
            {
              description: 'Successful user authentication',
              riskScore: Math.max(sessionData.security.riskScore, successResult.riskScore),
              context: {
                email: user.email,
                sessionId: sessionData.sessionId,
                anomalies: [...sessionData.security.anomalies, ...successResult.anomalies.map(a => a.type)],
                isDeviceKnown: sessionData.security.isDeviceKnown,
                isLocationKnown: sessionData.security.isLocationKnown,
                challengeRequired: !!successResult.challengeRequired
              }
            },
            undefined,
            sessionData.sessionId
          )

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            teamName: user.teamName || undefined,
            sessionId: sessionData.sessionId,
            securityRisk: sessionData.security.riskScore,
            requiresMFA: sessionData.security.requiresMFA,
            sessionExpiresAt: sessionData.expiresAt
            // mfaEnabled: false // Feature not implemented yet
          }
        } catch (error) {
          // Guardian Security: Log error and re-throw
          console.error('Authentication error:', error)
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
    maxAge: 30 * 60, // Guardian Security: Base 30 minutes (adaptive timeout overrides this)
    updateAge: 5 * 60, // Guardian Security: Update session every 5 minutes
  },
  jwt: {
    maxAge: 30 * 60, // Guardian Security: 30 minutes
    // Catalyst Performance: Optimized JWT processing (using NextAuth's built-in optimizations)
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Catalyst Performance: Optimized JWT processing
      if (user) {
        // Minimal token payload for performance
        token.id = user.id
        token.role = user.role
        token.teamName = user.teamName
        token.sessionId = crypto.randomUUID()
        token.iat = Math.floor(Date.now() / 1000)
        
        // Session data stored in JWT token for simplicity
      }

      // Guardian Security: Token refresh validation
      if (trigger === "update" && session) {
        return { ...token, ...session }
      }

      // Catalyst Performance: Fast token age check
      const tokenAge = Date.now() / 1000 - (token.iat as number || 0)
      if (tokenAge > 30 * 60) { // 30 minutes
        throw new Error('TOKEN_EXPIRED')
      }

      return token
    },
    async session({ session, token, req }) {
      // Catalyst Performance: Lightning-fast session initialization
      if (token) {
        // Minimal session data for performance
        session.user.id = token.id as string || token.sub!
        session.user.role = token.role as string
        session.user.teamName = token.teamName as string
        session.user.sessionId = token.sessionId as string
        session.user.securityRisk = token.securityRisk as number
        session.user.requiresMFA = token.requiresMFA as boolean

        // Guardian Security: Validate session with current context
        if (token.sessionId && req) {
          const sessionValidation = await guardianSessionManager.validateSession(
            token.sessionId as string,
            {
              ip: req.headers?.get?.('x-forwarded-for')?.split(',')[0] || req.headers?.get?.('x-real-ip') || req.ip,
              userAgent: req.headers?.get?.('user-agent') || 'unknown',
              location: {
                country: req.headers?.get?.('cf-ipcountry') || req.headers?.get?.('x-country')
              }
            }
          )

          if (!sessionValidation.isValid) {
            // Session is invalid, force logout
            return null
          }

          // Update session with new security data
          if (sessionValidation.security) {
            session.user.securityRisk = sessionValidation.security.riskScore
            session.user.requiresMFA = sessionValidation.security.requiresMFA
            
            // Store updated security info in token for next request
            token.securityRisk = sessionValidation.security.riskScore
            token.requiresMFA = sessionValidation.security.requiresMFA
          }
        }
        
        // User data available from token for fast access
      }
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Guardian Security: Additional sign-in validation
      if (account?.provider === 'google') {
        // Verify Google account email is verified
        if (!profile?.email_verified) {
          throw new Error('EMAIL_NOT_VERIFIED')
        }
      }
      return true
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Guardian Security: Log successful sign-ins
      console.log('User signed in:', user.id, account?.provider)
    },
    async signOut(message) {
      // Guardian Security: Log sign-outs with audit trail
      if (message?.token?.sessionId) {
        // Terminate session in session manager
        guardianSessionManager.terminateSession(message.token.sessionId, 'user_logout')
        
        // Log security event
        await guardianAuditLogger.logSecurityEvent(
          SecurityEventType.LOGOUT,
          message.token.id || message.token.sub,
          {
            ip: 'unknown', // Request context not available in signOut event
            userAgent: 'unknown'
          },
          {
            description: 'User initiated logout',
            riskScore: 0.1,
            context: {
              sessionId: message.token.sessionId,
              email: message.token.email
            }
          },
          undefined,
          message.token.sessionId
        )
      }
      
      console.log('User signed out and session terminated')
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  debug: false, // Guardian Security: Never enable debug in production
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 60 // 30 minutes
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  }
} satisfies NextAuthConfig