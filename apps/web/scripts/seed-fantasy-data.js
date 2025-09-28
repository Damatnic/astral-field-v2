const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Sample NFL Players Data
const NFL_PLAYERS = [
  // Quarterbacks
  { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', adp: 2.5, projectedPoints: 295 },
  { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', adp: 3.2, projectedPoints: 290 },
  { name: 'Jalen Hurts', position: 'QB', nflTeam: 'PHI', adp: 4.1, projectedPoints: 285 },
  { name: 'Patrick Mahomes', position: 'QB', nflTeam: 'KC', adp: 1.8, projectedPoints: 305 },
  { name: 'Joe Burrow', position: 'QB', nflTeam: 'CIN', adp: 5.5, projectedPoints: 275 },
  { name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', adp: 7.2, projectedPoints: 265 },
  
  // Running Backs
  { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', adp: 1.2, projectedPoints: 285 },
  { name: 'Austin Ekeler', position: 'RB', nflTeam: 'LAC', adp: 2.8, projectedPoints: 265 },
  { name: 'Derrick Henry', position: 'RB', nflTeam: 'TEN', adp: 3.5, projectedPoints: 255 },
  { name: 'Jonathan Taylor', position: 'RB', nflTeam: 'IND', adp: 4.1, projectedPoints: 245 },
  { name: 'Nick Chubb', position: 'RB', nflTeam: 'CLE', adp: 5.2, projectedPoints: 235 },
  { name: 'Saquon Barkley', position: 'RB', nflTeam: 'PHI', adp: 6.1, projectedPoints: 225 },
  { name: 'Alvin Kamara', position: 'RB', nflTeam: 'NO', adp: 7.3, projectedPoints: 215 },
  { name: 'Dalvin Cook', position: 'RB', nflTeam: 'NYJ', adp: 8.5, projectedPoints: 205 },
  
  // Wide Receivers
  { name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', adp: 2.1, projectedPoints: 275 },
  { name: 'Davante Adams', position: 'WR', nflTeam: 'LV', adp: 2.9, projectedPoints: 270 },
  { name: 'Stefon Diggs', position: 'WR', nflTeam: 'BUF', adp: 3.8, projectedPoints: 265 },
  { name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', adp: 4.2, projectedPoints: 260 },
  { name: 'Justin Jefferson', position: 'WR', nflTeam: 'MIN', adp: 1.5, projectedPoints: 280 },
  { name: 'Ja\'Marr Chase', position: 'WR', nflTeam: 'CIN', adp: 5.1, projectedPoints: 250 },
  { name: 'CeeDee Lamb', position: 'WR', nflTeam: 'DAL', adp: 6.3, projectedPoints: 240 },
  { name: 'A.J. Brown', position: 'WR', nflTeam: 'PHI', adp: 7.1, projectedPoints: 235 },
  { name: 'DK Metcalf', position: 'WR', nflTeam: 'SEA', adp: 8.2, projectedPoints: 225 },
  { name: 'Mike Evans', position: 'WR', nflTeam: 'TB', adp: 9.1, projectedPoints: 220 },
  
  // Tight Ends
  { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', adp: 3.1, projectedPoints: 195 },
  { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', adp: 4.5, projectedPoints: 175 },
  { name: 'T.J. Hockenson', position: 'TE', nflTeam: 'MIN', adp: 6.8, projectedPoints: 155 },
  { name: 'George Kittle', position: 'TE', nflTeam: 'SF', adp: 7.2, projectedPoints: 150 },
  { name: 'Darren Waller', position: 'TE', nflTeam: 'NYG', adp: 8.1, projectedPoints: 145 },
  { name: 'Kyle Pitts', position: 'TE', nflTeam: 'ATL', adp: 9.3, projectedPoints: 140 },
  
  // Kickers
  { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', adp: 150, projectedPoints: 140 },
  { name: 'Harrison Butker', position: 'K', nflTeam: 'KC', adp: 155, projectedPoints: 135 },
  { name: 'Tyler Bass', position: 'K', nflTeam: 'BUF', adp: 160, projectedPoints: 130 },
  { name: 'Daniel Carlson', position: 'K', nflTeam: 'LV', adp: 165, projectedPoints: 125 },
  
  // Defenses
  { name: 'Buffalo Bills', position: 'DEF', nflTeam: 'BUF', adp: 140, projectedPoints: 130 },
  { name: 'San Francisco 49ers', position: 'DEF', nflTeam: 'SF', adp: 145, projectedPoints: 125 },
  { name: 'Philadelphia Eagles', position: 'DEF', nflTeam: 'PHI', adp: 150, projectedPoints: 120 },
  { name: 'Dallas Cowboys', position: 'DEF', nflTeam: 'DAL', adp: 155, projectedPoints: 115 },
]

// Sample Users
const SAMPLE_USERS = [
  { name: 'Alex Rodriguez', email: 'alex@example.com', teamName: 'Thunder Bolts' },
  { name: 'Sarah Johnson', email: 'sarah@example.com', teamName: 'Dynasty Warriors' },
  { name: 'Mike Chen', email: 'mike@example.com', teamName: 'Gridiron Legends' },
  { name: 'Jessica Brown', email: 'jessica@example.com', teamName: 'Victory Formation' },
  { name: 'David Wilson', email: 'david@example.com', teamName: 'End Zone Elite' },
  { name: 'Maria Garcia', email: 'maria@example.com', teamName: 'Championship Drive' },
  { name: 'Kevin Lee', email: 'kevin@example.com', teamName: 'Fourth Down Heroes' },
  { name: 'Amanda Davis', email: 'amanda@example.com', teamName: 'Fantasy Phenoms' },
  { name: 'James Taylor', email: 'james@example.com', teamName: 'Touchdown Titans' },
  { name: 'Lisa Anderson', email: 'lisa@example.com', teamName: 'Goal Line Guardians' },
  { name: 'Robert Martinez', email: 'robert@example.com', teamName: 'Pocket Passers' },
  { name: 'Emily White', email: 'emily@example.com', teamName: 'Blitz Brigade' },
]

async function main() {
  console.log('🌱 Starting fantasy football data seeding...')

  try {
    // Create sample users
    console.log('👥 Creating sample users...')
    const createdUsers = []
    
    for (const userData of SAMPLE_USERS) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          name: userData.name,
          email: userData.email,
          hashedPassword,
          teamName: userData.teamName,
          role: 'USER'
        }
      })
      createdUsers.push(user)
    }
    console.log(`✅ Created ${createdUsers.length} users`)

    // Create sample leagues
    console.log('🏆 Creating sample leagues...')
    const leagues = [
      {
        name: 'Championship League',
        description: 'Elite fantasy football competition',
        maxTeams: 12,
        currentWeek: 4,
        isActive: true
      },
      {
        name: 'Rookie Dynasty',
        description: 'Perfect for fantasy football beginners',
        maxTeams: 10,
        currentWeek: 4,
        isActive: true
      }
    ]

    const createdLeagues = []
    for (const leagueData of leagues) {
      const league = await prisma.league.create({
        data: leagueData
      })
      createdLeagues.push(league)
    }
    console.log(`✅ Created ${createdLeagues.length} leagues`)

    // Create NFL players
    console.log('🏈 Creating NFL players...')
    const createdPlayers = []
    
    for (const playerData of NFL_PLAYERS) {
      // Check if player already exists
      let player = await prisma.player.findFirst({
        where: {
          name: playerData.name,
          position: playerData.position,
          nflTeam: playerData.nflTeam
        }
      })

      if (!player) {
        player = await prisma.player.create({
          data: {
            name: playerData.name,
            position: playerData.position,
            nflTeam: playerData.nflTeam,
            adp: playerData.adp,
            isFantasyRelevant: true
          }
        })
      }
      createdPlayers.push(player)
    }
    console.log(`✅ Created ${createdPlayers.length} players`)

    // Create teams for each league
    console.log('⚡ Creating teams...')
    const allTeams = []
    
    for (const league of createdLeagues) {
      const teamsPerLeague = league.maxTeams
      const usersForLeague = createdUsers.slice(0, teamsPerLeague)
      
      for (let i = 0; i < usersForLeague.length; i++) {
        const user = usersForLeague[i]
        const team = await prisma.team.create({
          data: {
            name: user.teamName || `${user.name}'s Team`,
            ownerId: user.id,
            leagueId: league.id,
            wins: Math.floor(Math.random() * 4), // 0-3 wins (3 weeks completed)
            losses: Math.floor(Math.random() * 4),
            ties: 0
          }
        })
        allTeams.push(team)
      }
    }
    console.log(`✅ Created ${allTeams.length} teams`)

    // Create league settings
    console.log('⚙️ Creating league settings...')
    for (const league of createdLeagues) {
      const firstTeam = allTeams.find(t => t.leagueId === league.id)
      if (firstTeam) {
        await prisma.leagueSettings.create({
          data: {
            leagueId: league.id,
            commissionerId: firstTeam.ownerId,
            rosterPositions: JSON.stringify({
              QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1, BENCH: 6
            }),
            scoringSettings: JSON.stringify({
              passingYards: 0.04,
              passingTds: 4,
              interceptions: -2,
              rushingYards: 0.1,
              rushingTds: 6,
              receivingYards: 0.1,
              receivingTds: 6,
              receptions: 0.5
            }),
            playoffSettings: JSON.stringify({
              teamsInPlayoffs: 6,
              playoffWeeks: [15, 16, 17]
            }),
            tradeSettings: JSON.stringify({
              tradeDeadline: 'Week 10',
              reviewPeriod: 48,
              vetoVotes: 4
            }),
            waiverSettings: JSON.stringify({
              type: 'ROLLING',
              processDay: 'WEDNESDAY',
              freeAgentBudget: 1000
            }),
            draftSettings: JSON.stringify({
              type: 'SNAKE',
              timePerPick: 90,
              draftDate: '2025-08-25'
            }),
            seasonSettings: JSON.stringify({
              regularSeasonWeeks: 14,
              playoffWeeks: 3,
              championshipWeek: 17
            })
          }
        })
      }
    }
    console.log('✅ Created league settings')

    // Create player projections
    console.log('📊 Creating player projections...')
    for (const player of createdPlayers) {
      // Season projection
      await prisma.playerProjection.create({
        data: {
          playerId: player.id,
          season: 2025,
          projectedPoints: NFL_PLAYERS.find(p => p.name === player.name)?.projectedPoints || 100,
          confidence: 0.75
        }
      })

      // Weekly projections for weeks 1-17
      for (let week = 1; week <= 17; week++) {
        const basePoints = NFL_PLAYERS.find(p => p.name === player.name)?.projectedPoints || 100
        const weeklyPoints = (basePoints / 17) * (0.8 + Math.random() * 0.4) // Variance
        
        await prisma.playerProjection.create({
          data: {
            playerId: player.id,
            week,
            season: 2025,
            projectedPoints: Math.round(weeklyPoints * 10) / 10,
            confidence: 0.65
          }
        })
      }
    }
    console.log('✅ Created player projections')

    // Create player stats for weeks 1-3 (completed) and week 4 (in progress)
    console.log('📈 Creating player stats...')
    for (const player of createdPlayers) {
      for (let week = 1; week <= 4; week++) {
        const basePoints = NFL_PLAYERS.find(p => p.name === player.name)?.projectedPoints || 100
        const weeklyPoints = (basePoints / 17) * (0.7 + Math.random() * 0.6) // More variance for actual
        
        let stats = {}
        switch (player.position) {
          case 'QB':
            stats = {
              passingYards: Math.floor(200 + Math.random() * 150),
              passingTds: Math.floor(Math.random() * 4),
              interceptions: Math.floor(Math.random() * 2),
              rushingYards: Math.floor(Math.random() * 40)
            }
            break
          case 'RB':
            stats = {
              rushingYards: Math.floor(50 + Math.random() * 100),
              rushingTds: Math.floor(Math.random() * 2),
              receivingYards: Math.floor(Math.random() * 60),
              receptions: Math.floor(Math.random() * 6)
            }
            break
          case 'WR':
          case 'TE':
            stats = {
              receivingYards: Math.floor(30 + Math.random() * 80),
              receivingTds: Math.floor(Math.random() * 2),
              receptions: Math.floor(2 + Math.random() * 8)
            }
            break
          default:
            stats = { points: Math.floor(5 + Math.random() * 10) }
        }

        await prisma.playerStats.upsert({
          where: {
            playerId_week_season: {
              playerId: player.id,
              week,
              season: 2025
            }
          },
          update: {},
          create: {
            playerId: player.id,
            week,
            season: 2025,
            fantasyPoints: Math.round(weeklyPoints * 10) / 10,
            stats: JSON.stringify(stats)
          }
        })
      }
    }
    console.log('✅ Created player stats')

    // Create some roster assignments (simplified draft results)
    console.log('👥 Creating roster assignments...')
    const positions = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF']
    
    for (const team of allTeams) {
      let playerIndex = 0
      
      // Assign starters
      for (const position of positions) {
        const availablePosition = position === 'FLEX' ? ['RB', 'WR', 'TE'] : [position]
        const eligiblePlayers = []
        for (const p of createdPlayers) {
          if (availablePosition.includes(p.position)) {
            const existing = await prisma.rosterPlayer.findFirst({ where: { playerId: p.id } })
            if (!existing) {
              eligiblePlayers.push(p)
            }
          }
        }
        
        if (eligiblePlayers.length > 0) {
          const selectedPlayer = eligiblePlayers[Math.floor(Math.random() * Math.min(5, eligiblePlayers.length))]
          
          await prisma.rosterPlayer.create({
            data: {
              teamId: team.id,
              playerId: selectedPlayer.id,
              position: position === 'FLEX' ? 'FLEX' : position,
              isStarter: true
            }
          })
        }
      }

      // Assign bench players
      for (let i = 0; i < 6; i++) {
        const unassignedPlayers = []
        for (const p of createdPlayers) {
          const existing = await prisma.rosterPlayer.findFirst({ where: { playerId: p.id } })
          if (!existing) {
            unassignedPlayers.push(p)
          }
        }
        
        if (unassignedPlayers.length > 0) {
          const selectedPlayer = unassignedPlayers[Math.floor(Math.random() * Math.min(10, unassignedPlayers.length))]
          
          await prisma.rosterPlayer.create({
            data: {
              teamId: team.id,
              playerId: selectedPlayer.id,
              position: 'BENCH',
              isStarter: false
            }
          })
        }
      }
    }
    console.log('✅ Created roster assignments')

    // Create matchups for weeks 1-4
    console.log('🎯 Creating matchups...')
    for (const league of createdLeagues) {
      const leagueTeams = allTeams.filter(t => t.leagueId === league.id)
      
      for (let week = 1; week <= 4; week++) {
        // Create matchups (pair teams randomly)
        const shuffledTeams = [...leagueTeams].sort(() => Math.random() - 0.5)
        
        for (let i = 0; i < shuffledTeams.length; i += 2) {
          if (i + 1 < shuffledTeams.length) {
            const homeTeam = shuffledTeams[i]
            const awayTeam = shuffledTeams[i + 1]
            
            // Generate scores for weeks 1-3 (completed), week 4 in progress
            let homeScore = 0
            let awayScore = 0
            let isComplete = week <= 3
            
            if (week <= 3) {
              homeScore = 80 + Math.random() * 60 // 80-140 points
              awayScore = 80 + Math.random() * 60
            } else {
              // Week 4 - partial scores
              homeScore = Math.random() * 60 // 0-60 points so far
              awayScore = Math.random() * 60
            }

            await prisma.matchup.create({
              data: {
                week,
                season: 2025,
                homeTeamId: homeTeam.id,
                awayTeamId: awayTeam.id,
                leagueId: league.id,
                homeScore: Math.round(homeScore * 10) / 10,
                awayScore: Math.round(awayScore * 10) / 10,
                isComplete
              }
            })
          }
        }
      }
    }
    console.log('✅ Created matchups')

    // Create some sample trade proposals
    console.log('🔄 Creating sample trades...')
    const sampleTrades = [
      {
        proposingTeamId: allTeams[0]?.id,
        receivingTeamId: allTeams[1]?.id,
        status: 'PENDING'
      },
      {
        proposingTeamId: allTeams[2]?.id,
        receivingTeamId: allTeams[3]?.id,
        status: 'ACCEPTED'
      },
      {
        proposingTeamId: allTeams[4]?.id,
        receivingTeamId: allTeams[5]?.id,
        status: 'REJECTED'
      }
    ]

    for (const trade of sampleTrades) {
      if (trade.proposingTeamId && trade.receivingTeamId) {
        // Get some players from each team
        const proposingPlayers = await prisma.rosterPlayer.findMany({
          where: { teamId: trade.proposingTeamId },
          take: 1
        })
        const receivingPlayers = await prisma.rosterPlayer.findMany({
          where: { teamId: trade.receivingTeamId },
          take: 1
        })

        if (proposingPlayers.length > 0 && receivingPlayers.length > 0) {
          await prisma.tradeProposal.create({
            data: {
              proposingTeamId: trade.proposingTeamId,
              receivingTeamId: trade.receivingTeamId,
              givingPlayerIds: JSON.stringify([proposingPlayers[0].playerId]),
              receivingPlayerIds: JSON.stringify([receivingPlayers[0].playerId]),
              message: 'Sample trade proposal',
              status: trade.status,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          })
        }
      }
    }
    console.log('✅ Created sample trades')

    // Create live games for week 4
    console.log('🔴 Creating live games...')
    const nflTeams = [...new Set(createdPlayers.map(p => p.nflTeam))]
    const gameDay = new Date('2025-09-27T13:00:00Z') // Sunday 1 PM ET

    for (let i = 0; i < nflTeams.length; i += 2) {
      if (i + 1 < nflTeams.length) {
        await prisma.liveGame.create({
          data: {
            nflGameId: `nfl_game_${i / 2 + 1}`,
            homeTeam: nflTeams[i],
            awayTeam: nflTeams[i + 1],
            week: 4,
            season: 2025,
            gameTime: new Date(gameDay.getTime() + (i / 2) * 3 * 60 * 60 * 1000), // Stagger games
            status: Math.random() > 0.5 ? 'IN_PROGRESS' : 'SCHEDULED',
            quarter: Math.floor(Math.random() * 4) + 1,
            timeRemaining: `${Math.floor(Math.random() * 15)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
            homeScore: Math.floor(Math.random() * 35),
            awayScore: Math.floor(Math.random() * 35)
          }
        })
      }
    }
    console.log('✅ Created live games')

    console.log('🎉 Fantasy football data seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`👥 Users: ${createdUsers.length}`)
    console.log(`🏆 Leagues: ${createdLeagues.length}`)
    console.log(`⚡ Teams: ${allTeams.length}`)
    console.log(`🏈 Players: ${createdPlayers.length}`)
    console.log(`🎯 Weeks of data: 1-3 (completed), 4 (active)`)
    console.log('\n🔐 Login credentials:')
    console.log('Email: alex@example.com')
    console.log('Password: password123')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })