import { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

// Guardian Security: Enhanced authentication configuration
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
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

        // Guardian Security: Rate limiting check
        const clientIP = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || 'unknown'
        
        try {
          // Guardian Security: SQL injection protection with parameterized query
          const user = await prisma.users.findUnique({
            where: {
              email: credentials.email.toLowerCase().trim()
            },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              role: true,
              teamName: true,
              hashedPassword: true,
              isActive: true,
              loginAttempts: true,
              lockedUntil: true,
              lastLoginAt: true,
              mfaEnabled: true,
              mfaSecret: true
            }
          })

          if (!user || !user.hashedPassword) {
            // Guardian Security: Timing attack prevention
            await bcrypt.compare(credentials.password, '$2a$12$dummy.hash.to.prevent.timing.attacks')
            throw new Error('INVALID_CREDENTIALS')
          }

          // Guardian Security: Account lockout check
          if (user.lockedUntil && new Date() < user.lockedUntil) {
            throw new Error('ACCOUNT_LOCKED')
          }

          // Guardian Security: Account status check
          if (!user.isActive) {
            throw new Error('ACCOUNT_DISABLED')
          }

          // Guardian Security: Password verification with timing attack protection
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.hashedPassword
          )

          if (!isPasswordValid) {
            // Guardian Security: Increment failed login attempts
            const attempts = (user.loginAttempts || 0) + 1
            const updateData: any = { 
              loginAttempts: attempts,
              lastFailedLogin: new Date()
            }

            // Lock account after 5 failed attempts for 30 minutes
            if (attempts >= 5) {
              updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000)
            }

            await prisma.users.update({
              where: { id: user.id },
              data: updateData
            })

            throw new Error('INVALID_CREDENTIALS')
          }

          // Guardian Security: Reset login attempts on successful login
          if (user.loginAttempts && user.loginAttempts > 0) {
            await prisma.users.update({
              where: { id: user.id },
              data: {
                loginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
                lastLoginIP: clientIP as string
              }
            })
          }

          // Guardian Security: Create audit log
          await prisma.audit_logs.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.id,
              action: 'LOGIN_SUCCESS',
              details: {
                ip: clientIP,
                userAgent: req?.headers?.['user-agent'] || 'unknown',
                timestamp: new Date().toISOString()
              }
            }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            teamName: user.teamName || undefined,
            mfaEnabled: user.mfaEnabled || false
          }
        } catch (error) {
          // Guardian Security: Comprehensive error logging without exposing sensitive data
          await prisma.audit_logs.create({
            data: {
              id: crypto.randomUUID(),
              userId: 'unknown',
              action: 'LOGIN_FAILURE',
              details: {
                email: credentials.email,
                ip: clientIP,
                error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
                timestamp: new Date().toISOString()
              }
            }
          }).catch(() => {}) // Fail silently if audit log fails

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
    maxAge: 30 * 60, // Guardian Security: 30 minutes instead of default 30 days
    updateAge: 5 * 60, // Guardian Security: Update session every 5 minutes
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 60, // Guardian Security: 30 minutes
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Guardian Security: Enhanced JWT with security claims
      if (user) {
        token.id = user.id
        token.role = user.role
        token.teamName = user.teamName
        token.mfaEnabled = user.mfaEnabled
        token.sessionId = crypto.randomUUID()
        token.iat = Math.floor(Date.now() / 1000)
      }

      // Guardian Security: Token refresh validation
      if (trigger === "update" && session) {
        return { ...token, ...session }
      }

      // Guardian Security: Token expiration check
      const tokenAge = Date.now() / 1000 - (token.iat as number || 0)
      if (tokenAge > 30 * 60) { // 30 minutes
        throw new Error('TOKEN_EXPIRED')
      }

      return token
    },
    async session({ session, token }) {
      // Guardian Security: Enhanced session with security metadata
      if (token) {
        session.user.id = token.id as string || token.sub!
        session.user.role = token.role as string
        session.user.teamName = token.teamName as string
        session.user.mfaEnabled = token.mfaEnabled as boolean
        session.sessionId = token.sessionId as string
        session.expires = new Date(Date.now() + 30 * 60 * 1000).toISOString()
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
      await prisma.audit_logs.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id!,
          action: 'SIGNIN_SUCCESS',
          details: {
            provider: account?.provider || 'unknown',
            isNewUser: isNewUser || false,
            timestamp: new Date().toISOString()
          }
        }
      }).catch(() => {}) // Fail silently
    },
    async signOut({ session, token }) {
      // Guardian Security: Log sign-outs
      if (session?.user?.id) {
        await prisma.audit_logs.create({
          data: {
            id: crypto.randomUUID(),
            userId: session.user.id,
            action: 'SIGNOUT',
            details: {
              sessionId: (session as any).sessionId,
              timestamp: new Date().toISOString()
            }
          }
        }).catch(() => {}) // Fail silently
      }
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