import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a singleton prisma instance
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 requests
const WINDOW_MS = 60000; // per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip) || { count: 0, resetTime: now + WINDOW_MS };
  
  // Reset if window expired
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
    requestCounts.set(ip, record);
    return true;
  }
  
  // Check if under limit
  if (record.count < RATE_LIMIT) {
    record.count++;
    requestCounts.set(ip, record);
    return true;
  }
  
  return false;
}

export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        error: 'Too many requests. Please try again later.'
      }, { 
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      });
    }
    
    // Fetch teams with their related data
    const teams = await prisma.team.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            season: true
          }
        }
      },
      orderBy: [
        { wins: 'desc' },
        { pointsFor: 'desc' }
      ]
    });
    
    // Add cache headers to reduce server load
    return NextResponse.json({
      success: true,
      teams,
      count: teams.length,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      }
    });
    
  } catch (error: any) {
    console.error('Teams API error:', error);
    
    // Handle database connection errors gracefully
    if (error.code === 'P2002' || error.code === 'P2021') {
      return NextResponse.json({
        success: false,
        error: 'Database temporarily unavailable',
        teams: [],
        count: 0
      }, { status: 503 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch teams',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      teams: [],
      count: 0
    }, { status: 500 });
  }
}