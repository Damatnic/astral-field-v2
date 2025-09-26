import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createDemoUsers() {
  console.log('Creating demo users...')

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 12)
  const userPassword = await bcrypt.hash('user123', 12)
  const demoPassword = await bcrypt.hash('demo123', 12)

  // Create demo users
  const users = [
    {
      email: 'admin@astralfield.demo',
      name: 'Admin User',
      hashedPassword: adminPassword,
      role: 'ADMIN',
      teamName: 'Astral Admins'
    },
    {
      email: 'user@astralfield.demo',
      name: 'Demo User',
      hashedPassword: userPassword,
      role: 'USER',
      teamName: 'Demo Team'
    },
    {
      email: 'demo@astralfield.demo',
      name: 'Demo Manager',
      hashedPassword: demoPassword,
      role: 'USER',
      teamName: 'Fantasy Champions'
    }
  ]

  for (const userData of users) {
    try {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: userData,
        create: userData
      })
      console.log(`✅ Created/updated user: ${user.email}`)
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error)
    }
  }

  console.log('\n🎉 Demo users created!')
  console.log('\nLogin credentials:')
  console.log('👤 Admin: admin@astralfield.demo / admin123')
  console.log('👤 User: user@astralfield.demo / user123')
  console.log('👤 Demo: demo@astralfield.demo / demo123')
}

createDemoUsers()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })