import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { GuardianSecurity } from './middleware/security'

export default auth(async (req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // Guardian Security: Apply security checks first
  const securityResponse = await GuardianSecurity.middleware(req)
  if (securityResponse) {
    return securityResponse
  }

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

  // Guardian Security: Add security headers to response
  const response = NextResponse.next()
  const securityHeaders = GuardianSecurity.generateSecurityHeaders()
  
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

  // Guardian Security: Enhanced API route protection
  if (isApiRoute && !isAuthRoute.includes('api/auth') && !nextUrl.pathname.includes('/api/health')) {
    // Additional API security checks
    if (!isLoggedIn && !nextUrl.pathname.includes('/api/auth/')) {
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