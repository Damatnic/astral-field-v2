/**
 * Players Page - Complete Rebuild
 * Fast, searchable player database with advanced filtering
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { PlayerCard } from '@/components/ui/player-card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { Users, Search, Filter } from 'lucide-react'
import { prisma } from '@/lib/database/prisma'
import { Suspense } from 'react'

interface PlayersPageProps {
  searchParams: {
    search?: string
    position?: string
    team?: string
    page?: string
  }
}

async function getPlayers(params: PlayersPageProps['searchParams']) {
  const { search, position, team, page = '1' } = params
  const pageNumber = parseInt(page)
  const pageSize = 24

  try {
    const where: any = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { team: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        position ? { position } : {},
        team ? { team } : {},
      ],
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        take: pageSize,
        skip: (pageNumber - 1) * pageSize,
        orderBy: [
          { fantasyPoints: 'desc' },
        ],
        select: {
          id: true,
          name: true,
          position: true,
          team: true,
          jerseyNumber: true,
          fantasyPoints: true,
          projectedPoints: true,
          status: true,
        },
      }),
      prisma.player.count({ where }),
    ])

    return {
      players,
      total,
      pages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    console.error('Error fetching players:', error)
    return {
      players: [],
      total: 0,
      pages: 0,
    }
  }
}

function PlayerFilters() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="search"
          name="search"
          placeholder="Search players..."
          className="w-full h-10 pl-10 pr-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Position Filter */}
      <select
        name="position"
        className="h-10 px-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      >
        <option value="">All Positions</option>
        <option value="QB">QB</option>
        <option value="RB">RB</option>
        <option value="WR">WR</option>
        <option value="TE">TE</option>
        <option value="K">K</option>
        <option value="DEF">DEF</option>
      </select>

      {/* Team Filter */}
      <select
        name="team"
        className="h-10 px-4 bg-slate-900/50 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      >
        <option value="">All Teams</option>
        <option value="KC">Kansas City</option>
        <option value="SF">San Francisco</option>
        <option value="BUF">Buffalo</option>
        <option value="DAL">Dallas</option>
        <option value="PHI">Philadelphia</option>
        {/* Add more teams as needed */}
      </select>

      <button
        type="button"
        className="h-10 px-4 flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 transition-all"
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">More Filters</span>
      </button>
    </div>
  )
}

async function PlayersList({ searchParams }: PlayersPageProps) {
  const { players, total, pages } = await getPlayers(searchParams)

  if (players.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No players found"
        description="Try adjusting your search or filters to find what you're looking for."
        action={{
          label: "Clear Filters",
          onClick: () => window.location.href = '/players',
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          Showing {players.length} of {total} players
        </span>
        {pages > 1 && (
          <span className="text-slate-500">
            Page {searchParams.page || 1} of {pages}
          </span>
        )}
      </div>

      {/* Player Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={{
              id: player.id,
              name: player.name,
              position: player.position,
              team: player.team || 'FA',
              points: player.fantasyPoints || 0,
              projected: player.projectedPoints || 0,
              trend: player.fantasyPoints && player.projectedPoints && player.fantasyPoints > player.projectedPoints ? 'up' : 'down',
              status: (player.status as any) || 'active',
            }}
            variant="default"
            onClick={() => {
              // Navigate to player detail
              window.location.href = `/players/${player.id}`
            }}
          />
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: Math.min(pages, 5) }).map((_, i) => {
            const pageNum = i + 1
            const current = parseInt(searchParams.page || '1')
            return (
              <a
                key={pageNum}
                href={`/players?page=${pageNum}${searchParams.search ? `&search=${searchParams.search}` : ''}${searchParams.position ? `&position=${searchParams.position}` : ''}`}
                className={`h-10 w-10 flex items-center justify-center rounded-lg border font-medium transition-all ${
                  current === pageNum
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                }`}
              >
                {pageNum}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title="Player Research"
          description="Analyze stats, projections, and trends for every NFL player"
          icon={Users}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Players' },
          ]}
        />

        {/* Filters */}
        <form method="GET" className="sticky top-16 z-10 bg-slate-950/95 backdrop-blur-sm -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 border-b border-slate-800">
          <PlayerFilters />
        </form>

        {/* Players List */}
        <Suspense fallback={<LoadingState variant="player" count={12} />}>
          <PlayersList searchParams={searchParams} />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
