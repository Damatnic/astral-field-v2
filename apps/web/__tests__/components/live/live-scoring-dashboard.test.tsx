import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LiveScoringDashboard } from '@/components/live/live-scoring-dashboard'
import { useLiveScoring } from '@/hooks/use-websocket'

// Mock the WebSocket hook
jest.mock('@/hooks/use-websocket')
const mockUseLiveScoring = useLiveScoring as jest.MockedFunction<typeof useLiveScoring>

const mockMatchups = [
  {
    id: 'matchup1',
    week: 14,
    homeTeam: {
      id: 'team1',
      name: 'Fire Breathing Rubber Ducks',
      owner: { name: 'John Doe' },
      logo: null
    },
    awayTeam: {
      id: 'team2', 
      name: 'Thunderbolts',
      owner: { name: 'Jane Smith' },
      logo: null
    },
    homeScore: 87.4,
    awayScore: 92.1,
    projectedHomeScore: 98.2,
    projectedAwayScore: 89.7,
    isComplete: false,
    homeLineup: [
      {
        id: 'lineup1',
        player: {
          id: 'p1',
          name: 'Josh Allen',
          position: 'QB',
          nflTeam: 'BUF',
          currentWeekStats: { fantasyPoints: 18.4 },
          gameInfo: {
            homeScore: 21,
            awayScore: 14, 
            quarter: 3,
            timeRemaining: '8:42',
            isComplete: false
          }
        },
        position: 'QB',
        isStarter: true,
        fantasyPoints: 18.4
      }
    ],
    awayLineup: [
      {
        id: 'lineup2',
        player: {
          id: 'p2',
          name: 'Lamar Jackson',
          position: 'QB',
          nflTeam: 'BAL',
          currentWeekStats: { fantasyPoints: 22.1 },
          gameInfo: {
            homeScore: 28,
            awayScore: 17,
            quarter: 4,
            timeRemaining: '12:15', 
            isComplete: false
          }
        },
        position: 'QB',
        isStarter: true,
        fantasyPoints: 22.1
      }
    ]
  },
  {
    id: 'matchup2',
    week: 14,
    homeTeam: {
      id: 'team3',
      name: 'Storm Hawks',
      owner: { name: 'Bob Wilson' },
      logo: null
    },
    awayTeam: {
      id: 'team4',
      name: 'Lightning Bolts', 
      owner: { name: 'Alice Brown' },
      logo: null
    },
    homeScore: 124.6,
    awayScore: 118.2,
    projectedHomeScore: 112.4,
    projectedAwayScore: 119.8,
    isComplete: true,
    homeLineup: [],
    awayLineup: []
  }
]

const mockLiveUpdates = [
  {
    id: 'update1',
    playerId: 'p1',
    playerName: 'Josh Allen',
    teamName: 'Fire Breathing Rubber Ducks',
    type: 'TOUCHDOWN',
    points: 6.0,
    description: '15-yard rushing touchdown',
    timestamp: new Date('2024-09-22T20:15:00Z')
  },
  {
    id: 'update2',
    playerId: 'p2', 
    playerName: 'Lamar Jackson',
    teamName: 'Thunderbolts',
    type: 'PASSING_TD',
    points: 4.0,
    description: '28-yard TD pass to Mark Andrews',
    timestamp: new Date('2024-09-22T20:18:00Z')
  }
]

const mockActions = {
  joinScoring: jest.fn(),
  leaveScoring: jest.fn(),
  refreshScores: jest.fn()
}

describe('LiveScoringDashboard Component', () => {
  const defaultProps = {
    leagueId: 'league1',
    week: 14,
    userTeamId: 'team1'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLiveScoring.mockReturnValue({
      matchups: mockMatchups,
      liveUpdates: mockLiveUpdates,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockActions
    })
  })

  it('renders live scoring dashboard correctly', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(screen.getByText('Live Scoring - Week 14')).toBeInTheDocument()
    expect(screen.getByText('Fire Breathing Rubber Ducks')).toBeInTheDocument()
    expect(screen.getByText('Thunderbolts')).toBeInTheDocument()
    expect(screen.getByText('Storm Hawks')).toBeInTheDocument()
    expect(screen.getByText('Lightning Bolts')).toBeInTheDocument()
  })

  it('displays matchup scores correctly', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(screen.getByText('87.4')).toBeInTheDocument() // Home team score
    expect(screen.getByText('92.1')).toBeInTheDocument() // Away team score
    expect(screen.getByText('124.6')).toBeInTheDocument() // Completed matchup home
    expect(screen.getByText('118.2')).toBeInTheDocument() // Completed matchup away
  })

  it('shows projected scores vs actual scores', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(screen.getByText('Projected: 98.2')).toBeInTheDocument()
    expect(screen.getByText('Projected: 89.7')).toBeInTheDocument()
  })

  it('highlights user team matchup', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    const userMatchup = screen.getByText('Fire Breathing Rubber Ducks').closest('.matchup-card')
    expect(userMatchup).toHaveClass('ring-2', 'ring-blue-500')
  })

  it('displays live player updates feed', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(screen.getByText('Live Updates')).toBeInTheDocument()
    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    expect(screen.getByText('15-yard rushing touchdown')).toBeInTheDocument()
    expect(screen.getByText('6.0 pts')).toBeInTheDocument()
    
    expect(screen.getByText('Lamar Jackson')).toBeInTheDocument()
    expect(screen.getByText('28-yard TD pass to Mark Andrews')).toBeInTheDocument()
    expect(screen.getByText('4.0 pts')).toBeInTheDocument()
  })

  it('shows game status for active players', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    // Expand matchup to see player details
    const matchupCard = screen.getByText('Fire Breathing Rubber Ducks').closest('.matchup-card')
    fireEvent.click(matchupCard!)
    
    expect(screen.getByText('Q3 8:42')).toBeInTheDocument() // Josh Allen game status
    expect(screen.getByText('21-14')).toBeInTheDocument() // Game score
  })

  it('indicates completed vs active matchups', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    const activeMatchup = screen.getByText('Fire Breathing Rubber Ducks').closest('.matchup-card')
    const completedMatchup = screen.getByText('Storm Hawks').closest('.matchup-card')
    
    expect(activeMatchup).toHaveClass('border-green-500') // Active
    expect(completedMatchup).toHaveClass('border-gray-300') // Complete
    
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByText('FINAL')).toBeInTheDocument()
  })

  it('displays fantasy points for each player', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    // Expand matchup details
    const expandButton = screen.getByRole('button', { name: /show lineup/i })
    fireEvent.click(expandButton)
    
    expect(screen.getByText('18.4')).toBeInTheDocument() // Josh Allen points
    expect(screen.getByText('22.1')).toBeInTheDocument() // Lamar Jackson points
  })

  it('shows loading state while fetching data', () => {
    mockUseLiveScoring.mockReturnValue({
      matchups: [],
      liveUpdates: [],
      isConnected: false,
      isLoading: true,
      error: null,
      ...mockActions
    })

    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(screen.getByText('Loading live scores...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays error message when connection fails', () => {
    mockUseLiveScoring.mockReturnValue({
      matchups: [],
      liveUpdates: [],
      isConnected: false,
      isLoading: false,
      error: 'Failed to connect to scoring updates',
      ...mockActions
    })

    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(screen.getByText('Failed to connect to scoring updates')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('allows refreshing scores manually', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)
    
    expect(mockActions.refreshScores).toHaveBeenCalled()
  })

  it('filters matchups by completion status', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    // Show only active games
    const activeFilter = screen.getByRole('button', { name: /active/i })
    fireEvent.click(activeFilter)
    
    expect(screen.getByText('Fire Breathing Rubber Ducks')).toBeInTheDocument()
    expect(screen.queryByText('Storm Hawks')).not.toBeInTheDocument()
    
    // Show all games
    const allFilter = screen.getByRole('button', { name: /all/i })
    fireEvent.click(allFilter)
    
    expect(screen.getByText('Fire Breathing Rubber Ducks')).toBeInTheDocument()
    expect(screen.getByText('Storm Hawks')).toBeInTheDocument()
  })

  it('shows connection status indicator', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-green-500')
  })

  it('handles disconnection gracefully', () => {
    mockUseLiveScoring.mockReturnValue({
      matchups: mockMatchups,
      liveUpdates: mockLiveUpdates,
      isConnected: false,
      isLoading: false,
      error: null,
      ...mockActions
    })

    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-red-500')
  })

  it('sorts updates by timestamp in descending order', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    const updates = screen.getAllByTestId('live-update')
    expect(updates[0]).toHaveTextContent('Lamar Jackson') // More recent
    expect(updates[1]).toHaveTextContent('Josh Allen') // Older
  })

  it('expands and collapses matchup lineups', async () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    const expandButton = screen.getByRole('button', { name: /show lineup/i })
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      expect(screen.getByText('QB')).toBeInTheDocument()
    })
    
    const collapseButton = screen.getByRole('button', { name: /hide lineup/i })
    fireEvent.click(collapseButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Josh Allen')).not.toBeInTheDocument()
    })
  })

  it('joins scoring room on mount', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(mockActions.joinScoring).toHaveBeenCalledWith('league1', 14)
  })

  it('leaves scoring room on unmount', () => {
    const { unmount } = render(<LiveScoringDashboard {...defaultProps} />)
    
    unmount()
    
    expect(mockActions.leaveScoring).toHaveBeenCalled()
  })

  it('shows position badges with correct colors', () => {
    render(<LiveScoringDashboard {...defaultProps} />)
    
    const expandButton = screen.getByRole('button', { name: /show lineup/i })
    fireEvent.click(expandButton)
    
    const qbBadge = screen.getByText('QB')
    expect(qbBadge).toHaveClass('bg-red-500')
  })

  it('displays team logos when available', () => {
    const matchupsWithLogos = [
      {
        ...mockMatchups[0],
        homeTeam: { ...mockMatchups[0].homeTeam, logo: 'https://example.com/logo1.png' },
        awayTeam: { ...mockMatchups[0].awayTeam, logo: 'https://example.com/logo2.png' }
      }
    ]

    mockUseLiveScoring.mockReturnValue({
      matchups: matchupsWithLogos,
      liveUpdates: mockLiveUpdates,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockActions
    })

    render(<LiveScoringDashboard {...defaultProps} />)
    
    expect(screen.getByAltText('Fire Breathing Rubber Ducks logo')).toBeInTheDocument()
    expect(screen.getByAltText('Thunderbolts logo')).toBeInTheDocument()
  })
})
