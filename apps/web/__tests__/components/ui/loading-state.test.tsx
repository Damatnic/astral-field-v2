/**
 * LoadingState Component Tests
 * Comprehensive test coverage for loading state component
 */

import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LoadingState } from '@/components/ui/loading-state'

describe('LoadingState Component', () => {
  describe('Variants', () => {
    it('should render card variant', () => {
      const { container } = render(<LoadingState variant="card" count={3} />)
      // Should render 3 card skeletons
      const skeletons = container.querySelectorAll('.border-slate-800')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should render stats variant', () => {
      const { container } = render(<LoadingState variant="stats" count={4} />)
      expect(container.firstChild).toHaveClass('grid')
    })

    it('should render table variant', () => {
      const { container } = render(<LoadingState variant="table" />)
      // Should have header and rows
      const rows = container.querySelectorAll('.border-b')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('should render list variant', () => {
      const { container } = render(<LoadingState variant="list" />)
      const items = container.querySelectorAll('.rounded-lg')
      expect(items.length).toBeGreaterThan(0)
    })

    it('should render player variant', () => {
      const { container } = render(<LoadingState variant="player" count={2} />)
      // Should render player card skeletons
      const skeletons = container.querySelectorAll('.border-slate-800')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Count', () => {
    it('should render correct number of skeletons', () => {
      const { container } = render(<LoadingState variant="card" count={5} />)
      const cards = container.querySelectorAll('.border-slate-800')
      expect(cards.length).toBe(5)
    })

    it('should default to 1 skeleton', () => {
      const { container } = render(<LoadingState variant="card" />)
      const cards = container.querySelectorAll('.border-slate-800')
      expect(cards.length).toBe(1)
    })
  })

  describe('Layout', () => {
    it('should apply grid layout for stats variant', () => {
      const { container } = render(<LoadingState variant="stats" count={4} />)
      expect(container.firstChild).toHaveClass('grid')
      expect(container.firstChild).toHaveClass('grid-cols-1')
    })

    it('should apply grid layout for card variant', () => {
      const { container } = render(<LoadingState variant="card" count={3} />)
      expect(container.firstChild).toHaveClass('grid')
    })

    it('should not use grid for table variant', () => {
      const { container } = render(<LoadingState variant="table" />)
      expect(container.firstChild).not.toHaveClass('grid')
    })
  })

  describe('Accessibility', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <LoadingState variant="card" className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<LoadingState variant="card" ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should have fade-in animation', () => {
      const { container } = render(<LoadingState variant="card" />)
      expect(container.firstChild).toHaveClass('animate-in')
      expect(container.firstChild).toHaveClass('fade-in')
    })
  })

  describe('Skeleton Animation', () => {
    it('should render shimmer effect', () => {
      const { container } = render(<LoadingState variant="card" />)
      // Check for gradient shimmer elements
      const gradients = container.querySelectorAll('.bg-gradient-to-r')
      expect(gradients.length).toBeGreaterThan(0)
    })
  })
})

