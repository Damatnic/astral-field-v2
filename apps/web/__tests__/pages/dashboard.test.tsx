import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardPage from '@/app/dashboard/page'
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

describe('Dashboard Page', () => {
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

      render(<DashboardPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('loads dashboard data when authenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5
            },
            isStarter: true
          }
        ],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/teams?userId=user-1')
      })

      await waitFor(() => {
        expect(screen.getByText('Test Team')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner while loading', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<DashboardPage />)

      expect(screen.getByText('Loading your command center...')).toBeInTheDocument()
    })
  })

  describe('Dashboard Content', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays hero matchup card with team information', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Team')).toBeInTheDocument()
      })

      expect(screen.getByText('Week 4')).toBeInTheDocument()
      expect(screen.getByText('3-1-0')).toBeInTheDocument()
    })

    it('displays mega stat cards', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('This Week')).toBeInTheDocument()
      })

      expect(screen.getByText('Standing')).toBeInTheDocument()
      expect(screen.getByText('Power Rank')).toBeInTheDocument()
    })

    it('displays starting lineup grid', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5
            },
            isStarter: true
          }
        ],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Starting Lineup')).toBeInTheDocument()
      })

      expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    })

    it('displays action cards', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('What You Need to Do')).toBeInTheDocument()
      })

      expect(screen.getByText('Optimize Your Lineup')).toBeInTheDocument()
      expect(screen.getByText('Top Waiver Target')).toBeInTheDocument()
    })

    it('displays AI insights carousel', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('AI Insights')).toBeInTheDocument()
      })

      expect(screen.getByText(/Start Josh Allen over Dak Prescott/)).toBeInTheDocument()
    })
  })

  describe('Interactive Elements', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('navigates to team page when clicking lineup edit', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Edit →')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Edit →'))

      expect(mockPush).toHaveBeenCalledWith('/team')
    })

    it('navigates to player detail when clicking player card', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5
            },
            isStarter: true
          }
        ],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Josh Allen'))

      expect(mockPush).toHaveBeenCalledWith('/players/player-1')
    })

    it('cycles through AI insights with navigation buttons', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('AI Insights')).toBeInTheDocument()
      })

      // Find and click the next button
      const nextButton = screen.getByRole('button', { name: /next/i })
      fireEvent.click(nextButton)

      // Should show the next insight
      expect(screen.getByText(/Jerome Ford available/)).toBeInTheDocument()
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

      render(<DashboardPage />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading dashboard:', expect.any(Error))
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

      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        ties: 0,
        totalPoints: 145.2,
        projectedPoints: 152.3,
        rank: 2,
        roster: [],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('modern-layout')).toBeInTheDocument()
      })

      // Check for responsive classes
      const container = screen.getByTestId('modern-layout').firstChild
      expect(container).toHaveClass('p-4', 'lg:p-8')
    })
  })
})
