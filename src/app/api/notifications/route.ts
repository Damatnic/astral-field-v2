import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Notifications feature not implemented yet'
  }, { status: 501 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Notifications feature not implemented yet'
  }, { status: 501 });
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Notifications feature not implemented yet'
  }, { status: 501 });
}