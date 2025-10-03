import { NextResponse } from 'next/server';
import { ESPNSyncService } from '@/lib/services/espn-sync';

export const dynamic = 'force-dynamic'


export async function POST() {
  try {
    const syncService = new ESPNSyncService();
    const result = await syncService.syncESPNPlayers();
    
    return NextResponse.json({ 
      success: true, 
      message: `Synced ${result.synced} players with ${result.errors} errors`
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('ESPN player sync failed:', error);

    }
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to sync players' 
    }, { status: 500 });
  }
}