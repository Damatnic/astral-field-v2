import { NextRequest, NextResponse } from 'next/server'
import { guardianSecurityHeaders, guardianSecurityHeadersDev } from '@/lib/security/security-headers'
import { guardianMiddlewareManager } from '@/lib/security/guardian-middleware-fix'

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const isProduction = process.env.NODE_ENV === 'production'

  // Guardian Security: Apply security headers first
  const securityHeadersProvider = isProduction 
    ? guardianSecurityHeaders 
    : guardianSecurityHeadersDev
  
  const securityHeaders = securityHeadersProvider.generateHeaders(isProduction)
  
  // Add production-specific CSP
  if (isProduction) {
    securityHeaders['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https: wss: ws: *.neon.tech https://vitals.vercel-insights.com",
      "media-src 'self'",
      "object-src 'none'",
      "child-src 'none'",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
      "report-uri /api/security/csp-report"
    ].join('; ')
  }

  // Guardian Security: Enhanced authentication validation
  const authResult = await guardianMiddlewareManager.validateAuthentication(req)

  // Log authentication details in development
  if (!isProduction && process.env.AUTH_DEBUG === 'true') {
    console.log('🛡️ Guardian Middleware Debug:', {
      path: nextUrl.pathname,
      authenticated: authResult.isAuthenticated,
      method: authResult.debugInfo?.method,
      hasSession: !!authResult.session,
      debugInfo: authResult.debugInfo
    })
  }

  // Route classification
  const isProtectedRoute = guardianMiddlewareManager.isProtectedRoute(nextUrl.pathname)
  const isAuthRoute = guardianMiddlewareManager.isAuthRoute(nextUrl.pathname)
  const isProtectedApiRoute = guardianMiddlewareManager.isProtectedApiRoute(nextUrl.pathname)

  // Create base response with security headers
  const createResponse = (response?: NextResponse) => {
    const res = response || NextResponse.next()
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.headers.set(key, value)
    })
    return res
  }

  // Handle protected routes
  if (isProtectedRoute && !authResult.isAuthenticated) {
    const redirectResponse = guardianMiddlewareManager.createSecureRedirect(req, '/auth/signin')
    return createResponse(redirectResponse)
  }

  // Handle auth routes when already authenticated
  if (isAuthRoute && authResult.isAuthenticated) {
    const callbackUrl = nextUrl.searchParams.get('callbackUrl')
    const redirectUrl = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/dashboard'
    const redirectResponse = NextResponse.redirect(new URL(redirectUrl, nextUrl))
    return createResponse(redirectResponse)
  }

  // Handle protected API routes
  if (isProtectedApiRoute && !authResult.isAuthenticated) {
    const apiErrorResponse = new NextResponse(JSON.stringify({ 
      error: 'Unauthorized', 
      message: 'Valid session required',
      code: 'AUTH_REQUIRED'
    }), { 
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return createResponse(apiErrorResponse)
  }

  // Add user context headers for API routes
  if (authResult.isAuthenticated && authResult.session && nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    
    // Add user context headers (if session has user data)
    if (authResult.session.user?.id && authResult.session.user.id !== 'cookie-validated') {
      response.headers.set('x-user-id', authResult.session.user.id)
      response.headers.set('x-user-role', authResult.session.user.role || 'user')
    }
    
    return createResponse(response)
  }

  // Default response with security headers
  return createResponse()
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