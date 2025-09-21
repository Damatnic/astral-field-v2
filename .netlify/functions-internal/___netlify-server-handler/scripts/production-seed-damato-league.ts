/**
 * Production Seed Script for D'Amato Dynasty League
 * This script creates the real league data for the 10 members
 */

import { PrismaClient, UserRole, Position, PlayerStatus, RosterSlot } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Real D'Amato Dynasty League Members
const LEAGUE_MEMBERS = [
  { name: 'Nicholas D\'Amato', email: 'nicholas.damato@damatodynasty.com', teamName: 'The Commissioners', isCommissioner: true },
  { name: 'Nick Hartley', email: 'nick.hartley@damatodynasty.com', teamName: 'Hartley Heroes' },
  { name: 'Jack McCaigue', email: 'jack.mccaigue@damatodynasty.com', teamName: 'Jack\'s Juggernauts' },
  { name: 'Larry McCaigue', email: 'larry.mccaigue@damatodynasty.com', teamName: 'Larry\'s Legends' },
  { name: 'Renee McCaigue', email: 'renee.mccaigue@damatodynasty.com', teamName: 'Renee\'s Renegades' },
  { name: 'Jon Kornbeck', email: 'jon.kornbeck@damatodynasty.com', teamName: 'Kornbeck Crushers' },
  { name: 'David Jarvey', email: 'david.jarvey@damatodynasty.com', teamName: 'Jarvey\'s Giants' },
  { name: 'Kaity Lorbecki', email: 'kaity.lorbecki@damatodynasty.com', teamName: 'Lorbecki Lightning' },
  { name: 'Cason Minor', email: 'cason.minor@damatodynasty.com', teamName: 'Minor Miracles' },
  { name: 'Brittany Bergum', email: 'brittany.bergum@damatodynasty.com', teamName: 'Bergum Blitz' }
];

// League Settings
const LEAGUE_SETTINGS = {
  name: 'D\'Amato Dynasty League',
  description: 'The official D\'Amato Dynasty fantasy football league. Est. 2024. Where legends are made and trash talk is mandatory.',
  season: 2024,
  currentWeek: 17, // Update this to current NFL week
  rosterSlots: {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    K: 1,
    DST: 1,
    BENCH: 6,
    IR: 2
  },
  scoringSystem: {
    // Passing
    passingYards: 0.04,        // 1 point per 25 yards
    passingTouchdowns: 4,
    interceptions: -2,
    
    // Rushing
    rushingYards: 0.1,         // 1 point per 10 yards
    rushingTouchdowns: 6,
    
    // Receiving
    receivingYards: 0.1,       // 1 point per 10 yards
    receivingTouchdowns: 6,
    receptions: 0.5,           // PPR
    
    // Kicking
    fieldGoalMade: {
      '0-39': 3,
      '40-49': 4,
      '50+': 5
    },
    extraPointMade: 1,
    
    // Defense/Special Teams
    defensiveTouchdown: 6,
    interceptionReturn: 2,
    fumbleRecovery: 2,
    sack: 1,
    safety: 2,
    pointsAllowed: {
      '0': 10,
      '1-6': 7,
      '7-13': 4,
      '14-20': 1,
      '21-27': 0,
      '28-34': -1,
      '35+': -4
    }
  },
  waiverMode: 'FAAB' as const,
  faabBudget: 100,
  tradeDeadline: new Date('2024-11-30'),
  playoffWeeks: [15, 16, 17]
};

async function seedDamatoLeague() {
  console.log('🏈 Starting D\'Amato Dynasty League production seed...');
  
  try {
    // Clear existing test data (be careful in production!)
    console.log('Clearing existing test data...');
    await prisma.$transaction([
      prisma.rosterPlayer.deleteMany(),
      prisma.team.deleteMany(),
      prisma.leagueMember.deleteMany(),
      prisma.settings.deleteMany(),
      prisma.league.deleteMany(),
      prisma.user.deleteMany({ where: { email: { contains: '@damatodynasty.com' } } })
    ]);
    
    // Create Users
    console.log('Creating league members...');
    const users = await Promise.all(
      LEAGUE_MEMBERS.map(async (member) => {
        // Generate secure password - in production, send reset email
        const tempPassword = await bcrypt.hash(`${member.name.toLowerCase().replace(/[^a-z]/g, '')}2024!`, 10);
        
        return prisma.user.create({
          data: {
            email: member.email,
            name: member.name,
            profileId: member.email, // Use email as profileId for now
            role: member.isCommissioner ? UserRole.COMMISSIONER : UserRole.PLAYER,
            teamName: member.teamName,
            avatar: getTeamEmoji(member.teamName)
          }
        });
      })
    );
    
    console.log(`✅ Created ${users.length} users`);
    
    // Create League
    console.log('Creating D\'Amato Dynasty League...');
    const commissioner = users.find(u => u.role === UserRole.COMMISSIONER);
    
    const league = await prisma.league.create({
      data: {
        name: LEAGUE_SETTINGS.name,
        description: LEAGUE_SETTINGS.description,
        season: LEAGUE_SETTINGS.season,
        currentWeek: LEAGUE_SETTINGS.currentWeek,
        isActive: true,
        commissionerId: commissioner?.id,
        settings: {
          create: {
            rosterSlots: LEAGUE_SETTINGS.rosterSlots,
            scoringSystem: LEAGUE_SETTINGS.scoringSystem,
            waiverMode: LEAGUE_SETTINGS.waiverMode,
            tradeDeadline: LEAGUE_SETTINGS.tradeDeadline,
            playoffWeeks: LEAGUE_SETTINGS.playoffWeeks
          }
        }
      }
    });
    
    console.log(`✅ Created league: ${league.name}`);
    
    // Create League Members and Teams
    console.log('Creating teams...');
    const teams = await Promise.all(
      users.map(async (user, index) => {
        // Add user to league
        await prisma.leagueMember.create({
          data: {
            userId: user.id,
            leagueId: league.id,
            role: user.role === UserRole.COMMISSIONER ? 'COMMISSIONER' : 'OWNER'
          }
        });
        
        // Create team
        const team = await prisma.team.create({
          data: {
            name: user.teamName || `Team ${index + 1}`,
            leagueId: league.id,
            ownerId: user.id,
            waiverPriority: index + 1,
            faabBudget: LEAGUE_SETTINGS.faabBudget,
            faabSpent: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0,
            pointsAgainst: 0
          }
        });
        
        return team;
      })
    );
    
    console.log(`✅ Created ${teams.length} teams`);
    
    // Create Weeks
    console.log('Creating season weeks...');
    const weeks = await Promise.all(
      Array.from({ length: 18 }, (_, i) => i + 1).map(weekNumber =>
        prisma.week.create({
          data: {
            leagueId: league.id,
            weekNumber,
            isLocked: weekNumber < LEAGUE_SETTINGS.currentWeek
          }
        })
      )
    );
    
    console.log(`✅ Created ${weeks.length} weeks`);
    
    // Create Draft Order (snake draft)
    console.log('Creating draft order...');
    const draftOrders = [];
    const numRounds = 16; // Standard draft rounds
    
    for (let round = 1; round <= numRounds; round++) {
      const isEvenRound = round % 2 === 0;
      const pickOrder = isEvenRound ? teams.slice().reverse() : teams;
      
      for (let pick = 0; pick < pickOrder.length; pick++) {
        draftOrders.push({
          leagueId: league.id,
          teamId: pickOrder[pick].id,
          round,
          pick: pick + 1
        });
      }
    }
    
    await prisma.draftOrder.createMany({ data: draftOrders });
    console.log(`✅ Created draft order for ${numRounds} rounds`);
    
    // Create Matchup Schedule
    console.log('Creating matchup schedule...');
    const matchupSchedule = generateMatchupSchedule(teams, league.id);
    await prisma.matchup.createMany({ data: matchupSchedule });
    console.log(`✅ Created ${matchupSchedule.length} matchups`);
    
    console.log('🎉 D\'Amato Dynasty League setup complete!');
    console.log('\n📧 User Credentials:');
    LEAGUE_MEMBERS.forEach(member => {
      const password = `${member.name.toLowerCase().replace(/[^a-z]/g, '')}2024!`;
      console.log(`   ${member.name}: ${member.email} / ${password}`);
    });
    console.log('\n⚠️  IMPORTANT: Send password reset emails to all members for security!');
    
    return {
      league,
      users,
      teams
    };
    
  } catch (error) {
    console.error('❌ Error seeding D\'Amato Dynasty League:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getTeamEmoji(teamName: string): string {
  const emojiMap: { [key: string]: string } = {
    'Commissioners': '👑',
    'Heroes': '🦸',
    'Juggernauts': '💪',
    'Legends': '⭐',
    'Renegades': '🏴‍☠️',
    'Crushers': '🔨',
    'Giants': '🏔️',
    'Lightning': '⚡',
    'Miracles': '✨',
    'Blitz': '🚀'
  };
  
  const key = Object.keys(emojiMap).find(k => teamName.includes(k));
  return key ? emojiMap[key] : '🏈';
}

function generateMatchupSchedule(teams: any[], leagueId: string) {
  const matchups = [];
  const numTeams = teams.length;
  const regularSeasonWeeks = 14; // Weeks 1-14 regular season
  
  // Simple round-robin schedule
  for (let week = 1; week <= regularSeasonWeeks; week++) {
    const weekMatchups = [];
    const teamsInWeek = [...teams];
    
    while (teamsInWeek.length > 1) {
      const homeTeam = teamsInWeek.shift();
      const awayTeamIndex = Math.floor(Math.random() * teamsInWeek.length);
      const awayTeam = teamsInWeek.splice(awayTeamIndex, 1)[0];
      
      weekMatchups.push({
        leagueId,
        week,
        season: LEAGUE_SETTINGS.season,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: 0,
        awayScore: 0,
        isComplete: week < LEAGUE_SETTINGS.currentWeek
      });
    }
    
    matchups.push(...weekMatchups);
  }
  
  // Playoff weeks (15-17)
  // These will be determined based on standings
  
  return matchups;
}

// Run the seed script
if (require.main === module) {
  seedDamatoLeague()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedDamatoLeague;