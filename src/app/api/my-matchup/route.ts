import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'My matchup feature not implemented yet'
  }, { status: 501 });
}