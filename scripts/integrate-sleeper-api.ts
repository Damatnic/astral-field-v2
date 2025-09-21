/**
 * Sleeper API Integration Script - 2025 NFL Season Week 3
 * Fetches real NFL players and populates database
 */

import * as dotenv from 'dotenv';
import { PrismaClient, Position, PlayerStatus } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Sleeper API Configuration for 2025
const SLEEPER_API = {
  baseUrl: 'https://api.sleeper.app/v1',
  nflState: '/state/nfl',
  players: '/players/nfl',
  season: 2025,
  currentWeek: 3
};

// Position mapping from Sleeper to our enum
const POSITION_MAPPING: Record<string, Position> = {
  'QB': Position.QB,
  'RB': Position.RB,
  'WR': Position.WR,
  'TE': Position.TE,
  'K': Position.K,
  'DEF': Position.DST,
  'DL': Position.DL,
  'LB': Position.LB,
  'DB': Position.DB
};

interface SleeperPlayer {
  player_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string;
  team?: string;
  number?: number;
  height?: string;
  weight?: string;
  age?: number;
  years_exp?: number;
  status?: string;
  injury_status?: string;
  injury_notes?: string;
  fantasy_positions?: string[];
  search_full_name?: string;
}

interface SleeperNFLState {
  week: number;
  season_type: string;
  season: string;
  previous_season: string;
  leg: number;
  display_week: number;
}

async function fetchNFLState(): Promise<SleeperNFLState> {
  console.log('🏈 Fetching current NFL state...');
  
  try {
    const response = await fetch(`${SLEEPER_API.baseUrl}${SLEEPER_API.nflState}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const nflState = await response.json();
    console.log(`✅ NFL State: Season ${nflState.season}, Week ${nflState.week} (${nflState.season_type})`);
    
    return nflState;
  } catch (error) {
    console.error('❌ Failed to fetch NFL state:', error);
    throw error;
  }
}

async function fetchAllPlayers(): Promise<SleeperPlayer[]> {
  console.log('👨‍💼 Fetching all NFL players from Sleeper API...');
  
  try {
    const response = await fetch(`${SLEEPER_API.baseUrl}${SLEEPER_API.players}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const playersData = await response.json();
    const players = Object.values(playersData) as SleeperPlayer[];
    
    console.log(`✅ Fetched ${players.length} players from Sleeper API`);
    return players;
  } catch (error) {
    console.error('❌ Failed to fetch players:', error);
    throw error;
  }
}

function getPlayerStatus(player: SleeperPlayer): PlayerStatus {
  if (player.status === 'Inactive' || player.status === 'Reserve') {
    return PlayerStatus.INACTIVE;
  }
  
  if (player.injury_status) {
    const injury = player.injury_status.toLowerCase();
    if (injury.includes('out')) return PlayerStatus.OUT;
    if (injury.includes('doubtful')) return PlayerStatus.DOUBTFUL; 
    if (injury.includes('questionable')) return PlayerStatus.QUESTIONABLE;
    if (injury.includes('probable')) return PlayerStatus.PROBABLE;
  }
  
  return PlayerStatus.ACTIVE;
}

function getPrimaryPosition(player: SleeperPlayer): Position | null {
  if (!player.position) return null;
  
  // Map Sleeper position to our enum
  const position = POSITION_MAPPING[player.position];
  return position || null;
}

async function populatePlayersDatabase(players: SleeperPlayer[]) {
  console.log('💾 Populating database with NFL players...');
  
  let imported = 0;
  let skipped = 0;
  
  for (const player of players) {
    try {
      // Skip players without essential data
      if (!player.player_id || !player.full_name || !player.position) {
        skipped++;
        continue;
      }
      
      const position = getPrimaryPosition(player);
      if (!position) {
        skipped++;
        continue;
      }

      // Check if player already exists
      const existingPlayer = await prisma.player.findUnique({
        where: { sleeperPlayerId: player.player_id }
      });

      if (existingPlayer) {
        skipped++;
        continue;
      }

      // Create player record
      await prisma.player.create({
        data: {
          sleeperPlayerId: player.player_id,
          name: player.full_name,
          firstName: player.first_name || '',
          lastName: player.last_name || '',
          position: position,
          nflTeam: player.team || null,
          height: player.height || null,
          weight: player.weight ? String(player.weight) : null,
          age: player.age || null,
          yearsExperience: player.years_exp || 0,
          status: getPlayerStatus(player),
          injuryStatus: player.injury_status || null,
          fantasyPositions: player.fantasy_positions || [position],
          isRookie: player.years_exp === 0,
          lastUpdated: new Date()
        }
      });
      
      imported++;
      
      // Log progress every 100 players
      if (imported % 100 === 0) {
        console.log(`📊 Imported ${imported} players...`);
      }
      
    } catch (error: any) {
      // Skip duplicates or other errors
      if (error.code === 'P2002') {
        skipped++;
      } else {
        console.error(`❌ Error importing ${player.full_name}:`, error.message);
        skipped++;
      }
    }
  }
  
  console.log(`✅ Database population complete:`);
  console.log(`   📈 Imported: ${imported} players`);
  console.log(`   ⏭️ Skipped: ${skipped} players`);
}

async function updateLeagueWithCurrentWeek(nflState: SleeperNFLState) {
  console.log('🔄 Updating league with current NFL week...');
  
  const leagues = await prisma.league.findMany();
  
  for (const league of leagues) {
    await prisma.league.update({
      where: { id: league.id },
      data: {
        currentWeek: nflState.week,
        season: parseInt(nflState.season),
        updatedAt: new Date()
      }
    });
  }
  
  console.log(`✅ Updated ${leagues.length} leagues with Week ${nflState.week} of ${nflState.season}`);
}

async function main() {
  try {
    console.log('🚀 Starting Sleeper API Integration for 2025 NFL Season...\n');
    
    // Fetch current NFL state
    const nflState = await fetchNFLState();
    
    // Fetch all players from Sleeper
    const players = await fetchAllPlayers();
    
    // Filter for active NFL players only
    const activePlayers = players.filter(p => 
      p.full_name && 
      p.position && 
      p.team && 
      p.status !== 'Inactive'
    );
    
    console.log(`🎯 Filtering to ${activePlayers.length} active NFL players`);
    
    // Clear existing players first
    console.log('🧹 Clearing existing player data...');
    await prisma.player.deleteMany({});
    
    // Populate database with real players
    await populatePlayersDatabase(activePlayers);
    
    // Update league settings with current week
    await updateLeagueWithCurrentWeek(nflState);
    
    console.log('\n🎉 Sleeper API Integration Complete!');
    console.log(`📊 NFL State: ${nflState.season} Season, Week ${nflState.week}`);
    console.log(`👥 Active Players: ${activePlayers.length} imported`);
    console.log('🔗 Ready for live fantasy scoring and data');
    
  } catch (error) {
    console.error('❌ Integration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { main as integrateSleeperAPI, SLEEPER_API };