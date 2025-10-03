import { NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export async function GET() {
  try {
    const espn = new ESPNService();
    const data = await espn.getNews();
    return NextResponse.json(data);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('ESPN news API failed:', error);

    }
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}