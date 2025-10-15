import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const additionalPlayers = [
  // QBs (need 10 more)
  { name: 'Tua Tagovailoa', position: 'QB', team: 'MIA', adp: 50 },
  { name: 'Trevor Lawrence', position: 'QB', team: 'JAX', adp: 55 },
  { name: 'Kirk Cousins', position: 'QB', team: 'ATL', adp: 60 },
  { name: 'Geno Smith', position: 'QB', team: 'SEA', adp: 65 },
  { name: 'Baker Mayfield', position: 'QB', team: 'TB', adp: 70 },
  { name: 'Sam Darnold', position: 'QB', team: 'MIN', adp: 75 },
  { name: 'Russell Wilson', position: 'QB', team: 'PIT', adp: 80 },
  { name: 'Justin Fields', position: 'QB', team: 'PIT', adp: 85 },
  { name: 'Deshaun Watson', position: 'QB', team: 'CLE', adp: 90 },
  { name: 'Daniel Jones', position: 'QB', team: 'NYG', adp: 95 },

  // RBs (need 24 more)
  { name: 'Javonte Williams', position: 'RB', team: 'DEN', adp: 51 },
  { name: 'Rhamondre Stevenson', position: 'RB', team: 'NE', adp: 52 },
  { name: 'Najee Harris', position: 'RB', team: 'PIT', adp: 53 },
  { name: 'David Montgomery', position: 'RB', team: 'DET', adp: 54 },
  { name: 'Jahmyr Gibbs', position: 'RB', team: 'DET', adp: 56 },
  { name: 'Zack Moss', position: 'RB', team: 'CIN', adp: 57 },
  { name: 'Gus Edwards', position: 'RB', team: 'LAC', adp: 58 },
  { name: 'Chuba Hubbard', position: 'RB', team: 'CAR', adp: 59 },
  { name: 'Tyjae Spears', position: 'RB', team: 'TEN', adp: 61 },
  { name: 'Jaylen Warren', position: 'RB', team: 'PIT', adp: 62 },
  { name: 'Zach Charbonnet', position: 'RB', team: 'SEA', adp: 63 },
  { name: 'Roschon Johnson', position: 'RB', team: 'CHI', adp: 64 },
  { name: 'Trey Benson', position: 'RB', team: 'ARI', adp: 66 },
  { name: 'Ty Chandler', position: 'RB', team: 'MIN', adp: 67 },
  { name: 'Justice Hill', position: 'RB', team: 'BAL', adp: 68 },
  { name: 'Dameon Pierce', position: 'RB', team: 'HOU', adp: 69 },
  { name: 'Khalil Herbert', position: 'RB', team: 'CHI', adp: 71 },
  { name: 'Elijah Mitchell', position: 'RB', team: 'SF', adp: 72 },
  { name: 'Clyde Edwards-Helaire', position: 'RB', team: 'KC', adp: 73 },
  { name: 'Samaje Perine', position: 'RB', team: 'DEN', adp: 74 },
  { name: 'Ezekiel Elliott', position: 'RB', team: 'NE', adp: 76 },
  { name: 'Kareem Hunt', position: 'RB', team: 'CLE', adp: 77 },
  { name: 'Latavius Murray', position: 'RB', team: 'BUF', adp: 78 },
  { name: 'Jamaal Williams', position: 'RB', team: 'NO', adp: 79 },

  // WRs (need 30 more)
  { name: 'Jaxon Smith-Njigba', position: 'WR', team: 'SEA', adp: 81 },
  { name: 'Jordan Addison', position: 'WR', team: 'MIN', adp: 82 },
  { name: 'Quentin Johnston', position: 'WR', team: 'LAC', adp: 83 },
  { name: 'Rashee Rice', position: 'WR', team: 'KC', adp: 84 },
  { name: 'Jayden Reed', position: 'WR', team: 'GB', adp: 86 },
  { name: 'Romeo Doubs', position: 'WR', team: 'GB', adp: 87 },
  { name: 'Dontayvion Wicks', position: 'WR', team: 'GB', adp: 88 },
  { name: 'Josh Downs', position: 'WR', team: 'IND', adp: 89 },
  { name: 'Wan\'dale Robinson', position: 'WR', team: 'NYG', adp: 91 },
  { name: 'Jakobi Meyers', position: 'WR', team: 'LV', adp: 92 },
  { name: 'Tyler Boyd', position: 'WR', team: 'CIN', adp: 93 },
  { name: 'Elijah Moore', position: 'WR', team: 'CLE', adp: 94 },
  { name: 'Tutu Atwell', position: 'WR', team: 'LAR', adp: 96 },
  { name: 'Demario Douglas', position: 'WR', team: 'NE', adp: 97 },
  { name: 'Rondale Moore', position: 'WR', team: 'ARI', adp: 98 },
  { name: 'Marvin Mims', position: 'WR', team: 'DEN', adp: 99 },
  { name: 'Tre Tucker', position: 'WR', team: 'LV', adp: 100 },
  { name: 'Jonathan Mingo', position: 'WR', team: 'CAR', adp: 101 },
  { name: 'Rashid Shaheed', position: 'WR', team: 'NO', adp: 102 },
  { name: 'Skyy Moore', position: 'WR', team: 'KC', adp: 103 },
  { name: 'Alec Pierce', position: 'WR', team: 'IND', adp: 104 },
  { name: 'Jahan Dotson', position: 'WR', team: 'WAS', adp: 105 },
  { name: 'Curtis Samuel', position: 'WR', team: 'BUF', adp: 106 },
  { name: 'Mecole Hardman', position: 'WR', team: 'KC', adp: 107 },
  { name: 'Kendrick Bourne', position: 'WR', team: 'NE', adp: 108 },
  { name: 'Parris Campbell', position: 'WR', team: 'PHI', adp: 109 },
  { name: 'Laviska Shenault', position: 'WR', team: 'SEA', adp: 110 },
  { name: 'Donovan Peoples-Jones', position: 'WR', team: 'DET', adp: 111 },
  { name: 'Kalif Raymond', position: 'WR', team: 'DET', adp: 112 },
  { name: 'Marquez Valdes-Scantling', position: 'WR', team: 'BUF', adp: 113 },

  // TEs (need 10 more)
  { name: 'Cole Kmet', position: 'TE', team: 'CHI', adp: 114 },
  { name: 'Chigoziem Okonkwo', position: 'TE', team: 'TEN', adp: 115 },
  { name: 'Hunter Henry', position: 'TE', team: 'NE', adp: 116 },
  { name: 'Tyler Conklin', position: 'TE', team: 'NYJ', adp: 117 },
  { name: 'Juwan Johnson', position: 'TE', team: 'NO', adp: 118 },
  { name: 'Noah Fant', position: 'TE', team: 'SEA', adp: 119 },
  { name: 'Hayden Hurst', position: 'TE', team: 'LAC', adp: 120 },
  { name: 'Gerald Everett', position: 'TE', team: 'CHI', adp: 121 },
  { name: 'Irv Smith Jr', position: 'TE', team: 'CIN', adp: 122 },
  { name: 'Austin Hooper', position: 'TE', team: 'LV', adp: 123 },

  // Ks (need 11 more)
  { name: 'Jake Moody', position: 'K', team: 'SF', adp: 124 },
  { name: 'Cairo Santos', position: 'K', team: 'CHI', adp: 125 },
  { name: 'Greg Joseph', position: 'K', team: 'GB', adp: 126 },
  { name: 'Matt Gay', position: 'K', team: 'IND', adp: 127 },
  { name: 'Riley Patterson', position: 'K', team: 'DET', adp: 128 },
  { name: 'Greg Zuerlein', position: 'K', team: 'NYJ', adp: 129 },
  { name: 'Wil Lutz', position: 'K', team: 'DEN', adp: 130 },
  { name: 'Matt Prater', position: 'K', team: 'ARI', adp: 131 },
  { name: 'Chase McLaughlin', position: 'K', team: 'TB', adp: 132 },
  { name: 'Younghoe Koo', position: 'K', team: 'ATL', adp: 133 },
  { name: 'Daniel Carlson', position: 'K', team: 'LV', adp: 134 },

  // DEFs (need 11 more)
  { name: 'Steelers', position: 'DEF', team: 'PIT', adp: 135 },
  { name: 'Browns', position: 'DEF', team: 'CLE', adp: 136 },
  { name: 'Jets', position: 'DEF', team: 'NYJ', adp: 137 },
  { name: 'Patriots', position: 'DEF', team: 'NE', adp: 138 },
  { name: 'Broncos', position: 'DEF', team: 'DEN', adp: 139 },
  { name: 'Chargers', position: 'DEF', team: 'LAC', adp: 140 },
  { name: 'Seahawks', position: 'DEF', team: 'SEA', adp: 141 },
  { name: 'Packers', position: 'DEF', team: 'GB', adp: 142 },
  { name: 'Buccaneers', position: 'DEF', team: 'TB', adp: 143 },
  { name: 'Falcons', position: 'DEF', team: 'ATL', adp: 144 },
  { name: 'Cardinals', position: 'DEF', team: 'ARI', adp: 145 },
]

async function addPlayers() {
  console.log(`Adding ${additionalPlayers.length} players...`)
  
  for (const player of additionalPlayers) {
    const { team, ...playerData } = player
    await prisma.player.create({
      data: {
        ...playerData,
        nflTeam: team,
        isFantasyRelevant: true
      }
    })
  }
  
  const total = await prisma.player.count()
  console.log(`✅ Total players now: ${total}`)
}

addPlayers()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
