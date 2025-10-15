import { render, screen } from '@testing-library/react'
import { PowerRankings } from '@/components/league/power-rankings'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

const mockRankings = [
  {
    rank: 1,
    previousRank: 2,
    teamName: 'Thunder Bolts',
    ownerName: 'John Doe',
    record: { wins: 6, losses: 2, ties: 0 },
    pointsFor: 1124.5,
    pointsAgainst: 1089.3,
    powerScore: 95.2,
    trend: 'up' as const,
    strengthOfSchedule: 0.85
  },
  {
    rank: 2,
    previousRank: 1,
    teamName: 'Gridiron Warriors',
    ownerName: 'Jane Smith',
    record: { wins: 5, losses: 3, ties: 0 },
    pointsFor: 1089.3,
    pointsAgainst: 1124.5,
    powerScore: 88.7,
    trend: 'down' as const,
    strengthOfSchedule: 0.92
  },
  {
    rank: 3,
    previousRank: 3,
    teamName: 'Dynasty Squad',
    ownerName: 'Mike Johnson',
    record: { wins: 5, losses: 3, ties: 0 },
    pointsFor: 1076.8,
    pointsAgainst: 1050.2,
    powerScore: 82.1,
    trend: 'same' as const,
    strengthOfSchedule: 0.78
  }
]

describe('PowerRankings', () => {
  it('renders power rankings for all teams', () => {
    render(<PowerRankings rankings={mockRankings} />)

    expect(screen.getByText('Thunder Bolts')).toBeInTheDocument()
    expect(screen.getByText('Gridiron Warriors')).toBeInTheDocument()
    expect(screen.getByText('Dynasty Squad')).toBeInTheDocument()
  })

  it('displays team owner names', () => {
    render(<PowerRankings rankings={mockRankings} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
  })

  it('displays team records', () => {
    render(<PowerRankings rankings={mockRankings} />)

    expect(screen.getByText('6-2')).toBeInTheDocument()
    expect(screen.getByText('5-3')).toBeInTheDocument()
  })

  it('displays points for', () => {
    render(<PowerRankings rankings={mockRankings} />)

    expect(screen.getByText('1124.5')).toBeInTheDocument()
    expect(screen.getByText('1089.3')).toBeInTheDocument()
    expect(screen.getByText('1076.8')).toBeInTheDocument()
  })

  it('displays power scores', () => {
    render(<PowerRankings rankings={mockRankings} />)

    expect(screen.getByText('95.2')).toBeInTheDocument()
    expect(screen.getByText('88.7')).toBeInTheDocument()
    expect(screen.getByText('82.1')).toBeInTheDocument()
  })

  it('displays strength of schedule', () => {
    render(<PowerRankings rankings={mockRankings} />)

    expect(screen.getByText('SoS: 0.85')).toBeInTheDocument()
    expect(screen.getByText('SoS: 0.92')).toBeInTheDocument()
    expect(screen.getByText('SoS: 0.78')).toBeInTheDocument()
  })

  it('displays rank change indicators', () => {
    render(<PowerRankings rankings={mockRankings} />)

    // Thunder Bolts moved up 1 spot
    expect(screen.getByText('1 up')).toBeInTheDocument()
    
    // Gridiron Warriors moved down 1 spot
    expect(screen.getByText('1 down')).toBeInTheDocument()
  })

  it('highlights current user team when provided', () => {
    render(<PowerRankings rankings={mockRankings} currentUserTeamId="Thunder Bolts" />)

    const thunderBoltsCard = screen.getByText('Thunder Bolts').closest('div')
    expect(thunderBoltsCard).toHaveClass('border-blue-500/50', 'shadow-lg', 'shadow-blue-500/20')
  })

  it('displays "YOU" indicator for current user team', () => {
    render(<PowerRankings rankings={mockRankings} currentUserTeamId="Thunder Bolts" />)

    expect(screen.getByText('YOU')).toBeInTheDocument()
  })

  it('applies correct rank colors', () => {
    render(<PowerRankings rankings={mockRankings} />)

    // First place should have gold/yellow colors
    const firstPlaceBadge = screen.getByText('👑').closest('div')
    expect(firstPlaceBadge).toHaveClass('from-yellow-500', 'to-orange-500')

    // Second place should have silver colors
    const secondPlaceBadge = screen.getByText('🥈').closest('div')
    expect(secondPlaceBadge).toHaveClass('from-blue-500', 'to-purple-500')

    // Third place should have bronze colors
    const thirdPlaceBadge = screen.getByText('🥉').closest('div')
    expect(thirdPlaceBadge).toHaveClass('from-blue-500', 'to-purple-500')
  })

  it('displays correct rank badges', () => {
    render(<PowerRankings rankings={mockRankings} />)

    expect(screen.getByText('👑')).toBeInTheDocument() // First place
    expect(screen.getByText('🥈')).toBeInTheDocument() // Second place
    expect(screen.getByText('🥉')).toBeInTheDocument() // Third place
  })

  it('applies correct CSS classes for ranking cards', () => {
    render(<PowerRankings rankings={mockRankings} />)

    const rankingCard = screen.getByText('Thunder Bolts').closest('div')
    expect(rankingCard).toHaveClass('relative', 'p-4', 'rounded-xl', 'border-2', 'bg-gradient-to-br', 'from-slate-800/50', 'to-slate-900/50')
  })

  it('applies correct CSS classes for rank badges', () => {
    render(<PowerRankings rankings={mockRankings} />)

    const rankBadge = screen.getByText('👑').closest('div')
    expect(rankBadge).toHaveClass('w-12', 'h-12', 'rounded-full', 'flex', 'items-center', 'justify-center', 'text-white', 'font-bold', 'text-lg', 'shadow-xl', 'border-2', 'border-slate-900')
  })

  it('handles ties in records', () => {
    const rankingsWithTies = [
      {
        ...mockRankings[0],
        record: { wins: 5, losses: 2, ties: 1 }
      }
    ]

    render(<PowerRankings rankings={rankingsWithTies} />)

    expect(screen.getByText('5-2-1')).toBeInTheDocument()
  })

  it('handles empty rankings array', () => {
    render(<PowerRankings rankings={[]} />)

    // Should render without errors
    expect(screen.queryByText('Thunder Bolts')).not.toBeInTheDocument()
  })

  it('displays trend icons correctly', () => {
    render(<PowerRankings rankings={mockRankings} />)

    // Should have trending up and down icons
    const trendIcons = screen.getAllByRole('img', { hidden: true })
    expect(trendIcons.length).toBeGreaterThan(0)
  })

  it('applies correct CSS classes for trend indicators', () => {
    render(<PowerRankings rankings={mockRankings} />)

    // Find trend indicators
    const upTrend = screen.getByText('1 up').closest('div')
    expect(upTrend).toHaveClass('text-emerald-400')

    const downTrend = screen.getByText('1 down').closest('div')
    expect(downTrend).toHaveClass('text-red-400')
  })
})
