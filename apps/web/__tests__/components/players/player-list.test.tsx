import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlayerList } from '@/components/players/player-list'

const mockPlayers = [
  {
    id: '1',
    name: 'Josh Allen',
    position: 'QB',
    nflTeam: 'BUF',
    rank: 1,
    adp: 2.5,
    isAvailable: true,
    stats: [
      { week: 1, fantasyPoints: 25.6, stats: { passingYards: 285, touchdowns: 3 } },
      { week: 2, fantasyPoints: 22.4, stats: { passingYards: 265, touchdowns: 2 } }
    ],
    projections: [
      { projectedPoints: 24.8, confidence: 0.85 }
    ],
    news: [
      {
        id: '1',
        title: 'Josh Allen cleared to play',
        content: 'No injury concerns for Week 3',
        source: 'ESPN',
        publishedAt: new Date('2024-09-20'),
        severity: 'LOW'
      }
    ]
  },
  {
    id: '2', 
    name: 'Saquon Barkley',
    position: 'RB',
    nflTeam: 'PHI',
    rank: 5,
    adp: 8.2,
    isAvailable: true,
    stats: [
      { week: 1, fantasyPoints: 18.4, stats: { rushingYards: 95, touchdowns: 1 } },
      { week: 2, fantasyPoints: 14.8, stats: { rushingYards: 78, touchdowns: 0 } }
    ],
    projections: [
      { projectedPoints: 16.2, confidence: 0.78 }
    ],
    news: []
  }
]

describe('PlayerList Component', () => {
  const defaultProps = {
    players: mockPlayers,
    currentPage: 1,
    totalPages: 5,
    onPageChange: jest.fn(),
    loading: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders player list correctly', () => {
    render(<PlayerList {...defaultProps} />)
    
    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    expect(screen.getByText('Saquon Barkley')).toBeInTheDocument()
    expect(screen.getByText('BUF')).toBeInTheDocument()
    expect(screen.getByText('PHI')).toBeInTheDocument()
  })

  it('displays player statistics', () => {
    render(<PlayerList {...defaultProps} />)
    
    // Check fantasy points
    expect(screen.getByText('25.6')).toBeInTheDocument()
    expect(screen.getByText('18.4')).toBeInTheDocument()
  })

  it('shows player projections', () => {
    render(<PlayerList {...defaultProps} />)
    
    expect(screen.getByText('24.8')).toBeInTheDocument()
    expect(screen.getByText('16.2')).toBeInTheDocument()
  })

  it('displays position badges with correct colors', () => {
    render(<PlayerList {...defaultProps} />)
    
    const qbBadge = screen.getByText('QB')
    const rbBadge = screen.getByText('RB')
    
    expect(qbBadge).toHaveClass('bg-red-500')
    expect(rbBadge).toHaveClass('bg-green-500')
  })

  it('shows trending indicators', () => {
    render(<PlayerList {...defaultProps} />)
    
    // Josh Allen trending up (25.6 > 22.4, but we show most recent trend)
    // Should show trending indicators based on recent performance
    const trendingIcons = screen.getAllByTestId(/trending/)
    expect(trendingIcons.length).toBeGreaterThan(0)
  })

  it('displays pagination controls', () => {
    render(<PlayerList {...defaultProps} />)
    
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
  })

  it('handles pagination clicks', () => {
    render(<PlayerList {...defaultProps} />)
    
    const nextButton = screen.getByText('Next')
    fireEvent.click(nextButton)
    
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables previous button on first page', () => {
    render(<PlayerList {...defaultProps} />)
    
    const prevButton = screen.getByText('Previous')
    expect(prevButton).toBeDisabled()
  })

  it('disables next button on last page', () => {
    const lastPageProps = { ...defaultProps, currentPage: 5 }
    render(<PlayerList {...lastPageProps} />)
    
    const nextButton = screen.getByText('Next')
    expect(nextButton).toBeDisabled()
  })

  it('shows loading state', () => {
    const loadingProps = { ...defaultProps, loading: true }
    render(<PlayerList {...loadingProps} />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('expands player details on click', async () => {
    render(<PlayerList {...defaultProps} />)
    
    const playerCard = screen.getByText('Josh Allen').closest('.player-card')
    fireEvent.click(playerCard!)
    
    await waitFor(() => {
      expect(screen.getByText('Josh Allen cleared to play')).toBeInTheDocument()
    })
  })

  it('shows player news when available', async () => {
    render(<PlayerList {...defaultProps} />)
    
    // Click to expand Josh Allen's details
    const joshAllenCard = screen.getByText('Josh Allen').closest('.player-card')
    fireEvent.click(joshAllenCard!)
    
    await waitFor(() => {
      expect(screen.getByText('Recent News')).toBeInTheDocument()
      expect(screen.getByText('Josh Allen cleared to play')).toBeInTheDocument()
    })
  })

  it('handles empty player list', () => {
    const emptyProps = { ...defaultProps, players: [] }
    render(<PlayerList {...emptyProps} />)
    
    expect(screen.getByText('No players found')).toBeInTheDocument()
  })

  it('displays ADP information', () => {
    render(<PlayerList {...defaultProps} />)
    
    expect(screen.getByText('2.5')).toBeInTheDocument() // Josh Allen ADP
    expect(screen.getByText('8.2')).toBeInTheDocument() // Saquon ADP
  })

  it('shows confidence scores for projections', () => {
    render(<PlayerList {...defaultProps} />)
    
    expect(screen.getByText('85%')).toBeInTheDocument() // Josh Allen confidence
    expect(screen.getByText('78%')).toBeInTheDocument() // Saquon confidence
  })
})