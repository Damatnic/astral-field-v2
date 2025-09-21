import { NextResponse } from 'next/server';
import { DataSyncService } from '@/lib/services/data-sync';

export async function POST() {
  try {
    const syncService = new DataSyncService();
    await syncService.syncAllPlayers();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Players synced successfully from ESPN' 
    });
  } catch (error) {
    console.error('Player sync failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to sync players from ESPN' 
    }, { status: 500 });
  }
}