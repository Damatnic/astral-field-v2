import { render, screen, fireEvent } from '@testing-library/react'
import { PlayerComparisonTool } from '@/components/player/player-comparison-tool'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}))

const mockPlayers = [
  {
    id: '1',
    name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    fantasyPoints: 24.5,
    projectedPoints: 22.0,
    stats: {
      targets: 45,
      receptions: 32,
      yards: 450,
      touchdowns: 4,
      carries: 8,
      snapCount: 95,
      targetShare: 25.5
    },
    lastFiveGames: [20.5, 18.3, 24.5, 22.1, 19.8],
    consistency: 85,
    ceiling: 35.0,
    floor: 15.0
  },
  {
    id: '2',
    name: 'Patrick Mahomes',
    position: 'QB',
    team: 'KC',
    fantasyPoints: 28.2,
    projectedPoints: 25.5,
    stats: {
      targets: 50,
      receptions: 35,
      yards: 520,
      touchdowns: 5,
      carries: 6,
      snapCount: 98,
      targetShare: 28.2
    },
    lastFiveGames: [22.1, 26.8, 28.2, 24.9, 25.3],
    consistency: 92,
    ceiling: 40.0,
    floor: 18.0
  }
]

describe('PlayerComparisonTool', () => {
  const mockOnClose = jest.fn()
  const mockOnAddPlayer = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders player comparison tool', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    expect(screen.getByText('Player Comparison')).toBeInTheDocument()
    expect(screen.getByText('Compare up to 4 players side-by-side')).toBeInTheDocument()
  })

  it('displays player information in table', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    expect(screen.getByText('QB • BUF')).toBeInTheDocument()
    expect(screen.getByText('QB • KC')).toBeInTheDocument()
  })

  it('displays core stats', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    expect(screen.getByText('Fantasy Points')).toBeInTheDocument()
    expect(screen.getByText('Projected')).toBeInTheDocument()
    expect(screen.getByText('Ceiling')).toBeInTheDocument()
    expect(screen.getByText('Floor')).toBeInTheDocument()
    expect(screen.getByText('Consistency')).toBeInTheDocument()
  })

  it('displays advanced metrics', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    expect(screen.getByText('Targets')).toBeInTheDocument()
    expect(screen.getByText('Receptions')).toBeInTheDocument()
    expect(screen.getByText('Yards')).toBeInTheDocument()
    expect(screen.getByText('TDs')).toBeInTheDocument()
    expect(screen.getByText('Carries')).toBeInTheDocument()
    expect(screen.getByText('Snap %')).toBeInTheDocument()
    expect(screen.getByText('Target Share')).toBeInTheDocument()
  })

  it('displays recent performance section', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    expect(screen.getByText('Recent Performance')).toBeInTheDocument()
    expect(screen.getByText('Last 5 Games')).toBeInTheDocument()
  })

  it('displays AI analysis section', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    expect(screen.getByText('AI Analysis')).toBeInTheDocument()
    expect(screen.getByText(/Based on recent performance and projected points/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    const closeButton = screen.getByTestId('close-comparison-button')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop is clicked', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    // Find the backdrop by clicking on the modal container
    const modal = screen.getByRole('dialog')
    fireEvent.click(modal)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onAddPlayer when add player button is clicked', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    const addPlayerButton = screen.getByTestId('add-player-button')
    fireEvent.click(addPlayerButton)

    expect(mockOnAddPlayer).toHaveBeenCalled()
  })

  it('removes player when remove button is clicked', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    // Initially should have both players
    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    
    // Click remove button for first player
    const removeButton = screen.getByTestId('remove-player-1')
    fireEvent.click(removeButton)

    // Player should be removed
    expect(screen.queryByText('Josh Allen')).not.toBeInTheDocument()
  })

  it('handles keyboard ESC key to close', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('exports comparison data as CSV', () => {
    // Mock URL.createObjectURL and link click
    const mockClick = jest.fn()
    const mockCreateElement = document.createElement
    
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'a') {
        return { click: mockClick, href: '', download: '' } as any
      }
      return mockCreateElement(tagName)
    })
    
    global.URL.createObjectURL = jest.fn(() => 'blob:test')

    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    const exportButton = screen.getByTestId('export-comparison-button')
    fireEvent.click(exportButton)

    expect(mockClick).toHaveBeenCalled()
    
    // Cleanup
    document.createElement = mockCreateElement
  })

  it('applies correct CSS classes for modal structure', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    const modal = screen.getByRole('dialog')
    expect(modal).toHaveClass('fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center', 'p-4', 'bg-black/80')
  })

  it('applies correct CSS classes for comparison table', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    const table = screen.getByRole('table')
    expect(table).toHaveClass('w-full')
  })

  it('displays player avatars with initials', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    expect(screen.getByText('JA')).toBeInTheDocument() // Josh Allen initials
    expect(screen.getByText('PM')).toBeInTheDocument() // Patrick Mahomes initials
  })

  it('highlights best and worst values in comparisons', () => {
    render(
      <PlayerComparisonTool
        players={mockPlayers}
        onClose={mockOnClose}
        onAddPlayer={mockOnAddPlayer}
      />
    )

    // Patrick Mahomes has higher fantasy points, so should be highlighted
    const mahomesPoints = screen.getByText('28.2')
    expect(mahomesPoints).toHaveClass('text-emerald-400', 'font-bold')
  })
})
