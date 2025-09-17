#!/usr/bin/env tsx

import { prisma } from '../src/lib/db'

async function setupDamatoLeague() {
  try {
    console.log('🏈 Setting up D\'Amato Dynasty League with correct member names')
    console.log('===============================================================')

    // First, ensure Nicholas D'Amato is the league owner
    const nicholasUser = await prisma.user.upsert({
      where: { email: 'nicholas.damato@astralfield.com' },
      update: {
        name: "Nicholas D'Amato",
        role: 'COMMISSIONER'
      },
      create: {
        email: 'nicholas.damato@astralfield.com',
        name: "Nicholas D'Amato",
        role: 'COMMISSIONER'
      }
    });

    console.log(`✅ Created/Updated league owner: ${nicholasUser.name}`)

    // D'Amato Dynasty League members with correct names
    const leagueMembers = [
      { name: "Nicholas D'Amato", email: 'nicholas.damato@astralfield.com', role: 'COMMISSIONER' as const },
      { name: 'Nick Hartley', email: 'nick.hartley@astralfield.com', role: 'PLAYER' as const },
      { name: 'Jack McCaigue', email: 'jack.mccaigue@astralfield.com', role: 'PLAYER' as const },
      { name: 'Larry McCaigue', email: 'larry.mccaigue@astralfield.com', role: 'PLAYER' as const },
      { name: 'Renee McCaigue', email: 'renee.mccaigue@astralfield.com', role: 'PLAYER' as const },
      { name: 'Jon Kornbeck', email: 'jon.kornbeck@astralfield.com', role: 'PLAYER' as const },
      { name: 'David Jarvey', email: 'david.jarvey@astralfield.com', role: 'PLAYER' as const },
      { name: 'Kaity Lorbecki', email: 'kaity.lorbecki@astralfield.com', role: 'PLAYER' as const },
      { name: 'Cason Minor', email: 'cason.minor@astralfield.com', role: 'PLAYER' as const },
      { name: 'Brittany Bergum', email: 'brittany.bergum@astralfield.com', role: 'PLAYER' as const }
    ];

    // Create or update all users
    const users = [];
    for (const member of leagueMembers) {
      const user = await prisma.user.upsert({
        where: { email: member.email },
        update: {
          name: member.name,
          role: member.role
        },
        create: {
          email: member.email,
          name: member.name,
          role: member.role
        }
      });
      users.push(user);
      console.log(`✅ ${member.role}: ${member.name}`);
    }

    // Find or create the D'Amato Dynasty League
    let league = await prisma.league.findFirst({
      where: { name: "D'Amato Dynasty League" }
    });

    if (!league) {
      league = await prisma.league.create({
        data: {
          name: "D'Amato Dynasty League",
          commissionerId: nicholasUser.id,
          description: 'Premier dynasty fantasy football league featuring the best managers in the game.',
          season: 2025,
          isActive: true
        }
      });
    } else {
      // Update existing league
      league = await prisma.league.update({
        where: { id: league.id },
        data: {
          commissionerId: nicholasUser.id,
          description: 'Premier dynasty fantasy football league featuring the best managers in the game.',
          season: 2025,
          isActive: true
        }
      });
    }

    console.log(`✅ League created: ${league.name} (ID: ${league.id})`);

    // Create teams for each member
    const teamNames = [
      "D'Amato Dynasty", // Nicholas
      'Hartley Heroes',   // Nick Hartley
      'McCaigue Maulers', // Jack McCaigue
      'Larry Legends',    // Larry McCaigue
      'Renee Raiders',    // Renee McCaigue
      'Kornbeck Kings',   // Jon Kornbeck
      'Jarvey Juggernauts', // David Jarvey
      'Lorbecki Lions',   // Kaity Lorbecki
      'Minor Mayhem',     // Cason Minor
      'Bergum Bombers'    // Brittany Bergum
    ];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const teamName = teamNames[i];
      
      const team = await prisma.team.upsert({
        where: {
          leagueId_ownerId: {
            leagueId: league.id,
            ownerId: user.id
          }
        },
        update: {
          name: teamName,
          draftPosition: i + 1,
          waiverPriority: i + 1,
          faabBudget: 100
        },
        create: {
          name: teamName,
          leagueId: league.id,
          ownerId: user.id,
          draftPosition: i + 1,
          waiverPriority: i + 1,
          faabBudget: 100
        }
      });

      console.log(`✅ Team ${i + 1}: ${teamName} (Owner: ${user.name})`);
    }

    console.log('\n🎉 D\'Amato Dynasty League setup complete!')
    console.log('===================================================')
    console.log(`League Owner: Nicholas D'Amato`)
    console.log(`Total Teams: ${users.length}`)
    console.log(`League Type: Dynasty`)
    console.log(`Season: 2025`)
    
  } catch (error) {
    console.error('❌ Error setting up league:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupDamatoLeague()
  .then(() => {
    console.log('\n✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });