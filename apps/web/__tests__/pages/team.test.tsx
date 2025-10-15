import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import TeamPage from '@/app/team/page'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/components/layout/modern-layout', () => ({
  ModernLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="modern-layout">{children}</div>
}))
jest.mock('@/components/lineup/drag-drop-lineup-editor', () => ({
  DragDropLineupEditor: ({ roster, onSave }: { roster: any[], onSave: (roster: any[]) => Promise<void> }) => (
    <div data-testid="drag-drop-lineup-editor">
      <div data-testid="roster-count">{roster.length} players</div>
      <button onClick={() => onSave(roster)}>Save Lineup</button>
    </div>
  )
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

describe('Team Page', () => {
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

      render(<TeamPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('loads team data when authenticated', async () => {
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
              team: 'BUF',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5,
              status: 'ACTIVE'
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

      render(<TeamPage />)

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

      render(<TeamPage />)

      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })
  })

  describe('Team Content', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('displays team header with name and stats', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              team: 'BUF',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5,
              status: 'ACTIVE'
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

      render(<TeamPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Team')).toBeInTheDocument()
      })

      expect(screen.getByText('Manage your lineup')).toBeInTheDocument()
      expect(screen.getByText('Starting Points')).toBeInTheDocument()
      expect(screen.getByText('Projected')).toBeInTheDocument()
    })

    it('displays drag-drop lineup editor', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              team: 'BUF',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5,
              status: 'ACTIVE'
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

      render(<TeamPage />)

      await waitFor(() => {
        expect(screen.getByTestId('drag-drop-lineup-editor')).toBeInTheDocument()
      })

      expect(screen.getByTestId('roster-count')).toHaveTextContent('1 players')
    })

    it('calculates and displays total points correctly', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              team: 'BUF',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5,
              status: 'ACTIVE'
            },
            isStarter: true
          },
          {
            player: {
              id: 'player-2',
              name: 'Bench Player',
              position: 'RB',
              team: 'MIA',
              nflTeam: 'MIA',
              fantasyPoints: 15.0,
              projectedPoints: 18.0,
              status: 'ACTIVE'
            },
            isStarter: false
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

      render(<TeamPage />)

      await waitFor(() => {
        expect(screen.getByText('25.2')).toBeInTheDocument() // Starting points
      })

      expect(screen.getByText('22.5')).toBeInTheDocument() // Projected points
    })
  })

  describe('Lineup Management', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })
    })

    it('saves lineup changes successfully', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              team: 'BUF',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5,
              status: 'ACTIVE'
            },
            isStarter: true
          }
        ],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTeamData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })

      render(<TeamPage />)

      await waitFor(() => {
        expect(screen.getByText('Save Lineup')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Save Lineup'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/teams/lineup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: 'team-1',
            roster: [
              {
                playerId: 'player-1',
                isStarter: true
              }
            ]
          })
        })
      })
    })

    it('handles lineup save errors', async () => {
      const mockTeamData = {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Josh Allen',
              position: 'QB',
              team: 'BUF',
              nflTeam: 'BUF',
              fantasyPoints: 25.2,
              projectedPoints: 22.5,
              status: 'ACTIVE'
            },
            isStarter: true
          }
        ],
        league: {
          name: 'Test League',
          currentWeek: 4
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTeamData)
        })
        .mockRejectedValueOnce(new Error('Save failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<TeamPage />)

      await waitFor(() => {
        expect(screen.getByText('Save Lineup')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Save Lineup'))

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error saving lineup:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Error States', () => {
    it('shows no team found when team data is null', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null)
      })

      render(<TeamPage />)

      await waitFor(() => {
        expect(screen.getByText('No Team Found')).toBeInTheDocument()
      })

      expect(screen.getByText('Unable to load team data')).toBeInTheDocument()
    })

    it('handles API errors gracefully', async () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<TeamPage />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading team data:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Roster Settings', () => {
    it('passes correct roster settings to lineup editor', async () => {
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

      render(<TeamPage />)

      await waitFor(() => {
        expect(screen.getByTestId('drag-drop-lineup-editor')).toBeInTheDocument()
      })

      // The roster settings are passed as props to the component
      // We can verify the component receives the correct data structure
      expect(screen.getByTestId('roster-count')).toHaveTextContent('0 players')
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

      render(<TeamPage />)

      await waitFor(() => {
        expect(screen.getByTestId('modern-layout')).toBeInTheDocument()
      })

      // Check for responsive classes
      const container = screen.getByTestId('modern-layout').firstChild
      expect(container).toHaveClass('p-4', 'lg:p-8')
    })
  })
})
