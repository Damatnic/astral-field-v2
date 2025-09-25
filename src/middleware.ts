import { NextRequest, NextResponse } from 'next/server';
import { validateSessionFromRequest } from '@/lib/auth';
import { applyCors, applySecurityHeaders, validateRequest, InputSanitizer } from '@/lib/security';
import { RATE_LIMIT_CONFIGS as RATE_LIMITS, botProtection } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Main middleware function
export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const userAgent = request.headers.get('user-agent') || '';
  
  try {
    // Skip middleware for static assets and internal Next.js routes
    if (shouldSkipMiddleware(pathname)) {
      return NextResponse.next();
    }

    // Initial security validation
    const validation = validateRequest(request);
    if (!validation.valid) {
      logger.warn({
        pathname,
        errors: validation.errors,
        ip: getClientIp(request),
        userAgent,
      }, 'Request blocked by security validation');
      
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Bot protection
    const botCheck = await botProtection.checkRequest(request);
    if (!botCheck.allowed) {
      logger.warn({
        pathname,
        reason: botCheck.reason,
        ip: getClientIp(request),
        userAgent,
      }, 'Request blocked by bot protection');
      
      return new NextResponse('Access Denied', { status: 403 });
    }

    // Handle preflight OPTIONS requests
    if (method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      return applySecurityAndCorsHeaders(request, response);
    }

    // Apply appropriate rate limiting based on route
    const rateLimitConfig = selectRateLimiter(pathname, method);
    if (rateLimitConfig) {
      try {
        const { withRateLimit } = await import('@/lib/rate-limiter');
        const rateLimitResult = await withRateLimit(request, rateLimitConfig, async () => {
          return NextResponse.next();
        });
        
        // If rate limit was hit, withRateLimit returns a 429 response
        if (rateLimitResult.status === 429) {
          logger.warn({
            pathname,
            ip: getClientIp(request),
          }, 'Request rate limited');
          return rateLimitResult;
        }
      } catch (error) {
        logger.error({ error, pathname }, 'Rate limiting check failed');
        // Fail open - allow request if rate limiting fails
      }
    }

    // Authentication and authorization for protected routes
    const authResult = await handleAuthentication(request, pathname);
    if (authResult) {
      return authResult;
    }

    // Create response
    let response = NextResponse.next();

    // Apply comprehensive security headers and CORS
    response = applySecurityAndCorsHeaders(request, response);

    // Add performance and monitoring headers
    const processingTime = Date.now() - startTime;
    response.headers.set('X-Response-Time', processingTime.toString());
    response.headers.set('X-Request-ID', generateRequestId());
    
    // Log successful request processing
    if (isDevelopment) {
      logger.debug({
        method,
        pathname,
        processingTime,
        ip: getClientIp(request),
      }, 'Request processed');
    }

    return response;

  } catch (error) {
    // Global error handling for middleware
    logger.error({
      error,
      pathname,
      method,
      ip: getClientIp(request),
    }, 'Middleware error');

    // Return generic error response
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Helper functions
function shouldSkipMiddleware(pathname: string): boolean {
  const skipPaths = [
    '/_next/',
    '/api/health',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
    '/sw.js',
  ];

  const skipExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.css', '.js', '.map', '.woff', '.woff2', '.ttf', '.eot',
  ];

  return skipPaths.some(path => pathname.startsWith(path)) ||
         skipExtensions.some(ext => pathname.endsWith(ext));
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
}

function selectRateLimiter(pathname: string, method: string) {
  // Authentication endpoints - strict limits
  if (pathname.includes('/auth/') || pathname.includes('/login') || pathname.includes('/register')) {
    return RATE_LIMITS.auth;
  }

  // Password reset endpoints
  if (pathname.includes('/reset-password') || pathname.includes('/forgot-password')) {
    return RATE_LIMITS.passwordReset;
  }

  // General API endpoints
  if (pathname.startsWith('/api/')) {
    return RATE_LIMITS.api;
  }

  // No rate limiting for regular pages
  return null;
}

function applySecurityAndCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  // Apply CORS headers
  response = applyCors(request, response);
  
  // Apply security headers
  response = applySecurityHeaders(response);
  
  return response;
}

async function handleAuthentication(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  // Define protected routes
  const protectedRoutes = ['/dashboard', '/admin', '/monitoring', '/profile', '/settings'];
  const adminRoutes = ['/admin', '/monitoring'];

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  if (!isProtected) {
    return null;
  }

  try {
    const user = await validateSessionFromRequest(request);
    
    if (!user) {
      logger.warn({
        pathname,
        ip: getClientIp(request),
      }, 'Unauthenticated access attempt');
      
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check admin permissions for admin routes
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    if (isAdminRoute && user.role !== 'ADMIN') {
      logger.warn({
        pathname,
        userId: user.id,
        role: user.role,
        ip: getClientIp(request),
      }, 'Unauthorized admin access attempt');
      
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return null; // Authentication successful
    
  } catch (error) {
    logger.error({
      error,
      pathname,
      ip: getClientIp(request),
    }, 'Authentication check failed');
    
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Configure matcher to include specific routes and disable Edge Runtime
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
  runtime: 'nodejs',
};