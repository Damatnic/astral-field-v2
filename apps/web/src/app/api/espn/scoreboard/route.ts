import { NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export async function GET() {
  try {
    const espn = new ESPNService();
    const data = await espn.getScoreboard();
    return NextResponse.json(data);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('ESPN scoreboard API failed:', error);

    }
    return NextResponse.json({ error: 'Failed to fetch scoreboard' }, { status: 500 });
  }
}