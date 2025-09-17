import { NextRequest, NextResponse } from 'next/server';
import { validateSessionFromRequest, canAccessRole } from './lib/auth';

// Protected routes configuration
const PROTECTED_ROUTES = {
  // Admin-only routes
  admin: [
    '/admin',
    '/api/admin'
  ],
  // Commissioner and above routes
  commissioner: [
    '/leagues/[id]/commissioner',
    '/api/leagues/[id]/commissioner',
    '/api/leagues/create',
    '/api/leagues/[id]/settings'
  ],
  // Authenticated user routes (all roles)
  authenticated: [
    '/dashboard',
    '/leagues',
    '/api/user',
    '/api/leagues',
    '/api/draft',
    '/api/players',
    '/api/lineups',
    '/api/waivers',
    '/api/trades'
  ]
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/register',
  '/api/health',
  '/api/status',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  '/offline.html'
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/auth/login',
  '/auth/register'
];

function matchesPattern(pathname: string, pattern: string): boolean {
  // Convert pattern with [id] to regex
  const regexPattern = pattern
    .replace(/\[id\]/g, '[^/]+')
    .replace(/\//g, '\\/');
  
  const regex = new RegExp(`^${regexPattern}(?:\\/.*)?$`);
  return regex.test(pathname);
}

function isProtectedRoute(pathname: string): { protected: boolean; requiredRole?: 'admin' | 'commissioner' | 'authenticated' } {
  // Check if it's a public route
  for (const route of PUBLIC_ROUTES) {
    if (pathname.startsWith(route)) {
      return { protected: false };
    }
  }

  // Check admin routes
  for (const route of PROTECTED_ROUTES.admin) {
    if (matchesPattern(pathname, route)) {
      return { protected: true, requiredRole: 'admin' };
    }
  }

  // Check commissioner routes
  for (const route of PROTECTED_ROUTES.commissioner) {
    if (matchesPattern(pathname, route)) {
      return { protected: true, requiredRole: 'commissioner' };
    }
  }

  // Check authenticated routes
  for (const route of PROTECTED_ROUTES.authenticated) {
    if (matchesPattern(pathname, route)) {
      return { protected: true, requiredRole: 'authenticated' };
    }
  }

  // Default to public
  return { protected: false };
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  try {
    // Get current user from session
    const user = await validateSessionFromRequest(request);
    
    // Check if route is protected
    const routeInfo = isProtectedRoute(pathname);
    
    // If user is authenticated and trying to access auth routes, redirect to dashboard
    if (user && isAuthRoute(pathname)) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    
    // If route is not protected, allow access
    if (!routeInfo.protected) {
      return NextResponse.next();
    }
    
    // If route is protected but user is not authenticated, redirect to login
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      // Add return URL for redirect after login
      if (pathname !== '/login') {
        loginUrl.searchParams.set('returnUrl', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    
    // Check role-based access
    if (routeInfo.requiredRole && routeInfo.requiredRole !== 'authenticated') {
      const hasAccess = canAccessRole(user.role, routeInfo.requiredRole);
      
      if (!hasAccess) {
        // Redirect to unauthorized page or dashboard
        const unauthorizedUrl = new URL('/dashboard?error=unauthorized', request.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }
    
    // Add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', user.id);
    response.headers.set('x-user-role', user.role);
    response.headers.set('x-user-email', user.email);
    
    return response;
    
  } catch (error) {
    console.error('Middleware error:', error);
    
    // On error, if it's a protected route, redirect to login
    const routeInfo = isProtectedRoute(pathname);
    if (routeInfo.protected) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Otherwise allow the request to continue
    return NextResponse.next();
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).)*',
    '/api/((?!auth).)*' // Protect API routes except auth routes
  ]
};

// Utility functions for use in API routes
export function getUserFromHeaders(request: NextRequest) {
  return {
    id: request.headers.get('x-user-id'),
    role: request.headers.get('x-user-role') as 'admin' | 'commissioner' | 'player',
    email: request.headers.get('x-user-email')
  };
}

export function requireAuth(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    throw new Error('Authentication required');
  }
  return getUserFromHeaders(request);
}

export function requireRole(request: NextRequest, requiredRole: 'admin' | 'commissioner' | 'player') {
  const user = requireAuth(request);
  if (!canAccessRole(user.role, requiredRole)) {
    throw new Error(`${requiredRole} role required`);
  }
  return user;
}