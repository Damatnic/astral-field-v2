import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { guardianSecurityHeaders, guardianSecurityHeadersDev } from '@/lib/security/security-headers'

export default auth(async (req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

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
  
  // Add CSP specifically for production to block unauthorized font sources
  if (isProduction) {
    securityHeaders['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com", // CRITICAL: Only allow authorized font sources
      "connect-src 'self' https: wss: ws:",
      "media-src 'self'",
      "object-src 'none'",
      "child-src 'none'",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "manifest-src 'self'",
      "block-all-mixed-content",
      "upgrade-insecure-requests",
      "report-uri /api/security/csp-report"
    ].join('; ')
  }

  const response = NextResponse.next()
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Redirect to signin if trying to access protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search)
    const redirectResponse = NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${callbackUrl}`, nextUrl)
    )
    
    // Add security headers to redirect response
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value)
    })
    
    return redirectResponse
  }

  // Redirect to dashboard if trying to access auth routes while logged in
  if (isAuthRoute && isLoggedIn) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', nextUrl))
    
    // Add security headers to redirect response
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value)
    })
    
    return redirectResponse
  }

  // Basic API route protection
  if (isApiRoute && !nextUrl.pathname.includes('/api/auth/') && !nextUrl.pathname.includes('/api/health')) {
    if (!isLoggedIn) {
      return new NextResponse('Unauthorized', { 
        status: 401,
        headers: securityHeaders
      })
    }
  }

  return response
})

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