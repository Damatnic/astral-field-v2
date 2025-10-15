import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PlayersPage from '@/app/players/page'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/components/layout/modern-layout', () => ({
  ModernLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="modern-layout">{children}</div>
}))
jest.mock('@/lib/utils/advanced-player-stats', () => ({
  enhancePlayerWithAdvancedStats: (player: any) => ({
    ...player,
    targetShare: 15.5,
    snapCount: 85.2,
    redZoneTargets: 3
  })
}))

const mockPush = jest.fn()
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com'
  }
}

describe('Players Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    
    // Mock fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Authentication Flow', () => {
    it('redirects to signin when unauthenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('loads players when authenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      const mockPlayersData = {
        players: [
          {
            id: 'player-1',
            name: 'Josh Allen',
            position: 'QB',
            nflTeam: 'BUF',
            fantasyPoints: 25.2,
            projectedPoints: 22.5
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlayersData)
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/players')
      })

      await waitFor(() => {
        expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filtering', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('filters players by search term', async () => {
      const mockPlayersData = {
        players: [
          {
            id: 'player-1',
            name: 'Josh Allen',
            position: 'QB',
            nflTeam: 'BUF',
            fantasyPoints: 25.2,
            projectedPoints: 22.5
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPlayersData)
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search players...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search players...')
      fireEvent.change(searchInput, { target: { value: 'Josh' } })

      // Wait for debounced search
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/players?search=Josh')
      }, { timeout: 1000 })
    })

    it('filters players by position', async () => {
      const mockPlayersData = {
        players: [
          {
            id: 'player-1',
            name: 'Josh Allen',
            position: 'QB',
            nflTeam: 'BUF',
            fantasyPoints: 25.2,
            projectedPoints: 22.5
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPlayersData)
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Positions')).toBeInTheDocument()
      })

      const positionSelect = screen.getByDisplayValue('All Positions')
      fireEvent.change(positionSelect, { target: { value: 'QB' } })

      // Wait for debounced search
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/players?position=QB')
      }, { timeout: 1000 })
    })

    it('filters players by team', async () => {
      const mockPlayersData = {
        players: [
          {
            id: 'player-1',
            name: 'Josh Allen',
            position: 'QB',
            nflTeam: 'BUF',
            fantasyPoints: 25.2,
            projectedPoints: 22.5
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPlayersData)
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Teams')).toBeInTheDocument()
      })

      const teamSelect = screen.getByDisplayValue('All Teams')
      fireEvent.change(teamSelect, { target: { value: 'BUF' } })

      // Wait for debounced search
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/players?team=BUF')
      }, { timeout: 1000 })
    })

    it('clears all filters when clear button is clicked', async () => {
      const mockPlayersData = {
        players: [
          {
            id: 'player-1',
            name: 'Josh Allen',
            position: 'QB',
            nflTeam: 'BUF',
            fantasyPoints: 25.2,
            projectedPoints: 22.5
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPlayersData)
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument()
      })

      const clearButton = screen.getByText('Clear')
      fireEvent.click(clearButton)

      // Wait for debounced search
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/players')
      }, { timeout: 1000 })
    })
  })

  describe('Player Table', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays players in table format', async () => {
      const mockPlayersData = {
        players: [
          {
            id: 'player-1',
            name: 'Josh Allen',
            position: 'QB',
            nflTeam: 'BUF',
            fantasyPoints: 25.2,
            projectedPoints: 22.5
          },
          {
            id: 'player-2',
            name: 'Stefon Diggs',
            position: 'WR',
            nflTeam: 'BUF',
            fantasyPoints: 18.5,
            projectedPoints: 16.8
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlayersData)
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      })

      expect(screen.getByText('Stefon Diggs')).toBeInTheDocument()
      expect(screen.getByText('QB')).toBeInTheDocument()
      expect(screen.getByText('WR')).toBeInTheDocument()
      expect(screen.getByText('BUF')).toBeInTheDocument()
    })

    it('displays enhanced player stats', async () => {
      const mockPlayersData = {
        players: [
          {
            id: 'player-1',
            name: 'Josh Allen',
            position: 'QB',
            nflTeam: 'BUF',
            fantasyPoints: 25.2,
            projectedPoints: 22.5
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlayersData)
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByText('Target Share: 15.5%')).toBeInTheDocument()
      })
    })

    it('navigates to player detail when clicking player row', async () => {
      const mockPlayersData = {
        players: [
          {
            id: 'player-1',
            name: 'Josh Allen',
            position: 'QB',
            nflTeam: 'BUF',
            fantasyPoints: 25.2,
            projectedPoints: 22.5
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlayersData)
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      })

      const playerRow = screen.getByText('Josh Allen').closest('tr')
      fireEvent.click(playerRow!)

      expect(mockPush).toHaveBeenCalledWith('/players/player-1')
    })

    it('navigates to player detail when clicking view button', async () => {
      const mockPlayersData = {
        players: [
          {
            id: 'player-1',
            name: 'Josh Allen',
            position: 'QB',
            nflTeam: 'BUF',
            fantasyPoints: 25.2,
            projectedPoints: 22.5
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlayersData)
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByText('View')).toBeInTheDocument()
      })

      const viewButton = screen.getByText('View')
      fireEvent.click(viewButton)

      expect(mockPush).toHaveBeenCalledWith('/players/player-1')
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner while loading', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<PlayersPage />)

      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })

    it('shows no players found when empty', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ players: [] })
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByText('No players found')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<PlayersPage />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading players:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Filter Options', () => {
    it('displays all position options', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ players: [] })
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByText('All Positions')).toBeInTheDocument()
      })

      const positionSelect = screen.getByDisplayValue('All Positions')
      expect(positionSelect).toHaveTextContent('QB')
      expect(positionSelect).toHaveTextContent('RB')
      expect(positionSelect).toHaveTextContent('WR')
      expect(positionSelect).toHaveTextContent('TE')
      expect(positionSelect).toHaveTextContent('K')
      expect(positionSelect).toHaveTextContent('DEF')
    })

    it('displays all team options', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ players: [] })
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByText('All Teams')).toBeInTheDocument()
      })

      const teamSelect = screen.getByDisplayValue('All Teams')
      expect(teamSelect).toHaveTextContent('BUF')
      expect(teamSelect).toHaveTextContent('MIA')
      expect(teamSelect).toHaveTextContent('NE')
    })
  })

  describe('Responsive Design', () => {
    it('renders with proper responsive classes', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ players: [] })
      })

      render(<PlayersPage />)

      await waitFor(() => {
        expect(screen.getByTestId('modern-layout')).toBeInTheDocument()
      })

      // Check for responsive classes
      const container = screen.getByTestId('modern-layout').firstChild
      expect(container).toHaveClass('p-4', 'lg:p-8')
    })
  })
})
