/**
 * Auto-Draft System for 2025 NFL Season Week 3
 * Creates balanced teams for all 10 users with strategic advantage for Nicholas D'Amato
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Draft configuration for balanced fantasy teams
const DRAFT_CONFIG = {
  totalRounds: 13, // Reduced since no DST available
  rosterPositions: {
    QB: 2,   // 1 starter + 1 backup
    RB: 4,   // 2 starters + 2 backups
    WR: 4,   // 2-3 starters + 1-2 backups
    TE: 2,   // 1 starter + 1 backup
    K: 1,    // 1 kicker
    DST: 0   // No team defenses available
  },
  benchSlots: 6,
  startingLineup: {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1, // RB/WR/TE
    K: 1,
    DST: 0   // Skip DST for now
  }
};

// Strategic draft order - Nicholas D'Amato gets advantageous positions
const DRAFT_ORDER = [
  'Nicholas D\'Amato',  // Gets first overall pick - best advantage
  'Brittany Bergum',
  'Cason Minor',
  'David Jarvey',
  'Jack McCaigue',
  'Jon Kornbeck',
  'Kaity Lorbecki',
  'Larry McCaigue',
  'Nick Hartley',
  'Renee McCaigue'
];

interface DraftedPlayer {
  player: any;
  user: string;
  round: number;
  pick: number;
  position: Position;
}

interface UserRoster {
  [userId: string]: {
    players: any[];
    positionCounts: Record<Position, number>;
    totalPlayers: number;
  }
}

async function getTopPlayersByPosition(): Promise<Record<Position, any[]>> {
  console.log('🔍 Analyzing player rankings by position...');

  // Get top players by position based on fantasy relevance and stats
  const positions = [Position.QB, Position.RB, Position.WR, Position.TE, Position.K, Position.DST];
  const playersByPosition: Record<Position, any[]> = {} as any;

  for (const position of positions) {
    const players = await prisma.player.findMany({
      where: {
        position: position,
        status: 'ACTIVE',
        isActive: true,
        nflTeam: { not: null }
      },
      orderBy: [
        { searchRank: 'asc' }, // Sleeper's fantasy ranking
        { name: 'asc' }
      ],
      take: position === Position.QB ? 32 : 
            position === Position.K ? 32 :
            position === Position.DST ? 32 : 80 // More depth for skill positions
    });

    playersByPosition[position] = players;
    console.log(`📊 ${position}: ${players.length} players available`);
  }

  return playersByPosition;
}

function calculatePlayerValue(player: any, position: Position, round: number): number {
  let baseValue = 1000 - (player.searchRank || 999); // Higher rank = higher value
  
  // Position scarcity adjustments
  const scarcityMultiplier: Record<Position, number> = {
    [Position.QB]: 1.2,  // Premium position
    [Position.RB]: 1.5,  // High value, limited supply
    [Position.WR]: 1.3,  // High volume position
    [Position.TE]: 1.1,  // Lower scoring but positional scarcity
    [Position.K]: 0.8,   // Less fantasy relevance
    [Position.DST]: 0.9, // Moderate fantasy relevance
    [Position.P]: 1.0,   // Punter
    [Position.DL]: 1.0,  // Defensive Line
    [Position.LB]: 1.0,  // Linebacker
    [Position.DB]: 1.0,  // Defensive Back
    [Position.CB]: 1.0,  // Cornerback
    [Position.S]: 1.0    // Safety
  };

  baseValue *= scarcityMultiplier[position] || 1;

  // Early round bonus
  if (round <= 3) baseValue *= 1.3;
  else if (round <= 6) baseValue *= 1.1;

  // Rookie penalty (slightly lower value due to uncertainty)
  if (player.isRookie) baseValue *= 0.9;

  return baseValue;
}

function selectBestAvailablePlayer(
  availablePlayers: Record<Position, any[]>, 
  userRoster: any,
  round: number,
  isNicholas: boolean = false
): { player: any; position: Position } | null {
  
  const rosterCounts = userRoster.positionCounts;
  
  // Determine positional needs based on roster construction strategy
  const neededPositions: Position[] = [];
  
  if (round <= 6) {
    // Early rounds: Focus on premium positions
    if (rosterCounts.QB === 0) neededPositions.push(Position.QB);
    if (rosterCounts.RB < 2) neededPositions.push(Position.RB);
    if (rosterCounts.WR < 2) neededPositions.push(Position.WR);
    if (rosterCounts.TE === 0 && round >= 4) neededPositions.push(Position.TE);
  } else if (round <= 10) {
    // Middle rounds: Fill out skill positions
    if (rosterCounts.RB < DRAFT_CONFIG.rosterPositions.RB) neededPositions.push(Position.RB);
    if (rosterCounts.WR < DRAFT_CONFIG.rosterPositions.WR) neededPositions.push(Position.WR);
    if (rosterCounts.TE < DRAFT_CONFIG.rosterPositions.TE) neededPositions.push(Position.TE);
    if (rosterCounts.QB < DRAFT_CONFIG.rosterPositions.QB) neededPositions.push(Position.QB);
  } else {
    // Late rounds: Fill remaining spots and kicker
    if (rosterCounts.K < DRAFT_CONFIG.rosterPositions.K) neededPositions.push(Position.K);
    // Skip DST since none available
    if (rosterCounts.QB < DRAFT_CONFIG.rosterPositions.QB) neededPositions.push(Position.QB);
    if (rosterCounts.RB < DRAFT_CONFIG.rosterPositions.RB) neededPositions.push(Position.RB);
    if (rosterCounts.WR < DRAFT_CONFIG.rosterPositions.WR) neededPositions.push(Position.WR);
    if (rosterCounts.TE < DRAFT_CONFIG.rosterPositions.TE) neededPositions.push(Position.TE);
  }

  // If no specific needs, pick best available skill position for depth
  if (neededPositions.length === 0) {
    const skillPositions = [Position.RB, Position.WR, Position.TE, Position.QB];
    neededPositions.push(...skillPositions);
  }

  // Nicholas gets strategic advantage - better players in key positions
  if (isNicholas && round <= 8) {
    // Prioritize top-tier skill position players for Nicholas
    const priorityPositions: Position[] = [Position.RB, Position.WR, Position.QB];
    const nicholasNeeds = neededPositions.filter(pos => priorityPositions.includes(pos));
    if (nicholasNeeds.length > 0) {
      for (const position of nicholasNeeds) {
        if (availablePlayers[position]?.length > 0) {
          // Give Nicholas the best available player in priority positions
          const bestPlayer = availablePlayers[position][0];
          return { player: bestPlayer, position };
        }
      }
    }
  }

  // Regular draft logic - find best value pick
  let bestPick: { player: any; position: Position; value: number } | null = null;

  for (const position of neededPositions) {
    if (availablePlayers[position]?.length > 0) {
      const player = availablePlayers[position][0];
      const value = calculatePlayerValue(player, position, round);
      
      if (!bestPick || value > bestPick.value) {
        bestPick = { player, position, value };
      }
    }
  }

  return bestPick ? { player: bestPick.player, position: bestPick.position } : null;
}

async function conductAutoDraft(): Promise<DraftedPlayer[]> {
  console.log('🎯 Starting intelligent auto-draft for 10 users...\n');

  // Get all users
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' }
  });

  if (users.length !== 10) {
    throw new Error(`Expected 10 users, found ${users.length}`);
  }

  // Initialize user rosters
  const userRosters: UserRoster = {};
  users.forEach(user => {
    userRosters[user.id] = {
      players: [],
      positionCounts: {
        [Position.QB]: 0,
        [Position.RB]: 0,
        [Position.WR]: 0,
        [Position.TE]: 0,
        [Position.K]: 0,
        [Position.DST]: 0,
        [Position.DL]: 0,
        [Position.LB]: 0,
        [Position.DB]: 0,
        [Position.P]: 0,
        [Position.CB]: 0,
        [Position.S]: 0
      },
      totalPlayers: 0
    };
  });

  // Get available players by position
  const availablePlayers = await getTopPlayersByPosition();
  const draftResults: DraftedPlayer[] = [];

  console.log('🎪 Beginning draft with strategic selections...\n');

  // Conduct snake draft (1-10, 10-1, 1-10, etc.)
  for (let round = 1; round <= DRAFT_CONFIG.totalRounds; round++) {
    const isEvenRound = round % 2 === 0;
    const roundOrder = isEvenRound ? [...DRAFT_ORDER].reverse() : DRAFT_ORDER;

    console.log(`🔄 Round ${round}:`);

    for (let pickInRound = 0; pickInRound < roundOrder.length; pickInRound++) {
      const userName = roundOrder[pickInRound];
      const user = users.find(u => u.name === userName);
      
      if (!user) continue;

      const isNicholas = userName === 'Nicholas D\'Amato';
      const overallPick = (round - 1) * 10 + pickInRound + 1;

      // Select best available player for this user
      const selection = selectBestAvailablePlayer(
        availablePlayers, 
        userRosters[user.id], 
        round, 
        isNicholas
      );

      if (selection) {
        const { player, position } = selection;

        // Remove player from available pool
        const positionArray = availablePlayers[position];
        const playerIndex = positionArray.findIndex(p => p.id === player.id);
        if (playerIndex > -1) {
          positionArray.splice(playerIndex, 1);
        }

        // Add to user's roster
        userRosters[user.id].players.push(player);
        userRosters[user.id].positionCounts[position]++;
        userRosters[user.id].totalPlayers++;

        // Record draft pick
        draftResults.push({
          player,
          user: user.name || 'Unknown User',
          round,
          pick: overallPick,
          position
        });

        console.log(`   ${overallPick}. ${user.name} → ${player.name} (${position}) ${isNicholas ? '⭐' : ''}`);
      } else {
        console.log(`   ${overallPick}. ${user.name} → NO PICK (no suitable players available)`);
      }
    }
    console.log();
  }

  return draftResults;
}

async function createRostersInDatabase(draftResults: DraftedPlayer[]) {
  console.log('💾 Creating rosters in database...\n');

  // Get the championship league
  const league = await prisma.league.findFirst({
    where: { name: 'Astral Field Championship League 2025' }
  });

  if (!league) {
    throw new Error('Championship league not found');
  }

  // Clear existing rosters for fresh start
  await prisma.rosterPlayer.deleteMany();
  await prisma.team.deleteMany();

  // Group draft results by user
  const userDrafts: Record<string, DraftedPlayer[]> = {};
  draftResults.forEach(pick => {
    if (!userDrafts[pick.user]) userDrafts[pick.user] = [];
    userDrafts[pick.user].push(pick);
  });

  // Create rosters for each user
  for (const [userName, picks] of Object.entries(userDrafts)) {
    const user = await prisma.user.findFirst({
      where: { name: userName }
    });

    if (!user) continue;

    // Create team for this user
    const team = await prisma.team.create({
      data: {
        name: `${user.name?.split(' ')[0] || 'User'}'s Team`,
        leagueId: league.id,
        ownerId: user.id,
        pointsFor: 0,
        pointsAgainst: 0,
        wins: 0,
        losses: 0,
        ties: 0
      }
    });

    console.log(`👥 Created roster for ${userName}:`);

    // Add players to roster
    for (const pick of picks) {
      // Map Position to RosterSlot
      let rosterSlot: RosterSlot = RosterSlot.BENCH; // Default to bench
      
      switch (pick.position) {
        case Position.QB:
          rosterSlot = RosterSlot.QB;
          break;
        case Position.RB:
          rosterSlot = RosterSlot.RB;
          break;
        case Position.WR:
          rosterSlot = RosterSlot.WR;
          break;
        case Position.TE:
          rosterSlot = RosterSlot.TE;
          break;
        case Position.K:
          rosterSlot = RosterSlot.K;
          break;
        case Position.DST:
          rosterSlot = RosterSlot.DST;
          break;
        case Position.LB:
          rosterSlot = RosterSlot.LB;
          break;
        case Position.DB:
          rosterSlot = RosterSlot.DB;
          break;
        case Position.DL:
          rosterSlot = RosterSlot.DL;
          break;
        default:
          rosterSlot = RosterSlot.BENCH;
      }
      
      await prisma.rosterPlayer.create({
        data: {
          teamId: team.id,
          playerId: pick.player.id,
          rosterSlot: rosterSlot,
          position: RosterSlot.BENCH, // Initially all on bench
          acquisitionType: AcquisitionType.DRAFT,
          week: 1
        }
      });

      console.log(`   📋 ${pick.player.name} (${pick.position}) - Round ${pick.round}`);
    }

    console.log(`   ✅ Total: ${picks.length} players\n`);
  }
}

async function main() {
  try {
    console.log('🏈 Starting Auto-Draft System for 2025 NFL Season Week 3...\n');

    // Conduct the auto-draft
    const draftResults = await conductAutoDraft();

    // Create rosters in database
    await createRostersInDatabase(draftResults);

    console.log('🎉 Auto-Draft Complete!\n');
    console.log('📊 Draft Summary:');
    console.log(`   🎯 Total Picks: ${draftResults.length}`);
    console.log(`   👥 Users Drafted: ${new Set(draftResults.map(p => p.user)).size}`);
    console.log(`   🌟 Nicholas D'Amato's advantage activated`);
    console.log(`   🏆 Ready for 2025 NFL Season Week 3!\n`);

    // Show Nicholas's team for verification
    const nicholasTeam = draftResults.filter(p => p.user === 'Nicholas D\'Amato');
    console.log('⭐ Nicholas D\'Amato\'s Championship Team:');
    nicholasTeam.forEach(pick => {
      console.log(`   ${pick.round}.${pick.pick % 10 || 10} ${pick.player.name} (${pick.position})`);
    });

  } catch (error) {
    console.error('❌ Auto-draft failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { main as autoDraft };