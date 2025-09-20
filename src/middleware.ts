import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rate limiting configuration
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100');
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000'); // 15 minutes

// In-memory rate limiting store (use Redis in production for multiple instances)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security configurations
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007';
const isProduction = process.env.NODE_ENV === 'production';

// Rate limiting function
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitStore.delete(key);
    }
  }
  
  const current = rateLimitStore.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  if (current.resetTime < now) {
    current.count = 1;
    current.resetTime = now + RATE_LIMIT_WINDOW;
  } else {
    current.count += 1;
  }
  
  rateLimitStore.set(ip, current);
  return current.count <= RATE_LIMIT_MAX;
}

// Security headers function
function addSecurityHeaders(response: NextResponse): NextResponse {
  if (isProduction) {
    response.headers.set('X-Robots-Tag', 'index, follow');
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  }
  
  return response;
}

// CORS configuration
function handleCORS(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');
  
  if (origin && (origin === CORS_ORIGIN || !isProduction)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  }
  
  return response;
}

// Main middleware function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  // Create response
  let response = NextResponse.next();
  
  // Apply rate limiting for production
  if (isProduction && !pathname.startsWith('/_next') && !pathname.startsWith('/api/health')) {
    if (!rateLimit(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(RATE_LIMIT_WINDOW / 1000).toString(),
          'Content-Type': 'text/plain',
        },
      });
    }
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response = new NextResponse(null, { status: 200 });
    return handleCORS(request, response);
  }
  
  // Add security headers
  response = addSecurityHeaders(response);
  
  // Add CORS headers
  response = handleCORS(request, response);
  
  // Protected routes check (for admin and sensitive areas)
  if (pathname.startsWith('/admin') || pathname.startsWith('/monitoring')) {
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: isProduction 
      });
      
      if (!token || !token.isAdmin) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }
  
  // Add performance headers
  response.headers.set('X-Response-Time', Date.now().toString());
  
  return response;
}

// Configure matcher to include specific routes
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
};