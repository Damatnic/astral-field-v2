import { render, screen, fireEvent } from '@testing-library/react'
import { SmartWaiverWire } from '@/components/waivers/smart-waiver-wire'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('SmartWaiverWire', () => {
  const mockPlayers = [
    {
      id: '1',
      name: 'Breakout Player',
      position: 'RB',
      team: 'KC',
      fantasyPoints: 12.5,
      projectedPoints: 15.0,
      ownership: 25,
      aiScore: 85,
      breakoutProbability: 75,
      trending: 'hot' as const
    },
    {
      id: '2',
      name: 'Steady Eddie',
      position: 'WR',
      team: 'SF',
      fantasyPoints: 10.0,
      projectedPoints: 11.0,
      ownership: 50,
      aiScore: 70,
      breakoutProbability: 30,
      trending: 'up' as const
    }
  ]

  const mockOnClaim = jest.fn(() => Promise.resolve())
  const mockOnPlayerAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders AI recommendations section', () => {
    render(
      <SmartWaiverWire
        players={mockPlayers}
        myTeamNeeds={['RB']}
        onClaim={mockOnClaim}
        onPlayerAction={mockOnPlayerAction}
      />
    )

    expect(screen.getByText('AI-Powered Recommendations')).toBeInTheDocument()
    expect(screen.getByText('Top Picks for You')).toBeInTheDocument()
  })

  it('displays breakout candidates section when available', () => {
    render(
      <SmartWaiverWire
        players={mockPlayers}
        myTeamNeeds={[]}
        onClaim={mockOnClaim}
        onPlayerAction={mockOnPlayerAction}
      />
    )

    expect(screen.getByText('Breakout Candidates')).toBeInTheDocument()
    expect(screen.getByText('Breakout Player')).toBeInTheDocument()
  })

  it('shows position filter buttons', () => {
    render(
      <SmartWaiverWire
        players={mockPlayers}
        onClaim={mockOnClaim}
        onPlayerAction={mockOnPlayerAction}
      />
    )

    expect(screen.getByText('ALL')).toBeInTheDocument()
    expect(screen.getByText('QB')).toBeInTheDocument()
    expect(screen.getByText('RB')).toBeInTheDocument()
    expect(screen.getByText('WR')).toBeInTheDocument()
  })

  it('filters players by position', () => {
    render(
      <SmartWaiverWire
        players={mockPlayers}
        onClaim={mockOnClaim}
        onPlayerAction={mockOnPlayerAction}
      />
    )

    // Click RB filter
    const rbButton = screen.getByText('RB')
    fireEvent.click(rbButton)

    // Should highlight RB button
    expect(rbButton).toHaveClass('bg-blue-500')
  })

  it('search input is present', () => {
    render(
      <SmartWaiverWire
        players={mockPlayers}
        onClaim={mockOnClaim}
        onPlayerAction={mockOnPlayerAction}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search players...')
    expect(searchInput).toBeInTheDocument()
  })

  it('displays waiver budget when provided', () => {
    render(
      <SmartWaiverWire
        players={mockPlayers}
        onClaim={mockOnClaim}
        waiverBudget={100}
        onPlayerAction={mockOnPlayerAction}
      />
    )

    expect(screen.getByText('$100')).toBeInTheDocument()
  })

  it('shows player count', () => {
    render(
      <SmartWaiverWire
        players={mockPlayers}
        onClaim={mockOnClaim}
        onPlayerAction={mockOnPlayerAction}
      />
    )

    expect(screen.getByText(/2 players/)).toBeInTheDocument()
  })

  it('displays sort options', () => {
    render(
      <SmartWaiverWire
        players={mockPlayers}
        onClaim={mockOnClaim}
        onPlayerAction={mockOnPlayerAction}
      />
    )

    expect(screen.getByText('AI Score')).toBeInTheDocument()
  })
})

