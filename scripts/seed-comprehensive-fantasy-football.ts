import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface LeagueMember {
  name: string;
  email: string;
  teamName: string;
  role: string;
}

// Updated roster with 11 users
const DAMATO_DYNASTY_MEMBERS: LeagueMember[] = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", teamName: "D'Amato Dynasty", role: "COMMISSIONER" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", teamName: "Hartley's Heroes", role: "PLAYER" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", teamName: "McCaigue Mayhem", role: "PLAYER" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", teamName: "Larry Legends", role: "PLAYER" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", teamName: "Renee's Reign", role: "PLAYER" },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", teamName: "Kornbeck Crushers", role: "PLAYER" },
  { name: "David Jarvey", email: "david@damato-dynasty.com", teamName: "Jarvey's Juggernauts", role: "PLAYER" },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", teamName: "Lorbecki Lions", role: "PLAYER" },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", teamName: "Minor Miracles", role: "PLAYER" },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", teamName: "Bergum Blitz", role: "PLAYER" },
  { name: "Alex Rodriguez", email: "alex@damato-dynasty.com", teamName: "A-Rod All-Stars", role: "PLAYER" }
];

// Comprehensive player pool for fantasy football
const FANTASY_PLAYERS = [
  // Elite Quarterbacks
  { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', adp: 1.2, rank: 1 },
  { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', adp: 2.1, rank: 2 },
  { name: 'Jalen Hurts', position: 'QB', nflTeam: 'PHI', adp: 2.8, rank: 3 },
  { name: 'Patrick Mahomes', position: 'QB', nflTeam: 'KC', adp: 3.2, rank: 4 },
  { name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', adp: 4.5, rank: 5 },
  { name: 'Tua Tagovailoa', position: 'QB', nflTeam: 'MIA', adp: 5.1, rank: 6 },
  { name: 'Brock Purdy', position: 'QB', nflTeam: 'SF', adp: 5.8, rank: 7 },
  { name: 'C.J. Stroud', position: 'QB', nflTeam: 'HOU', adp: 6.2, rank: 8 },
  { name: 'Joe Burrow', position: 'QB', nflTeam: 'CIN', adp: 6.8, rank: 9 },
  { name: 'Justin Herbert', position: 'QB', nflTeam: 'LAC', adp: 7.2, rank: 10 },
  { name: 'Anthony Richardson', position: 'QB', nflTeam: 'IND', adp: 8.1, rank: 11 },
  { name: 'Jayden Daniels', position: 'QB', nflTeam: 'WAS', adp: 8.5, rank: 12 },

  // Elite Running Backs
  { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', adp: 1.1, rank: 1 },
  { name: 'Derrick Henry', position: 'RB', nflTeam: 'BAL', adp: 1.8, rank: 2 },
  { name: 'Josh Jacobs', position: 'RB', nflTeam: 'GB', adp: 2.2, rank: 3 },
  { name: 'Saquon Barkley', position: 'RB', nflTeam: 'PHI', adp: 2.5, rank: 4 },
  { name: 'Kyren Williams', position: 'RB', nflTeam: 'LAR', adp: 2.9, rank: 5 },
  { name: 'Alvin Kamara', position: 'RB', nflTeam: 'NO', adp: 3.1, rank: 6 },
  { name: 'Kenneth Walker III', position: 'RB', nflTeam: 'SEA', adp: 3.4, rank: 7 },
  { name: 'De\'Von Achane', position: 'RB', nflTeam: 'MIA', adp: 3.7, rank: 8 },
  { name: 'Joe Mixon', position: 'RB', nflTeam: 'HOU', adp: 4.1, rank: 9 },
  { name: 'Jonathan Taylor', position: 'RB', nflTeam: 'IND', adp: 4.3, rank: 10 },
  { name: 'Jahmyr Gibbs', position: 'RB', nflTeam: 'DET', adp: 4.6, rank: 11 },
  { name: 'Aaron Jones', position: 'RB', nflTeam: 'MIN', adp: 4.9, rank: 12 },
  { name: 'James Cook', position: 'RB', nflTeam: 'BUF', adp: 5.2, rank: 13 },
  { name: 'D\'Andre Swift', position: 'RB', nflTeam: 'CHI', adp: 5.5, rank: 14 },
  { name: 'Tony Pollard', position: 'RB', nflTeam: 'TEN', adp: 6.1, rank: 15 },
  { name: 'Najee Harris', position: 'RB', nflTeam: 'PIT', adp: 6.4, rank: 16 },
  { name: 'Rachaad White', position: 'RB', nflTeam: 'TB', adp: 6.8, rank: 17 },
  { name: 'Raheem Mostert', position: 'RB', nflTeam: 'MIA', adp: 7.2, rank: 18 },
  { name: 'Travis Etienne', position: 'RB', nflTeam: 'JAX', adp: 7.5, rank: 19 },
  { name: 'Rhamondre Stevenson', position: 'RB', nflTeam: 'NE', adp: 7.8, rank: 20 },

  // Elite Wide Receivers
  { name: 'CeeDee Lamb', position: 'WR', nflTeam: 'DAL', adp: 1.3, rank: 1 },
  { name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', adp: 1.6, rank: 2 },
  { name: 'A.J. Brown', position: 'WR', nflTeam: 'PHI', adp: 1.9, rank: 3 },
  { name: 'Amon-Ra St. Brown', position: 'WR', nflTeam: 'DET', adp: 2.3, rank: 4 },
  { name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', adp: 2.6, rank: 5 },
  { name: 'Ja\'Marr Chase', position: 'WR', nflTeam: 'CIN', adp: 2.7, rank: 6 },
  { name: 'Stefon Diggs', position: 'WR', nflTeam: 'HOU', adp: 3.3, rank: 7 },
  { name: 'DK Metcalf', position: 'WR', nflTeam: 'SEA', adp: 3.5, rank: 8 },
  { name: 'Mike Evans', position: 'WR', nflTeam: 'TB', adp: 3.8, rank: 9 },
  { name: 'Garrett Wilson', position: 'WR', nflTeam: 'NYJ', adp: 4.0, rank: 10 },
  { name: 'DeVonta Smith', position: 'WR', nflTeam: 'PHI', adp: 4.2, rank: 11 },
  { name: 'Chris Olave', position: 'WR', nflTeam: 'NO', adp: 4.4, rank: 12 },
  { name: 'Davante Adams', position: 'WR', nflTeam: 'NYJ', adp: 4.7, rank: 13 },
  { name: 'DJ Moore', position: 'WR', nflTeam: 'CHI', adp: 5.0, rank: 14 },
  { name: 'Calvin Ridley', position: 'WR', nflTeam: 'TEN', adp: 5.3, rank: 15 },
  { name: 'Zay Flowers', position: 'WR', nflTeam: 'BAL', adp: 5.6, rank: 16 },
  { name: 'Jordan Addison', position: 'WR', nflTeam: 'MIN', adp: 5.9, rank: 17 },
  { name: 'Keenan Allen', position: 'WR', nflTeam: 'CHI', adp: 6.2, rank: 18 },
  { name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', adp: 6.5, rank: 19 },
  { name: 'Terry McLaurin', position: 'WR', nflTeam: 'WAS', adp: 6.8, rank: 20 },
  { name: 'Tee Higgins', position: 'WR', nflTeam: 'CIN', adp: 7.1, rank: 21 },
  { name: 'Diontae Johnson', position: 'WR', nflTeam: 'CAR', adp: 7.4, rank: 22 },
  { name: 'Rome Odunze', position: 'WR', nflTeam: 'CHI', adp: 7.7, rank: 23 },
  { name: 'Marvin Harrison Jr.', position: 'WR', nflTeam: 'ARI', adp: 8.0, rank: 24 },
  { name: 'Brandon Aiyuk', position: 'WR', nflTeam: 'SF', adp: 8.3, rank: 25 },

  // Elite Tight Ends
  { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', adp: 2.4, rank: 1 },
  { name: 'Sam LaPorta', position: 'TE', nflTeam: 'DET', adp: 3.6, rank: 2 },
  { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', adp: 4.8, rank: 3 },
  { name: 'Trey McBride', position: 'TE', nflTeam: 'ARI', adp: 5.2, rank: 4 },
  { name: 'George Kittle', position: 'TE', nflTeam: 'SF', adp: 5.5, rank: 5 },
  { name: 'Evan Engram', position: 'TE', nflTeam: 'JAX', adp: 6.8, rank: 6 },
  { name: 'Kyle Pitts', position: 'TE', nflTeam: 'ATL', adp: 7.1, rank: 7 },
  { name: 'T.J. Hockenson', position: 'TE', nflTeam: 'MIN', adp: 7.4, rank: 8 },
  { name: 'Dalton Kincaid', position: 'TE', nflTeam: 'BUF', adp: 7.8, rank: 9 },
  { name: 'Jake Ferguson', position: 'TE', nflTeam: 'DAL', adp: 8.2, rank: 10 },
  { name: 'David Njoku', position: 'TE', nflTeam: 'CLE', adp: 8.6, rank: 11 },
  { name: 'Pat Freiermuth', position: 'TE', nflTeam: 'PIT', adp: 9.0, rank: 12 },

  // Kickers
  { name: 'Harrison Butker', position: 'K', nflTeam: 'KC', adp: 15.2, rank: 1 },
  { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', adp: 15.5, rank: 2 },
  { name: 'Tyler Bass', position: 'K', nflTeam: 'BUF', adp: 15.8, rank: 3 },
  { name: 'Brandon McManus', position: 'K', nflTeam: 'GB', adp: 16.1, rank: 4 },
  { name: 'Jake Moody', position: 'K', nflTeam: 'SF', adp: 16.4, rank: 5 },
  { name: 'Jason Sanders', position: 'K', nflTeam: 'MIA', adp: 16.7, rank: 6 },
  { name: 'Younghoe Koo', position: 'K', nflTeam: 'ATL', adp: 17.0, rank: 7 },
  { name: 'Daniel Carlson', position: 'K', nflTeam: 'LV', adp: 17.3, rank: 8 },
  { name: 'Chris Boswell', position: 'K', nflTeam: 'PIT', adp: 17.6, rank: 9 },
  { name: 'Cameron Dicker', position: 'K', nflTeam: 'LAC', adp: 17.9, rank: 10 },
  { name: 'Jake Elliott', position: 'K', nflTeam: 'PHI', adp: 18.2, rank: 11 },

  // Defenses
  { name: 'Philadelphia Eagles', position: 'DEF', nflTeam: 'PHI', adp: 14.2, rank: 1 },
  { name: 'San Francisco 49ers', position: 'DEF', nflTeam: 'SF', adp: 14.5, rank: 2 },
  { name: 'Baltimore Ravens', position: 'DEF', nflTeam: 'BAL', adp: 14.8, rank: 3 },
  { name: 'Buffalo Bills', position: 'DEF', nflTeam: 'BUF', adp: 15.1, rank: 4 },
  { name: 'Dallas Cowboys', position: 'DEF', nflTeam: 'DAL', adp: 15.4, rank: 5 },
  { name: 'Miami Dolphins', position: 'DEF', nflTeam: 'MIA', adp: 15.7, rank: 6 },
  { name: 'Pittsburgh Steelers', position: 'DEF', nflTeam: 'PIT', adp: 16.0, rank: 7 },
  { name: 'Cleveland Browns', position: 'DEF', nflTeam: 'CLE', adp: 16.3, rank: 8 },
  { name: 'New York Jets', position: 'DEF', nflTeam: 'NYJ', adp: 16.6, rank: 9 },
  { name: 'Houston Texans', position: 'DEF', nflTeam: 'HOU', adp: 16.9, rank: 10 },
  { name: 'Green Bay Packers', position: 'DEF', nflTeam: 'GB', adp: 17.2, rank: 11 }
];

// Team draft strategy templates
const TEAM_ROSTERS = [
  // Team 1: D'Amato Dynasty (Strong QB, Balanced)
  {
    QB: ['Josh Allen'],
    RB: ['Saquon Barkley', 'James Cook', 'Tony Pollard'],
    WR: ['CeeDee Lamb', 'Garrett Wilson', 'Jordan Addison', 'Terry McLaurin'],
    TE: ['Sam LaPorta'],
    K: ['Harrison Butker'],
    DEF: ['Philadelphia Eagles'],
    BENCH: ['Anthony Richardson', 'Rhamondre Stevenson', 'Rome Odunze']
  },
  // Team 2: Hartley's Heroes (RB Heavy)
  {
    QB: ['Lamar Jackson'],
    RB: ['Christian McCaffrey', 'Kyren Williams', 'De\'Von Achane'],
    WR: ['Tyreek Hill', 'Chris Olave', 'Zay Flowers', 'Brandon Aiyuk'],
    TE: ['Trey McBride'],
    K: ['Justin Tucker'],
    DEF: ['Baltimore Ravens'],
    BENCH: ['Jayden Daniels', 'Raheem Mostert', 'Diontae Johnson']
  },
  // Team 3: McCaigue Mayhem (WR Heavy)
  {
    QB: ['Jalen Hurts'],
    RB: ['Josh Jacobs', 'Aaron Jones', 'D\'Andre Swift'],
    WR: ['A.J. Brown', 'Amon-Ra St. Brown', 'Mike Evans', 'DeVonta Smith', 'Calvin Ridley'],
    TE: ['Travis Kelce'],
    K: ['Tyler Bass'],
    DEF: ['San Francisco 49ers'],
    BENCH: ['Brock Purdy', 'Najee Harris']
  },
  // Team 4: Larry Legends (Veteran Power)
  {
    QB: ['Patrick Mahomes'],
    RB: ['Derrick Henry', 'Alvin Kamara', 'Travis Etienne'],
    WR: ['Davante Adams', 'Cooper Kupp', 'Keenan Allen', 'Tee Higgins'],
    TE: ['Mark Andrews'],
    K: ['Brandon McManus'],
    DEF: ['Buffalo Bills'],
    BENCH: ['Joe Burrow', 'Rachaad White', 'Marvin Harrison Jr.']
  },
  // Team 5: Renee's Reign (Balanced Attack)
  {
    QB: ['Dak Prescott'],
    RB: ['Kenneth Walker III', 'Joe Mixon', 'Jonathan Taylor'],
    WR: ['Puka Nacua', 'DJ Moore', 'Terry McLaurin', 'Diontae Johnson'],
    TE: ['George Kittle'],
    K: ['Jake Moody'],
    DEF: ['Dallas Cowboys'],
    BENCH: ['C.J. Stroud', 'James Cook', 'Keon Coleman']
  },
  // Team 6: Kornbeck Crushers (Explosive Offense)
  {
    QB: ['Tua Tagovailoa'],
    RB: ['Jahmyr Gibbs', 'Raheem Mostert', 'Tank Bigsby'],
    WR: ['Ja\'Marr Chase', 'Stefon Diggs', 'Zay Flowers', 'Jordan Addison'],
    TE: ['Evan Engram'],
    K: ['Jason Sanders'],
    DEF: ['Miami Dolphins'],
    BENCH: ['Justin Herbert', 'Gus Edwards', 'Rome Odunze']
  },
  // Team 7: Jarvey's Juggernauts (Ground and Pound)
  {
    QB: ['Brock Purdy'],
    RB: ['Christian McCaffrey', 'Aaron Jones', 'Najee Harris'],
    WR: ['DK Metcalf', 'Calvin Ridley', 'Keenan Allen', 'Brandon Aiyuk'],
    TE: ['Kyle Pitts'],
    K: ['Younghoe Koo'],
    DEF: ['Pittsburgh Steelers'],
    BENCH: ['Anthony Richardson', 'D\'Andre Swift', 'Marvin Harrison Jr.']
  },
  // Team 8: Lorbecki Lions (Young Talent)
  {
    QB: ['C.J. Stroud'],
    RB: ['De\'Von Achane', 'Jahmyr Gibbs', 'James Cook'],
    WR: ['Garrett Wilson', 'Chris Olave', 'Jordan Addison', 'Rome Odunze'],
    TE: ['T.J. Hockenson'],
    K: ['Daniel Carlson'],
    DEF: ['Cleveland Browns'],
    BENCH: ['Jayden Daniels', 'Tony Pollard', 'Keon Coleman']
  },
  // Team 9: Minor Miracles (Sleeper Picks)
  {
    QB: ['Joe Burrow'],
    RB: ['Jonathan Taylor', 'Travis Etienne', 'Rhamondre Stevenson'],
    WR: ['Tyreek Hill', 'DeVonta Smith', 'Terry McLaurin', 'Diontae Johnson'],
    TE: ['Dalton Kincaid'],
    K: ['Chris Boswell'],
    DEF: ['New York Jets'],
    BENCH: ['Justin Herbert', 'Rachaad White', 'Tee Higgins']
  },
  // Team 10: Bergum Blitz (High Ceiling)
  {
    QB: ['Justin Herbert'],
    RB: ['Saquon Barkley', 'Kenneth Walker III', 'Tony Pollard'],
    WR: ['A.J. Brown', 'Mike Evans', 'Calvin Ridley', 'Brandon Aiyuk'],
    TE: ['Jake Ferguson'],
    K: ['Cameron Dicker'],
    DEF: ['Houston Texans'],
    BENCH: ['Anthony Richardson', 'D\'Andre Swift', 'Rome Odunze']
  },
  // Team 11: A-Rod All-Stars (Power Squad)
  {
    QB: ['Lamar Jackson'],
    RB: ['Josh Jacobs', 'Alvin Kamara', 'Joe Mixon'],
    WR: ['CeeDee Lamb', 'Amon-Ra St. Brown', 'Stefon Diggs', 'Zay Flowers'],
    TE: ['Sam LaPorta'],
    K: ['Jake Elliott'],
    DEF: ['Green Bay Packers'],
    BENCH: ['Dak Prescott', 'Aaron Jones', 'Marvin Harrison Jr.']
  }
];

function generateFantasyPoints(position: string, week: number): { points: number; stats: any } {
  let basePoints = 0;
  let variance = 0;
  let stats = {};

  // Add some week-to-week variation and position-based scoring
  const weekMultiplier = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2 multiplier

  switch (position) {
    case 'QB':
      basePoints = 18 + (Math.random() * 12); // 18-30 base
      variance = 5;
      stats = {
        passingYards: Math.floor(220 + Math.random() * 180),
        passingTouchdowns: Math.floor(1 + Math.random() * 3),
        interceptions: Math.floor(Math.random() * 2),
        rushingYards: Math.floor(Math.random() * 60),
        rushingTouchdowns: Math.floor(Math.random() * 1.5)
      };
      break;
    case 'RB':
      basePoints = 10 + (Math.random() * 15); // 10-25 base
      variance = 6;
      stats = {
        rushingYards: Math.floor(40 + Math.random() * 120),
        rushingTouchdowns: Math.floor(Math.random() * 2.5),
        receivingYards: Math.floor(10 + Math.random() * 50),
        receptions: Math.floor(2 + Math.random() * 6),
        receivingTouchdowns: Math.floor(Math.random() * 1.3)
      };
      break;
    case 'WR':
      basePoints = 8 + (Math.random() * 18); // 8-26 base
      variance = 7;
      stats = {
        receivingYards: Math.floor(30 + Math.random() * 100),
        receptions: Math.floor(3 + Math.random() * 8),
        receivingTouchdowns: Math.floor(Math.random() * 2.2),
        rushingYards: Math.floor(Math.random() * 25),
        rushingTouchdowns: Math.floor(Math.random() * 0.3)
      };
      break;
    case 'TE':
      basePoints = 6 + (Math.random() * 12); // 6-18 base
      variance = 4;
      stats = {
        receivingYards: Math.floor(25 + Math.random() * 80),
        receptions: Math.floor(2 + Math.random() * 6),
        receivingTouchdowns: Math.floor(Math.random() * 1.8)
      };
      break;
    case 'K':
      basePoints = 6 + (Math.random() * 8); // 6-14 base
      variance = 3;
      stats = {
        fieldGoalsMade: Math.floor(1 + Math.random() * 4),
        fieldGoalsAttempted: Math.floor(1 + Math.random() * 5),
        extraPointsMade: Math.floor(1 + Math.random() * 4)
      };
      break;
    case 'DEF':
      basePoints = 5 + (Math.random() * 12); // 5-17 base
      variance = 6;
      stats = {
        sacks: Math.floor(Math.random() * 5),
        interceptions: Math.floor(Math.random() * 3),
        fumbleRecoveries: Math.floor(Math.random() * 2),
        touchdowns: Math.floor(Math.random() * 1.5),
        pointsAllowed: Math.floor(10 + Math.random() * 25)
      };
      break;
  }

  // Add some random variance
  const finalPoints = Math.max(0, (basePoints + (Math.random() - 0.5) * variance) * weekMultiplier);
  
  return {
    points: Math.round(finalPoints * 10) / 10,
    stats
  };
}

// Week matchup pairings (11 teams means 1 bye each week)
const WEEK_MATCHUPS = [
  // Week 1
  [
    { home: 0, away: 1 },  // D'Amato vs Hartley
    { home: 2, away: 3 },  // McCaigue vs Larry
    { home: 4, away: 5 },  // Renee vs Kornbeck
    { home: 6, away: 7 },  // Jarvey vs Lorbecki
    { home: 8, away: 9 },  // Minor vs Bergum
    // A-Rod (index 10) has BYE
  ],
  // Week 2
  [
    { home: 10, away: 0 }, // A-Rod vs D'Amato
    { home: 1, away: 2 },  // Hartley vs McCaigue
    { home: 3, away: 4 },  // Larry vs Renee
    { home: 5, away: 6 },  // Kornbeck vs Jarvey
    { home: 7, away: 8 },  // Lorbecki vs Minor
    // Bergum (index 9) has BYE
  ],
  // Week 3
  [
    { home: 9, away: 10 }, // Bergum vs A-Rod
    { home: 0, away: 3 },  // D'Amato vs Larry
    { home: 1, away: 4 },  // Hartley vs Renee
    { home: 2, away: 5 },  // McCaigue vs Kornbeck
    { home: 6, away: 8 },  // Jarvey vs Minor
    // Lorbecki (index 7) has BYE
  ]
];

async function seedComprehensiveFantasyFootball() {
  console.log('🏈 Starting Comprehensive Fantasy Football Database Seeding...\n');

  try {
    // Clear existing data
    console.log('🗑️ Clearing existing fantasy data...');
    await prisma.chatMessage.deleteMany();
    await prisma.tradeProposal.deleteMany();
    await prisma.matchup.deleteMany();
    await prisma.rosterPlayer.deleteMany();
    await prisma.team.deleteMany();
    await prisma.playerStats.deleteMany();
    await prisma.playerProjection.deleteMany();
    await prisma.playerNews.deleteMany();
    await prisma.player.deleteMany();
    await prisma.league.deleteMany();

    // Step 1: Create Users
    console.log('\n👥 Creating users...');
    const users = [];
    for (const member of DAMATO_DYNASTY_MEMBERS) {
      const hashedPassword = await bcrypt.hash('Dynasty2025!', 10);
      
      const user = await prisma.user.upsert({
        where: { email: member.email },
        update: {
          name: member.name,
          role: member.role,
          teamName: member.teamName
        },
        create: {
          email: member.email,
          hashedPassword,
          name: member.name,
          role: member.role,
          teamName: member.teamName
        }
      });
      
      users.push(user);
      console.log(`  ✅ User: ${member.name}`);
    }

    // Step 2: Create League
    console.log('\n🏆 Creating league...');
    const league = await prisma.league.create({
      data: {
        name: "D'Amato Dynasty League",
        description: "Elite fantasy football competition among the D'Amato Dynasty members",
        isActive: true,
        playoffs: false,
        currentWeek: 4, // Currently in week 4
        maxTeams: 11
      }
    });
    console.log(`  ✅ League created: ${league.name}`);

    // Step 3: Create Players
    console.log('\n🏃‍♂️ Creating player pool...');
    const players = [];
    for (const playerData of FANTASY_PLAYERS) {
      const player = await prisma.player.create({
        data: {
          name: playerData.name,
          position: playerData.position,
          nflTeam: playerData.nflTeam,
          adp: playerData.adp,
          rank: playerData.rank,
          isFantasyRelevant: true
        }
      });
      players.push(player);
      console.log(`  ✅ Player: ${playerData.name} (${playerData.position} - ${playerData.nflTeam})`);
    }

    // Step 4: Create Teams and Rosters
    console.log('\n🎽 Creating teams and rosters...');
    const teams = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const member = DAMATO_DYNASTY_MEMBERS[i];
      
      const team = await prisma.team.create({
        data: {
          name: member.teamName,
          ownerId: user.id,
          leagueId: league.id,
          wins: 0,
          losses: 0,
          ties: 0
        }
      });
      teams.push(team);

      // Add players to roster based on template
      const rosterTemplate = TEAM_ROSTERS[i];
      const rosterPlayers = [];

      // Add all positions to roster
      for (const [position, playerNames] of Object.entries(rosterTemplate)) {
        for (const playerName of playerNames) {
          const player = players.find(p => p.name === playerName);
          if (player) {
            const isStarter = position !== 'BENCH';
            const rosterPlayer = await prisma.rosterPlayer.create({
              data: {
                teamId: team.id,
                playerId: player.id,
                position: position === 'BENCH' ? 'BENCH' : position,
                isStarter
              }
            });
            rosterPlayers.push(rosterPlayer);
          }
        }
      }

      console.log(`  ✅ Team: ${member.teamName} (${rosterPlayers.length} players)`);
    }

    // Step 5: Generate Player Stats for Weeks 1-3
    console.log('\n📊 Generating player statistics for weeks 1-3...');
    for (let week = 1; week <= 3; week++) {
      for (const player of players) {
        const { points, stats } = generateFantasyPoints(player.position, week);
        
        await prisma.playerStats.create({
          data: {
            playerId: player.id,
            week,
            season: 2025,
            fantasyPoints: points,
            stats: JSON.stringify(stats)
          }
        });
      }
      console.log(`  ✅ Week ${week} stats generated for ${players.length} players`);
    }

    // Step 6: Create Matchups and Calculate Scores for Weeks 1-3
    console.log('\n⚔️ Creating matchups and calculating scores...');
    for (let week = 1; week <= 3; week++) {
      const matchups = WEEK_MATCHUPS[week - 1];
      
      for (const matchup of matchups) {
        const homeTeam = teams[matchup.home];
        const awayTeam = teams[matchup.away];

        // Calculate team scores for this week
        const homeScore = await calculateTeamScore(homeTeam.id, week);
        const awayScore = await calculateTeamScore(awayTeam.id, week);

        // Create matchup
        const matchupRecord = await prisma.matchup.create({
          data: {
            week,
            season: 2025,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeScore,
            awayScore,
            isComplete: true,
            leagueId: league.id
          }
        });

        // Update team records
        if (homeScore > awayScore) {
          await prisma.team.update({
            where: { id: homeTeam.id },
            data: { wins: { increment: 1 } }
          });
          await prisma.team.update({
            where: { id: awayTeam.id },
            data: { losses: { increment: 1 } }
          });
        } else if (awayScore > homeScore) {
          await prisma.team.update({
            where: { id: awayTeam.id },
            data: { wins: { increment: 1 } }
          });
          await prisma.team.update({
            where: { id: homeTeam.id },
            data: { losses: { increment: 1 } }
          });
        } else {
          await prisma.team.update({
            where: { id: homeTeam.id },
            data: { ties: { increment: 1 } }
          });
          await prisma.team.update({
            where: { id: awayTeam.id },
            data: { ties: { increment: 1 } }
          });
        }

        console.log(`  ✅ Week ${week}: ${homeTeam.name} ${homeScore.toFixed(1)} - ${awayScore.toFixed(1)} ${awayTeam.name}`);
      }
    }

    // Step 7: Create Week 4 Matchups (Upcoming)
    console.log('\n📅 Creating Week 4 matchups...');
    const week4Matchups = [
      { home: 7, away: 9 },  // Lorbecki vs Bergum
      { home: 0, away: 2 },  // D'Amato vs McCaigue
      { home: 1, away: 3 },  // Hartley vs Larry
      { home: 4, away: 6 },  // Renee vs Jarvey
      { home: 5, away: 8 },  // Kornbeck vs Minor
      // A-Rod (index 10) has BYE
    ];

    for (const matchup of week4Matchups) {
      const homeTeam = teams[matchup.home];
      const awayTeam = teams[matchup.away];

      await prisma.matchup.create({
        data: {
          week: 4,
          season: 2025,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeScore: 0,
          awayScore: 0,
          isComplete: false,
          leagueId: league.id
        }
      });

      console.log(`  ✅ Week 4: ${homeTeam.name} vs ${awayTeam.name}`);
    }

    // Step 8: Generate Week 4 Projections
    console.log('\n🔮 Generating Week 4 projections...');
    for (const player of players) {
      const { points } = generateFantasyPoints(player.position, 4);
      
      await prisma.playerProjection.create({
        data: {
          playerId: player.id,
          week: 4,
          season: 2025,
          projectedPoints: points,
          confidence: 0.7 + Math.random() * 0.3 // 0.7 to 1.0 confidence
        }
      });
    }
    console.log(`  ✅ Projections created for ${players.length} players`);

    // Step 9: Create Sample Trades and Transactions
    console.log('\n💱 Creating sample trades...');
    
    // Sample trade proposal
    await prisma.tradeProposal.create({
      data: {
        proposingTeamId: teams[1].id, // Hartley
        receivingTeamId: teams[3].id, // Larry
        givingPlayerIds: JSON.stringify([players.find(p => p.name === 'De\'Von Achane')?.id]),
        receivingPlayerIds: JSON.stringify([players.find(p => p.name === 'Cooper Kupp')?.id]),
        message: "I think this trade helps both our teams. Your veteran experience for my explosive upside!",
        status: "PENDING"
      }
    });

    // Sample completed trade
    await prisma.tradeProposal.create({
      data: {
        proposingTeamId: teams[0].id, // D'Amato
        receivingTeamId: teams[2].id, // McCaigue
        givingPlayerIds: JSON.stringify([players.find(p => p.name === 'Anthony Richardson')?.id]),
        receivingPlayerIds: JSON.stringify([players.find(p => p.name === 'Brock Purdy')?.id]),
        message: "Let's swap QBs for different upside profiles",
        status: "ACCEPTED",
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    });

    console.log('  ✅ Sample trades created');

    // Step 10: Create League Chat Messages
    console.log('\n💬 Creating league chat...');
    
    const chatMessages = [
      { userId: users[0].id, content: "Welcome to the D'Amato Dynasty League! Let's have a great season everyone!", type: "ANNOUNCEMENT" },
      { userId: users[1].id, content: "Good luck everyone! May the best team win 🏆", type: "TEXT" },
      { userId: users[2].id, content: "My team is looking scary this year... watch out! 😈", type: "TEXT" },
      { userId: users[3].id, content: "Experience beats youth every time. Let's see what you got kids!", type: "TEXT" },
      { userId: users[4].id, content: "Anyone interested in trading? I'm looking for RB depth", type: "TEXT" },
      { userId: users[5].id, content: "Week 3 was crazy! So many upsets", type: "TEXT" }
    ];

    for (const message of chatMessages) {
      await prisma.chatMessage.create({
        data: {
          ...message,
          leagueId: league.id,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
        }
      });
    }

    console.log('  ✅ League chat created');

    // Final Report
    console.log('\n🎉 FANTASY FOOTBALL DATABASE SEEDING COMPLETE! 🎉');
    console.log('\n📈 LEAGUE SUMMARY:');
    console.log(`• League: ${league.name}`);
    console.log(`• Teams: ${teams.length}`);
    console.log(`• Players: ${players.length}`);
    console.log(`• Current Week: ${league.currentWeek}`);
    console.log(`• Completed Weeks: 1-3`);
    
    console.log('\n🏆 CURRENT STANDINGS:');
    const teamsWithRecords = await prisma.team.findMany({
      include: {
        owner: true
      },
      orderBy: [
        { wins: 'desc' },
        { losses: 'asc' }
      ]
    });

    teamsWithRecords.forEach((team, index) => {
      const record = `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''}`;
      console.log(`${index + 1}. ${team.name} (${team.owner.name}) - ${record}`);
    });

    console.log('\n⚡ WHAT\'S AVAILABLE:');
    console.log('• Complete 3-week game history with realistic scores');
    console.log('• All 11 users have fully drafted teams');
    console.log('• Week 4 matchups ready to begin');
    console.log('• Player stats and projections');
    console.log('• League standings and team records');
    console.log('• Sample trades and league chat');
    console.log('• Waiver wire system ready');
    
    console.log('\n🔐 LOGIN INFO:');
    console.log('Email: [firstname]@damato-dynasty.com');
    console.log('Password: Dynasty2025!');

  } catch (error) {
    console.error('❌ Error seeding fantasy football database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function calculateTeamScore(teamId: string, week: number): Promise<number> {
  // Get all roster players for this team that are starters
  const rosterPlayers = await prisma.rosterPlayer.findMany({
    where: {
      teamId,
      isStarter: true
    },
    include: {
      player: {
        include: {
          stats: {
            where: {
              week,
              season: 2025
            }
          }
        }
      }
    }
  });

  let totalScore = 0;
  for (const rosterPlayer of rosterPlayers) {
    const playerStats = rosterPlayer.player.stats[0];
    if (playerStats) {
      totalScore += playerStats.fantasyPoints;
    }
  }

  return Math.round(totalScore * 10) / 10;
}

// Run the comprehensive seeding
seedComprehensiveFantasyFootball()
  .then(() => {
    console.log('\n✅ Comprehensive Fantasy Football Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });