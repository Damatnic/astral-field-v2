import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import TradesPage from '@/app/trades/page'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/components/layout/modern-layout', () => ({
  ModernLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="modern-layout">{children}</div>
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

describe('Trades Page', () => {
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('loads trade data when authenticated', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5
            }
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTeamData)
      })

      render(<TradesPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/teams?userId=user-1')
      })

      await waitFor(() => {
        expect(screen.getByText('Test Team')).toBeInTheDocument()
      })
    })
  })

  describe('Team Selection', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays team selector with available teams', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(screen.getByText('Select Team to Trade With')).toBeInTheDocument()
      })

      expect(screen.getByText('Choose a team...')).toBeInTheDocument()
      expect(screen.getByText('Team 2')).toBeInTheDocument()
      expect(screen.getByText('Team 3')).toBeInTheDocument()
      expect(screen.getByText('Team 4')).toBeInTheDocument()
    })

    it('updates selected team when changed', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('')).toBeInTheDocument()
      })

      const teamSelect = screen.getByDisplayValue('')
      fireEvent.change(teamSelect, { target: { value: '2' } })

      expect(teamSelect).toHaveValue('2')
    })
  })

  describe('Player Selection', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays my team players for selection', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5
            }
          },
          {
            player: {
              id: 'player-2',
              name: 'Stefon Diggs',
              position: 'WR',
              nflTeam: 'BUF',
              fantasyPoints: 18.5,
              projectedPoints: 16.8
            }
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(screen.getByText('Your Players')).toBeInTheDocument()
      })

      expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      expect(screen.getByText('Stefon Diggs')).toBeInTheDocument()
      expect(screen.getByText('25.2 pts')).toBeInTheDocument()
      expect(screen.getByText('18.5 pts')).toBeInTheDocument()
    })

    it('toggles player selection when clicked', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5
            }
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      })

      const playerCard = screen.getByText('Josh Allen').closest('div')
      fireEvent.click(playerCard!)

      // Player should be selected (blue background)
      expect(playerCard).toHaveClass('bg-blue-600')
    })

    it('shows placeholder for their team when no team selected', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(screen.getByText('Their Players')).toBeInTheDocument()
      })

      expect(screen.getByText('Select a team to view their roster')).toBeInTheDocument()
    })
  })

  describe('Trade Proposal', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('shows trade summary when players are selected', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5
            }
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      })

      // Select a team
      const teamSelect = screen.getByDisplayValue('')
      fireEvent.change(teamSelect, { target: { value: '2' } })

      // Select a player
      const playerCard = screen.getByText('Josh Allen').closest('div')
      fireEvent.click(playerCard!)

      await waitFor(() => {
        expect(screen.getByText('Trade Summary')).toBeInTheDocument()
      })

      expect(screen.getByText('Sending 1 player(s) • Receiving 0 player(s)')).toBeInTheDocument()
    })

    it('proposes trade successfully', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5
            }
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      })

      // Select a team
      const teamSelect = screen.getByDisplayValue('')
      fireEvent.change(teamSelect, { target: { value: '2' } })

      // Select a player
      const playerCard = screen.getByText('Josh Allen').closest('div')
      fireEvent.click(playerCard!)

      await waitFor(() => {
        expect(screen.getByText('Propose Trade')).toBeInTheDocument()
      })

      const proposeButton = screen.getByText('Propose Trade')
      fireEvent.click(proposeButton)

      // Should show success message (mocked)
      expect(proposeButton).toBeDisabled()
    })

    it('disables propose button when requirements not met', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5
            }
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      })

      // Don't select a team or players
      const proposeButton = screen.getByText('Propose Trade')
      expect(proposeButton).toBeDisabled()
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner while loading', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<TradesPage />)

      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading trade data:', expect.any(Error))
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

      render(<TradesPage />)

      await waitFor(() => {
        expect(screen.getByTestId('modern-layout')).toBeInTheDocument()
      })

      // Check for responsive classes
      const container = screen.getByTestId('modern-layout').firstChild
      expect(container).toHaveClass('p-4', 'lg:p-8')
    })
  })
})
