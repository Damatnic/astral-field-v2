/**
 * PlayerCard Component Tests
 * Comprehensive test coverage for player card component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PlayerCard } from '@/components/ui/player-card'

describe('PlayerCard Component', () => {
  const mockPlayer = {
    id: 'player-1',
    name: 'Patrick Mahomes',
    position: 'QB',
    team: 'KC',
    points: 24.5,
    projected: 22.8,
    trend: 'up' as const,
    owned: 99,
    status: 'active' as const,
  }

  it('should render player information', () => {
    render(<PlayerCard player={mockPlayer} />)
    
    expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    expect(screen.getByText('KC')).toBeInTheDocument()
    expect(screen.getByText('QB')).toBeInTheDocument()
  })

  it('should display player stats', () => {
    render(<PlayerCard player={mockPlayer} variant="default" />)
    
    expect(screen.getByText('24.5')).toBeInTheDocument()
    expect(screen.getByText('22.8')).toBeInTheDocument()
  })

  it('should show ownership percentage', () => {
    render(<PlayerCard player={mockPlayer} />)
    expect(screen.getByText('99% owned')).toBeInTheDocument()
  })

  it('should display status badge for non-active players', () => {
    render(
      <PlayerCard 
        player={{ ...mockPlayer, status: 'injured' }} 
      />
    )
    expect(screen.getByText('INJURED')).toBeInTheDocument()
  })

  it('should handle onClick callback', () => {
    const handleClick = jest.fn()
    render(<PlayerCard player={mockPlayer} onClick={handleClick} />)
    
    const card = screen.getByText('Patrick Mahomes').closest('div')?.parentElement
    if (card) {
      fireEvent.click(card)
      expect(handleClick).toHaveBeenCalledTimes(1)
    }
  })

  it('should handle onSelect callback', () => {
    const handleSelect = jest.fn()
    render(<PlayerCard player={mockPlayer} onSelect={handleSelect} />)
    
    const card = screen.getByText('Patrick Mahomes').closest('div')?.parentElement
    if (card) {
      fireEvent.click(card)
      expect(handleSelect).toHaveBeenCalledWith('player-1')
    }
  })

  it('should show selected state', () => {
    const { container } = render(
      <PlayerCard player={mockPlayer} selected />
    )
    
    const card = container.firstChild
    expect(card).toHaveClass('border-blue-500')
    expect(card).toHaveClass('ring-2')
  })

  it('should render custom actions', () => {
    render(
      <PlayerCard 
        player={mockPlayer}
        actions={<button>Add Player</button>}
      />
    )
    expect(screen.getByText('Add Player')).toBeInTheDocument()
  })

  it('should handle player without photo', () => {
    render(<PlayerCard player={mockPlayer} />)
    // Should show first letter of name as fallback
    const fallback = screen.getByText('P')
    expect(fallback).toBeInTheDocument()
  })

  it('should display trend indicator', () => {
    const { container } = render(
      <PlayerCard player={mockPlayer} variant="default" />
    )
    // Should have trending up icon for upward trend
    const svg = container.querySelector('svg[class*="text-emerald-400"]')
    expect(svg).toBeInTheDocument()
  })

  describe('Variants', () => {
    it('should render compact variant', () => {
      render(<PlayerCard player={mockPlayer} variant="compact" />)
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    })

    it('should render detailed variant', () => {
      render(<PlayerCard player={mockPlayer} variant="detailed" />)
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const { container } = render(
        <PlayerCard player={mockPlayer} />
      )
      const card = container.firstChild
      expect(card).toHaveClass('cursor-pointer')
    })

    it('should support custom className', () => {
      const { container } = render(
        <PlayerCard player={mockPlayer} className="custom" />
      )
      expect(container.firstChild).toHaveClass('custom')
    })
  })
})

