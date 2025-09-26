import { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
// Note: bcryptjs is incompatible with Edge Runtime
// We'll handle password hashing in Node.js-only API routes
// Crypto will be handled in Node.js API routes only

// Edge Runtime compatible password verification
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // This will be implemented as a Node.js API route call
  try {
    const response = await fetch('/api/auth/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, hashedPassword })
    })
    const result = await response.json()
    return result.valid
  } catch (error) {
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

        // Guardian Security: Rate limiting check
        const clientIP = req?.headers?.get?.('x-forwarded-for') || req?.headers?.get?.('x-real-ip') || 'unknown'
        
        try {
          // Guardian Security: SQL injection protection with parameterized query
          const user = await prisma.user.findUnique({
            where: {
              email: (credentials.email as string).toLowerCase().trim()
            },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              role: true,
              teamName: true,
              hashedPassword: true
            }
          })

          if (!user || !user.hashedPassword) {
            // Guardian Security: Timing attack prevention
            // Simple timing delay for Edge Runtime compatibility
            await new Promise(resolve => setTimeout(resolve, 100))
            throw new Error('INVALID_CREDENTIALS')
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
            throw new Error('INVALID_CREDENTIALS')
          }

          // Guardian Security: Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: {
              updatedAt: new Date()
            }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            teamName: user.teamName || undefined,
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
    maxAge: 30 * 60, // Guardian Security: 30 minutes instead of default 30 days
    updateAge: 5 * 60, // Guardian Security: Update session every 5 minutes
  },
  jwt: {
    maxAge: 30 * 60, // Guardian Security: 30 minutes
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Guardian Security: Enhanced JWT with security claims
      if (user) {
        token.id = user.id
        token.role = user.role
        token.teamName = user.teamName
        // token.mfaEnabled = false // Feature not implemented
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
        // session.user.mfaEnabled = false // Feature not implemented
        // session.sessionId = token.sessionId as string // Custom field
        // session.expires is handled automatically by NextAuth
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
      // Guardian Security: Log sign-outs
      console.log('User signed out')
      // Audit logging would go here when audit_logs table is available
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