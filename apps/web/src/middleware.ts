import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth(async (req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // Define protected and auth routes
  const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard') ||
                          nextUrl.pathname.startsWith('/team') ||
                          nextUrl.pathname.startsWith('/players') ||
                          nextUrl.pathname.startsWith('/ai-coach') ||
                          nextUrl.pathname.startsWith('/settings') ||
                          nextUrl.pathname.startsWith('/matchups') ||
                          nextUrl.pathname.startsWith('/chat') ||
                          nextUrl.pathname.startsWith('/analytics')

  const isAuthRoute = nextUrl.pathname.startsWith('/auth/')
  const isApiRoute = nextUrl.pathname.startsWith('/api/')

  // Basic security headers (Edge Runtime compatible)
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
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