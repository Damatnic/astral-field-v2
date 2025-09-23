import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sleeperAPI } from '@/lib/sleeper-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'trending':
        return await getTrendingPlayers();
      case 'injuries':
        return await getInjuryReport();
      case 'projections':
        return await getCurrentWeekProjections();
      case 'state':
        return await getNFLState();
      default:
        return await syncPlayers();
    }
  } catch (error) {
    console.error('Sleeper sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Sleeper API' },
      { status: 500 }
    );
  }
}

async function syncPlayers() {
  try {
    const sleeperPlayers = await sleeperAPI.getAllPlayers();
    const playerArray = Object.values(sleeperPlayers)
      .filter(p => p.fantasy_positions?.length > 0)
      .slice(0, 100); // Limit for demo

    let synced = 0;
    let errors = 0;

    for (const sleeperPlayer of playerArray) {
      try {
        const playerData = sleeperAPI.convertToDbPlayer(sleeperPlayer);
        
        await prisma.player.upsert({
          where: { 
            sleeperPlayerId: sleeperPlayer.player_id 
          },
          update: {
            ...playerData,
            lastUpdated: new Date()
          },
          create: {
            ...playerData,
            espnId: `sleeper_${sleeperPlayer.player_id}`, // Required field
            createdAt: new Date()
          }
        });
        
        synced++;
      } catch (err) {
        console.error(`Failed to sync player ${sleeperPlayer.full_name}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} players from Sleeper`,
      synced,
      errors,
      total: playerArray.length
    });
  } catch (error) {
    throw error;
  }
}

async function getTrendingPlayers() {
  const [adds, drops] = await Promise.all([
    sleeperAPI.getTrendingPlayers('add', 24, 10),
    sleeperAPI.getTrendingPlayers('drop', 24, 10)
  ]);

  const allPlayers = await sleeperAPI.getAllPlayers();

  const enrichedAdds = adds.map(t => ({
    ...t,
    player: allPlayers[t.player_id],
    type: 'add'
  }));

  const enrichedDrops = drops.map(t => ({
    ...t,
    player: allPlayers[t.player_id],
    type: 'drop'
  }));

  return NextResponse.json({
    success: true,
    data: {
      adds: enrichedAdds,
      drops: enrichedDrops
    }
  });
}

async function getInjuryReport() {
  const injuries = await sleeperAPI.getInjuryReport();
  
  return NextResponse.json({
    success: true,
    data: injuries.slice(0, 50), // Limit to top 50
    count: injuries.length
  });
}

async function getCurrentWeekProjections() {
  const nflState = await sleeperAPI.getNFLState();
  const projections = await sleeperAPI.getPlayerProjections(
    nflState.season,
    nflState.week,
    'regular'
  );

  const formattedProjections = Object.entries(projections)
    .map(([playerId, data]) => ({
      playerId,
      ...data
    }))
    .sort((a, b) => (b.points?.ppr || 0) - (a.points?.ppr || 0))
    .slice(0, 100);

  return NextResponse.json({
    success: true,
    week: nflState.week,
    season: nflState.season,
    data: formattedProjections
  });
}

async function getNFLState() {
  const state = await sleeperAPI.getNFLState();
  
  return NextResponse.json({
    success: true,
    data: state
  });
}