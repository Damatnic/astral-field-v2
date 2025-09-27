import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function createDemoDataForUser(userId: string, userName?: string) {
  try {
    console.log('Creating demo data for user:', userId)
    
    // Check if user already has teams
    const existingTeams = await prisma.team.findMany({
      where: { ownerId: userId }
    })
    
    if (existingTeams.length > 0) {
      console.log('User already has teams, skipping demo data creation')
      return
    }
    
    // Create demo league
    const demoLeague = await prisma.league.create({
      data: {
        name: 'Demo Fantasy League',
        description: 'Your practice league to get started with Astral Field',
        currentWeek: 4,
        maxTeams: 12,
        isActive: true
      }
    })
    
    console.log('Created demo league:', demoLeague.id)
    
    // Create user's team
    const userTeam = await prisma.team.create({
      data: {
        name: userName ? `${userName}'s Team` : 'My Fantasy Team',
        ownerId: userId,
        leagueId: demoLeague.id,
        wins: 2,
        losses: 1,
        ties: 0
      }
    })
    
    console.log('Created user team:', userTeam.id)
    
    // Create other demo teams in the league
    const demoTeams = [
      { name: 'The Juggernauts', wins: 3, losses: 0, ties: 0 },
      { name: 'Thunder Birds', wins: 2, losses: 1, ties: 0 },
      { name: 'Storm Chasers', wins: 2, losses: 1, ties: 0 },
      { name: 'Fire Hawks', wins: 1, losses: 2, ties: 0 },
      { name: 'Ice Wolves', wins: 1, losses: 2, ties: 0 },
      { name: 'Golden Eagles', wins: 0, losses: 3, ties: 0 }
    ]
    
    const createdTeams = []
    for (const team of demoTeams) {
      const demoTeam = await prisma.team.create({
        data: {
          name: team.name,
          ownerId: 'demo-user-' + Math.random().toString(36).substr(2, 9),
          leagueId: demoLeague.id,
          wins: team.wins,
          losses: team.losses,
          ties: team.ties
        }
      })
      createdTeams.push(demoTeam)
    }
    
    console.log('Created demo teams:', createdTeams.length)
    
    // Create some demo players
    const demoPlayers = [
      { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', adp: 12.5, rank: 1 },
      { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', adp: 3.2, rank: 2 },
      { name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', adp: 8.7, rank: 3 },
      { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', adp: 18.3, rank: 4 },
      { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', adp: 145.2, rank: 5 },
      { name: 'Buffalo Defense', position: 'DEF', nflTeam: 'BUF', adp: 122.1, rank: 6 },
      { name: 'Derrick Henry', position: 'RB', nflTeam: 'TEN', adp: 15.8, rank: 7 },
      { name: 'Davante Adams', position: 'WR', nflTeam: 'LV', adp: 11.2, rank: 8 },
      { name: 'Patrick Mahomes', position: 'QB', nflTeam: 'KC', adp: 25.4, rank: 9 },
      { name: 'Jonathan Taylor', position: 'RB', nflTeam: 'IND', adp: 9.1, rank: 10 }
    ]
    
    const createdPlayers = []
    for (const player of demoPlayers) {
      const demoPlayer = await prisma.player.create({
        data: {
          name: player.name,
          position: player.position,
          nflTeam: player.nflTeam,
          adp: player.adp,
          rank: player.rank,
          isFantasyRelevant: true
        }
      })
      createdPlayers.push(demoPlayer)
    }
    
    console.log('Created demo players:', createdPlayers.length)
    
    // Add some players to user's roster
    const rosterPlayers = createdPlayers.slice(0, 6) // First 6 players
    for (let i = 0; i < rosterPlayers.length; i++) {
      const player = rosterPlayers[i]
      await prisma.rosterPlayer.create({
        data: {
          teamId: userTeam.id,
          playerId: player.id,
          position: i < 2 ? 'STARTER' : 'BENCH',
          isStarter: i < 2
        }
      })
    }
    
    console.log('Added players to user roster')
    
    // Create some demo player news
    const newsItems = [
      {
        playerId: createdPlayers[0].id,
        title: 'Josh Allen leads Bills to victory',
        content: 'Buffalo quarterback throws for 350 yards and 3 TDs in dominant performance.',
        source: 'ESPN',
        severity: 'LOW'
      },
      {
        playerId: createdPlayers[1].id,
        title: 'McCaffrey questionable with minor injury',
        content: 'Running back dealing with minor ankle issue, expected to play this week.',
        source: 'NFL Network',
        severity: 'MEDIUM'
      },
      {
        playerId: createdPlayers[2].id,
        title: 'Kupp practices fully, ready for Sunday',
        content: 'Star receiver fully recovered from previous injury concerns.',
        source: 'The Athletic',
        severity: 'LOW'
      }
    ]
    
    for (const news of newsItems) {
      await prisma.playerNews.create({
        data: {
          playerId: news.playerId,
          title: news.title,
          content: news.content,
          source: news.source,
          severity: news.severity,
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
        }
      })
    }
    
    console.log('Created demo player news')
    
    // Create some demo matchups for the current week
    const allTeams = [userTeam, ...createdTeams]
    for (let i = 0; i < allTeams.length; i += 2) {
      if (i + 1 < allTeams.length) {
        await prisma.matchup.create({
          data: {
            week: demoLeague.currentWeek,
            season: 2025,
            homeTeamId: allTeams[i].id,
            awayTeamId: allTeams[i + 1].id,
            leagueId: demoLeague.id,
            homeScore: Math.random() * 50 + 80, // Random score between 80-130
            awayScore: Math.random() * 50 + 80,
            isComplete: false
          }
        })
      }
    }
    
    console.log('Created demo matchups')
    
    console.log('Demo data creation completed successfully!')
    
    return {
      league: demoLeague,
      userTeam,
      players: createdPlayers.length,
      teams: createdTeams.length + 1 // +1 for user team
    }
    
  } catch (error) {
    console.error('Error creating demo data:', error)
    throw error
  }
}

// Main function for direct execution
async function main() {
  try {
    // Get user ID from command line args
    const userId = process.argv[2]
    const userName = process.argv[3]
    
    if (!userId) {
      console.error('Please provide a user ID as the first argument')
      process.exit(1)
    }
    
    await createDemoDataForUser(userId, userName)
    
  } catch (error) {
    console.error('Demo data creation failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}