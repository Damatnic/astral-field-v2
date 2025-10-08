import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Database State...\n')

  // Check users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      teamName: true,
      role: true,
      hashedPassword: true,
    },
    orderBy: { email: 'asc' }
  })

  console.log(`📊 Found ${users.length} users:\n`)
  users.forEach((user, i) => {
    const hasPassword = !!user.hashedPassword
    console.log(`${i + 1}. ${user.name || 'No name'} (${user.email})`)
    console.log(`   Team: ${user.teamName || 'No team'}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Password: ${hasPassword ? '✅ Set' : '❌ Missing'}`)
    console.log('')
  })

  // Check teams
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })

  console.log(`\n🏈 Found ${teams.length} teams:\n`)
  teams.forEach((team, i) => {
    console.log(`${i + 1}. ${team.name}`)
    console.log(`   Owner: ${team.owner?.name || 'No owner'} (${team.owner?.email || 'N/A'})`)
  })

  // Check leagues
  const leagues = await prisma.league.findMany({
    select: {
      id: true,
      name: true,
      season: true,
      _count: {
        select: {
          teams: true
        }
      }
    }
  })

  console.log(`\n🏆 Found ${leagues.length} league(s):\n`)
  leagues.forEach((league, i) => {
    console.log(`${i + 1}. ${league.name}`)
    console.log(`   Season: ${league.season}`)
    console.log(`   Teams: ${league._count.teams}`)
  })

  console.log('\n✅ Database check complete!\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

