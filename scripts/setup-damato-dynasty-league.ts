#!/usr/bin/env tsx

// 🏈 D'Amato Dynasty League Setup Script
// Creates the complete fantasy football league with 10 teams for all D'Amato users

import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

// Initialize Prisma with explicit database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_rkDs2yUYZEQ7@ep-proud-pond-adntwlpd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
})

// D'Amato Dynasty League Members with Creative Team Names
const DAMATO_DYNASTY_MEMBERS = [
  { email: 'damato@dynasty.com', name: 'Anthony D\'Amato', teamName: '🏆 Dynasty Destroyers' },
  { email: 'marco@dynasty.com', name: 'Marco D\'Amato', teamName: '⚡ Lightning Strikes' },
  { email: 'sophia@dynasty.com', name: 'Sophia D\'Amato', teamName: '🔥 Fire & Fury' },
  { email: 'giovanni@dynasty.com', name: 'Giovanni D\'Amato', teamName: '💪 Gridiron Gladiators' },
  { email: 'isabella@dynasty.com', name: 'Isabella D\'Amato', teamName: '🎯 Precision Panthers' },
  { email: 'francesco@dynasty.com', name: 'Francesco D\'Amato', teamName: '🚀 Rocket Raiders' },
  { email: 'lucia@dynasty.com', name: 'Lucia D\'Amato', teamName: '💎 Diamond Dynasty' },
  { email: 'alessandro@dynasty.com', name: 'Alessandro D\'Amato', teamName: '⚔️ Battlefield Bombers' },
  { email: 'valentina@dynasty.com', name: 'Valentina D\'Amato', teamName: '🌟 Victory Vipers' },
  { email: 'matteo@dynasty.com', name: 'Matteo D\'Amato', teamName: '🔥 Thunder Titans' }
]

// Sample NFL Players for Fantasy Football
const SAMPLE_PLAYERS = [
  // Quarterbacks
  { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', adp: 1.2, rank: 1 },
  { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', adp: 2.1, rank: 2 },
  { name: 'Jalen Hurts', position: 'QB', nflTeam: 'PHI', adp: 3.5, rank: 3 },
  { name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', adp: 4.8, rank: 4 },
  { name: 'Joe Burrow', position: 'QB', nflTeam: 'CIN', adp: 5.2, rank: 5 },
  { name: 'Patrick Mahomes', position: 'QB', nflTeam: 'KC', adp: 6.1, rank: 6 },
  { name: 'Tua Tagovailoa', position: 'QB', nflTeam: 'MIA', adp: 7.3, rank: 7 },
  { name: 'Trevor Lawrence', position: 'QB', nflTeam: 'JAX', adp: 8.1, rank: 8 },
  { name: 'Anthony Richardson', position: 'QB', nflTeam: 'IND', adp: 9.2, rank: 9 },
  { name: 'Jayden Daniels', position: 'QB', nflTeam: 'WAS', adp: 10.1, rank: 10 },

  // Running Backs
  { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', adp: 1.5, rank: 1 },
  { name: 'Saquon Barkley', position: 'RB', nflTeam: 'PHI', adp: 2.8, rank: 2 },
  { name: 'Derrick Henry', position: 'RB', nflTeam: 'BAL', adp: 3.2, rank: 3 },
  { name: 'Josh Jacobs', position: 'RB', nflTeam: 'GB', adp: 4.1, rank: 4 },
  { name: 'Alvin Kamara', position: 'RB', nflTeam: 'NO', adp: 4.8, rank: 5 },
  { name: 'Jonathan Taylor', position: 'RB', nflTeam: 'IND', adp: 5.5, rank: 6 },
  { name: 'Kenneth Walker III', position: 'RB', nflTeam: 'SEA', adp: 6.2, rank: 7 },
  { name: 'Jahmyr Gibbs', position: 'RB', nflTeam: 'DET', adp: 6.9, rank: 8 },
  { name: 'De\'Von Achane', position: 'RB', nflTeam: 'MIA', adp: 7.1, rank: 9 },
  { name: 'Tony Pollard', position: 'RB', nflTeam: 'TEN', adp: 7.8, rank: 10 },
  { name: 'Bijan Robinson', position: 'RB', nflTeam: 'ATL', adp: 8.2, rank: 11 },
  { name: 'Travis Etienne Jr.', position: 'RB', nflTeam: 'JAX', adp: 8.9, rank: 12 },
  { name: 'Joe Mixon', position: 'RB', nflTeam: 'HOU', adp: 9.5, rank: 13 },
  { name: 'Isiah Pacheco', position: 'RB', nflTeam: 'KC', adp: 10.2, rank: 14 },
  { name: 'Rhamondre Stevenson', position: 'RB', nflTeam: 'NE', adp: 11.1, rank: 15 },

  // Wide Receivers
  { name: 'CeeDee Lamb', position: 'WR', nflTeam: 'DAL', adp: 1.8, rank: 1 },
  { name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', adp: 2.5, rank: 2 },
  { name: 'A.J. Brown', position: 'WR', nflTeam: 'PHI', adp: 3.1, rank: 3 },
  { name: 'Ja\'Marr Chase', position: 'WR', nflTeam: 'CIN', adp: 3.8, rank: 4 },
  { name: 'Amon-Ra St. Brown', position: 'WR', nflTeam: 'DET', adp: 4.2, rank: 5 },
  { name: 'Stefon Diggs', position: 'WR', nflTeam: 'BUF', adp: 4.9, rank: 6 },
  { name: 'DK Metcalf', position: 'WR', nflTeam: 'SEA', adp: 5.3, rank: 7 },
  { name: 'Davante Adams', position: 'WR', nflTeam: 'LV', adp: 5.8, rank: 8 },
  { name: 'DeVonta Smith', position: 'WR', nflTeam: 'PHI', adp: 6.1, rank: 9 },
  { name: 'Jaylen Waddle', position: 'WR', nflTeam: 'MIA', adp: 6.7, rank: 10 },
  { name: 'Chris Olave', position: 'WR', nflTeam: 'NO', adp: 7.2, rank: 11 },
  { name: 'Mike Evans', position: 'WR', nflTeam: 'TB', adp: 7.9, rank: 12 },
  { name: 'Garrett Wilson', position: 'WR', nflTeam: 'NYJ', adp: 8.3, rank: 13 },
  { name: 'Calvin Ridley', position: 'WR', nflTeam: 'TEN', adp: 8.8, rank: 14 },
  { name: 'Amari Cooper', position: 'WR', nflTeam: 'CLE', adp: 9.4, rank: 15 },

  // Tight Ends
  { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', adp: 2.2, rank: 1 },
  { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', adp: 4.5, rank: 2 },
  { name: 'T.J. Hockenson', position: 'TE', nflTeam: 'MIN', adp: 6.8, rank: 3 },
  { name: 'Kyle Pitts', position: 'TE', nflTeam: 'ATL', adp: 8.1, rank: 4 },
  { name: 'Evan Engram', position: 'TE', nflTeam: 'JAX', adp: 9.7, rank: 5 },
  { name: 'George Kittle', position: 'TE', nflTeam: 'SF', adp: 10.3, rank: 6 },
  { name: 'Dallas Goedert', position: 'TE', nflTeam: 'PHI', adp: 11.2, rank: 7 },
  { name: 'David Njoku', position: 'TE', nflTeam: 'CLE', adp: 12.1, rank: 8 },

  // Kickers
  { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', adp: 15.1, rank: 1 },
  { name: 'Harrison Butker', position: 'K', nflTeam: 'KC', adp: 15.8, rank: 2 },
  { name: 'Tyler Bass', position: 'K', nflTeam: 'BUF', adp: 16.2, rank: 3 },
  { name: 'Jake Elliott', position: 'K', nflTeam: 'PHI', adp: 16.7, rank: 4 },
  { name: 'Daniel Carlson', position: 'K', nflTeam: 'LV', adp: 17.1, rank: 5 },

  // Defenses
  { name: 'Buffalo Bills', position: 'DST', nflTeam: 'BUF', adp: 14.2, rank: 1 },
  { name: 'San Francisco 49ers', position: 'DST', nflTeam: 'SF', adp: 14.8, rank: 2 },
  { name: 'Philadelphia Eagles', position: 'DST', nflTeam: 'PHI', adp: 15.3, rank: 3 },
  { name: 'Dallas Cowboys', position: 'DST', nflTeam: 'DAL', adp: 15.9, rank: 4 },
  { name: 'Pittsburgh Steelers', position: 'DST', nflTeam: 'PIT', adp: 16.4, rank: 5 }
]

async function main() {
  console.log('🏈 Setting up D\'Amato Dynasty League 2025...\n')

  try {
    // Phase 1: Check and create users
    console.log('👥 Phase 1: Setting up D\'Amato Dynasty members...')
    
    const hashedPassword = await bcryptjs.hash('Dynasty2025!', 12)
    const users = []

    for (const member of DAMATO_DYNASTY_MEMBERS) {
      let user = await prisma.user.findUnique({
        where: { email: member.email }
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: member.email,
            name: member.name,
            hashedPassword,
            teamName: member.teamName,
            role: 'USER'
          }
        })
        console.log(`  ✅ Created user: ${member.name} (${member.email})`)
      } else {
        // Update existing user with team name
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: member.name,
            teamName: member.teamName
          }
        })
        console.log(`  ✅ Updated user: ${member.name} (${member.email})`)
      }
      users.push(user)
    }

    // Phase 2: Create the main league
    console.log('\n🏆 Phase 2: Creating D\'Amato Dynasty League...')
    
    let league = await prisma.league.findFirst({
      where: { name: 'D\'Amato Dynasty League 2025' }
    })

    if (!league) {
      league = await prisma.league.create({
        data: {
          name: 'D\'Amato Dynasty League 2025',
          description: 'The ultimate fantasy football experience for the D\'Amato Dynasty members',
          isActive: true,
          playoffs: false,
          currentWeek: 1,
          maxTeams: 10
        }
      })
      console.log(`  ✅ Created league: ${league.name}`)
    } else {
      console.log(`  ✅ League already exists: ${league.name}`)
    }

    // Phase 3: Create teams for each user
    console.log('\n🏈 Phase 3: Creating teams for all members...')
    
    const teams = []
    for (const user of users) {
      let team = await prisma.team.findFirst({
        where: { ownerId: user.id, leagueId: league.id }
      })

      if (!team) {
        team = await prisma.team.create({
          data: {
            name: user.teamName || `${user.name}'s Team`,
            ownerId: user.id,
            leagueId: league.id,
            wins: 0,
            losses: 0,
            ties: 0
          }
        })
        console.log(`  ✅ Created team: ${team.name} (Owner: ${user.name})`)
      } else {
        console.log(`  ✅ Team already exists: ${team.name} (Owner: ${user.name})`)
      }
      teams.push(team)
    }

    // Phase 4: Seed NFL players
    console.log('\n🏃‍♂️ Phase 4: Seeding NFL players...')
    
    for (const playerData of SAMPLE_PLAYERS) {
      let player = await prisma.player.findFirst({
        where: { name: playerData.name, position: playerData.position }
      })

      if (!player) {
        player = await prisma.player.create({
          data: {
            name: playerData.name,
            position: playerData.position,
            nflTeam: playerData.nflTeam,
            isFantasyRelevant: true,
            adp: playerData.adp,
            rank: playerData.rank
          }
        })
        console.log(`  ✅ Added player: ${player.name} (${player.position} - ${player.nflTeam})`)
      }
    }

    // Phase 5: Generate simple matchups for Week 1
    console.log('\n📅 Phase 5: Generating Week 1 matchups...')
    
    // Create 5 matchups for Week 1 (10 teams = 5 matchups)
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const homeTeam = shuffledTeams[i]
        const awayTeam = shuffledTeams[i + 1]

        const existingMatchup = await prisma.matchup.findFirst({
          where: {
            week: 1,
            season: 2025,
            leagueId: league.id,
            OR: [
              { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id },
              { homeTeamId: awayTeam.id, awayTeamId: homeTeam.id }
            ]
          }
        })

        if (!existingMatchup) {
          await prisma.matchup.create({
            data: {
              week: 1,
              season: 2025,
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              homeScore: 0,
              awayScore: 0,
              isComplete: false,
              leagueId: league.id
            }
          })
          console.log(`  ✅ Created matchup: ${homeTeam.name} vs ${awayTeam.name}`)
        }
      }
    }

    // Phase 6: Summary
    console.log('\n🎉 D\'Amato Dynasty League Setup Complete!')
    console.log('=' .repeat(50))
    console.log(`📊 League: ${league.name}`)
    console.log(`👥 Members: ${users.length}`)
    console.log(`🏈 Teams: ${teams.length}`)
    console.log(`🏃‍♂️ Players: ${SAMPLE_PLAYERS.length}`)
    console.log(`📅 Current Week: ${league.currentWeek}`)
    console.log(`🏆 Status: ${league.isActive ? 'ACTIVE' : 'INACTIVE'}`)
    
    console.log('\n🎮 Ready for Fantasy Football Action!')
    console.log('All D\'Amato Dynasty members can now:')
    console.log('• Log in with email and password "Dynasty2025!"')
    console.log('• View their team and league standings')
    console.log('• See Week 1 matchups')
    console.log('• Access the dashboard and league features')

  } catch (error) {
    console.error('❌ Error setting up D\'Amato Dynasty League:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()