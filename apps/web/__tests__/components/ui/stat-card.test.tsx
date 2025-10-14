/**
 * StatCard Component Tests
 * Comprehensive test coverage for stat card component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatCard } from '@/components/ui/stat-card'
import { Trophy, Target } from 'lucide-react'

describe('StatCard Component', () => {
  const defaultProps = {
    label: 'Test Stat',
    value: '100',
  }

  it('should render label and value', () => {
    render(<StatCard {...defaultProps} />)
    expect(screen.getByText('Test Stat')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('should render with icon', () => {
    const { container } = render(
      <StatCard {...defaultProps} icon={Trophy} />
    )
    // Check if icon container exists
    const iconContainer = container.querySelector('.bg-slate-800\\/50')
    expect(iconContainer).toBeInTheDocument()
  })

  it('should display trend indicator when provided', () => {
    render(
      <StatCard 
        {...defaultProps} 
        trend="up" 
        trendValue="+15%" 
      />
    )
    expect(screen.getByText('+15%')).toBeInTheDocument()
  })

  it('should show up trend with green color', () => {
    const { container } = render(
      <StatCard {...defaultProps} trend="up" trendValue="+10%" />
    )
    const trendValue = screen.getByText('+10%')
    expect(trendValue).toHaveClass('text-emerald-400')
  })

  it('should show down trend with red color', () => {
    const { container } = render(
      <StatCard {...defaultProps} trend="down" trendValue="-5%" />
    )
    const trendValue = screen.getByText('-5%')
    expect(trendValue).toHaveClass('text-red-400')
  })

  it('should render description when provided', () => {
    render(
      <StatCard {...defaultProps} description="vs last week" />
    )
    expect(screen.getByText('vs last week')).toBeInTheDocument()
  })

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      const { container } = render(
        <StatCard {...defaultProps} variant="default" />
      )
      const card = container.firstChild
      expect(card).toHaveClass('from-slate-900')
    })

    it('should apply success variant styles', () => {
      const { container } = render(
        <StatCard {...defaultProps} variant="success" />
      )
      const card = container.firstChild
      expect(card).toHaveClass('from-emerald-950/50')
    })

    it('should apply warning variant styles', () => {
      const { container } = render(
        <StatCard {...defaultProps} variant="warning" />
      )
      const card = container.firstChild
      expect(card).toHaveClass('from-amber-950/50')
    })

    it('should apply danger variant styles', () => {
      const { container } = render(
        <StatCard {...defaultProps} variant="danger" />
      )
      const card = container.firstChild
      expect(card).toHaveClass('from-red-950/50')
    })

    it('should apply info variant styles', () => {
      const { container } = render(
        <StatCard {...defaultProps} variant="info" />
      )
      const card = container.firstChild
      expect(card).toHaveClass('from-blue-950/50')
    })
  })

  describe('Number Formatting', () => {
    it('should handle numeric values', () => {
      render(<StatCard label="Points" value={42} />)
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('should handle string values', () => {
      render(<StatCard label="Rank" value="#1" />)
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('should handle decimal values', () => {
      render(<StatCard label="Average" value="12.5" />)
      expect(screen.getByText('12.5')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <StatCard {...defaultProps} className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<StatCard {...defaultProps} ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Complex Scenarios', () => {
    it('should render complete stat card with all props', () => {
      render(
        <StatCard
          label="Total Points"
          value="245.6"
          icon={Target}
          trend="up"
          trendValue="+12.5%"
          description="vs last week"
          variant="success"
          className="custom-class"
        />
      )

      expect(screen.getByText('Total Points')).toBeInTheDocument()
      expect(screen.getByText('245.6')).toBeInTheDocument()
      expect(screen.getByText('+12.5%')).toBeInTheDocument()
      expect(screen.getByText('vs last week')).toBeInTheDocument()
    })

    it('should handle minimal props', () => {
      render(<StatCard label="Simple" value="10" />)
      expect(screen.getByText('Simple')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })
  })
})

