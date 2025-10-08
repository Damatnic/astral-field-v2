import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_USERS = [
  { 
    name: "Nicholas D'Amato", 
    email: "nicholas@damato-dynasty.com", 
    teamName: "D'Amato Dynasty", 
    role: "COMMISSIONER" 
  },
  { 
    name: "Nick Hartley", 
    email: "nick@damato-dynasty.com", 
    teamName: "Hartley's Heroes", 
    role: "USER" 
  },
  { 
    name: "Jack McCaigue", 
    email: "jack@damato-dynasty.com", 
    teamName: "McCaigue Mayhem", 
    role: "USER" 
  },
  { 
    name: "Larry McCaigue", 
    email: "larry@damato-dynasty.com", 
    teamName: "Larry Legends", 
    role: "USER" 
  },
  { 
    name: "Renee McCaigue", 
    email: "renee@damato-dynasty.com", 
    teamName: "Renee's Reign", 
    role: "USER" 
  },
  { 
    name: "Jon Kornbeck", 
    email: "jon@damato-dynasty.com", 
    teamName: "Kornbeck Crushers", 
    role: "USER" 
  },
  { 
    name: "David Jarvey", 
    email: "david@damato-dynasty.com", 
    teamName: "Jarvey's Juggernauts", 
    role: "USER" 
  },
  { 
    name: "Kaity Lorbecki", 
    email: "kaity@damato-dynasty.com", 
    teamName: "Lorbecki Lions", 
    role: "USER" 
  },
  { 
    name: "Cason Minor", 
    email: "cason@damato-dynasty.com", 
    teamName: "Minor Miracles", 
    role: "USER" 
  },
  { 
    name: "Brittany Bergum", 
    email: "brittany@damato-dynasty.com", 
    teamName: "Bergum Blitz", 
    role: "USER" 
  }
]

const DEMO_PASSWORD = 'Dynasty2025!'

async function main() {
  console.log('🏈 Seeding D\'Amato Dynasty League users...\n')

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10)

  for (const user of DEMO_USERS) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      })

      if (existingUser) {
        // Update existing user
        await prisma.user.update({
          where: { email: user.email },
          data: {
            name: user.name,
            teamName: user.teamName,
            role: user.role as any,
            hashedPassword,
            emailVerified: new Date(),
          }
        })
        console.log(`✅ Updated: ${user.name} (${user.email})`)
      } else {
        // Create new user
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            teamName: user.teamName,
            role: user.role as any,
            hashedPassword,
            emailVerified: new Date(),
          }
        })
        console.log(`✨ Created: ${user.name} (${user.email})`)
      }
    } catch (error) {
      console.error(`❌ Error with ${user.email}:`, error)
    }
  }

  console.log('\n🎉 All D\'Amato Dynasty League users seeded successfully!')
  console.log(`\n🔑 Demo Password for all accounts: ${DEMO_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

