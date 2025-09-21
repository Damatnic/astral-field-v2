import { NextResponse } from 'next/server';
import { DataSyncService } from '@/lib/services/data-sync';

export async function POST() {
  try {
    const syncService = new DataSyncService();
    await syncService.syncLiveScores();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Live scores synced successfully' 
    });
  } catch (error) {
    console.error('Score sync failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to sync live scores' 
    }, { status: 500 });
  }
}