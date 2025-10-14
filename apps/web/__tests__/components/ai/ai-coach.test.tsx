import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AICoach } from '@/components/ai/ai-coach'

const mockRecommendations = [
  {
    id: 'rec1',
    type: 'LINEUP',
    playerId: '1',
    playerName: 'Josh Allen',
    position: 'QB',
    confidence: 0.95,
    reason: 'Favorable matchup against weak secondary',
    recommendation: 'START',
    expectedPoints: 24.5,
    impact: 'HIGH'
  },
  {
    id: 'rec2', 
    type: 'WAIVER',
    playerId: '2',
    playerName: 'Tyler Boyd',
    position: 'WR',
    confidence: 0.78,
    reason: 'High target share with Tee Higgins out',
    recommendation: 'ADD',
    expectedPoints: 12.3,
    impact: 'MEDIUM'
  },
  {
    id: 'rec3',
    type: 'TRADE',
    playerId: '3',
    playerName: 'Saquon Barkley',
    position: 'RB', 
    confidence: 0.65,
    reason: 'Injury concerns and tough upcoming schedule',
    recommendation: 'SELL',
    expectedPoints: 14.8,
    impact: 'HIGH'
  }
]

const mockTeam = {
  id: 'team1',
  name: 'Fire Breathing Rubber Ducks',
  record: { wins: 8, losses: 4, ties: 0 },
  roster: [
    { id: '1', playerId: '1', player: { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF' }, position: 'QB', isStarter: true },
    { id: '2', playerId: '4', player: { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF' }, position: 'RB', isStarter: true }
  ]
}

// Mock the fetch function
global.fetch = jest.fn()

describe('AICoach Component', () => {
  const defaultProps = {
    teamId: 'team1',
    team: mockTeam,
    currentWeek: 14
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations })
    })
  })

  it('renders AI Coach interface correctly', async () => {
    render(<AICoach {...defaultProps} />)
    
    expect(screen.getByText('AI Coach')).toBeInTheDocument()
    expect(screen.getByText('Get personalized recommendations for your team')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get recommendations/i })).toBeInTheDocument()
  })

  it('fetches and displays recommendations when button is clicked', async () => {
    render(<AICoach {...defaultProps} />)
    
    const getRecommendationsBtn = screen.getByRole('button', { name: /get recommendations/i })
    fireEvent.click(getRecommendationsBtn)

    await waitFor(() => {
      expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      expect(screen.getByText('Tyler Boyd')).toBeInTheDocument() 
      expect(screen.getByText('Saquon Barkley')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/ai/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: 'team1', week: 14 })
    })
  })

  it('displays different recommendation types with correct icons', async () => {
    render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))

    await waitFor(() => {
      expect(screen.getByText('LINEUP')).toBeInTheDocument()
      expect(screen.getByText('WAIVER')).toBeInTheDocument()
      expect(screen.getByText('TRADE')).toBeInTheDocument()
    })
  })

  it('shows confidence levels and expected points', async () => {
    render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument() // Josh Allen confidence
      expect(screen.getByText('78%')).toBeInTheDocument() // Tyler Boyd confidence
      expect(screen.getByText('65%')).toBeInTheDocument() // Saquon confidence
      
      expect(screen.getByText('24.5')).toBeInTheDocument() // Josh Allen expected points
      expect(screen.getByText('12.3')).toBeInTheDocument() // Tyler Boyd expected points
      expect(screen.getByText('14.8')).toBeInTheDocument() // Saquon expected points
    })
  })

  it('displays recommendation reasons', async () => {
    render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))

    await waitFor(() => {
      expect(screen.getByText('Favorable matchup against weak secondary')).toBeInTheDocument()
      expect(screen.getByText('High target share with Tee Higgins out')).toBeInTheDocument() 
      expect(screen.getByText('Injury concerns and tough upcoming schedule')).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching recommendations', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))
    
    expect(screen.getByText('Analyzing your team...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500
    })
    
    render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to get recommendations. Please try again.')).toBeInTheDocument()
    })
  })

  it('filters recommendations by type', async () => {
    render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))

    await waitFor(() => {
      expect(screen.getByText('Josh Allen')).toBeInTheDocument()
      expect(screen.getByText('Tyler Boyd')).toBeInTheDocument()
      expect(screen.getByText('Saquon Barkley')).toBeInTheDocument()
    })

    // Filter to only lineup recommendations
    const lineupFilter = screen.getByRole('button', { name: /lineup/i })
    fireEvent.click(lineupFilter)

    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    expect(screen.queryByText('Tyler Boyd')).not.toBeInTheDocument()
    expect(screen.queryByText('Saquon Barkley')).not.toBeInTheDocument()
  })

  it('shows impact levels with correct colors', async () => {
    render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))

    await waitFor(() => {
      const highImpactBadges = screen.getAllByText('HIGH')
      const mediumImpactBadge = screen.getByText('MEDIUM')
      
      expect(highImpactBadges).toHaveLength(2) // Josh Allen and Saquon
      expect(highImpactBadges[0]).toHaveClass('bg-red-100')
      expect(mediumImpactBadge).toHaveClass('bg-yellow-100')
    })
  })

  it('allows applying lineup recommendations', async () => {
    render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))

    await waitFor(() => {
      const applyButton = screen.getByRole('button', { name: /apply lineup/i })
      fireEvent.click(applyButton)
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/teams/team1/lineup', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lineupChanges: [
          { playerId: '1', position: 'QB', action: 'START' }
        ]
      })
    })
  })

  it('shows team analysis summary', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        recommendations: mockRecommendations,
        analysis: {
          teamStrength: 'Strong',
          weakPositions: ['WR', 'TE'],
          upcomingMatchup: 'Favorable',
          projectedScore: 127.5
        }
      })
    })

    render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))

    await waitFor(() => {
      expect(screen.getByText('Team Analysis')).toBeInTheDocument()
      expect(screen.getByText('Strong')).toBeInTheDocument()
      expect(screen.getByText('127.5')).toBeInTheDocument()
      expect(screen.getByText('Favorable')).toBeInTheDocument()
    })
  })

  it('refreshes recommendations with updated week', async () => {
    const { rerender } = render(<AICoach {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /get recommendations/i }))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/recommendations', expect.objectContaining({
        body: JSON.stringify({ teamId: 'team1', week: 14 })
      }))
    })

    // Update to week 15
    rerender(<AICoach {...defaultProps} currentWeek={15} />)
    
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/recommendations', expect.objectContaining({
        body: JSON.stringify({ teamId: 'team1', week: 15 })
      }))
    })
  })
})
