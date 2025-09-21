// Simple test route for Sleeper API deployment verification
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Sleeper API routes are working!',
    timestamp: new Date().toISOString(),
    deployment: 'vercel',
  });
}