/**
 * EmptyState Component Tests
 * Comprehensive test coverage for empty state component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Plus } from 'lucide-react'

describe('EmptyState Component', () => {
  it('should render title', () => {
    render(<EmptyState title="No Data Found" />)
    expect(screen.getByText('No Data Found')).toBeInTheDocument()
  })

  it('should render description when provided', () => {
    render(
      <EmptyState 
        title="No Data" 
        description="Try adjusting your filters" 
      />
    )
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
  })

  it('should render icon when provided', () => {
    const { container } = render(
      <EmptyState title="Empty" icon={Users} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render primary action button', () => {
    const handleClick = jest.fn()
    render(
      <EmptyState 
        title="No Data"
        action={{
          label: 'Add Item',
          onClick: handleClick,
        }}
      />
    )
    
    const button = screen.getByText('Add Item')
    expect(button).toBeInTheDocument()
    
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should render primary action with icon', () => {
    render(
      <EmptyState 
        title="No Data"
        action={{
          label: 'Add Item',
          onClick: jest.fn(),
          icon: Plus,
        }}
      />
    )
    
    expect(screen.getByText('Add Item')).toBeInTheDocument()
  })

  it('should render secondary action', () => {
    const handleSecondary = jest.fn()
    render(
      <EmptyState 
        title="No Data"
        action={{
          label: 'Primary',
          onClick: jest.fn(),
        }}
        secondaryAction={{
          label: 'Secondary',
          onClick: handleSecondary,
        }}
      />
    )
    
    const button = screen.getByText('Secondary')
    expect(button).toBeInTheDocument()
    
    fireEvent.click(button)
    expect(handleSecondary).toHaveBeenCalledTimes(1)
  })

  it('should apply custom className', () => {
    const { container } = render(
      <EmptyState title="Test" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<EmptyState title="Test" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  describe('Complete Empty State', () => {
    it('should render with all features', () => {
      const handlePrimary = jest.fn()
      const handleSecondary = jest.fn()

      render(
        <EmptyState
          icon={Users}
          title="No Players Found"
          description="Try adjusting your search or filters"
          action={{
            label: 'Clear Filters',
            onClick: handlePrimary,
            icon: Plus,
          }}
          secondaryAction={{
            label: 'View All',
            onClick: handleSecondary,
          }}
          className="test-empty-state"
        />
      )

      expect(screen.getByText('No Players Found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument()
      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
      expect(screen.getByText('View All')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Clear Filters'))
      expect(handlePrimary).toHaveBeenCalled()

      fireEvent.click(screen.getByText('View All'))
      expect(handleSecondary).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<EmptyState title="Empty State" />)
      const heading = screen.getByText('Empty State')
      expect(heading.tagName).toBe('H3')
    })

    it('should center content', () => {
      const { container } = render(<EmptyState title="Test" />)
      expect(container.firstChild).toHaveClass('text-center')
    })
  })
})

