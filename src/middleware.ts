import { NextRequest, NextResponse } from 'next/server';

// SIMPLIFIED MIDDLEWARE FOR VERCEL DEPLOYMENT
// All authentication temporarily disabled to fix Edge Runtime issues
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

// Empty matcher - middleware won't run on any routes
export const config = {
  matcher: []
};