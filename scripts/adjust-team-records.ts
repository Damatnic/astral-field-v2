#!/usr/bin/env npx tsx

/**
 * Adjust team records per user request
 * Give winning records to Jack, Jon, and Hartley
 * User (Nicholas) is fine not having the best team
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function adjustTeamRecords() {
  try {
    console.log('🏈 Adjusting Team Records Per User Request\n');

    // Get all teams with owners
    const teams = await prisma.team.findMany({
      include: {
        owner: true,
        league: true
      }
    });

    console.log('Current standings:');
    teams.forEach(team => {
      console.log(`   ${team.owner.name} (${team.owner.teamName}): ${team.wins}-${team.losses}`);
    });

    console.log('\nAdjusting records...');

    // Update specific teams per user request
    for (const team of teams) {
      let wins = 1;
      let losses = 2;
      let pointsFor = 320;
      let pointsAgainst = 340;

      // Give winning records to Jack, Jon, and Hartley
      if (team.owner.name.includes('Jack')) {
        wins = 3;
        losses = 0;
        pointsFor = 420;
        pointsAgainst = 290;
        console.log(`   ✅ Giving ${team.owner.name} a great 3-0 record`);
      } else if (team.owner.name.includes('Jon')) {
        wins = 3;
        losses = 0;
        pointsFor = 410;
        pointsAgainst = 300;
        console.log(`   ✅ Giving ${team.owner.name} a great 3-0 record`);
      } else if (team.owner.name.includes('Hartley') || team.owner.name.includes('Nick Hartley')) {
        wins = 2;
        losses = 1;
        pointsFor = 385;
        pointsAgainst = 320;
        console.log(`   ✅ Giving ${team.owner.name} a strong 2-1 record`);
      } else if (team.owner.name.includes('Nicholas') && team.owner.name.includes("D'Amato")) {
        // User is fine not having the best team
        wins = 1;
        losses = 2;
        pointsFor = 335;
        pointsAgainst = 365;
        console.log(`   📊 ${team.owner.name} has a modest 1-2 record`);
      } else {
        // Mix of records for other teams
        const randomRecord = Math.random();
        if (randomRecord < 0.3) {
          wins = 2;
          losses = 1;
          pointsFor = Math.floor(Math.random() * 40) + 360;
          pointsAgainst = Math.floor(Math.random() * 40) + 320;
        } else if (randomRecord < 0.7) {
          wins = 1;
          losses = 2;
          pointsFor = Math.floor(Math.random() * 40) + 310;
          pointsAgainst = Math.floor(Math.random() * 40) + 350;
        } else {
          wins = 0;
          losses = 3;
          pointsFor = Math.floor(Math.random() * 40) + 270;
          pointsAgainst = Math.floor(Math.random() * 40) + 380;
        }
      }

      await prisma.team.update({
        where: { id: team.id },
        data: {
          wins,
          losses,
          ties: 0,
          pointsFor,
          pointsAgainst
        }
      });
    }

    // Show updated standings
    const updatedTeams = await prisma.team.findMany({
      include: {
        owner: true
      },
      orderBy: [
        { wins: 'desc' },
        { pointsFor: 'desc' }
      ]
    });

    console.log('\n📊 UPDATED STANDINGS:');
    updatedTeams.forEach((team, i) => {
      const winPct = (team.wins / (team.wins + team.losses) * 100).toFixed(0);
      console.log(`   ${i + 1}. ${team.owner.name} (${team.owner.teamName}): ${team.wins}-${team.losses} (${team.pointsFor} PF, ${team.pointsAgainst} PA) - ${winPct}%`);
    });

    console.log('\n🎉 Team records adjusted successfully!');
    console.log('   ✅ Jack and Jon both have 3-0 records');
    console.log('   ✅ Nick Hartley has a strong 2-1 record');
    console.log('   ✅ Nicholas has a modest 1-2 record as requested');
    console.log('   ✅ Other teams have varied competitive records');

  } catch (error) {
    console.error('❌ Error adjusting team records:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  adjustTeamRecords()
    .then(() => {
      console.log('\n✅ Team record adjustment completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Team record adjustment failed:', error);
      process.exit(1);
    });
}

export { adjustTeamRecords };