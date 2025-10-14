/**
 * LiveGameCard Component Tests
 * Comprehensive test coverage for live game card component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LiveGameCard } from '@/components/live/live-game-card'

describe('LiveGameCard Component', () => {
  const mockGame = {
    gameId: 'game-1',
    homeTeam: 'KC',
    awayTeam: 'BUF',
    homeScore: 24,
    awayScore: 21,
    quarter: '4th',
    timeRemaining: '2:15',
    status: 'live' as const,
  }

  it('should render team names', () => {
    render(<LiveGameCard game={mockGame} />)
    expect(screen.getByText('KC')).toBeInTheDocument()
    expect(screen.getByText('BUF')).toBeInTheDocument()
  })

  it('should render scores', () => {
    render(<LiveGameCard game={mockGame} />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('21')).toBeInTheDocument()
  })

  it('should render game status', () => {
    render(<LiveGameCard game={mockGame} />)
    expect(screen.getByText('4th - 2:15')).toBeInTheDocument()
  })

  it('should show LIVE indicator for live games', () => {
    render(<LiveGameCard game={mockGame} />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })

  it('should show FINAL for completed games', () => {
    const finalGame = { ...mockGame, status: 'final' as const }
    render(<LiveGameCard game={finalGame} />)
    expect(screen.getByText('FINAL')).toBeInTheDocument()
  })

  it('should not show LIVE indicator for scheduled games', () => {
    const scheduledGame = { ...mockGame, status: 'scheduled' as const }
    render(<LiveGameCard game={scheduledGame} />)
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()
  })

  it('should highlight winning team score', () => {
    const { container } = render(<LiveGameCard game={mockGame} />)
    // Home team (24) should be white (winning), away team (21) should be gray
    const scores = container.querySelectorAll('.text-3xl')
    expect(scores[0]).toHaveClass('text-slate-500') // Away (losing)
    expect(scores[1]).toHaveClass('text-white') // Home (winning)
  })

  it('should apply emerald border for live games', () => {
    const { container } = render(<LiveGameCard game={mockGame} />)
    expect(container.firstChild).toHaveClass('border-emerald-500/30')
  })

  it('should apply slate border for non-live games', () => {
    const finalGame = { ...mockGame, status: 'final' as const }
    const { container } = render(<LiveGameCard game={finalGame} />)
    expect(container.firstChild).toHaveClass('border-slate-800')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <LiveGameCard game={mockGame} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  describe('Accessibility', () => {
    it('should have proper text contrast', () => {
      const { container } = render(<LiveGameCard game={mockGame} />)
      const teamNames = screen.getAllByText(/KC|BUF/)
      teamNames.forEach(name => {
        expect(name).toHaveClass('text-white')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle tied game', () => {
      const tiedGame = { ...mockGame, homeScore: 21, awayScore: 21 }
      const { container } = render(<LiveGameCard game={tiedGame} />)
      expect(screen.getByText('21')).toBeInTheDocument()
    })

    it('should handle zero scores', () => {
      const zeroGame = { ...mockGame, homeScore: 0, awayScore: 0, status: 'scheduled' as const }
      render(<LiveGameCard game={zeroGame} />)
      const scores = screen.getAllByText('0')
      expect(scores.length).toBe(2)
    })

    it('should handle high scores', () => {
      const highScoreGame = { ...mockGame, homeScore: 52, awayScore: 49 }
      render(<LiveGameCard game={highScoreGame} />)
      expect(screen.getByText('52')).toBeInTheDocument()
      expect(screen.getByText('49')).toBeInTheDocument()
    })
  })
})

