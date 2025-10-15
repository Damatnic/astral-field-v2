import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import WaiversPage from '@/app/waivers/page'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/components/layout/modern-layout', () => ({
  ModernLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="modern-layout">{children}</div>
}))
jest.mock('@/lib/utils/player-analytics', () => ({
  enhancePlayerWithAnalytics: (player: any) => ({
    ...player,
    trending: 'hot',
    aiScore: 85,
    breakoutProbability: 0.75,
    opportunity: 'HIGH'
  })
}))
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
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

describe('Waivers Page', () => {
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

      render(<WaiversPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('loads waivers data when authenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      const mockWaiversData = {
        availablePlayers: [
          {
            id: 'player-1',
            name: 'Jerome Ford',
            position: 'RB',
            nflTeam: 'CLE',
            fantasyPoints: 18.5,
            projectedPoints: 15.2
          }
        ],
        waiverBudget: 100
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWaiversData)
      })

      render(<WaiversPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/waivers?userId=user-1')
      })

      await waitFor(() => {
        expect(screen.getByText('Jerome Ford')).toBeInTheDocument()
      })
    })
  })

  describe('Waiver Budget Display', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays waiver budget correctly', async () => {
      const mockWaiversData = {
        availablePlayers: [],
        waiverBudget: 150
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWaiversData)
      })

      render(<WaiversPage />)

      await waitFor(() => {
        expect(screen.getByText('$150')).toBeInTheDocument()
      })

      expect(screen.getByText('Waiver Budget')).toBeInTheDocument()
    })
  })

  describe('Player Claims', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays available players with enhanced analytics', async () => {
      const mockWaiversData = {
        availablePlayers: [
          {
            id: 'player-1',
            name: 'Jerome Ford',
            position: 'RB',
            nflTeam: 'CLE',
            fantasyPoints: 18.5,
            projectedPoints: 15.2
          }
        ],
        waiverBudget: 100
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWaiversData)
      })

      render(<WaiversPage />)

      await waitFor(() => {
        expect(screen.getByText('Jerome Ford')).toBeInTheDocument()
      })

      expect(screen.getByText('🔥 HOT')).toBeInTheDocument()
      expect(screen.getByText('85')).toBeInTheDocument() // AI Score
    })

    it('claims player successfully', async () => {
      const mockWaiversData = {
        availablePlayers: [
          {
            id: 'player-1',
            name: 'Jerome Ford',
            position: 'RB',
            nflTeam: 'CLE',
            fantasyPoints: 18.5,
            projectedPoints: 15.2
          }
        ],
        waiverBudget: 100
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWaiversData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })

      render(<WaiversPage />)

      await waitFor(() => {
        expect(screen.getByText('Claim')).toBeInTheDocument()
      })

      const claimButton = screen.getByText('Claim')
      fireEvent.click(claimButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/waivers/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: 'player-1' })
        })
      })
    })

    it('handles claim errors gracefully', async () => {
      const mockWaiversData = {
        availablePlayers: [
          {
            id: 'player-1',
            name: 'Jerome Ford',
            position: 'RB',
            nflTeam: 'CLE',
            fantasyPoints: 18.5,
            projectedPoints: 15.2
          }
        ],
        waiverBudget: 100
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWaiversData)
        })
        .mockRejectedValueOnce(new Error('Claim failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<WaiversPage />)

      await waitFor(() => {
        expect(screen.getByText('Claim')).toBeInTheDocument()
      })

      const claimButton = screen.getByText('Claim')
      fireEvent.click(claimButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error claiming player:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('navigates to player detail when clicking player row', async () => {
      const mockWaiversData = {
        availablePlayers: [
          {
            id: 'player-1',
            name: 'Jerome Ford',
            position: 'RB',
            nflTeam: 'CLE',
            fantasyPoints: 18.5,
            projectedPoints: 15.2
          }
        ],
        waiverBudget: 100
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWaiversData)
      })

      render(<WaiversPage />)

      await waitFor(() => {
        expect(screen.getByText('Jerome Ford')).toBeInTheDocument()
      })

      const playerRow = screen.getByText('Jerome Ford').closest('tr')
      fireEvent.click(playerRow!)

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

      render(<WaiversPage />)

      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })

    it('shows no available players when empty', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ availablePlayers: [], waiverBudget: 100 })
      })

      render(<WaiversPage />)

      await waitFor(() => {
        expect(screen.getByText('No available players')).toBeInTheDocument()
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

      render(<WaiversPage />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading waivers:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Player Analytics Display', () => {
    it('displays AI score with progress bar', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      const mockWaiversData = {
        availablePlayers: [
          {
            id: 'player-1',
            name: 'Jerome Ford',
            position: 'RB',
            nflTeam: 'CLE',
            fantasyPoints: 18.5,
            projectedPoints: 15.2
          }
        ],
        waiverBudget: 100
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWaiversData)
      })

      render(<WaiversPage />)

      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument() // AI Score
      })

      // Check for progress bar
      const progressBar = screen.getByText('85').previousElementSibling
      expect(progressBar).toHaveStyle('width: 85%')
    })

    it('displays trending status for players', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      const mockWaiversData = {
        availablePlayers: [
          {
            id: 'player-1',
            name: 'Jerome Ford',
            position: 'RB',
            nflTeam: 'CLE',
            fantasyPoints: 18.5,
            projectedPoints: 15.2
          }
        ],
        waiverBudget: 100
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWaiversData)
      })

      render(<WaiversPage />)

      await waitFor(() => {
        expect(screen.getByText('🔥 HOT')).toBeInTheDocument()
      })
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
        json: () => Promise.resolve({ availablePlayers: [], waiverBudget: 100 })
      })

      render(<WaiversPage />)

      await waitFor(() => {
        expect(screen.getByTestId('modern-layout')).toBeInTheDocument()
      })

      // Check for responsive classes
      const container = screen.getByTestId('modern-layout').firstChild
      expect(container).toHaveClass('p-4', 'lg:p-8')
    })
  })
})
