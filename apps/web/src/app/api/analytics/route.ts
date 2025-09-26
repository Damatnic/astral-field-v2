import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Analytics endpoint active'
  });
}

export async function POST() {
  return NextResponse.json({ 
    status: 'received',
    message: 'Analytics data processed'
  });
}