import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function redraftAllTeams() {
  console.log('🏈 Starting complete redraft for all 10 teams...\n')

  // 1. Clear all existing rosters
  console.log('1️⃣ Clearing existing rosters...')
  await prisma.rosterPlayer.deleteMany({})
  console.log('   ✅ All rosters cleared\n')

  // 2. Get all teams
  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' }
  })
  console.log(`2️⃣ Found ${teams.length} teams\n`)

  // 3. Get top players by position (need 16 * teams.length total)
  const totalNeeded = teams.length * 16
  const qbs = await prisma.player.findMany({ where: { position: 'QB' }, orderBy: { adp: 'asc' }, take: teams.length * 2 })
  const rbs = await prisma.player.findMany({ where: { position: 'RB' }, orderBy: { adp: 'asc' }, take: teams.length * 4 })
  const wrs = await prisma.player.findMany({ where: { position: 'WR' }, orderBy: { adp: 'asc' }, take: teams.length * 5 })
  const tes = await prisma.player.findMany({ where: { position: 'TE' }, orderBy: { adp: 'asc' }, take: teams.length * 2 })
  const ks = await prisma.player.findMany({ where: { position: 'K' }, orderBy: { adp: 'asc' }, take: teams.length * 2 })
  const defs = await prisma.player.findMany({ where: { position: 'DEF' }, orderBy: { adp: 'asc' }, take: teams.length * 2 })

  // 4. Snake draft - 16 rounds, 10 teams
  const draftPool = [...qbs, ...rbs, ...wrs, ...tes, ...ks, ...defs]
  const teamRosters: { [teamId: string]: string[] } = {}
  teams.forEach(t => teamRosters[t.id] = [])

  console.log('3️⃣ Conducting snake draft (16 rounds)...')
  
  let playerIndex = 0
  for (let round = 1; round <= 16; round++) {
    const isEvenRound = round % 2 === 0
    const roundTeams = isEvenRound ? [...teams].reverse() : teams

    for (const team of roundTeams) {
      if (playerIndex < draftPool.length) {
        teamRosters[team.id].push(draftPool[playerIndex].id)
        playerIndex++
      }
    }
    console.log(`   Round ${round} complete`)
  }
  console.log('   ✅ Draft complete\n')

  // 5. Assign rosters with proper positions
  console.log('4️⃣ Assigning rosters to teams...')
  for (const team of teams) {
    const playerIds = teamRosters[team.id]
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } }
    })

    // Assign starters: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 K, 1 DEF = 9 starters, 7 bench
    const qb = players.find(p => p.position === 'QB')
    const rbs = players.filter(p => p.position === 'RB').slice(0, 2)
    const wrs = players.filter(p => p.position === 'WR').slice(0, 2)
    const te = players.find(p => p.position === 'TE')
    const k = players.find(p => p.position === 'K')
    const def = players.find(p => p.position === 'DEF')
    
    const usedIds = [qb?.id, ...rbs.map(r => r.id), ...wrs.map(w => w.id), te?.id, k?.id, def?.id].filter(Boolean)
    const flex = players.find(p => ['RB', 'WR', 'TE'].includes(p.position) && !usedIds.includes(p.id))

    const starters = [qb, ...rbs, ...wrs, te, flex, k, def].filter(Boolean)
    const bench = players.filter(p => !starters.find(s => s?.id === p.id))
    
    console.log(`   Team ${team.name}: ${players.length} total players`)

    // Create roster entries
    for (const player of starters) {
      if (player) {
        const isFlex = player.id === flex?.id
        await prisma.rosterPlayer.create({
          data: {
            teamId: team.id,
            playerId: player.id,
            position: isFlex ? 'FLEX' : player.position,
            isStarter: true
          }
        })
      }
    }

    for (const player of bench) {
      await prisma.rosterPlayer.create({
        data: {
          teamId: team.id,
          playerId: player.id,
          position: 'BENCH',
          isStarter: false
        }
      })
    }

    console.log(`   ✅ ${team.name}: ${starters.length} starters, ${bench.length} bench`)
  }

  console.log('\n✅ Redraft complete! All 10 teams have 16-player rosters\n')
}

redraftAllTeams()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
