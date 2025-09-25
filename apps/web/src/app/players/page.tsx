import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { prisma } from '@/lib/prisma'
import { PlayerSearch } from '@/components/players/player-search'
import { PlayerList } from '@/components/players/player-list'

interface Player {
  id: string
  name: string
  position: string
  nflTeam: string | null
  rank: number | null
  adp: number | null
  status: string
  age: number | null
  stats: Array<{
    id: string
    week: number
    fantasyPoints: number
    stats: any
  }>
  projections: Array<{
    id: string
    week: number | null
    projectedPoints: number
    confidence: number
  }>
  news: Array<{
    id: string
    headline: string
    publishedAt: Date
  }>
}

interface PlayersPageProps {
  searchParams: {
    search?: string
    position?: string
    team?: string
    page?: string
  }
}

async function getPlayers(params: PlayersPageProps['searchParams']) {
  const page = parseInt(params.page || '1')
  const pageSize = 50
  const skip = (page - 1) * pageSize

  const where: any = {
    isActive: true,
    isFantasyRelevant: true
  }

  if (params.search) {
    where.name = {
      contains: params.search,
      mode: 'insensitive'
    }
  }

  if (params.position && params.position !== 'ALL') {
    where.position = params.position
  }

  if (params.team && params.team !== 'ALL') {
    where.nflTeam = params.team
  }

  const [players, totalCount] = await Promise.all([
    prisma.player.findMany({
      where,
      include: {
        stats: {
          where: {
            season: 2024,
            week: { lte: 3 }
          },
          orderBy: { week: 'desc' },
          take: 3
        },
        projections: {
          where: {
            season: 2024,
            week: 4
          },
          take: 1
        },
        news: {
          orderBy: { publishedAt: 'desc' },
          take: 1
        }
      },
      orderBy: [
        { rank: 'asc' },
        { adp: 'asc' },
        { name: 'asc' }
      ],
      skip,
      take: pageSize
    }),
    prisma.player.count({ where })
  ])

  // Transform players to match the interface
  const transformedPlayers = players.map(player => ({
    ...player,
    status: 'ACTIVE', // Default status
    age: null, // Could be calculated from birthdate if available
    nflTeam: player.nflTeam as string | null,
    stats: player.stats || [],
    projections: player.projections || [],
    news: (player.news || []).map(newsItem => ({
      id: newsItem.id,
      headline: newsItem.title,
      publishedAt: newsItem.publishedAt
    }))
  }))

  return {
    players: transformedPlayers as Player[],
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize)
  }
}

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  const data = await getPlayers(searchParams)

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Player Research</h1>
          <p className="text-gray-400 mt-2">
            Analyze player stats, projections, and news to make informed decisions
          </p>
        </div>

        {/* Search and Filters */}
        <PlayerSearch />

        {/* Player List */}
        <PlayerList 
          players={data.players}
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          totalCount={data.totalCount}
        />
      </div>
    </DashboardLayout>
  )
}