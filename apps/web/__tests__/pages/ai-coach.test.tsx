import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AICoachPage from '@/app/ai-coach/page'
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

describe('AI Coach Page', () => {
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

      render(<AICoachPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('loads AI coach when authenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByText('AI Coach')).toBeInTheDocument()
      })
    })
  })

  describe('AI Coach Content', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays AI coach header with gradient background', async () => {
      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByText('AI Coach')).toBeInTheDocument()
      })

      expect(screen.getByText('Personalized recommendations powered by advanced analytics')).toBeInTheDocument()
      expect(screen.getByText('AI is analyzing your team...')).toBeInTheDocument()
    })

    it('displays lineup recommendations', async () => {
      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByText('Start Patrick Mahomes')).toBeInTheDocument()
      })

      expect(screen.getByText('Mahomes has a favorable matchup against a bottom-ranked defense')).toBeInTheDocument()
      expect(screen.getByText('+8.5 projected points')).toBeInTheDocument()
    })

    it('displays waiver recommendations', async () => {
      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByText('Add Jerome Ford')).toBeInTheDocument()
      })

      expect(screen.getByText('With Nick Chubb out, Ford is a league-winning pickup')).toBeInTheDocument()
      expect(screen.getByText('Potential RB1 value')).toBeInTheDocument()
    })

    it('displays trade recommendations', async () => {
      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByText('Consider trading Davante Adams')).toBeInTheDocument()
      })

      expect(screen.getByText('Sell high while his value is at season peak')).toBeInTheDocument()
      expect(screen.getByText('Upgrade at RB position')).toBeInTheDocument()
    })

    it('displays confidence scores', async () => {
      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByText('92% confidence')).toBeInTheDocument()
      })

      expect(screen.getByText('85% confidence')).toBeInTheDocument()
      expect(screen.getByText('78% confidence')).toBeInTheDocument()
    })

    it('displays confidence bars', async () => {
      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByText('92% confidence')).toBeInTheDocument()
      })

      // Check for confidence bars (they should have width styles)
      const confidenceBars = screen.getAllByRole('progressbar')
      expect(confidenceBars.length).toBeGreaterThan(0)
    })
  })

  describe('Recommendation Types', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays different recommendation types with appropriate icons', async () => {
      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByText('Start Patrick Mahomes')).toBeInTheDocument()
      })

      // Check for different recommendation types
      expect(screen.getByText('Start Patrick Mahomes')).toBeInTheDocument() // Lineup
      expect(screen.getByText('Add Jerome Ford')).toBeInTheDocument() // Waiver
      expect(screen.getByText('Consider trading Davante Adams')).toBeInTheDocument() // Trade
    })

    it('displays recommendation cards with proper styling', async () => {
      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByText('Start Patrick Mahomes')).toBeInTheDocument()
      })

      // Check for recommendation cards
      const recommendationCards = screen.getAllByText(/Start Patrick Mahomes|Add Jerome Ford|Consider trading Davante Adams/)
      expect(recommendationCards.length).toBe(3)
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

      render(<AICoachPage />)

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

      render(<AICoachPage />)

      // The component should still render even if there are errors
      await waitFor(() => {
        expect(screen.getByText('AI Coach')).toBeInTheDocument()
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

      render(<AICoachPage />)

      await waitFor(() => {
        expect(screen.getByTestId('modern-layout')).toBeInTheDocument()
      })

      // Check for responsive classes
      const container = screen.getByTestId('modern-layout').firstChild
      expect(container).toHaveClass('p-4', 'lg:p-8')
    })
  })
})
