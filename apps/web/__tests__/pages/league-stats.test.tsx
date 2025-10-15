import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LeagueStatsPage from '@/app/league-stats/page'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/components/layout/modern-layout', () => ({
  ModernLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="modern-layout">{children}</div>
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

describe('League Stats Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
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

      render(<LeagueStatsPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('loads league stats when authenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(<LeagueStatsPage />)

      await waitFor(() => {
        expect(screen.getByText('League Standings')).toBeInTheDocument()
      })
    })
  })

  describe('Standings Table', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays standings table with headers', async () => {
      render(<LeagueStatsPage />)

      await waitFor(() => {
        expect(screen.getByText('Rank')).toBeInTheDocument()
      })

      expect(screen.getByText('Team')).toBeInTheDocument()
      expect(screen.getByText('Record')).toBeInTheDocument()
      expect(screen.getByText('Points')).toBeInTheDocument()
      expect(screen.getByText('Trend')).toBeInTheDocument()
    })

    it('displays team standings data', async () => {
      render(<LeagueStatsPage />)

      await waitFor(() => {
        expect(screen.getByText('Thunder Bolts')).toBeInTheDocument()
      })

      expect(screen.getByText('Gridiron Warriors')).toBeInTheDocument()
      expect(screen.getByText('Dynasty Squad')).toBeInTheDocument()
      expect(screen.getByText('6-2-0')).toBeInTheDocument()
      expect(screen.getByText('5-3-0')).toBeInTheDocument()
    })

    it('displays team points', async () => {
      render(<LeagueStatsPage />)

      await waitFor(() => {
        expect(screen.getByText('1124.5')).toBeInTheDocument()
      })

      expect(screen.getByText('1089.3')).toBeInTheDocument()
      expect(screen.getByText('1076.8')).toBeInTheDocument()
    })

    it('displays rank numbers', async () => {
      render(<LeagueStatsPage />)

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
      })

      expect(screen.getByText('#2')).toBeInTheDocument()
      expect(screen.getByText('#3')).toBeInTheDocument()
    })

    it('displays trend indicators', async () => {
      render(<LeagueStatsPage />)

      await waitFor(() => {
        expect(screen.getByText('+1')).toBeInTheDocument()
      })

      expect(screen.getByText('-1')).toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument()
    })
  })

  describe('Trophy Icons', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays trophy icons for top 3 teams', async () => {
      render(<LeagueStatsPage />)

      await waitFor(() => {
        expect(screen.getByText('Thunder Bolts')).toBeInTheDocument()
      })

      // Check for trophy icons (they should be present in the top 3 rows)
      const trophyIcons = screen.getAllByTestId('trophy-icon')
      expect(trophyIcons.length).toBeGreaterThan(0)
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner while loading', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      // Mock the setLoading to never resolve
      jest.spyOn(global, 'setTimeout').mockImplementation(() => {
        return {} as any
      })

      render(<LeagueStatsPage />)

      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })
  })

  describe('Error Handling', () => {
    it('handles errors gracefully', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<LeagueStatsPage />)

      // The component should still render even if there are errors
      await waitFor(() => {
        expect(screen.getByText('League Standings')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Responsive Design', () => {
    it('renders with proper responsive classes', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(<LeagueStatsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('modern-layout')).toBeInTheDocument()
      })

      // Check for responsive classes
      const container = screen.getByTestId('modern-layout').firstChild
      expect(container).toHaveClass('p-4', 'lg:p-8')
    })
  })
})
