// Sentinel's Session Management Debug Utilities
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database/prisma'

export interface SessionDiagnostics {
  sessionExists: boolean
  sessionValid: boolean
  userExists: boolean
  tokenAge?: number
  tokenExpiry?: number
  sessionData?: any
  cookies?: Record<string, string>
  errors: string[]
  recommendations: string[]
}

export class SessionDebugManager {
  
  /**
   * Comprehensive session diagnostics
   */
  static async diagnoseSession(request?: Request): Promise<SessionDiagnostics> {
    const errors: string[] = []
    const recommendations: string[] = []
    let sessionExists = false
    let sessionValid = false
    let userExists = false
    let sessionData = null
    let tokenAge: number | undefined = undefined
    let tokenExpiry: number | undefined = undefined
    let cookies: Record<string, string> = {}

    try {
      // Step 1: Check session existence
      try {
        sessionData = await auth()
        sessionExists = !!sessionData
        sessionValid = !!(sessionData?.user?.id)
        
        if (sessionData?.user?.id) {
          // Step 2: Verify user exists in database
          const user = await prisma.user.findUnique({
            where: { id: sessionData.user.id },
            select: { id: true, email: true, name: true }
          })
          userExists = !!user
          
          if (!user) {
            errors.push('Session user ID does not exist in database')
            recommendations.push('Clear session and force re-login')
          }
        }
      } catch (error) {
        errors.push(`Session auth failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        recommendations.push('Check NextAuth configuration and database connection')
      }

      // Step 3: Analyze cookies if request is available
      if (request) {
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=')
            if (name) cookies[name] = value || ''
          })
        }

        // Check for session tokens
        const sessionToken = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token']
        if (sessionToken) {
          try {
            // Try to decode JWT to get token info
            const tokenParts = sessionToken.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]))
              tokenAge = payload.iat ? (Date.now() / 1000) - payload.iat : undefined
              tokenExpiry = payload.exp || undefined
              
              if (tokenExpiry && (Date.now() / 1000) > tokenExpiry) {
                errors.push('JWT token has expired')
                recommendations.push('Force session refresh or re-login')
              }
            }
          } catch (error) {
            errors.push('Failed to decode session token')
            recommendations.push('Clear corrupted session cookies')
          }
        } else {
          if (sessionExists) {
            errors.push('Session exists but no session token found in cookies')
            recommendations.push('Check cookie configuration and SameSite settings')
          }
        }
      }

      // Step 4: Generate recommendations based on findings
      if (!sessionExists && !sessionValid) {
        recommendations.push('User needs to log in')
      } else if (sessionExists && !sessionValid) {
        errors.push('Session exists but is invalid')
        recommendations.push('Clear session and force re-login')
      } else if (sessionValid && !userExists) {
        errors.push('Valid session but user no longer exists')
        recommendations.push('Clear session and force re-login')
      }

      // Step 5: Token age analysis
      if (tokenAge !== undefined) {
        const maxAge = 86400 // 24 hours in seconds
        if (tokenAge > maxAge) {
          errors.push(`Token is older than maximum age (${tokenAge}s > ${maxAge}s)`)
          recommendations.push('Refresh token or force re-login')
        } else if (tokenAge > maxAge * 0.8) {
          recommendations.push('Token approaching expiry, consider refreshing')
        }
      }

    } catch (error) {
      errors.push(`Session diagnostics failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      sessionExists,
      sessionValid,
      userExists,
      tokenAge,
      tokenExpiry,
      sessionData,
      cookies,
      errors,
      recommendations
    }
  }

  /**
   * Force refresh session by clearing tokens
   */
  static clearSessionCookies(): string[] {
    const cookiesToClear = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token'
    ]

    const clearCommands = cookiesToClear.map(cookieName => 
      `document.cookie = "${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost"`
    )

    return clearCommands
  }

  /**
   * Test session persistence across page loads
   */
  static async testSessionPersistence(): Promise<{
    initialSession: any
    reloadedSession: any
    persistent: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    
    try {
      // Get initial session
      const initialSession = await auth()
      
      // Simulate page reload by getting session again
      await new Promise(resolve => setTimeout(resolve, 100))
      const reloadedSession = await auth()
      
      const persistent = !!(
        initialSession?.user?.id && 
        reloadedSession?.user?.id && 
        initialSession.user.id === reloadedSession.user.id
      )
      
      if (!persistent) {
        if (initialSession?.user?.id && !reloadedSession?.user?.id) {
          issues.push('Session lost after reload - possible cookie or token issue')
        } else if (initialSession?.user?.id !== reloadedSession?.user?.id) {
          issues.push('Session user changed after reload - possible race condition')
        }
      }
      
      return {
        initialSession,
        reloadedSession,
        persistent,
        issues
      }
    } catch (error) {
      issues.push(`Session persistence test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        initialSession: null,
        reloadedSession: null,
        persistent: false,
        issues
      }
    }
  }

  /**
   * Generate session debug report
   */
  static async generateDebugReport(request?: Request): Promise<string> {
    const diagnostics = await this.diagnoseSession(request)
    const persistenceTest = await this.testSessionPersistence()
    
    let report = `
🛡️ SENTINEL SESSION DIAGNOSTICS REPORT
Generated: ${new Date().toISOString()}

📊 SESSION STATUS:
- Session Exists: ${diagnostics.sessionExists ? '✅' : '❌'}
- Session Valid: ${diagnostics.sessionValid ? '✅' : '❌'}
- User Exists in DB: ${diagnostics.userExists ? '✅' : '❌'}
- Session Persistent: ${persistenceTest.persistent ? '✅' : '❌'}

🔍 SESSION DETAILS:
- User ID: ${diagnostics.sessionData?.user?.id || 'None'}
- Email: ${diagnostics.sessionData?.user?.email || 'None'}
- Name: ${diagnostics.sessionData?.user?.name || 'None'}
- Role: ${(diagnostics.sessionData?.user as any)?.role || 'None'}
- Session ID: ${(diagnostics.sessionData?.user as any)?.sessionId || 'None'}

⏰ TOKEN ANALYSIS:
- Token Age: ${diagnostics.tokenAge ? `${Math.round(diagnostics.tokenAge)}s` : 'Unknown'}
- Token Expiry: ${diagnostics.tokenExpiry ? new Date(diagnostics.tokenExpiry * 1000).toISOString() : 'Unknown'}

🍪 COOKIES FOUND:
${Object.entries(diagnostics.cookies)
  .filter(([key]) => key.includes('auth') || key.includes('session'))
  .map(([key, value]) => `- ${key}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`)
  .join('\n') || '- No auth-related cookies found'}

❌ ERRORS DETECTED:
${diagnostics.errors.length > 0 ? diagnostics.errors.map(err => `- ${err}`).join('\n') : '- No errors detected'}

${persistenceTest.issues.length > 0 ? `
🔄 PERSISTENCE ISSUES:
${persistenceTest.issues.map(issue => `- ${issue}`).join('\n')}
` : ''}

💡 RECOMMENDATIONS:
${diagnostics.recommendations.length > 0 ? diagnostics.recommendations.map(rec => `- ${rec}`).join('\n') : '- No specific recommendations'}

🔧 TROUBLESHOOTING COMMANDS:
${this.clearSessionCookies().map(cmd => `- ${cmd}`).join('\n')}
`

    return report
  }
}

// Export convenience functions
export const diagnoseSession = SessionDebugManager.diagnoseSession
export const clearSessionCookies = SessionDebugManager.clearSessionCookies
export const testSessionPersistence = SessionDebugManager.testSessionPersistence
export const generateSessionReport = SessionDebugManager.generateDebugReport