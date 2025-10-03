/**
 * Draft Room Component Tests
 * 
 * Tests for draft room component with real-time draft functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DraftRoom } from '@/components/draft/draft-room'
import { useDraftRoom } from '@/hooks/use-websocket'

jest.mock('@/hooks/use-websocket')

global.fetch = jest.fn()

describe('DraftRoom Component', () => {
  const mockProps = {
    leagueId: 'league-123',
    currentUserId: 'user-123'
  }

  const mockDraftState = {
    state: { connected: true, error: null },
    draftState: {
      league: {
        teams: [
          { id: 'team-1', name: 'Team Alpha', owner: { name: 'User 1' }, draftPicks: [] },
          { id: 'team-2', name: 'Team Beta', owner: { name: 'User 2' }, draftPicks: [] }
        ]
      }
    },
    draftEvents: [
      { round: 1, pick: 1, playerId: 'player-1', teamId: 'team-1' }
    ],
    timeRemaining: 90,
    currentTeamId: 'team-1',
    draftPlayer: jest.fn()
  }

  const mockDraftStatus = {
    success: true,
    data: {
      draft: {
        id: 'draft-123',
        status: 'IN_PROGRESS',
        league: { name: 'Test League' }
      },
      currentPick: {
        round: 1,
        pick: 1,
        team: {
          id: 'team-1',
          name: 'Team Alpha',
          owner: { id: 'user-123', name: 'User 1' }
        },
        timeRemaining: 90,
        timePerPick: 90
      },
      totalPicks: 180,
      picksCompleted: 0
    }
  }

  const mockPlayers = {
    success: true,
    data: [
      { id: 'player-1', name: 'Patrick Mahomes', position: 'QB', nflTeam: 'KC', adp: 10, projectedPoints: 350 },
      { id: 'player-2', name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', adp: 5, projectedPoints: 320 },
      { id: 'player-3', name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', adp: 15, projectedPoints: 280 }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useDraftRoom as jest.Mock).mockReturnValue(mockDraftState)
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('action=status')) {
        return Promise.resolve({ json: () => Promise.resolve(mockDraftStatus) })
      }
      if (url.includes('action=available-players')) {
        return Promise.resolve({ json: () => Promise.resolve(mockPlayers) })
      }
      return Promise.resolve({ json: () => Promise.resolve({ success: true }) })
    })
  })

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      render(<DraftRoom {...mockProps} />)
      expect(screen.getByText('Loading draft room...')).toBeInTheDocument()
    })

    it('should show error if connection fails', () => {
      ;(useDraftRoom as jest.Mock).mockReturnValue({
        ...mockDraftState,
        state: { connected: false, error: 'Connection failed' }
      })

      render(<DraftRoom {...mockProps} />)
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument()
    })
  })

  describe('Draft Header', () => {
    it('should display league name', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Test League Draft/)).toBeInTheDocument()
      })
    })

    it('should display current round and pick', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Round 1/)).toBeInTheDocument()
        expect(screen.getByText(/Pick 1/)).toBeInTheDocument()
      })
    })

    it('should display draft status badge', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument()
      })
    })

    it('should display picks completed', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/0 \/ 180 picks completed/)).toBeInTheDocument()
      })
    })
  })

  describe('Draft Timer', () => {
    it('should display time remaining', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('1:30')).toBeInTheDocument()
      })
    })

    it('should show current team turn', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Team Alpha's turn/)).toBeInTheDocument()
      })
    })

    it('should highlight timer when time is low', async () => {
      const lowTimeDraftStatus = {
        ...mockDraftStatus,
        data: {
          ...mockDraftStatus.data,
          currentPick: {
            ...mockDraftStatus.data.currentPick,
            timeRemaining: 20
          }
        }
      }

      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('action=status')) {
          return Promise.resolve({ json: () => Promise.resolve(lowTimeDraftStatus) })
        }
        return Promise.resolve({ json: () => Promise.resolve(mockPlayers) })
      })

      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        const timer = screen.getByText('0:20')
        expect(timer).toHaveClass('text-red-400')
      })
    })
  })

  describe('Turn Indicator', () => {
    it('should show "YOUR TURN" when it is user turn', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('YOUR TURN')).toBeInTheDocument()
      })
    })

    it('should show "Waiting for pick" when not user turn', async () => {
      const notMyTurnStatus = {
        ...mockDraftStatus,
        data: {
          ...mockDraftStatus.data,
          currentPick: {
            ...mockDraftStatus.data.currentPick,
            team: {
              ...mockDraftStatus.data.currentPick.team,
              owner: { id: 'other-user', name: 'Other User' }
            }
          }
        }
      }

      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('action=status')) {
          return Promise.resolve({ json: () => Promise.resolve(notMyTurnStatus) })
        }
        return Promise.resolve({ json: () => Promise.resolve(mockPlayers) })
      })

      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Waiting for pick')).toBeInTheDocument()
      })
    })

    it('should show auto-pick toggle when user turn', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Enable Auto')).toBeInTheDocument()
      })
    })
  })

  describe('View Mode Tabs', () => {
    it('should display all view mode tabs', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('players')).toBeInTheDocument()
        expect(screen.getByText('board')).toBeInTheDocument()
        expect(screen.getByText('history')).toBeInTheDocument()
      })
    })

    it('should start with players view active', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        const playersTab = screen.getByText('players')
        expect(playersTab).toHaveClass('bg-blue-600')
      })
    })

    it('should switch view modes', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        const boardTab = screen.getByText('board')
        fireEvent.click(boardTab)
        expect(boardTab).toHaveClass('bg-blue-600')
      })
    })
  })

  describe('Available Players', () => {
    it('should display available players', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
        expect(screen.getByText('Christian McCaffrey')).toBeInTheDocument()
        expect(screen.getByText('Tyreek Hill')).toBeInTheDocument()
      })
    })

    it('should display player positions', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('QB')).toBeInTheDocument()
        expect(screen.getByText('RB')).toBeInTheDocument()
        expect(screen.getByText('WR')).toBeInTheDocument()
      })
    })

    it('should display player ADP', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('ADP: 10')).toBeInTheDocument()
      })
    })

    it('should display projected points', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Proj: 350 pts')).toBeInTheDocument()
      })
    })
  })

  describe('Position Filter', () => {
    it('should display position filter buttons', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('ALL')).toBeInTheDocument()
        expect(screen.getByText('QB')).toBeInTheDocument()
        expect(screen.getByText('RB')).toBeInTheDocument()
      })
    })

    it('should filter players by position', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        const qbButton = screen.getByText('QB')
        fireEvent.click(qbButton)
        
        expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
        expect(screen.queryByText('Christian McCaffrey')).not.toBeInTheDocument()
      })
    })
  })

  describe('Player Search', () => {
    it('should display search input', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search players...')).toBeInTheDocument()
      })
    })

    it('should filter players by search query', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search players...')
        fireEvent.change(searchInput, { target: { value: 'Mahomes' } })
        
        expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
        expect(screen.queryByText('Christian McCaffrey')).not.toBeInTheDocument()
      })
    })
  })

  describe('Player Selection', () => {
    it('should select player on click', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        const player = screen.getByText('Patrick Mahomes')
        fireEvent.click(player.closest('div')!)
        
        expect(screen.getByText('Selected Player')).toBeInTheDocument()
      })
    })

    it('should show draft button when player selected', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        const player = screen.getByText('Patrick Mahomes')
        fireEvent.click(player.closest('div')!)
        
        expect(screen.getByText('Draft Player')).toBeInTheDocument()
      })
    })

    it('should disable draft button when not user turn', async () => {
      const notMyTurnStatus = {
        ...mockDraftStatus,
        data: {
          ...mockDraftStatus.data,
          currentPick: {
            ...mockDraftStatus.data.currentPick,
            team: {
              ...mockDraftStatus.data.currentPick.team,
              owner: { id: 'other-user', name: 'Other User' }
            }
          }
        }
      }

      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('action=status')) {
          return Promise.resolve({ json: () => Promise.resolve(notMyTurnStatus) })
        }
        return Promise.resolve({ json: () => Promise.resolve(mockPlayers) })
      })

      render(<DraftRoom {...mockProps} />)
      
      await waitFor(async () => {
        const player = screen.getByText('Patrick Mahomes')
        fireEvent.click(player.closest('div')!)
        
        await waitFor(() => {
          const draftButton = screen.getByText('Not Your Turn')
          expect(draftButton).toBeDisabled()
        })
      })
    })
  })

  describe('Draft Action', () => {
    it('should draft player when button clicked', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST') {
          return Promise.resolve({ json: () => Promise.resolve({ success: true }) })
        }
        if (url.includes('action=status')) {
          return Promise.resolve({ json: () => Promise.resolve(mockDraftStatus) })
        }
        return Promise.resolve({ json: () => Promise.resolve(mockPlayers) })
      })

      render(<DraftRoom {...mockProps} />)
      
      await waitFor(async () => {
        const player = screen.getByText('Patrick Mahomes')
        fireEvent.click(player.closest('div')!)
        
        await waitFor(() => {
          const draftButton = screen.getByText('Draft Player')
          fireEvent.click(draftButton)
        })
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/draft',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('draft-player')
          })
        )
      })
    })
  })

  describe('Recent Picks', () => {
    it('should display recent picks section', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Recent Picks')).toBeInTheDocument()
      })
    })
  })

  describe('Draft Order', () => {
    it('should display draft order section', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Draft Order')).toBeInTheDocument()
      })
    })

    it('should display all teams', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Team Alpha')).toBeInTheDocument()
        expect(screen.getByText('Team Beta')).toBeInTheDocument()
      })
    })

    it('should highlight current team', async () => {
      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('ON CLOCK')).toBeInTheDocument()
      })
    })
  })

  describe('No Draft State', () => {
    it('should show message when draft not found', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({ 
          json: () => Promise.resolve({ success: true, data: { draft: null } }) 
        })
      })

      render(<DraftRoom {...mockProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Draft Not Found')).toBeInTheDocument()
      })
    })
  })
})
