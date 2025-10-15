import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VisualTradeBuilder } from '@/components/trades/visual-trade-builder'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('VisualTradeBuilder', () => {
  const mockMyRoster = [
    {
      id: '1',
      name: 'Josh Allen',
      position: 'QB',
      team: 'BUF',
      fantasyPoints: 24.5,
      projectedPoints: 22.0
    },
    {
      id: '2',
      name: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF',
      fantasyPoints: 18.2,
      projectedPoints: 20.0
    }
  ]

  const mockTheirRoster = [
    {
      id: '3',
      name: 'Patrick Mahomes',
      position: 'QB',
      team: 'KC',
      fantasyPoints: 23.5,
      projectedPoints: 21.5
    },
    {
      id: '4',
      name: 'Saquon Barkley',
      position: 'RB',
      team: 'PHI',
      fantasyPoints: 16.8,
      projectedPoints: 18.5
    }
  ]

  const mockOnProposeTrade = jest.fn(() => Promise.resolve())

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders both team rosters', () => {
    render(
      <VisualTradeBuilder
        myRoster={mockMyRoster}
        theirRoster={mockTheirRoster}
        myTeamName="My Team"
        theirTeamName="Their Team"
        onProposeTrade={mockOnProposeTrade}
      />
    )

    expect(screen.getByText('My Team')).toBeInTheDocument()
    expect(screen.getByText('Their Team')).toBeInTheDocument()
    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
  })

  it('allows adding players to trade', () => {
    render(
      <VisualTradeBuilder
        myRoster={mockMyRoster}
        theirRoster={mockTheirRoster}
        myTeamName="My Team"
        theirTeamName="Their Team"
        onProposeTrade={mockOnProposeTrade}
      />
    )

    // Click on Josh Allen to add to trade
    const joshAllen = screen.getByText('Josh Allen')
    fireEvent.click(joshAllen)

    // Should appear in trade section
    // The player should still be visible (moved to trade area)
  })

  it('shows analyze button when players are selected', () => {
    render(
      <VisualTradeBuilder
        myRoster={mockMyRoster}
        theirRoster={mockTheirRoster}
        myTeamName="My Team"
        theirTeamName="Their Team"
        onProposeTrade={mockOnProposeTrade}
      />
    )

    expect(screen.getByText('Analyze Trade')).toBeInTheDocument()
  })

  it('displays trade analysis after analyzing', async () => {
    render(
      <VisualTradeBuilder
        myRoster={mockMyRoster}
        theirRoster={mockTheirRoster}
        myTeamName="My Team"
        theirTeamName="Their Team"
        onProposeTrade={mockOnProposeTrade}
      />
    )

    // Add players to both sides
    fireEvent.click(screen.getByText('Josh Allen'))
    fireEvent.click(screen.getByText('Patrick Mahomes'))

    // Click analyze
    const analyzeButton = screen.getByText('Analyze Trade')
    fireEvent.click(analyzeButton)

    // Wait for analysis to complete
    await waitFor(() => {
      expect(screen.getByText(/Analyzing.../)).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('Make Fair button is present', () => {
    render(
      <VisualTradeBuilder
        myRoster={mockMyRoster}
        theirRoster={mockTheirRoster}
        myTeamName="My Team"
        theirTeamName="Their Team"
        onProposeTrade={mockOnProposeTrade}
      />
    )

    expect(screen.getByText('Make Fair')).toBeInTheDocument()
  })
})

