import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DraftRoom } from '@/components/draft/draft-room'
import { useDraftRoom } from '@/hooks/use-websocket'

// Mock the WebSocket hook
jest.mock('@/hooks/use-websocket')
const mockUseDraftRoom = useDraftRoom as jest.MockedFunction<typeof useDraftRoom>

const mockLeague = {
  id: 'league1',
  name: 'Championship League',
  teams: [
    { id: 'team1', name: 'Fire Breathing Rubber Ducks', owner: { name: 'John Doe' } },
    { id: 'team2', name: 'Thunderbolts', owner: { name: 'Jane Smith' } },
    { id: 'team3', name: 'Storm Hawks', owner: { name: 'Bob Wilson' } }
  ]
}

const mockDraftState = {
  currentPick: 3,
  currentRound: 1,
  currentTeamId: 'team3',
  timeRemaining: 75,
  draftOrder: ['team1', 'team2', 'team3'],
  picks: [
    { pick: 1, round: 1, teamId: 'team1', playerId: 'p1', playerName: 'Josh Allen', position: 'QB' },
    { pick: 2, round: 1, teamId: 'team2', playerId: 'p2', playerName: 'Christian McCaffrey', position: 'RB' }
  ]
}

const mockAvailablePlayers = [
  {
    id: 'p3',
    name: 'Tyreek Hill',
    position: 'WR',
    nflTeam: 'MIA',
    adp: 3.2,
    rank: 3,
    projections: [{ projectedPoints: 18.5, confidence: 0.88 }]
  },
  {
    id: 'p4', 
    name: 'Derrick Henry',
    position: 'RB',
    nflTeam: 'BAL',
    adp: 4.1,
    rank: 4,
    projections: [{ projectedPoints: 16.8, confidence: 0.82 }]
  },
  {
    id: 'p5',
    name: 'Cooper Kupp',
    position: 'WR', 
    nflTeam: 'LAR',
    adp: 5.3,
    rank: 5,
    projections: [{ projectedPoints: 17.2, confidence: 0.79 }]
  }
]

const mockDraftActions = {
  draftPlayer: jest.fn(),
  joinDraft: jest.fn(),
  leaveDraft: jest.fn()
}

describe('DraftRoom Component', () => {
  const defaultProps = {
    leagueId: 'league1',
    userTeamId: 'team1',
    league: mockLeague
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseDraftRoom.mockReturnValue({
      draftState: mockDraftState,
      availablePlayers: mockAvailablePlayers,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockDraftActions
    })
  })

  it('renders draft room interface correctly', () => {
    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('Championship League Draft')).toBeInTheDocument()
    expect(screen.getByText('Round 1 - Pick 3')).toBeInTheDocument()
    expect(screen.getByText('Storm Hawks')).toBeInTheDocument() // Current team picking
    expect(screen.getByText('01:15')).toBeInTheDocument() // Timer display
  })

  it('displays draft order correctly', () => {
    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('Fire Breathing Rubber Ducks')).toBeInTheDocument()
    expect(screen.getByText('Thunderbolts')).toBeInTheDocument()
    expect(screen.getByText('Storm Hawks')).toBeInTheDocument()
  })

  it('shows completed picks in draft board', () => {
    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    expect(screen.getByText('Christian McCaffrey')).toBeInTheDocument()
    expect(screen.getByText('QB')).toBeInTheDocument()
    expect(screen.getByText('RB')).toBeInTheDocument()
  })

  it('displays available players to draft', () => {
    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('Available Players')).toBeInTheDocument()
    expect(screen.getByText('Tyreek Hill')).toBeInTheDocument()
    expect(screen.getByText('Derrick Henry')).toBeInTheDocument() 
    expect(screen.getByText('Cooper Kupp')).toBeInTheDocument()
    
    // Check ADP and projections
    expect(screen.getByText('3.2')).toBeInTheDocument() // Tyreek ADP
    expect(screen.getByText('18.5')).toBeInTheDocument() // Tyreek projections
  })

  it('allows drafting a player when it is user turn', () => {
    // Mock user's turn
    mockUseDraftRoom.mockReturnValue({
      draftState: { ...mockDraftState, currentTeamId: 'team1' },
      availablePlayers: mockAvailablePlayers,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockDraftActions
    })

    render(<DraftRoom {...defaultProps} />)
    
    const tyreekCard = screen.getByText('Tyreek Hill').closest('.player-card')
    const draftButton = screen.getByRole('button', { name: /draft tyreek hill/i })
    
    expect(draftButton).not.toBeDisabled()
    
    fireEvent.click(draftButton)
    
    expect(mockDraftActions.draftPlayer).toHaveBeenCalledWith({
      playerId: 'p3',
      playerName: 'Tyreek Hill'
    })
  })

  it('disables draft buttons when not user turn', () => {
    render(<DraftRoom {...defaultProps} />)
    
    const draftButtons = screen.getAllByRole('button', { name: /draft/i })
    
    draftButtons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('shows loading state while connecting', () => {
    mockUseDraftRoom.mockReturnValue({
      draftState: null,
      availablePlayers: [],
      isConnected: false,
      isLoading: true,
      error: null,
      ...mockDraftActions
    })

    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('Connecting to draft...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays error message when connection fails', () => {
    mockUseDraftRoom.mockReturnValue({
      draftState: null,
      availablePlayers: [],
      isConnected: false,
      isLoading: false,
      error: 'Failed to connect to draft room',
      ...mockDraftActions
    })

    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('Failed to connect to draft room')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('filters players by position', () => {
    render(<DraftRoom {...defaultProps} />)
    
    // Click WR filter
    const wrFilter = screen.getByRole('button', { name: /wr/i })
    fireEvent.click(wrFilter)
    
    expect(screen.getByText('Tyreek Hill')).toBeInTheDocument()
    expect(screen.getByText('Cooper Kupp')).toBeInTheDocument()
    expect(screen.queryByText('Derrick Henry')).not.toBeInTheDocument()
  })

  it('searches for players by name', () => {
    render(<DraftRoom {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search players...')
    fireEvent.change(searchInput, { target: { value: 'tyreek' } })
    
    expect(screen.getByText('Tyreek Hill')).toBeInTheDocument()
    expect(screen.queryByText('Derrick Henry')).not.toBeInTheDocument()
    expect(screen.queryByText('Cooper Kupp')).not.toBeInTheDocument()
  })

  it('shows pick timer with correct formatting', async () => {
    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('01:15')).toBeInTheDocument()
    
    // Mock timer update
    mockUseDraftRoom.mockReturnValue({
      draftState: { ...mockDraftState, timeRemaining: 59 },
      availablePlayers: mockAvailablePlayers,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockDraftActions
    })

    // Re-render with updated time
    render(<DraftRoom {...defaultProps} />)
    expect(screen.getByText('00:59')).toBeInTheDocument()
  })

  it('highlights current team picking', () => {
    render(<DraftRoom {...defaultProps} />)
    
    const currentTeamCard = screen.getByText('Storm Hawks').closest('.team-card')
    expect(currentTeamCard).toHaveClass('ring-2', 'ring-blue-500')
  })

  it('shows draft position for each team', () => {
    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('#1')).toBeInTheDocument() // Fire Breathing Rubber Ducks
    expect(screen.getByText('#2')).toBeInTheDocument() // Thunderbolts  
    expect(screen.getByText('#3')).toBeInTheDocument() // Storm Hawks
  })

  it('displays team roster counts', () => {
    const leagueWithRosters = {
      ...mockLeague,
      teams: [
        { ...mockLeague.teams[0], _count: { roster: 1 } },
        { ...mockLeague.teams[1], _count: { roster: 1 } }, 
        { ...mockLeague.teams[2], _count: { roster: 0 } }
      ]
    }

    render(<DraftRoom {...defaultProps} league={leagueWithRosters} />)
    
    expect(screen.getByText('1/16')).toBeInTheDocument() // Team 1 roster count
    expect(screen.getByText('0/16')).toBeInTheDocument() // Team 3 roster count
  })

  it('shows auto-pick notification', () => {
    mockUseDraftRoom.mockReturnValue({
      draftState: { 
        ...mockDraftState,
        lastPick: {
          isAutoPick: true,
          playerName: 'Travis Kelce',
          teamName: 'Fire Breathing Rubber Ducks',
          reason: 'Time expired'
        }
      },
      availablePlayers: mockAvailablePlayers,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockDraftActions
    })

    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('Auto-pick: Travis Kelce to Fire Breathing Rubber Ducks (Time expired)')).toBeInTheDocument()
  })

  it('joins draft room on mount', () => {
    render(<DraftRoom {...defaultProps} />)
    
    expect(mockDraftActions.joinDraft).toHaveBeenCalledWith('league1')
  })

  it('leaves draft room on unmount', () => {
    const { unmount } = render(<DraftRoom {...defaultProps} />)
    
    unmount()
    
    expect(mockDraftActions.leaveDraft).toHaveBeenCalled()
  })

  it('shows draft status indicators', () => {
    mockUseDraftRoom.mockReturnValue({
      draftState: { 
        ...mockDraftState,
        status: 'IN_PROGRESS',
        totalPicks: 192,
        completedPicks: 2
      },
      availablePlayers: mockAvailablePlayers,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockDraftActions
    })

    render(<DraftRoom {...defaultProps} />)
    
    expect(screen.getByText('Draft Progress: 2/192')).toBeInTheDocument()
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
  })
})