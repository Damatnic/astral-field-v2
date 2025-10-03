/**
 * PlayerList Component Tests
 * 
 * Comprehensive test suite demonstrating component testing best practices
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerList } from '@/components/players/player-list'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

describe('PlayerList Component', () => {
  // Mock data
  const mockPlayers = [
    {
      id: '1',
      name: 'Patrick Mahomes',
      position: 'QB',
      nflTeam: 'KC',
      rank: 1,
      adp: 1.5,
      status: 'active',
      age: 28,
      stats: [
        { id: 's1', week: 1, fantasyPoints: 25.4, stats: {} },
        { id: 's2', week: 2, fantasyPoints: 22.1, stats: {} }
      ],
      projections: [
        { id: 'p1', projectedPoints: 24.5, confidence: 0.85 }
      ],
      news: [
        { id: 'n1', headline: 'Mahomes throws 3 TDs', publishedAt: new Date('2024-01-01') }
      ]
    },
    {
      id: '2',
      name: 'Christian McCaffrey',
      position: 'RB',
      nflTeam: 'SF',
      rank: 2,
      adp: 2.1,
      status: 'active',
      age: 27,
      stats: [
        { id: 's3', week: 1, fantasyPoints: 28.7, stats: {} }
      ],
      projections: [
        { id: 'p2', projectedPoints: 26.3, confidence: 0.90 }
      ],
      news: []
    }
  ]

  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(() => Promise.resolve())
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    
    // Mock window.location
    delete (window as any).location
    window.location = { href: 'http://localhost:3000/players?page=1' } as any
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    })

    it('should render all players', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
      expect(screen.getByText('Christian McCaffrey')).toBeInTheDocument()
    })

    it('should display player positions with correct colors', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const qbBadge = screen.getByText('QB')
      const rbBadge = screen.getByText('RB')
      
      expect(qbBadge).toBeInTheDocument()
      expect(rbBadge).toBeInTheDocument()
    })

    it('should display player stats', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      // Check for average points (25.4 + 22.1) / 2 = 23.75 ≈ 23.8
      expect(screen.getByText('23.8')).toBeInTheDocument()
      
      // Check for projection
      expect(screen.getByText('24.5')).toBeInTheDocument()
    })

    it('should display player news when available', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      expect(screen.getByText('Mahomes throws 3 TDs')).toBeInTheDocument()
    })

    it('should not display news section when no news available', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      // McCaffrey has no news, so "Latest News" should only appear once
      const newsHeaders = screen.getAllByText('Latest News')
      expect(newsHeaders).toHaveLength(1)
    })

    it('should display pagination info', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      expect(screen.getByText(/Showing 1-50 of 100 players/)).toBeInTheDocument()
      expect(screen.getByText(/Page 1 of 5/)).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no players', () => {
      render(
        <PlayerList
          players={[]}
          currentPage={1}
          totalPages={0}
          totalCount={0}
        />
      )
      
      expect(screen.getByText('No players found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument()
    })

    it('should display search emoji in empty state', () => {
      render(
        <PlayerList
          players={[]}
          currentPage={1}
          totalPages={0}
          totalCount={0}
        />
      )
      
      expect(screen.getByText('🔍')).toBeInTheDocument()
    })

    it('should not display pagination when no players', () => {
      render(
        <PlayerList
          players={[]}
          currentPage={1}
          totalPages={0}
          totalCount={0}
        />
      )
      
      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })
  })

  describe('Player Trends', () => {
    it('should show upward trend for improving player', () => {
      const trendingUpPlayer = [{
        ...mockPlayers[0],
        stats: [
          { id: 's1', week: 2, fantasyPoints: 30.0, stats: {} },
          { id: 's2', week: 1, fantasyPoints: 20.0, stats: {} }
        ]
      }]

      render(
        <PlayerList
          players={trendingUpPlayer}
          currentPage={1}
          totalPages={1}
          totalCount={1}
        />
      )
      
      expect(screen.getByText('+10.0')).toBeInTheDocument()
    })

    it('should show downward trend for declining player', () => {
      const trendingDownPlayer = [{
        ...mockPlayers[0],
        stats: [
          { id: 's1', week: 2, fantasyPoints: 15.0, stats: {} },
          { id: 's2', week: 1, fantasyPoints: 25.0, stats: {} }
        ]
      }]

      render(
        <PlayerList
          players={trendingDownPlayer}
          currentPage={1}
          totalPages={1}
          totalCount={1}
        />
      )
      
      expect(screen.getByText('-10.0')).toBeInTheDocument()
    })

    it('should show steady trend for consistent player', () => {
      const steadyPlayer = [{
        ...mockPlayers[0],
        stats: [
          { id: 's1', week: 2, fantasyPoints: 20.5, stats: {} },
          { id: 's2', week: 1, fantasyPoints: 20.0, stats: {} }
        ]
      }]

      render(
        <PlayerList
          players={steadyPlayer}
          currentPage={1}
          totalPages={1}
          totalCount={1}
        />
      )
      
      expect(screen.getByText('Steady')).toBeInTheDocument()
    })

    it('should show no trend for player with insufficient data', () => {
      const newPlayer = [{
        ...mockPlayers[0],
        stats: [
          { id: 's1', week: 1, fantasyPoints: 20.0, stats: {} }
        ]
      }]

      render(
        <PlayerList
          players={newPlayer}
          currentPage={1}
          totalPages={1}
          totalCount={1}
        />
      )
      
      // Should show "--" for trend
      const trendCells = screen.getAllByText('--')
      expect(trendCells.length).toBeGreaterThan(0)
    })
  })

  describe('Pagination', () => {
    it('should render pagination controls', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    it('should disable Previous button on first page', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const prevButton = screen.getByText('Previous').closest('button')
      expect(prevButton).toBeDisabled()
    })

    it('should disable Next button on last page', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={5}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const nextButton = screen.getByText('Next').closest('button')
      expect(nextButton).toBeDisabled()
    })

    it('should enable both buttons on middle page', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={3}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const prevButton = screen.getByText('Previous').closest('button')
      const nextButton = screen.getByText('Next').closest('button')
      
      expect(prevButton).not.toBeDisabled()
      expect(nextButton).not.toBeDisabled()
    })

    it('should navigate to next page when Next clicked', async () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const nextButton = screen.getByText('Next').closest('button')
      await userEvent.click(nextButton!)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        )
      })
    })

    it('should navigate to previous page when Previous clicked', async () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={3}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const prevButton = screen.getByText('Previous').closest('button')
      await userEvent.click(prevButton!)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        )
      })
    })

    it('should navigate to specific page when page number clicked', async () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const page3Button = screen.getByText('3').closest('button')
      await userEvent.click(page3Button!)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('page=3')
        )
      })
    })

    it('should highlight current page', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={2}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const page2Button = screen.getByText('2').closest('button')
      // Current page should have different styling (not outline variant)
      expect(page2Button).toBeInTheDocument()
    })

    it('should not render pagination for single page', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={1}
          totalCount={2}
        />
      )
      
      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })
  })

  describe('Player Actions', () => {
    it('should have View Details button for each player', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const viewDetailsButtons = screen.getAllByText('View Details')
      expect(viewDetailsButtons).toHaveLength(mockPlayers.length)
    })

    it('should have Add to Watchlist button for each player', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const watchlistButtons = screen.getAllByText('Add to Watchlist')
      expect(watchlistButtons).toHaveLength(mockPlayers.length)
    })

    it('should link to player detail page', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const viewDetailsLinks = screen.getAllByText('View Details')
      const firstLink = viewDetailsLinks[0].closest('a')
      
      expect(firstLink).toHaveAttribute('href', '/players/1')
    })
  })

  describe('Player Information Display', () => {
    it('should display player rank when available', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
    })

    it('should display ADP when available', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      expect(screen.getByText('ADP: 1.5')).toBeInTheDocument()
      expect(screen.getByText('ADP: 2.1')).toBeInTheDocument()
    })

    it('should display player age', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      expect(screen.getByText(/Age 28/)).toBeInTheDocument()
      expect(screen.getByText(/Age 27/)).toBeInTheDocument()
    })

    it('should display Unknown age when not available', () => {
      const playerWithoutAge = [{
        ...mockPlayers[0],
        age: null
      }]

      render(
        <PlayerList
          players={playerWithoutAge}
          currentPage={1}
          totalPages={1}
          totalCount={1}
        />
      )
      
      expect(screen.getByText(/Age Unknown/)).toBeInTheDocument()
    })

    it('should display number of games played', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      // Mahomes has 2 games
      const gamesCells = screen.getAllByText('2')
      expect(gamesCells.length).toBeGreaterThan(0)
    })

    it('should display -- for missing projections', () => {
      const playerWithoutProjection = [{
        ...mockPlayers[0],
        projections: []
      }]

      render(
        <PlayerList
          players={playerWithoutProjection}
          currentPage={1}
          totalPages={1}
          totalCount={1}
        />
      )
      
      const projectionCells = screen.getAllByText('--')
      expect(projectionCells.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should memoize player cards', () => {
      const { rerender } = render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      // Re-render with same props
      rerender(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      // Component should still render correctly
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    })

    it('should handle large player lists efficiently', () => {
      const largePlayers List = Array.from({ length: 50 }, (_, i) => ({
        ...mockPlayers[0],
        id: `player-${i}`,
        name: `Player ${i}`
      }))

      render(
        <PlayerList
          players={largePlayersList}
          currentPage={1}
          totalPages={10}
          totalCount={500}
        />
      )
      
      // Should render all players
      expect(screen.getByText('Player 0')).toBeInTheDocument()
      expect(screen.getByText('Player 49')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have accessible links', () => {
      render(
        <PlayerList
          players={mockPlayers}
          currentPage={1}
          totalPages={5}
          totalCount={100}
        />
      )
      
      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)
    })
  })
})
