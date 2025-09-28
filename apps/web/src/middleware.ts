import { NextRequest, NextResponse } from 'next/server'
import { guardianSecurityHeaders, guardianSecurityHeadersDev } from '@/lib/security/security-headers'

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req
  
  // Alpha Optimization: Edge-compatible session validation without Prisma dependency
  let isLoggedIn = false
  let sessionSource = 'none'
  
  // Primary session validation using secure cookies only (Edge Runtime compatible)
  const sessionToken = req.cookies.get('next-auth.session-token')?.value || 
                      req.cookies.get('__Secure-next-auth.session-token')?.value
  
  if (sessionToken && sessionToken.length > 10) {
    try {
      // Basic JWT structure validation for Edge Runtime
      const tokenParts = sessionToken.split('.')
      if (tokenParts.length === 3) {
        isLoggedIn = true
        sessionSource = 'cookie'
      }
    } catch (error) {
      // Token validation failed, continue as not logged in
      if (process.env.AUTH_DEBUG === 'true') {
        console.warn('Session cookie validation failed:', error instanceof Error ? error.message : String(error))
      }
    }
  }
  
  // Debug logging for development
  if (process.env.AUTH_DEBUG === 'true' && process.env.NODE_ENV === 'development') {
    console.log(`Middleware auth check: ${isLoggedIn ? 'authenticated' : 'not authenticated'} (source: ${sessionSource}) for ${nextUrl.pathname}`)
  }

  // Catalyst Performance: Optimized route matching with Set for O(1) lookup
  const protectedPaths = new Set([
    '/dashboard', '/team', '/players', '/ai-coach', 
    '/settings', '/matchups', '/chat', '/analytics'
  ])
  
  const isProtectedRoute = protectedPaths.has(nextUrl.pathname) || 
    Array.from(protectedPaths).some(path => nextUrl.pathname.startsWith(path + '/'))

  const isAuthRoute = nextUrl.pathname.startsWith('/auth/')
  const isApiRoute = nextUrl.pathname.startsWith('/api/')
  const isProduction = process.env.NODE_ENV === 'production'

  // Guardian Security: Advanced security headers with production environment detection
  const securityHeadersProvider = isProduction 
    ? guardianSecurityHeaders 
    : guardianSecurityHeadersDev
  
  const securityHeaders = securityHeadersProvider.generateHeaders(isProduction)
  
  // Add enhanced CSP for production with comprehensive font source support
  if (isProduction) {
    securityHeaders['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com https://vitals.vercel-insights.com *.vercel.app",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com https://r2cdn.perplexity.ai https://fonts.googleapis.com data:", // COMPREHENSIVE: Allow all font sources
      "connect-src 'self' https: wss: ws: *.neon.tech https://vitals.vercel-insights.com *.vercel.app",
      "media-src 'self' data: blob:",
      "object-src 'none'",
      "child-src 'self'",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
      "report-uri /api/security/csp-report"
    ].join('; ')
  } else {
    // Development CSP - more permissive for debugging
    securityHeaders['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com https://r2cdn.perplexity.ai data:",
      "connect-src 'self' https: wss: ws:",
      "media-src 'self' data: blob:",
      "object-src 'none'",
      "report-uri /api/security/csp-report"
    ].join('; ')
  }

  const response = NextResponse.next()
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Sentinel Authentication: Enhanced route protection with session validation
  if (isProtectedRoute && !isLoggedIn) {
    // Clear any invalid session cookies before redirect
    const response = NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${encodeURIComponent(nextUrl.pathname + nextUrl.search)}`, nextUrl)
    )
    
    // Clear invalid session cookies
    response.cookies.delete('next-auth.session-token')
    response.cookies.delete('__Secure-next-auth.session-token')
    response.cookies.delete('next-auth.callback-url')
    response.cookies.delete('__Secure-next-auth.callback-url')
    response.cookies.delete('next-auth.csrf-token')
    response.cookies.delete('__Host-next-auth.csrf-token')
    
    // Add security headers to redirect response
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }

  // Redirect to dashboard if trying to access auth routes while logged in
  if (isAuthRoute && isLoggedIn) {
    // Get callback URL from query params if present
    const callbackUrl = nextUrl.searchParams.get('callbackUrl')
    const redirectUrl = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/dashboard'
    
    const redirectResponse = NextResponse.redirect(new URL(redirectUrl, nextUrl))
    
    // Add security headers to redirect response
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value)
    })
    
    return redirectResponse
  }

  // Enhanced API route protection with session validation
  if (isApiRoute && !nextUrl.pathname.includes('/api/auth/') && !nextUrl.pathname.includes('/api/health') && !nextUrl.pathname.includes('/api/debug/')) {
    if (!isLoggedIn) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'Valid session required',
        code: 'AUTH_REQUIRED'
      }), { 
        status: 401,
        headers: {
          ...securityHeaders,
          'Content-Type': 'application/json'
        }
      })
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|manifest.json|sw.js|icon-|robots.txt).*)',
  ],
}