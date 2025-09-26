import { NextResponse } from 'next/server';
import { ESPNService } from '@/lib/services/espn';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const espn = new ESPNService();
    const data = await espn.getPlayerInfo(params.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error(`ESPN player API failed for ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 });
  }
}