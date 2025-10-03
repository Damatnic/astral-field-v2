'use client'

import { memo, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'

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
    projectedPoints: number
    confidence: number | null
  }>
  news: Array<{
    id: string
    headline: string
    publishedAt: Date
  }>
}

interface PlayerListProps {
  players: Player[]
  currentPage: number
  totalPages: number
  totalCount: number
}

// Memoized PlayerCard component for better performance
const PlayerCard = memo(({ player }: { player: Player }) => {
  const getPositionColor = useCallback((position: string) => {
    const colors: Record<string, string> = {
      QB: 'bg-red-500/20 text-red-400 border-red-500/30',
      RB: 'bg-green-500/20 text-green-400 border-green-500/30',
      WR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      TE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      K: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      DEF: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    }
    return colors[position] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }, [])

  const getPlayerTrend = useCallback((stats: Player['stats']) => {
    if (stats.length < 2) return null
    
    const recent = stats[0]?.fantasyPoints || 0
    const previous = stats[1]?.fantasyPoints || 0
    const diff = recent - previous

    if (Math.abs(diff) < 1) return { icon: MinusIcon, color: 'text-gray-400', text: 'Steady' }
    if (diff > 0) return { icon: ArrowTrendingUpIcon, color: 'text-green-400', text: `+${diff.toFixed(1)}` }
    return { icon: ArrowTrendingDownIcon, color: 'text-red-400', text: diff.toFixed(1) }
  }, [])

  const trend = useMemo(() => getPlayerTrend(player.stats), [player.stats, getPlayerTrend])
  const avgPoints = useMemo(() => {
    return player.stats.length > 0 
      ? player.stats.reduce((sum: number, stat: any) => sum + stat.fantasyPoints, 0) / player.stats.length 
      : 0
  }, [player.stats])
  const projection = useMemo(() => player.projections[0], [player.projections])

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getPositionColor(player.position)}`}>
            {player.position}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{player.name}</h3>
            <p className="text-sm text-gray-400">
              {player.nflTeam} • Age {player.age || 'Unknown'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          {player.rank && (
            <p className="text-sm font-medium text-white">#{player.rank}</p>
          )}
          {player.adp && (
            <p className="text-xs text-gray-400">ADP: {player.adp.toFixed(1)}</p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-400">Avg Points</p>
          <p className="text-lg font-semibold text-white">{avgPoints.toFixed(1)}</p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-400">Projection</p>
          <p className="text-lg font-semibold text-white">
            {projection ? projection.projectedPoints.toFixed(1) : '--'}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-400">Games</p>
          <p className="text-lg font-semibold text-white">{player.stats.length}</p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-400">Trend</p>
          <div className="flex items-center justify-center">
            {trend ? (
              <>
                <trend.icon className={`h-4 w-4 mr-1 ${trend.color}`} />
                <span className={`text-sm font-medium ${trend.color}`}>{trend.text}</span>
              </>
            ) : (
              <span className="text-sm text-gray-400">--</span>
            )}
          </div>
        </div>
      </div>

      {/* Recent News */}
      {player.news[0] && (
        <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 mb-1">Latest News</p>
          <p className="text-sm text-gray-300">{player.news[0].headline}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(player.news[0].publishedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Link href={`/players/${player.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        </Link>
        <Button size="sm" className="px-6">
          Add to Watchlist
        </Button>
      </div>
    </div>
  )
})

// Memoized Pagination component
const PaginationControls = memo(({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) => {
  const pageNumbers = useMemo(() => {
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
      const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i))
      return pageNum <= totalPages ? pageNum : null
    }).filter(Boolean) as number[]
  }, [currentPage, totalPages])

  return (
    <div className="flex justify-center items-center space-x-4 pt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        Previous
      </Button>
      
      <div className="flex space-x-2">
        {pageNumbers.map(pageNum => (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageNum)}
            className="w-10"
          >
            {pageNum}
          </Button>
        ))}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
        <ChevronRightIcon className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
})

export const PlayerList = memo(({ players, currentPage, totalPages, totalCount }: PlayerListProps) => {
  const router = useRouter()

  const handlePageChange = useCallback((page: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', page.toString())
    router.push(url.toString())
  }, [router])

  // Memoized pagination info
  const paginationInfo = useMemo(() => ({
    startItem: ((currentPage - 1) * 50) + 1,
    endItem: Math.min(currentPage * 50, totalCount)
  }), [currentPage, totalCount])

  if (players.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-12">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No players found</h3>
          <p className="text-gray-400">Try adjusting your search criteria</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">
          Showing {paginationInfo.startItem}-{paginationInfo.endItem} of {totalCount} players
        </p>
        <div className="text-sm text-gray-400">
          Page {currentPage} of {totalPages}
        </div>
      </div>

      {/* Player Cards */}
      <div className="grid grid-cols-1 gap-4">
        {players.map((player: any) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
})

// Add display names for better debugging
PlayerCard.displayName = 'PlayerCard'
PaginationControls.displayName = 'PaginationControls'
PlayerList.displayName = 'PlayerList'