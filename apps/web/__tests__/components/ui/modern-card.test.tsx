/**
 * ModernCard Component Tests
 * Comprehensive test coverage for the modern card component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { 
  ModernCard, 
  ModernCardHeader, 
  ModernCardTitle, 
  ModernCardDescription,
  ModernCardContent,
  ModernCardFooter
} from '@/components/ui/modern-card'

describe('ModernCard Component', () => {
  describe('ModernCard', () => {
    it('should render children correctly', () => {
      render(
        <ModernCard>
          <div>Test Content</div>
        </ModernCard>
      )
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should apply glass variant styles', () => {
      const { container } = render(
        <ModernCard variant="glass">Content</ModernCard>
      )
      const card = container.firstChild
      expect(card).toHaveClass('bg-slate-900/50')
      expect(card).toHaveClass('backdrop-blur-xl')
    })

    it('should apply solid variant styles', () => {
      const { container } = render(
        <ModernCard variant="solid">Content</ModernCard>
      )
      const card = container.firstChild
      expect(card).toHaveClass('bg-slate-900')
    })

    it('should apply gradient variant styles', () => {
      const { container } = render(
        <ModernCard variant="gradient">Content</ModernCard>
      )
      const card = container.firstChild
      expect(card).toHaveClass('bg-gradient-to-br')
    })

    it('should apply bordered variant styles', () => {
      const { container } = render(
        <ModernCard variant="bordered">Content</ModernCard>
      )
      const card = container.firstChild
      expect(card).toHaveClass('bg-slate-950')
    })

    it('should apply hover styles when hover is true', () => {
      const { container } = render(
        <ModernCard hover={true}>Content</ModernCard>
      )
      const card = container.firstChild
      expect(card).toHaveClass('hover:border-slate-700/70')
    })

    it('should not apply hover styles when hover is false', () => {
      const { container } = render(
        <ModernCard hover={false}>Content</ModernCard>
      )
      const card = container.firstChild
      expect(card).not.toHaveClass('hover:border-slate-700/70')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <ModernCard className="custom-class">Content</ModernCard>
      )
      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<ModernCard ref={ref}>Content</ModernCard>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('ModernCardHeader', () => {
    it('should render children correctly', () => {
      render(
        <ModernCardHeader>
          <div>Header Content</div>
        </ModernCardHeader>
      )
      expect(screen.getByText('Header Content')).toBeInTheDocument()
    })

    it('should apply correct padding styles', () => {
      const { container } = render(
        <ModernCardHeader>Content</ModernCardHeader>
      )
      expect(container.firstChild).toHaveClass('px-6')
      expect(container.firstChild).toHaveClass('py-5')
    })
  })

  describe('ModernCardTitle', () => {
    it('should render as h3 element', () => {
      render(<ModernCardTitle>Test Title</ModernCardTitle>)
      const title = screen.getByText('Test Title')
      expect(title.tagName).toBe('H3')
    })

    it('should apply correct text styles', () => {
      const { container } = render(
        <ModernCardTitle>Title</ModernCardTitle>
      )
      expect(container.firstChild).toHaveClass('text-xl')
      expect(container.firstChild).toHaveClass('font-semibold')
      expect(container.firstChild).toHaveClass('text-white')
    })
  })

  describe('ModernCardDescription', () => {
    it('should render description text', () => {
      render(
        <ModernCardDescription>Test Description</ModernCardDescription>
      )
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })

    it('should apply slate color', () => {
      const { container } = render(
        <ModernCardDescription>Description</ModernCardDescription>
      )
      expect(container.firstChild).toHaveClass('text-slate-400')
    })
  })

  describe('ModernCardContent', () => {
    it('should render content', () => {
      render(
        <ModernCardContent>
          <div>Card Content</div>
        </ModernCardContent>
      )
      expect(screen.getByText('Card Content')).toBeInTheDocument()
    })

    it('should apply correct padding', () => {
      const { container } = render(
        <ModernCardContent>Content</ModernCardContent>
      )
      expect(container.firstChild).toHaveClass('px-6')
      expect(container.firstChild).toHaveClass('pb-6')
    })
  })

  describe('ModernCardFooter', () => {
    it('should render footer content', () => {
      render(
        <ModernCardFooter>
          <div>Footer Content</div>
        </ModernCardFooter>
      )
      expect(screen.getByText('Footer Content')).toBeInTheDocument()
    })

    it('should apply border and background', () => {
      const { container } = render(
        <ModernCardFooter>Footer</ModernCardFooter>
      )
      expect(container.firstChild).toHaveClass('border-t')
      expect(container.firstChild).toHaveClass('bg-slate-900/30')
    })
  })

  describe('Composition', () => {
    it('should render full card structure', () => {
      render(
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle>Card Title</ModernCardTitle>
            <ModernCardDescription>Card Description</ModernCardDescription>
          </ModernCardHeader>
          <ModernCardContent>Card Content</ModernCardContent>
          <ModernCardFooter>Card Footer</ModernCardFooter>
        </ModernCard>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card Description')).toBeInTheDocument()
      expect(screen.getByText('Card Content')).toBeInTheDocument()
      expect(screen.getByText('Card Footer')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const { container } = render(
        <ModernCard tabIndex={0}>
          <ModernCardContent>Accessible Content</ModernCardContent>
        </ModernCard>
      )
      expect(container.firstChild).toHaveAttribute('tabIndex', '0')
    })

    it('should support ARIA attributes', () => {
      render(
        <ModernCard aria-label="Test Card">
          <ModernCardContent>Content</ModernCardContent>
        </ModernCard>
      )
      expect(screen.getByLabelText('Test Card')).toBeInTheDocument()
    })
  })
})

