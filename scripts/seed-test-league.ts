import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// NFL Week 3 2025 Top Players by Position (for realistic draft)
const TOP_PLAYERS = {
  QB: [
    { name: 'Josh Allen', espnId: '3918298', team: 'BUF', adp: 1 },
    { name: 'Jalen Hurts', espnId: '4040715', team: 'PHI', adp: 2 },
    { name: 'Patrick Mahomes', espnId: '3139477', team: 'KC', adp: 3 },
    { name: 'Lamar Jackson', espnId: '3916387', team: 'BAL', adp: 4 },
    { name: 'Dak Prescott', espnId: '2577417', team: 'DAL', adp: 5 },
    { name: 'Tua Tagovailoa', espnId: '4241479', team: 'MIA', adp: 6 },
    { name: 'Justin Herbert', espnId: '4038941', team: 'LAC', adp: 7 },
    { name: 'Joe Burrow', espnId: '3915511', team: 'CIN', adp: 8 },
    { name: 'C.J. Stroud', espnId: '4432577', team: 'HOU', adp: 9 },
    { name: 'Trevor Lawrence', espnId: '4360310', team: 'JAX', adp: 10 },
    { name: 'Jared Goff', espnId: '2977644', team: 'DET', adp: 11 },
    { name: 'Kirk Cousins', espnId: '14880', team: 'ATL', adp: 12 },
    { name: 'Jordan Love', espnId: '4036378', team: 'GB', adp: 13 },
    { name: 'Kyler Murray', espnId: '3917315', team: 'ARI', adp: 14 },
    { name: 'Deshaun Watson', espnId: '3126486', team: 'CLE', adp: 15 }
  ],
  RB: [
    { name: 'Christian McCaffrey', espnId: '3117251', team: 'SF', adp: 1 },
    { name: 'Breece Hall', espnId: '4360294', team: 'NYJ', adp: 2 },
    { name: 'Bijan Robinson', espnId: '4426502', team: 'ATL', adp: 3 },
    { name: 'Saquon Barkley', espnId: '3929630', team: 'PHI', adp: 4 },
    { name: 'Jonathan Taylor', espnId: '4242335', team: 'IND', adp: 5 },
    { name: 'Derrick Henry', espnId: '3043078', team: 'BAL', adp: 6 },
    { name: 'Jahmyr Gibbs', espnId: '4427366', team: 'DET', adp: 7 },
    { name: 'Travis Etienne Jr.', espnId: '4239996', team: 'JAX', adp: 8 },
    { name: 'Josh Jacobs', espnId: '4047365', team: 'GB', adp: 9 },
    { name: 'Kenneth Walker III', espnId: '4426385', team: 'SEA', adp: 10 },
    { name: 'Joe Mixon', espnId: '3116385', team: 'HOU', adp: 11 },
    { name: 'Rachaad White', espnId: '4360438', team: 'TB', adp: 12 },
    { name: 'Isiah Pacheco', espnId: '4362885', team: 'KC', adp: 13 },
    { name: 'Alvin Kamara', espnId: '3054850', team: 'NO', adp: 14 },
    { name: 'James Cook', espnId: '4429507', team: 'BUF', adp: 15 },
    { name: 'Aaron Jones', espnId: '3042519', team: 'MIN', adp: 16 },
    { name: 'De\'Von Achane', espnId: '4429486', team: 'MIA', adp: 17 },
    { name: 'Rhamondre Stevenson', espnId: '4242534', team: 'NE', adp: 18 },
    { name: 'Tony Pollard', espnId: '4048244', team: 'TEN', adp: 19 },
    { name: 'Kyren Williams', espnId: '4379399', team: 'LAR', adp: 20 },
    { name: 'Najee Harris', espnId: '4240021', team: 'PIT', adp: 21 },
    { name: 'David Montgomery', espnId: '3886803', team: 'DET', adp: 22 },
    { name: 'James Conner', espnId: '3045147', team: 'ARI', adp: 23 },
    { name: 'D\'Andre Swift', espnId: '4040761', team: 'CHI', adp: 24 },
    { name: 'Javonte Williams', espnId: '4240703', team: 'DEN', adp: 25 }
  ],
  WR: [
    { name: 'Tyreek Hill', espnId: '3116406', team: 'MIA', adp: 1 },
    { name: 'CeeDee Lamb', espnId: '4241389', team: 'DAL', adp: 2 },
    { name: 'Justin Jefferson', espnId: '4262921', team: 'MIN', adp: 3 },
    { name: 'Ja\'Marr Chase', espnId: '4239993', team: 'CIN', adp: 4 },
    { name: 'Amon-Ra St. Brown', espnId: '4047650', team: 'DET', adp: 5 },
    { name: 'A.J. Brown', espnId: '3138217', team: 'PHI', adp: 6 },
    { name: 'Puka Nacua', espnId: '4577039', team: 'LAR', adp: 7 },
    { name: 'Garrett Wilson', espnId: '4430027', team: 'NYJ', adp: 8 },
    { name: 'Chris Olave', espnId: '4362628', team: 'NO', adp: 9 },
    { name: 'Davante Adams', espnId: '16800', team: 'LV', adp: 10 },
    { name: 'Mike Evans', espnId: '16737', team: 'TB', adp: 11 },
    { name: 'DK Metcalf', espnId: '3929829', team: 'SEA', adp: 12 },
    { name: 'Stefon Diggs', espnId: '2976212', team: 'HOU', adp: 13 },
    { name: 'Brandon Aiyuk', espnId: '4047038', team: 'SF', adp: 14 },
    { name: 'Cooper Kupp', espnId: '3051376', team: 'LAR', adp: 15 },
    { name: 'Nico Collins', espnId: '3925357', team: 'HOU', adp: 16 },
    { name: 'Deebo Samuel', espnId: '3115365', team: 'SF', adp: 17 },
    { name: 'Marvin Harrison Jr.', espnId: '4685702', team: 'ARI', adp: 18 },
    { name: 'DJ Moore', espnId: '4034688', team: 'CHI', adp: 19 },
    { name: 'Jaylen Waddle', espnId: '4241478', team: 'MIA', adp: 20 },
    { name: 'DeVonta Smith', espnId: '4241460', team: 'PHI', adp: 21 },
    { name: 'Calvin Ridley', espnId: '3925347', team: 'TEN', adp: 22 },
    { name: 'Michael Pittman Jr.', espnId: '4035687', team: 'IND', adp: 23 },
    { name: 'Tee Higgins', espnId: '4239609', team: 'CIN', adp: 24 },
    { name: 'Keenan Allen', espnId: '15818', team: 'CHI', adp: 25 },
    { name: 'Amari Cooper', espnId: '2976499', team: 'CLE', adp: 26 },
    { name: 'Terry McLaurin', espnId: '4039050', team: 'WAS', adp: 27 },
    { name: 'George Pickens', espnId: '4427369', team: 'PIT', adp: 28 },
    { name: 'Zay Flowers', espnId: '4432594', team: 'BAL', adp: 29 },
    { name: 'Drake London', espnId: '4362887', team: 'ATL', adp: 30 }
  ],
  TE: [
    { name: 'Sam LaPorta', espnId: '4430024', team: 'DET', adp: 1 },
    { name: 'Travis Kelce', espnId: '15847', team: 'KC', adp: 2 },
    { name: 'Mark Andrews', espnId: '4035538', team: 'BAL', adp: 3 },
    { name: 'Trey McBride', espnId: '4430090', team: 'ARI', adp: 4 },
    { name: 'George Kittle', espnId: '3040151', team: 'SF', adp: 5 },
    { name: 'Dalton Kincaid', espnId: '4430027', team: 'BUF', adp: 6 },
    { name: 'Kyle Pitts', espnId: '4361050', team: 'ATL', adp: 7 },
    { name: 'T.J. Hockenson', espnId: '4040715', team: 'MIN', adp: 8 },
    { name: 'Evan Engram', espnId: '3051392', team: 'JAX', adp: 9 },
    { name: 'Jake Ferguson', espnId: '4572651', team: 'DAL', adp: 10 },
    { name: 'Dallas Goedert', espnId: '3116365', team: 'PHI', adp: 11 },
    { name: 'David Njoku', espnId: '3052899', team: 'CLE', adp: 12 }
  ],
  K: [
    { name: 'Justin Tucker', espnId: '15683', team: 'BAL', adp: 1 },
    { name: 'Harrison Butker', espnId: '2577417', team: 'KC', adp: 2 },
    { name: 'Jake Elliott', espnId: '3051392', team: 'PHI', adp: 3 },
    { name: 'Tyler Bass', espnId: '3918298', team: 'BUF', adp: 4 },
    { name: 'Younghoe Koo', espnId: '3051914', team: 'ATL', adp: 5 },
    { name: 'Brandon Aubrey', espnId: '4572680', team: 'DAL', adp: 6 },
    { name: 'Jason Sanders', espnId: '3046439', team: 'MIA', adp: 7 },
    { name: 'Greg Zuerlein', espnId: '15072', team: 'NYJ', adp: 8 },
    { name: 'Jake Moody', espnId: '4432594', team: 'SF', adp: 9 },
    { name: 'Ka\'imi Fairbairn', espnId: '2977644', team: 'HOU', adp: 10 }
  ],
  DEF: [
    { name: 'San Francisco 49ers', espnId: 'DEF-SF', team: 'SF', adp: 1 },
    { name: 'Baltimore Ravens', espnId: 'DEF-BAL', team: 'BAL', adp: 2 },
    { name: 'Dallas Cowboys', espnId: 'DEF-DAL', team: 'DAL', adp: 3 },
    { name: 'Cleveland Browns', espnId: 'DEF-CLE', team: 'CLE', adp: 4 },
    { name: 'New York Jets', espnId: 'DEF-NYJ', team: 'NYJ', adp: 5 },
    { name: 'Buffalo Bills', espnId: 'DEF-BUF', team: 'BUF', adp: 6 },
    { name: 'Pittsburgh Steelers', espnId: 'DEF-PIT', team: 'PIT', adp: 7 },
    { name: 'Kansas City Chiefs', espnId: 'DEF-KC', team: 'KC', adp: 8 },
    { name: 'Miami Dolphins', espnId: 'DEF-MIA', team: 'MIA', adp: 9 },
    { name: 'New Orleans Saints', espnId: 'DEF-NO', team: 'NO', adp: 10 }
  ]
};

async function main() {
  console.log('🏈 Setting up 10-person test league...');
  
  // Clear existing data
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.message.deleteMany(),
    prisma.tradeProposal.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.matchup.deleteMany(),
    prisma.projection.deleteMany(),
    prisma.playerStats.deleteMany(),
    prisma.roster.deleteMany(),
    prisma.playerNews.deleteMany(),
    prisma.player.deleteMany(),
    prisma.team.deleteMany(),
    prisma.league.deleteMany(),
    prisma.userPreferences.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  
  // Create all 10 users
  const users = [
    { 
      name: "Nicholas D'Amato", 
      email: "nicholas.damato@test.com",
      isCommissioner: true,
      teamName: "D'Amato Dynasty"
    },
    { 
      name: "Nick Hartley", 
      email: "nick.hartley@test.com",
      isCommissioner: false,
      teamName: "Hartley's Heroes"
    },
    { 
      name: "Jack McCaigue", 
      email: "jack.mccaigue@test.com",
      isCommissioner: false,
      teamName: "Jack Attack"
    },
    { 
      name: "Larry McCaigue", 
      email: "larry.mccaigue@test.com",
      isCommissioner: false,
      teamName: "Larry's Legends"
    },
    { 
      name: "Renee McCaigue", 
      email: "renee.mccaigue@test.com",
      isCommissioner: false,
      teamName: "Renee's Reign"
    },
    { 
      name: "Jon Kornbeck", 
      email: "jon.kornbeck@test.com",
      isCommissioner: false,
      teamName: "Kornbeck Crushers"
    },
    { 
      name: "David Jarvey", 
      email: "david.jarvey@test.com",
      isCommissioner: false,
      teamName: "Jarvey's Juggernauts"
    },
    { 
      name: "Kaity Lorbecki", 
      email: "kaity.lorbecki@test.com",
      isCommissioner: false,
      teamName: "Kaity's Knights"
    },
    { 
      name: "Cason Minor", 
      email: "cason.minor@test.com",
      isCommissioner: false,
      teamName: "Minor Threat"
    },
    { 
      name: "Brittany Bergum", 
      email: "brittany.bergum@test.com",
      isCommissioner: false,
      teamName: "Bergum's Best"
    }
  ];
  
  const hashedPassword = await bcrypt.hash('fantasy2025', 10);
  
  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        emailVerified: new Date(),
        accounts: {
          create: {
            type: 'credentials',
            provider: 'credentials',
            providerAccountId: userData.email,
          }
        },
        preferences: {
          create: {
            emailNotifications: true,
            pushNotifications: true,
            theme: 'dark',
            timezone: 'America/New_York'
          }
        }
      }
    });
    
    createdUsers.push({ ...user, ...userData });
    console.log(`✅ Created user: ${user.name}`);
  }
  
  // Create the league with Nicholas D'Amato as commissioner
  const nicholas = createdUsers[0];
  const league = await prisma.league.create({
    data: {
      name: "Test League 2025",
      commissionerId: nicholas.id,
      season: "2025",
      currentWeek: 3, // Starting in Week 3
      isActive: true,
      settings: {
        maxTeams: 10,
        playoffTeams: 4,
        regularSeasonWeeks: 14,
        playoffWeeks: 3,
        tradeDeadline: 10,
        waiverType: 'rolling',
        waiverBudget: 100
      },
      scoringSettings: {
        // Standard PPR scoring
        pass_yd: 0.04,
        pass_td: 4,
        pass_int: -2,
        rush_yd: 0.1,
        rush_td: 6,
        rec: 1, // PPR
        rec_yd: 0.1,
        rec_td: 6,
        fumble: -2,
        fg_0_39: 3,
        fg_40_49: 4,
        fg_50_plus: 5,
        xp: 1,
        dst_td: 6,
        dst_sack: 1,
        dst_int: 2,
        dst_ff: 1,
        dst_fr: 1,
        dst_safety: 2
      },
      rosterSettings: {
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        FLEX: 1,
        K: 1,
        DEF: 1,
        BENCH: 6,
        IR: 1
      },
      draftSettings: {
        type: 'snake',
        rounds: 16,
        secondsPerPick: 90,
        date: new Date('2025-08-28') // Draft date (before season)
      }
    }
  });
  
  console.log(`✅ Created league: ${league.name}`);
  
  // Create teams for all users
  const teams = [];
  for (const user of createdUsers) {
    const team = await prisma.team.create({
      data: {
        name: user.teamName,
        ownerId: user.id,
        leagueId: league.id,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0
      }
    });
    teams.push(team);
    console.log(`✅ Created team: ${team.name}`);
  }
  
  // Add all players to database
  console.log('📊 Adding NFL players to database...');
  const allPlayers = [];
  
  for (const [position, players] of Object.entries(TOP_PLAYERS)) {
    for (const playerData of players) {
      const player = await prisma.player.upsert({
        where: { espnId: playerData.espnId },
        update: {
          name: playerData.name,
          position: position === 'DEF' ? 'DST' : position,
          nflTeam: playerData.team,
          adp: playerData.adp,
          status: 'active'
        },
        create: {
          espnId: playerData.espnId,
          name: playerData.name,
          position: position === 'DEF' ? 'DST' : position,
          nflTeam: playerData.team,
          adp: playerData.adp,
          status: 'active'
        }
      });
      allPlayers.push({ ...player, position, adpRank: playerData.adp });
    }
  }
  
  // Conduct a strategic draft with Nicholas getting a competitive team
  console.log('🎯 Conducting strategic draft...');
  await conductStrategicDraft(teams, allPlayers);
  
  // Create Week 1 & 2 results (simulated past weeks)
  await createPastWeekResults(league.id, teams, 1);
  await createPastWeekResults(league.id, teams, 2);
  
  // Create Week 3 matchups (current week)
  await createWeekMatchups(league.id, teams, 3, false);
  
  // Send welcome notifications
  for (const user of createdUsers) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'welcome',
        title: 'Welcome to Test League 2025!',
        message: `You've been added to the league. ${user.isCommissioner ? 'You are the commissioner.' : ''} Good luck this season!`,
        data: { leagueId: league.id }
      }
    });
  }
  
  console.log('✅ League setup complete!');
  console.log('📝 All users can login with password: fantasy2025');
  console.log(`👑 Commissioner: Nicholas D'Amato`);
}

async function conductStrategicDraft(teams: any[], allPlayers: any[]) {
  // Give Nicholas D'Amato the 3rd draft position (optimal spot)
  const nicholas = teams.find(t => t.name === "D'Amato Dynasty");
  const otherTeams = teams.filter(t => t.id !== nicholas.id);
  
  // Randomize other teams, place Nicholas at position 3
  const shuffledOthers = [...otherTeams].sort(() => Math.random() - 0.5);
  const draftOrder = [
    shuffledOthers[0],
    shuffledOthers[1],
    nicholas, // Nicholas gets 3rd pick
    ...shuffledOthers.slice(2)
  ];
  
  console.log('📋 Draft Order:');
  draftOrder.forEach((team, index) => {
    console.log(`${index + 1}. ${team.name}${team.id === nicholas.id ? ' 👑' : ''}`);
  });
  
  // Track drafted players
  const draftedPlayers = new Set<string>();
  const teamRosters: Map<string, any[]> = new Map();
  teams.forEach(team => teamRosters.set(team.id, []));
  
  // Snake draft - 16 rounds
  for (let round = 1; round <= 16; round++) {
    // Snake order: odd rounds forward, even rounds reverse
    const order = round % 2 === 1 ? [...draftOrder] : [...draftOrder].reverse();
    
    console.log(`\n--- Round ${round} ---`);
    
    for (const team of order) {
      const roster = teamRosters.get(team.id) || [];
      
      let selectedPlayer;
      if (team.id === nicholas.id) {
        // Strategic picks for Nicholas
        selectedPlayer = selectStrategicPlayerForNicholas(
          round,
          allPlayers,
          draftedPlayers,
          roster
        );
      } else {
        // Standard picks for other teams
        selectedPlayer = selectBestAvailablePlayer(
          round,
          allPlayers,
          draftedPlayers,
          roster
        );
      }
      
      if (selectedPlayer) {
        // Determine roster position
        const rosterSpot = determineRosterPosition(selectedPlayer.position, roster);
        
        await prisma.roster.create({
          data: {
            teamId: team.id,
            playerId: selectedPlayer.id,
            position: rosterSpot,
            isStarter: !rosterSpot.startsWith('BENCH'),
            acquisitionType: 'draft'
          }
        });
        
        roster.push({ ...selectedPlayer, rosterPosition: rosterSpot });
        teamRosters.set(team.id, roster);
        draftedPlayers.add(selectedPlayer.id);
        
        console.log(`${team.name} selects: ${selectedPlayer.name} (${selectedPlayer.position})${team.id === nicholas.id ? ' 👑' : ''}`);
      }
    }
  }
  
  console.log('\n✅ Draft complete - Nicholas has a championship-caliber team!');
}

function selectStrategicPlayerForNicholas(
  round: number,
  allPlayers: any[],
  draftedPlayers: Set<string>,
  currentRoster: any[]
): any {
  const availablePlayers = allPlayers.filter(p => !draftedPlayers.has(p.id));
  
  // Count current positions
  const rosterCounts = {
    QB: currentRoster.filter(p => p.position === 'QB').length,
    RB: currentRoster.filter(p => p.position === 'RB').length,
    WR: currentRoster.filter(p => p.position === 'WR').length,
    TE: currentRoster.filter(p => p.position === 'TE').length,
    K: currentRoster.filter(p => p.position === 'K').length,
    DST: currentRoster.filter(p => p.position === 'DST').length,
  };
  
  // Strategic picks for Nicholas to build a championship team
  switch(round) {
    case 1: // Round 1: Top 3 RB or elite WR
      const eliteRBs = availablePlayers.filter(p => p.position === 'RB' && p.adpRank <= 3);
      if (eliteRBs.length > 0) return eliteRBs[0];
      
      const eliteWRs = availablePlayers.filter(p => p.position === 'WR' && p.adpRank <= 5);
      return eliteWRs[0];
      
    case 2: // Round 2: Elite WR or top RB
      const topWRs = availablePlayers.filter(p => p.position === 'WR' && p.adpRank <= 8);
      if (topWRs.length > 0) return topWRs[0];
      
      const topRBs = availablePlayers.filter(p => p.position === 'RB' && p.adpRank <= 10);
      return topRBs[0];
      
    case 3: // Round 3: Best RB/WR available
      const flexPlayers = availablePlayers.filter(p => 
        (p.position === 'RB' || p.position === 'WR') && p.adpRank <= 15
      );
      return flexPlayers[0];
      
    case 4: // Round 4: Elite QB if available, otherwise best flex
      const eliteQBs = availablePlayers.filter(p => p.position === 'QB' && p.adpRank <= 5);
      if (eliteQBs.length > 0) return eliteQBs[0];
      
      const bestFlex = availablePlayers.filter(p => 
        p.position === 'RB' || p.position === 'WR'
      );
      return bestFlex[0];
      
    case 5: // Round 5: QB if needed, otherwise best available
      if (rosterCounts.QB === 0) {
        const qbs = availablePlayers.filter(p => p.position === 'QB');
        return qbs[0];
      }
      
      const bestAvail = availablePlayers.filter(p => 
        p.position === 'RB' || p.position === 'WR'
      );
      return bestAvail[0];
      
    case 6: // Round 6: Elite TE
      const eliteTEs = availablePlayers.filter(p => p.position === 'TE' && p.adpRank <= 5);
      if (eliteTEs.length > 0) return eliteTEs[0];
      
      return availablePlayers.filter(p => 
        p.position === 'RB' || p.position === 'WR'
      )[0];
      
    default:
      // Standard strategy for later rounds
      return selectBestAvailablePlayer(round, allPlayers, draftedPlayers, currentRoster);
  }
}

function selectBestAvailablePlayer(
  round: number,
  allPlayers: any[],
  draftedPlayers: Set<string>,
  currentRoster: any[]
): any {
  const availablePlayers = allPlayers.filter(p => !draftedPlayers.has(p.id));
  
  // Count current positions
  const rosterCounts = {
    QB: currentRoster.filter(p => p.position === 'QB').length,
    RB: currentRoster.filter(p => p.position === 'RB').length,
    WR: currentRoster.filter(p => p.position === 'WR').length,
    TE: currentRoster.filter(p => p.position === 'TE').length,
    K: currentRoster.filter(p => p.position === 'K').length,
    DST: currentRoster.filter(p => p.position === 'DST').length,
  };
  
  // Standard draft strategy with randomness
  const randomFactor = Math.random();
  
  // Rounds 1-3: Focus on RB/WR
  if (round <= 3) {
    const rbWr = availablePlayers.filter(p => p.position === 'RB' || p.position === 'WR');
    if (rbWr.length > 0) {
      const topChoices = rbWr.slice(0, 3);
      return topChoices[Math.floor(Math.random() * topChoices.length)];
    }
  }
  
  // Rounds 4-6: Fill out starting lineup
  if (round >= 4 && round <= 6) {
    if (rosterCounts.QB === 0 && randomFactor > 0.3) {
      const qbs = availablePlayers.filter(p => p.position === 'QB');
      if (qbs.length > 0) {
        const topQBs = qbs.slice(0, 2);
        return topQBs[Math.floor(Math.random() * topQBs.length)];
      }
    }
    
    if (rosterCounts.TE === 0 && randomFactor > 0.5) {
      const tes = availablePlayers.filter(p => p.position === 'TE');
      if (tes.length > 0) {
        const topTEs = tes.slice(0, 2);
        return topTEs[Math.floor(Math.random() * topTEs.length)];
      }
    }
    
    const rbWr = availablePlayers.filter(p => p.position === 'RB' || p.position === 'WR');
    if (rbWr.length > 0) {
      const topChoices = rbWr.slice(0, 3);
      return topChoices[Math.floor(Math.random() * topChoices.length)];
    }
  }
  
  // Rounds 7-10: Fill needs
  if (round >= 7 && round <= 10) {
    if (rosterCounts.QB === 0) {
      return availablePlayers.find(p => p.position === 'QB');
    }
    
    if (rosterCounts.TE === 0) {
      return availablePlayers.find(p => p.position === 'TE');
    }
    
    if (rosterCounts.RB < 3) {
      return availablePlayers.find(p => p.position === 'RB');
    }
    if (rosterCounts.WR < 3) {
      return availablePlayers.find(p => p.position === 'WR');
    }
    
    const flex = availablePlayers.filter(p => 
      p.position === 'RB' || p.position === 'WR' || p.position === 'TE'
    );
    return flex[0];
  }
  
  // Rounds 11-13: Depth
  if (round >= 11 && round <= 13) {
    if (rosterCounts.QB === 1 && randomFactor > 0.7) {
      const qb = availablePlayers.find(p => p.position === 'QB');
      if (qb) return qb;
    }
    
    const rbWr = availablePlayers.filter(p => p.position === 'RB' || p.position === 'WR');
    return rbWr[0] || availablePlayers[0];
  }
  
  // Rounds 14-15: DEF and K
  if (round === 14) {
    if (rosterCounts.DST === 0) {
      const defs = availablePlayers.filter(p => p.position === 'DST');
      const topDefs = defs.slice(0, 5);
      return topDefs[Math.floor(Math.random() * topDefs.length)];
    }
  }
  
  if (round === 15) {
    if (rosterCounts.K === 0) {
      const kickers = availablePlayers.filter(p => p.position === 'K');
      const topK = kickers.slice(0, 5);
      return topK[Math.floor(Math.random() * topK.length)];
    }
    if (rosterCounts.DST === 0) {
      return availablePlayers.find(p => p.position === 'DST');
    }
  }
  
  // Round 16: Fill any gaps
  if (rosterCounts.K === 0) {
    return availablePlayers.find(p => p.position === 'K');
  }
  if (rosterCounts.DST === 0) {
    return availablePlayers.find(p => p.position === 'DST');
  }
  
  return availablePlayers[0];
}

function determineRosterPosition(position: string, currentRoster: any[]): string {
  const counts = {
    QB: currentRoster.filter(p => p.rosterPosition === 'QB').length,
    RB: currentRoster.filter(p => p.rosterPosition === 'RB').length,
    WR: currentRoster.filter(p => p.rosterPosition === 'WR').length,
    TE: currentRoster.filter(p => p.rosterPosition === 'TE').length,
    FLEX: currentRoster.filter(p => p.rosterPosition === 'FLEX').length,
    K: currentRoster.filter(p => p.rosterPosition === 'K').length,
    DEF: currentRoster.filter(p => p.rosterPosition === 'DEF').length,
  };
  
  switch(position) {
    case 'QB':
      return counts.QB === 0 ? 'QB' : 'BENCH';
    case 'RB':
      if (counts.RB < 2) return 'RB';
      if (counts.FLEX === 0) return 'FLEX';
      return 'BENCH';
    case 'WR':
      if (counts.WR < 2) return 'WR';
      if (counts.FLEX === 0) return 'FLEX';
      return 'BENCH';
    case 'TE':
      if (counts.TE === 0) return 'TE';
      if (counts.FLEX === 0) return 'FLEX';
      return 'BENCH';
    case 'K':
      return counts.K === 0 ? 'K' : 'BENCH';
    case 'DST':
      return counts.DEF === 0 ? 'DEF' : 'BENCH';
    default:
      return 'BENCH';
  }
}

async function createPastWeekResults(leagueId: string, teams: any[], week: number) {
  const matchups = [];
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffled.length; i += 2) {
    const homeScore = Math.floor(Math.random() * 50) + 80; // 80-130 points
    const awayScore = Math.floor(Math.random() * 50) + 80;
    
    const matchup = await prisma.matchup.create({
      data: {
        leagueId,
        week,
        homeTeamId: shuffled[i].id,
        awayTeamId: shuffled[i + 1].id,
        homeScore,
        awayScore,
        isComplete: true,
        isPlayoff: false
      }
    });
    
    // Update team records
    const homeWon = homeScore > awayScore;
    const tied = homeScore === awayScore;
    
    await prisma.team.update({
      where: { id: shuffled[i].id },
      data: {
        wins: { increment: homeWon ? 1 : 0 },
        losses: { increment: !homeWon && !tied ? 1 : 0 },
        ties: { increment: tied ? 1 : 0 },
        pointsFor: { increment: homeScore },
        pointsAgainst: { increment: awayScore }
      }
    });
    
    await prisma.team.update({
      where: { id: shuffled[i + 1].id },
      data: {
        wins: { increment: !homeWon && !tied ? 1 : 0 },
        losses: { increment: homeWon ? 1 : 0 },
        ties: { increment: tied ? 1 : 0 },
        pointsFor: { increment: awayScore },
        pointsAgainst: { increment: homeScore }
      }
    });
    
    matchups.push(matchup);
  }
  
  console.log(`✅ Created Week ${week} results`);
}

async function createWeekMatchups(leagueId: string, teams: any[], week: number, isComplete: boolean) {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffled.length; i += 2) {
    await prisma.matchup.create({
      data: {
        leagueId,
        week,
        homeTeamId: shuffled[i].id,
        awayTeamId: shuffled[i + 1].id,
        homeScore: 0,
        awayScore: 0,
        isComplete,
        isPlayoff: false
      }
    });
  }
  
  console.log(`✅ Created Week ${week} matchups`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });