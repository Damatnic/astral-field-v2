import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const samplePlayers = [
  // Quarterbacks
  { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', adp: 1.2, rank: 1 },
  { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', adp: 2.1, rank: 2 },
  { name: 'Jalen Hurts', position: 'QB', nflTeam: 'PHI', adp: 2.8, rank: 3 },
  { name: 'Patrick Mahomes', position: 'QB', nflTeam: 'KC', adp: 3.2, rank: 4 },
  { name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', adp: 4.5, rank: 5 },
  { name: 'Tua Tagovailoa', position: 'QB', nflTeam: 'MIA', adp: 5.1, rank: 6 },
  { name: 'Brock Purdy', position: 'QB', nflTeam: 'SF', adp: 5.8, rank: 7 },
  { name: 'C.J. Stroud', position: 'QB', nflTeam: 'HOU', adp: 6.2, rank: 8 },

  // Running Backs
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

  // Wide Receivers
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

  // Tight Ends
  { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', adp: 2.4, rank: 1 },
  { name: 'Sam LaPorta', position: 'TE', nflTeam: 'DET', adp: 3.6, rank: 2 },
  { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', adp: 4.8, rank: 3 },
  { name: 'Trey McBride', position: 'TE', nflTeam: 'ARI', adp: 5.2, rank: 4 },
  { name: 'George Kittle', position: 'TE', nflTeam: 'SF', adp: 5.5, rank: 5 },
  { name: 'Evan Engram', position: 'TE', nflTeam: 'JAX', adp: 6.8, rank: 6 },
  { name: 'Kyle Pitts', position: 'TE', nflTeam: 'ATL', adp: 7.1, rank: 7 },
  { name: 'T.J. Hockenson', position: 'TE', nflTeam: 'MIN', adp: 7.4, rank: 8 },

  // Kickers
  { name: 'Harrison Butker', position: 'K', nflTeam: 'KC', adp: 15.2, rank: 1 },
  { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', adp: 15.5, rank: 2 },
  { name: 'Tyler Bass', position: 'K', nflTeam: 'BUF', adp: 15.8, rank: 3 },
  { name: 'Brandon McManus', position: 'K', nflTeam: 'GB', adp: 16.1, rank: 4 },
  { name: 'Jake Moody', position: 'K', nflTeam: 'SF', adp: 16.4, rank: 5 },
  { name: 'Jason Sanders', position: 'K', nflTeam: 'MIA', adp: 16.7, rank: 6 },

  // Defenses
  { name: 'Philadelphia Eagles', position: 'DEF', nflTeam: 'PHI', adp: 14.2, rank: 1 },
  { name: 'San Francisco 49ers', position: 'DEF', nflTeam: 'SF', adp: 14.5, rank: 2 },
  { name: 'Baltimore Ravens', position: 'DEF', nflTeam: 'BAL', adp: 14.8, rank: 3 },
  { name: 'Buffalo Bills', position: 'DEF', nflTeam: 'BUF', adp: 15.1, rank: 4 },
  { name: 'Dallas Cowboys', position: 'DEF', nflTeam: 'DAL', adp: 15.4, rank: 5 },
  { name: 'Miami Dolphins', position: 'DEF', nflTeam: 'MIA', adp: 15.7, rank: 6 },

  // Additional depth players
  { name: 'Tank Bigsby', position: 'RB', nflTeam: 'JAX', adp: 8.2, rank: 25 },
  { name: 'Zay Flowers', position: 'WR', nflTeam: 'BAL', adp: 6.1, rank: 20 },
  { name: 'Jordan Addison', position: 'WR', nflTeam: 'MIN', adp: 6.5, rank: 22 },
  { name: 'Rome Odunze', position: 'WR', nflTeam: 'CHI', adp: 7.2, rank: 25 },
  { name: 'Keon Coleman', position: 'WR', nflTeam: 'BUF', adp: 8.1, rank: 30 },
  { name: 'Gus Edwards', position: 'RB', nflTeam: 'LAC', adp: 9.2, rank: 35 },
  { name: 'Tony Pollard', position: 'RB', nflTeam: 'TEN', adp: 6.8, rank: 18 },
  { name: 'Raheem Mostert', position: 'RB', nflTeam: 'MIA', adp: 7.5, rank: 22 },
]

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clear existing players
  console.log('🗑️ Clearing existing players...')
  await prisma.playerStats.deleteMany()
  await prisma.playerProjection.deleteMany()
  await prisma.playerNews.deleteMany()
  await prisma.rosterPlayer.deleteMany()
  await prisma.player.deleteMany()

  console.log('👤 Creating players...')
  
  // Create players
  for (const playerData of samplePlayers) {
    const player = await prisma.player.create({
      data: {
        name: playerData.name,
        position: playerData.position,
        nflTeam: playerData.nflTeam,
        adp: playerData.adp,
        rank: playerData.rank,
        isFantasyRelevant: true
      }
    })

    // Create sample stats for weeks 1-4
    for (let week = 1; week <= 4; week++) {
      let fantasyPoints = 0
      let stats = {}

      // Generate realistic fantasy points based on position
      switch (playerData.position) {
        case 'QB':
          fantasyPoints = Math.random() * 15 + 10 // 10-25 points
          stats = {
            passingYards: Math.floor(Math.random() * 200 + 200),
            passingTouchdowns: Math.floor(Math.random() * 3 + 1),
            interceptions: Math.floor(Math.random() * 2),
            rushingYards: Math.floor(Math.random() * 50),
            rushingTouchdowns: Math.floor(Math.random() * 1.5)
          }
          break
        case 'RB':
          fantasyPoints = Math.random() * 12 + 6 // 6-18 points
          stats = {
            rushingYards: Math.floor(Math.random() * 80 + 40),
            rushingTouchdowns: Math.floor(Math.random() * 2),
            receivingYards: Math.floor(Math.random() * 40 + 10),
            receptions: Math.floor(Math.random() * 5 + 2),
            receivingTouchdowns: Math.floor(Math.random() * 1.3)
          }
          break
        case 'WR':
          fantasyPoints = Math.random() * 14 + 4 // 4-18 points
          stats = {
            receivingYards: Math.floor(Math.random() * 80 + 30),
            receptions: Math.floor(Math.random() * 6 + 3),
            receivingTouchdowns: Math.floor(Math.random() * 2),
            rushingYards: Math.floor(Math.random() * 20),
            rushingTouchdowns: Math.floor(Math.random() * 0.5)
          }
          break
        case 'TE':
          fantasyPoints = Math.random() * 10 + 3 // 3-13 points
          stats = {
            receivingYards: Math.floor(Math.random() * 60 + 25),
            receptions: Math.floor(Math.random() * 5 + 2),
            receivingTouchdowns: Math.floor(Math.random() * 1.5)
          }
          break
        case 'K':
          fantasyPoints = Math.random() * 8 + 5 // 5-13 points
          stats = {
            fieldGoalsMade: Math.floor(Math.random() * 3 + 1),
            fieldGoalsAttempted: Math.floor(Math.random() * 4 + 1),
            extraPointsMade: Math.floor(Math.random() * 3 + 1)
          }
          break
        case 'DEF':
          fantasyPoints = Math.random() * 12 + 2 // 2-14 points
          stats = {
            sacks: Math.floor(Math.random() * 4),
            interceptions: Math.floor(Math.random() * 2),
            fumbleRecoveries: Math.floor(Math.random() * 2),
            touchdowns: Math.floor(Math.random() * 1.2),
            pointsAllowed: Math.floor(Math.random() * 20 + 10)
          }
          break
      }

      await prisma.playerStats.create({
        data: {
          playerId: player.id,
          week,
          season: 2024,
          fantasyPoints: Math.round(fantasyPoints * 10) / 10,
          stats: JSON.stringify(stats)
        }
      })
    }

    // Create projection for week 5
    let projectedPoints = 0
    switch (playerData.position) {
      case 'QB':
        projectedPoints = Math.random() * 15 + 12
        break
      case 'RB':
        projectedPoints = Math.random() * 12 + 8
        break
      case 'WR':
        projectedPoints = Math.random() * 14 + 6
        break
      case 'TE':
        projectedPoints = Math.random() * 10 + 5
        break
      case 'K':
        projectedPoints = Math.random() * 8 + 6
        break
      case 'DEF':
        projectedPoints = Math.random() * 12 + 4
        break
    }

    await prisma.playerProjection.create({
      data: {
        playerId: player.id,
        week: 5,
        season: 2024,
        projectedPoints: Math.round(projectedPoints * 10) / 10,
        confidence: Math.random() * 0.4 + 0.6 // 0.6-1.0 confidence
      }
    })

    // Create some sample news
    if (Math.random() > 0.7) { // 30% chance of news
      await prisma.playerNews.create({
        data: {
          playerId: player.id,
          title: `${playerData.name} expected to have big week`,
          content: `Fantasy analysts are bullish on ${playerData.name} for this week's matchup.`,
          source: 'Fantasy Sports Network',
          severity: Math.random() > 0.8 ? 'HIGH' : 'MEDIUM',
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
        }
      })
    }

    console.log(`✅ Created ${playerData.name} (${playerData.position} - ${playerData.nflTeam})`)
  }

  console.log('🎉 Database seeding completed!')
  console.log(`📊 Created ${samplePlayers.length} players with stats and projections`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })