import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
}