/**
 * Sentinel Authentication Debug Utilities
 * Comprehensive debugging tools for authentication issues
 */

import { auth } from '@/lib/auth'
import { cookies } from 'next/headers'

export interface AuthDebugInfo {
  timestamp: string
  session: {
    exists: boolean
    user?: any
    expires?: string
    sessionId?: string
  }
  cookies: {
    sessionToken?: {
      exists: boolean
      value?: string
      length?: number
    }
    callbackUrl?: {
      exists: boolean
      value?: string
    }
    csrfToken?: {
      exists: boolean
      value?: string
    }
  }
  environment: {
    nodeEnv: string
    nextauthUrl?: string
    authSecretConfigured: boolean
    trustHost?: boolean
  }
  request?: {
    url?: string
    userAgent?: string
    ip?: string
  }
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

/**
 * Comprehensive authentication debugging
 */
export async function debugAuthentication(request?: Request): Promise<AuthDebugInfo> {
  const debug: AuthDebugInfo = {
    timestamp: new Date().toISOString(),
    session: { exists: false },
    cookies: {},
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      nextauthUrl: process.env.NEXTAUTH_URL,
      authSecretConfigured: !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      trustHost: process.env.AUTH_TRUST_HOST === 'true'
    },
    errors: [],
    warnings: [],
    recommendations: []
  }

  // Add request information if available
  if (request) {
    debug.request = {
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    }
  }

  try {
    // Get session information
    const session = await auth()
    if (session) {
      debug.session = {
        exists: true,
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          role: session.user?.role
        },
        expires: session.expires,
        sessionId: session.user?.sessionId
      }
    }
  } catch (error) {
    debug.errors.push(`Session retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  try {
    // Get cookie information
    const cookieStore = cookies()
    
    // Session token
    const sessionToken = cookieStore.get('next-auth.session-token') || 
                        cookieStore.get('__Secure-next-auth.session-token')
    if (sessionToken) {
      debug.cookies.sessionToken = {
        exists: true,
        value: sessionToken.value.substring(0, 20) + '...', // Truncated for security
        length: sessionToken.value.length
      }
    } else {
      debug.cookies.sessionToken = { exists: false }
    }

    // Callback URL
    const callbackUrl = cookieStore.get('next-auth.callback-url') || 
                       cookieStore.get('__Secure-next-auth.callback-url')
    if (callbackUrl) {
      debug.cookies.callbackUrl = {
        exists: true,
        value: callbackUrl.value
      }
    } else {
      debug.cookies.callbackUrl = { exists: false }
    }

    // CSRF token
    const csrfToken = cookieStore.get('next-auth.csrf-token') || 
                     cookieStore.get('__Host-next-auth.csrf-token')
    if (csrfToken) {
      debug.cookies.csrfToken = {
        exists: true,
        value: csrfToken.value.substring(0, 20) + '...' // Truncated for security
      }
    } else {
      debug.cookies.csrfToken = { exists: false }
    }

  } catch (error) {
    debug.errors.push(`Cookie retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Environment validation
  if (!debug.environment.authSecretConfigured) {
    debug.errors.push('AUTH_SECRET or NEXTAUTH_SECRET not configured')
    debug.recommendations.push('Set AUTH_SECRET environment variable with at least 32 characters')
  }

  if (!debug.environment.nextauthUrl) {
    debug.warnings.push('NEXTAUTH_URL not configured')
    debug.recommendations.push('Set NEXTAUTH_URL environment variable')
  }

  // Session validation
  if (debug.session.exists && debug.cookies.sessionToken?.exists) {
    // Both session and cookie exist - good state
  } else if (debug.session.exists && !debug.cookies.sessionToken?.exists) {
    debug.warnings.push('Session exists but no session cookie found')
    debug.recommendations.push('Check cookie configuration and secure settings')
  } else if (!debug.session.exists && debug.cookies.sessionToken?.exists) {
    debug.warnings.push('Session cookie exists but no valid session found')
    debug.recommendations.push('Session may be expired or invalid - clear cookies and re-authenticate')
  } else {
    debug.warnings.push('No session or session cookie found - user not authenticated')
  }

  // Cookie length validation
  if (debug.cookies.sessionToken?.length && debug.cookies.sessionToken.length < 50) {
    debug.warnings.push('Session token is unusually short')
    debug.recommendations.push('Check JWT token generation')
  }

  return debug
}

/**
 * Format debug information for console output
 */
export function formatDebugOutput(debug: AuthDebugInfo): string {
  const lines: string[] = []
  
  lines.push('🛡️ Sentinel Authentication Debug Report')
  lines.push('=' .repeat(50))
  lines.push(`Timestamp: ${debug.timestamp}`)
  lines.push('')
  
  // Session information
  lines.push('📋 Session Information:')
  lines.push(`  Session Exists: ${debug.session.exists ? '✅' : '❌'}`)
  if (debug.session.exists) {
    lines.push(`  User ID: ${debug.session.user?.id || 'N/A'}`)
    lines.push(`  Email: ${debug.session.user?.email || 'N/A'}`)
    lines.push(`  Role: ${debug.session.user?.role || 'N/A'}`)
    lines.push(`  Expires: ${debug.session.expires || 'N/A'}`)
    lines.push(`  Session ID: ${debug.session.sessionId || 'N/A'}`)
  }
  lines.push('')
  
  // Cookie information
  lines.push('🍪 Cookie Information:')
  lines.push(`  Session Token: ${debug.cookies.sessionToken?.exists ? '✅' : '❌'}`)
  if (debug.cookies.sessionToken?.exists) {
    lines.push(`    Length: ${debug.cookies.sessionToken.length} characters`)
  }
  lines.push(`  Callback URL: ${debug.cookies.callbackUrl?.exists ? '✅' : '❌'}`)
  if (debug.cookies.callbackUrl?.exists) {
    lines.push(`    Value: ${debug.cookies.callbackUrl.value}`)
  }
  lines.push(`  CSRF Token: ${debug.cookies.csrfToken?.exists ? '✅' : '❌'}`)
  lines.push('')
  
  // Environment information
  lines.push('🔧 Environment Configuration:')
  lines.push(`  NODE_ENV: ${debug.environment.nodeEnv}`)
  lines.push(`  NEXTAUTH_URL: ${debug.environment.nextauthUrl || 'Not set'}`)
  lines.push(`  AUTH_SECRET: ${debug.environment.authSecretConfigured ? '✅ Configured' : '❌ Not configured'}`)
  lines.push(`  Trust Host: ${debug.environment.trustHost ? '✅' : '❌'}`)
  lines.push('')
  
  // Request information
  if (debug.request) {
    lines.push('🌐 Request Information:')
    lines.push(`  URL: ${debug.request.url || 'N/A'}`)
    lines.push(`  User Agent: ${debug.request.userAgent || 'N/A'}`)
    lines.push(`  IP: ${debug.request.ip || 'N/A'}`)
    lines.push('')
  }
  
  // Errors
  if (debug.errors.length > 0) {
    lines.push('❌ Errors:')
    debug.errors.forEach(error => lines.push(`  • ${error}`))
    lines.push('')
  }
  
  // Warnings
  if (debug.warnings.length > 0) {
    lines.push('⚠️ Warnings:')
    debug.warnings.forEach(warning => lines.push(`  • ${warning}`))
    lines.push('')
  }
  
  // Recommendations
  if (debug.recommendations.length > 0) {
    lines.push('💡 Recommendations:')
    debug.recommendations.forEach(rec => lines.push(`  • ${rec}`))
    lines.push('')
  }
  
  return lines.join('\n')
}

/**
 * Quick authentication status check
 */
export async function quickAuthCheck(): Promise<{
  isAuthenticated: boolean
  hasValidSession: boolean
  hasSessionCookie: boolean
  issues: string[]
}> {
  const issues: string[] = []
  let isAuthenticated = false
  let hasValidSession = false
  let hasSessionCookie = false

  try {
    const session = await auth()
    hasValidSession = !!session?.user?.id
    isAuthenticated = hasValidSession
  } catch (error) {
    issues.push(`Session check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('next-auth.session-token') || 
                        cookieStore.get('__Secure-next-auth.session-token')
    hasSessionCookie = !!sessionToken?.value
  } catch (error) {
    issues.push(`Cookie check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Environment checks
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    issues.push('AUTH_SECRET not configured')
  }

  return {
    isAuthenticated,
    hasValidSession,
    hasSessionCookie,
    issues
  }
}

/**
 * Log authentication debug information to console
 */
export async function logAuthDebug(request?: Request): Promise<void> {
  if (process.env.NODE_ENV === 'development' || process.env.AUTH_DEBUG === 'true') {
    const debug = await debugAuthentication(request)
    console.log(formatDebugOutput(debug))
  }
}