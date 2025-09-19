import { NextRequest, NextResponse } from 'next/server';

// Simplified middleware for Vercel deployment
export function middleware(request: NextRequest) {
  // Pass all requests through without modification
  return NextResponse.next();
}

// Configure matcher to skip static files and API routes for better performance
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};