
export const dynamic = 'force-dynamic';
// Force deployment test
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Deployment working!',
    timestamp: new Date().toISOString(),
    version: '2.0',
  });
}