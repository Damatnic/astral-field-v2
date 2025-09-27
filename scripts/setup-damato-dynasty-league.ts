#!/usr/bin/env tsx
/**
 * Setup D'Amato Dynasty League
 * Create the league and assign all 10 members with their teams
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// D'Amato Dynasty League Members
const DAMATO_MEMBERS = [
  {
    name: 'Nicholas D\'Amato',
    email: 'nicholas@damato.com',
    teamName: 'Thunder Bolts',
    role: 'COMMISSIONER' as const
  },
  {
    name: 'Nick Hartley',
    email: 'nick@hartley.com', 
    teamName: 'Lightning Strike',
    role: 'PLAYER' as const
  },
  {
    name: 'Jack McCaigue',
    email: 'jack@mccaigue.com',
    teamName: 'Storm Chasers', 
    role: 'PLAYER' as const
  },
  {
    name: 'Larry McCaigue',
    email: 'larry@mccaigue.com',
    teamName: 'Wind Warriors',
    role: 'PLAYER' as const
  },
  {
    name: 'Renee McCaigue',
    email: 'renee@mccaigue.com',
    teamName: 'Tornado Titans',
    role: 'PLAYER' as const
  },
  {
    name: 'Jon Kornbeck',
    email: 'jon@kornbeck.com',
    teamName: 'Hurricane Heroes',
    role: 'PLAYER' as const
  },
  {
    name: 'David Jarvey',
    email: 'david@jarvey.com',
    teamName: 'Cyclone Squad',
    role: 'PLAYER' as const
  },
  {
    name: 'Kaity Lorbecki',
    email: 'kaity@lorbecki.com',
    teamName: 'Tempest Force',
    role: 'PLAYER' as const
  },
  {
    name: 'Cason Minor',
    email: 'cason@minor.com',
    teamName: 'Blizzard Brigade',
    role: 'PLAYER' as const
  },
  {
    name: 'Brittany Bergum',
    email: 'brittany@bergum.com',
    teamName: 'Frost Giants',
    role: 'PLAYER' as const
  }
]

async function setupDamatoDynastyLeague() {
  console.log('🏆 SETTING UP D\'AMATO DYNASTY LEAGUE')
  console.log('='.repeat(50))
  
  try {
    // Check if league already exists
    let league = await prisma.league.findFirst({
      where: {
        OR: [
          { name: { contains: 'Amato', mode: 'insensitive' } },
          { name: { contains: 'Dynasty', mode: 'insensitive' } }
        ]
      },
      include: {
        teams: {
          include: {
            owner: true
          }
        }
      }
    })
    
    if (!league) {
      // Create the D'Amato Dynasty League
      console.log('📝 Creating D\'Amato Dynasty League...')
      league = await prisma.league.create({
        data: {
          name: 'D\'Amato Dynasty League',
          description: 'Elite fantasy football league for the D\'Amato Dynasty members',
          maxTeams: 10
        },
        include: {
          teams: {
            include: {
              owner: true
            }
          }
        }
      })
      console.log(`✅ Created league: ${league.name} (ID: ${league.id})`)
    } else {
      console.log(`✅ Found existing league: ${league.name} (ID: ${league.id})`)
    }
    
    console.log('\n👥 Setting up league members...')
    
    for (const member of DAMATO_MEMBERS) {
      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email: member.email }
      })
      
      if (!user) {
        // Create the user
        const hashedPassword = await bcrypt.hash('dynasty2024!', 10)
        
        user = await prisma.user.create({
          data: {
            name: member.name,
            email: member.email,
            hashedPassword: hashedPassword,
            teamName: member.teamName,
            role: member.role
          }
        })
        console.log(`✅ Created user: ${user.name}`)
      } else {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            teamName: member.teamName,
            role: member.role
          }
        })
        console.log(`✅ Updated user: ${user.name}`)
      }
      
      // Check if team already exists for this user in this league
      let team = await prisma.team.findFirst({
        where: {
          ownerId: user.id,
          leagueId: league.id
        }
      })
      
      if (!team) {
        // Create team for the user in the league
        team = await prisma.team.create({
          data: {
            name: member.teamName,
            ownerId: user.id,
            leagueId: league.id
          }
        })
        console.log(`✅ Created team: ${team.name} for ${user.name}`)
      } else {
        // Update team name if needed
        team = await prisma.team.update({
          where: { id: team.id },
          data: {
            name: member.teamName
          }
        })
        console.log(`✅ Updated team: ${team.name} for ${user.name}`)
      }
    }
    
    // Verify the setup
    const updatedLeague = await prisma.league.findUnique({
      where: { id: league.id },
      include: {
        teams: {
          include: {
            owner: true
          },
          orderBy: { owner: { name: 'asc' } }
        }
      }
    })
    
    console.log('\n🎯 D\'AMATO DYNASTY LEAGUE SETUP COMPLETE!')
    console.log('='.repeat(50))
    console.log(`🏆 League: ${updatedLeague?.name}`)
    console.log(`👥 Teams: ${updatedLeague?.teams.length}/10`)
    console.log('\n📋 Team Roster:')
    
    updatedLeague?.teams.forEach((team, index) => {
      const icon = team.owner.role === 'COMMISSIONER' ? '👑' : '⚡'
      console.log(`  ${index + 1}. ${icon} ${team.owner.name} - ${team.name} (${team.owner.role})`)
    })
    
    console.log('\n🔐 Login Credentials for All Members:')
    console.log('   Email: [member]@[lastname].com')
    console.log('   Password: dynasty2024!')
    console.log('\n✅ All members can now sign in and access the league dashboard!')
    
  } catch (error) {
    console.error('❌ Error setting up D\'Amato Dynasty League:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupDamatoDynastyLeague()
