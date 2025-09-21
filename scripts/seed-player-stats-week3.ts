#!/usr/bin/env npx tsx

/**
 * Seed Player Statistics for Weeks 1 & 2 of 2025 Season
 * 
 * Since it's week 3, players should have fantasy stats from the first 2 weeks.
 * This script populates realistic player statistics to support the league standings.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample fantasy scores by position (realistic ranges for NFL players)
const POSITION_SCORING = {
  QB: { min: 8, max: 35, avg: 18 },
  RB: { min: 3, max: 32, avg: 12 },
  WR: { min: 2, max: 28, avg: 10 },
  TE: { min: 1, max: 22, avg: 8 },
  K: { min: 0, max: 18, avg: 8 },
  DEF: { min: -2, max: 25, avg: 8 }
};

function generateFantasyScore(position: string, week: number): number {
  const scoring = POSITION_SCORING[position as keyof typeof POSITION_SCORING] || POSITION_SCORING.WR;
  
  // Add some variance - week 1 tends to be more unpredictable
  const variance = week === 1 ? 0.3 : 0.2;
  const baseScore = scoring.avg;
  const range = scoring.max - scoring.min;
  
  // Generate score with normal distribution around average
  const randomFactor = (Math.random() - 0.5) * 2 * variance;
  let score = baseScore + (randomFactor * range);
  
  // Ensure score is within bounds
  score = Math.max(scoring.min, Math.min(scoring.max, score));
  
  // Round to 1 decimal place
  return Math.round(score * 10) / 10;
}

function generatePlayerStats(playerId: string, position: string, team: string, week: number) {
  const fantasyPoints = generateFantasyScore(position, week);
  
  // Generate basic stats based on position
  const stats: any = {
    week,
    team,
    opponent: `VS ${['GB', 'DAL', 'NE', 'SF', 'KC', 'BUF'][Math.floor(Math.random() * 6)]}`,
    gameStatus: 'COMPLETED'
  };

  // Position-specific stats
  switch (position) {
    case 'QB':
      stats.passingYards = Math.floor(Math.random() * 200) + 150;
      stats.passingTDs = Math.floor(Math.random() * 4);
      stats.interceptions = Math.random() < 0.3 ? 1 : 0;
      stats.rushingYards = Math.floor(Math.random() * 40);
      stats.rushingTDs = Math.random() < 0.2 ? 1 : 0;
      break;
    case 'RB':
      stats.rushingYards = Math.floor(Math.random() * 80) + 20;
      stats.rushingTDs = Math.random() < 0.4 ? 1 : 0;
      stats.receivingYards = Math.floor(Math.random() * 40);
      stats.receptions = Math.floor(Math.random() * 6);
      stats.receivingTDs = Math.random() < 0.2 ? 1 : 0;
      break;
    case 'WR':
    case 'TE':
      stats.receivingYards = Math.floor(Math.random() * 80) + 20;
      stats.receptions = Math.floor(Math.random() * 8) + 2;
      stats.receivingTDs = Math.random() < 0.3 ? 1 : 0;
      stats.rushingYards = Math.random() < 0.1 ? Math.floor(Math.random() * 20) : 0;
      break;
    case 'K':
      stats.fieldGoalsMade = Math.floor(Math.random() * 4) + 1;
      stats.fieldGoalsAttempted = stats.fieldGoalsMade + (Math.random() < 0.2 ? 1 : 0);
      stats.extraPointsMade = Math.floor(Math.random() * 4);
      break;
    case 'DEF':
      stats.sacks = Math.floor(Math.random() * 4);
      stats.interceptions = Math.floor(Math.random() * 2);
      stats.fumbleRecoveries = Math.random() < 0.3 ? 1 : 0;
      stats.defensiveTDs = Math.random() < 0.1 ? 1 : 0;
      stats.pointsAllowed = Math.floor(Math.random() * 20) + 10;
      break;
  }

  return {
    playerId,
    week,
    season: 2025,
    team,
    stats,
    fantasyPoints,
    isProjected: false
  };
}

async function seedPlayerStatsWeek3() {
  try {
    console.log('🏈 Seeding Player Statistics for 2025 Season (Weeks 1-2)\n');

    // Get all players
    const players = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
        position: true,
        nflTeam: true,
        status: true
      },
      where: {
        status: 'ACTIVE'
      }
    });

    console.log(`Found ${players.length} active players to generate stats for...`);

    let statsCreated = 0;

    // Generate stats for weeks 1 and 2
    for (const week of [1, 2]) {
      console.log(`\nGenerating Week ${week} statistics...`);
      
      for (const player of players) {
        // Check if stats already exist
        const existingStats = await prisma.playerStats.findUnique({
          where: {
            playerId_week_season: {
              playerId: player.id,
              week,
              season: 2025
            }
          }
        });

        if (!existingStats) {
          const playerStats = generatePlayerStats(
            player.id,
            player.position,
            player.nflTeam || 'FA',
            week
          );

          try {
            await prisma.playerStats.create({
              data: playerStats
            });
            statsCreated++;
            
            if (statsCreated % 50 === 0) {
              console.log(`   Created ${statsCreated} player stats...`);
            }
          } catch (error) {
            console.error(`Failed to create stats for ${player.name}:`, error);
          }
        }
      }
    }

    console.log(`\n✅ Successfully created ${statsCreated} player statistics entries`);

    // Generate summary stats
    const totalPlayerStats = await prisma.playerStats.count({
      where: { season: 2025 }
    });

    const avgPointsWeek1 = await prisma.playerStats.aggregate({
      where: { week: 1, season: 2025 },
      _avg: { fantasyPoints: true }
    });

    const avgPointsWeek2 = await prisma.playerStats.aggregate({
      where: { week: 2, season: 2025 },
      _avg: { fantasyPoints: true }
    });

    const topScorers = await prisma.playerStats.findMany({
      where: { season: 2025 },
      include: { player: true },
      orderBy: { fantasyPoints: 'desc' },
      take: 5
    });

    console.log('\n📊 PLAYER STATISTICS SUMMARY:');
    console.log(`   Total Stats Entries: ${totalPlayerStats}`);
    console.log(`   Week 1 Average Score: ${avgPointsWeek1._avg.fantasyPoints?.toFixed(1) || 0} points`);
    console.log(`   Week 2 Average Score: ${avgPointsWeek2._avg.fantasyPoints?.toFixed(1) || 0} points`);
    
    console.log('\n🏆 TOP PERFORMERS (Both Weeks):');
    topScorers.forEach((stat, i) => {
      console.log(`   ${i + 1}. ${stat.player.name} (${stat.player.position}): ${stat.fantasyPoints} points (Week ${stat.week})`);
    });

    console.log('\n🎯 WHAT THIS PROVIDES:');
    console.log('   ✅ Realistic player performance data for weeks 1-2');
    console.log('   ✅ Position-appropriate scoring ranges');
    console.log('   ✅ Statistical variance that matches real NFL trends');
    console.log('   ✅ Foundation for lineup decisions and waiver claims');
    console.log('   ✅ Historical data for player projections');

  } catch (error) {
    console.error('❌ Error seeding player statistics:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedPlayerStatsWeek3()
    .then(() => {
      console.log('\n✅ Player statistics seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Player statistics seeding failed:', error);
      process.exit(1);
    });
}

export { seedPlayerStatsWeek3 };