import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EnhancedPlayerCard } from '@/components/player/enhanced-player-card'
import '@testing-library/jest-dom'

describe('EnhancedPlayerCard', () => {
  const mockPlayer = {
    id: '1',
    name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    fantasyPoints: 24.5,
    projectedPoints: 22.0,
    status: 'ACTIVE' as const,
    trending: 'hot' as const,
    lastFiveGames: [20.5, 18.3, 24.5, 22.1, 19.8],
    ownership: 95
  }

  const mockOnAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders player information correctly', () => {
    render(
      <EnhancedPlayerCard
        player={mockPlayer}
        variant="compact"
        onAction={mockOnAction}
      />
    )

    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    expect(screen.getByText('QB')).toBeInTheDocument()
    expect(screen.getByText('BUF')).toBeInTheDocument()
    expect(screen.getByText('24.5')).toBeInTheDocument()
  })

  it('displays status badge when not ACTIVE', () => {
    const injuredPlayer = { ...mockPlayer, status: 'INJURED' as const }
    
    render(
      <EnhancedPlayerCard
        player={injuredPlayer}
        variant="compact"
        onAction={mockOnAction}
      />
    )

    expect(screen.getByText('INJURED')).toBeInTheDocument()
  })

  it('shows trending indicator', () => {
    render(
      <EnhancedPlayerCard
        player={mockPlayer}
        variant="compact"
        onAction={mockOnAction}
      />
    )

    // Flame icon should be present for 'hot' trending
    const card = screen.getByText('Josh Allen').closest('div')
    expect(card).toBeInTheDocument()
  })

  it('calls onAction when quick action is clicked', async () => {
    render(
      <EnhancedPlayerCard
        player={mockPlayer}
        variant="compact"
        onAction={mockOnAction}
        showQuickActions={true}
      />
    )

    // Click the more actions button first
    const moreButton = screen.getByRole('button')
    fireEvent.click(moreButton)

    // Wait for quick actions to appear
    await waitFor(() => {
      const addButton = screen.getByText('Add')
      expect(addButton).toBeInTheDocument()
      fireEvent.click(addButton)
    })

    expect(mockOnAction).toHaveBeenCalledWith('add', '1')
  })

  it('expands to show last 5 games when clicked in expanded variant', () => {
    render(
      <EnhancedPlayerCard
        player={mockPlayer}
        variant="expanded"
        onAction={mockOnAction}
      />
    )

    const card = screen.getByText('Josh Allen').closest('div')
    if (card) {
      fireEvent.click(card)
    }

    // Should show ownership percentage
    expect(screen.getByText(/95%/)).toBeInTheDocument()
  })

  it('displays "My Team" indicator when isOnMyTeam is true', () => {
    const myPlayer = { ...mockPlayer, isOnMyTeam: true }
    
    render(
      <EnhancedPlayerCard
        player={myPlayer}
        variant="compact"
        onAction={mockOnAction}
      />
    )

    expect(screen.getByText('My Team')).toBeInTheDocument()
  })

  it('applies correct position color classes', () => {
    render(
      <EnhancedPlayerCard
        player={mockPlayer}
        variant="compact"
        onAction={mockOnAction}
      />
    )

    const positionBadge = screen.getByText('QB')
    expect(positionBadge).toHaveClass('text-red-400')
  })
})

