import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MatchupsPage from '@/app/matchups/page'
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

describe('Matchups Page', () => {
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

      render(<MatchupsPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('loads matchup data when authenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(<MatchupsPage />)

      await waitFor(() => {
        expect(screen.getByText('This Week\'s Matchup')).toBeInTheDocument()
      })
    })
  })

  describe('Matchup Display', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays matchup card with team information', async () => {
      render(<MatchupsPage />)

      await waitFor(() => {
        expect(screen.getByText('Your Team')).toBeInTheDocument()
      })

      expect(screen.getByText('Opponent Team')).toBeInTheDocument()
      expect(screen.getByText('145.2')).toBeInTheDocument() // My team score
      expect(screen.getByText('138.5')).toBeInTheDocument() // Opponent score
    })

    it('displays projected points', async () => {
      render(<MatchupsPage />)

      await waitFor(() => {
        expect(screen.getByText('Proj: 152.3')).toBeInTheDocument()
      })

      expect(screen.getByText('Proj: 142.1')).toBeInTheDocument()
    })

    it('displays win probability', async () => {
      render(<MatchupsPage />)

      await waitFor(() => {
        expect(screen.getByText('Your Win Probability')).toBeInTheDocument()
      })

      expect(screen.getByText('62%')).toBeInTheDocument()
    })

    it('displays VS indicator', async () => {
      render(<MatchupsPage />)

      await waitFor(() => {
        expect(screen.getByText('VS')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner while loading', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      // Mock the loadMatchup function to never resolve
      jest.spyOn(global, 'setTimeout').mockImplementation(() => {
        return {} as any
      })

      render(<MatchupsPage />)

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

      render(<MatchupsPage />)

      // The component should still render even if there are errors
      await waitFor(() => {
        expect(screen.getByText('This Week\'s Matchup')).toBeInTheDocument()
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

      render(<MatchupsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('modern-layout')).toBeInTheDocument()
      })

      // Check for responsive classes
      const container = screen.getByTestId('modern-layout').firstChild
      expect(container).toHaveClass('p-4', 'lg:p-8')
    })
  })
})
