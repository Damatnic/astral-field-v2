/**
 * Badge Component Tests
 * 
 * Comprehensive test suite for UI Badge component
 * Demonstrates testing of variant-based badge components
 */

import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<Badge>Badge text</Badge>)
      
      expect(screen.getByText('Badge text')).toBeInTheDocument()
    })

    it('should render as a div element', () => {
      const { container } = render(<Badge>Badge</Badge>)
      
      const badge = container.firstChild
      expect(badge?.nodeName).toBe('DIV')
    })

    it('should render children correctly', () => {
      render(<Badge>Test Badge</Badge>)
      
      expect(screen.getByText('Test Badge')).toBeInTheDocument()
    })

    it('should apply default variant classes', () => {
      const { container } = render(<Badge>Default</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-primary')
    })

    it('should apply base classes', () => {
      const { container } = render(<Badge>Badge</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('inline-flex')
      expect(badge).toHaveClass('items-center')
      expect(badge).toHaveClass('rounded-full')
      expect(badge).toHaveClass('text-xs')
    })
  })

  describe('Variants', () => {
    it('should apply default variant', () => {
      const { container } = render(<Badge variant="default">Default</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-primary')
      expect(badge).toHaveClass('text-primary-foreground')
    })

    it('should apply secondary variant', () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-secondary')
      expect(badge).toHaveClass('text-secondary-foreground')
    })

    it('should apply destructive variant', () => {
      const { container } = render(<Badge variant="destructive">Destructive</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-destructive')
      expect(badge).toHaveClass('text-destructive-foreground')
    })

    it('should apply outline variant', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('text-foreground')
    })

    it('should apply success variant', () => {
      const { container } = render(<Badge variant="success">Success</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-green-500')
      expect(badge).toHaveClass('text-white')
    })

    it('should apply warning variant', () => {
      const { container } = render(<Badge variant="warning">Warning</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-yellow-500')
      expect(badge).toHaveClass('text-white')
    })
  })

  describe('Custom Classes', () => {
    it('should accept custom className', () => {
      const { container } = render(<Badge className="custom-class">Badge</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('custom-class')
    })

    it('should merge custom classes with variant classes', () => {
      const { container } = render(
        <Badge variant="success" className="custom-class">Badge</Badge>
      )
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('custom-class')
      expect(badge).toHaveClass('bg-green-500')
    })
  })

  describe('HTML Attributes', () => {
    it('should accept id attribute', () => {
      const { container } = render(<Badge id="test-badge">Badge</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveAttribute('id', 'test-badge')
    })

    it('should accept data attributes', () => {
      const { container } = render(<Badge data-testid="badge">Badge</Badge>)
      
      const badge = screen.getByTestId('badge')
      expect(badge).toBeInTheDocument()
    })

    it('should accept aria-label', () => {
      const { container } = render(<Badge aria-label="Status badge">New</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveAttribute('aria-label', 'Status badge')
    })

    it('should accept role attribute', () => {
      const { container } = render(<Badge role="status">Active</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveAttribute('role', 'status')
    })

    it('should accept onClick handler', () => {
      const handleClick = jest.fn()
      const { container } = render(<Badge onClick={handleClick}>Clickable</Badge>)
      
      const badge = container.firstChild as HTMLElement
      badge.click()
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Content Types', () => {
    it('should render text content', () => {
      render(<Badge>Text Badge</Badge>)
      
      expect(screen.getByText('Text Badge')).toBeInTheDocument()
    })

    it('should render number content', () => {
      render(<Badge>42</Badge>)
      
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('should render with icon and text', () => {
      render(
        <Badge>
          <span>✓</span>
          <span>Verified</span>
        </Badge>
      )
      
      expect(screen.getByText('✓')).toBeInTheDocument()
      expect(screen.getByText('Verified')).toBeInTheDocument()
    })

    it('should render with nested elements', () => {
      render(
        <Badge>
          <strong>Bold</strong> text
        </Badge>
      )
      
      expect(screen.getByText('Bold')).toBeInTheDocument()
      expect(screen.getByText(/text/)).toBeInTheDocument()
    })

    it('should render emoji content', () => {
      render(<Badge>🎉</Badge>)
      
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should support aria-live for status updates', () => {
      const { container } = render(<Badge aria-live="polite">Status</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveAttribute('aria-live', 'polite')
    })

    it('should support aria-describedby', () => {
      const { container } = render(<Badge aria-describedby="desc">Badge</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveAttribute('aria-describedby', 'desc')
    })

    it('should be keyboard accessible when clickable', () => {
      const handleClick = jest.fn()
      const { container } = render(
        <Badge onClick={handleClick} tabIndex={0}>Clickable</Badge>
      )
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const { container } = render(<Badge></Badge>)
      
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle null children', () => {
      const { container } = render(<Badge>{null}</Badge>)
      
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle undefined children', () => {
      const { container } = render(<Badge>{undefined}</Badge>)
      
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should handle very long text', () => {
      const longText = 'a'.repeat(100)
      render(<Badge>{longText}</Badge>)
      
      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it('should handle special characters', () => {
      render(<Badge>{"<>&\"'"}</Badge>)
      
      expect(screen.getByText('<>&"\'')).toBeInTheDocument()
    })

    it('should handle zero as content', () => {
      render(<Badge>0</Badge>)
      
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should handle false as content', () => {
      render(<Badge>{false}</Badge>)
      
      const { container } = render(<Badge>{false}</Badge>)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Use Cases', () => {
    it('should work as status indicator', () => {
      render(<Badge variant="success">Active</Badge>)
      
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should work as notification count', () => {
      render(<Badge variant="destructive">5</Badge>)
      
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should work as category tag', () => {
      render(<Badge variant="secondary">JavaScript</Badge>)
      
      expect(screen.getByText('JavaScript')).toBeInTheDocument()
    })

    it('should work as warning indicator', () => {
      render(<Badge variant="warning">Pending</Badge>)
      
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('should work in a list of badges', () => {
      render(
        <div>
          <Badge variant="success">Approved</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="destructive">Rejected</Badge>
        </div>
      )
      
      expect(screen.getByText('Approved')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have transition classes', () => {
      const { container } = render(<Badge>Badge</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('transition-colors')
    })

    it('should have focus styles', () => {
      const { container } = render(<Badge>Badge</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('focus:outline-none')
      expect(badge).toHaveClass('focus:ring-2')
    })

    it('should have proper padding', () => {
      const { container } = render(<Badge>Badge</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('px-2.5')
      expect(badge).toHaveClass('py-0.5')
    })

    it('should have rounded corners', () => {
      const { container } = render(<Badge>Badge</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('rounded-full')
    })

    it('should have border', () => {
      const { container } = render(<Badge>Badge</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('border')
    })
  })

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = Date.now()
      render(<Badge>Performance Test</Badge>)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })

    it('should handle multiple badges efficiently', () => {
      const start = Date.now()
      render(
        <>
          {Array.from({ length: 50 }, (_, i) => (
            <Badge key={i}>Badge {i}</Badge>
          ))}
        </>
      )
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(500)
    })
  })

  describe('Variant Combinations', () => {
    it('should combine variant with custom class', () => {
      const { container } = render(
        <Badge variant="success" className="text-lg">Large Success</Badge>
      )
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-green-500')
      expect(badge).toHaveClass('text-lg')
    })

    it('should override styles with custom classes', () => {
      const { container } = render(
        <Badge variant="default" className="bg-purple-500">Custom</Badge>
      )
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-purple-500')
    })
  })

  describe('Interactive Badges', () => {
    it('should handle hover state', () => {
      const { container } = render(<Badge variant="default">Hover me</Badge>)
      
      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('hover:bg-primary/80')
    })

    it('should handle click events', () => {
      const handleClick = jest.fn()
      const { container } = render(<Badge onClick={handleClick}>Click me</Badge>)
      
      const badge = container.firstChild as HTMLElement
      badge.click()
      
      expect(handleClick).toHaveBeenCalled()
    })

    it('should handle double click', () => {
      const handleDoubleClick = jest.fn()
      const { container } = render(<Badge onDoubleClick={handleDoubleClick}>Double click</Badge>)
      
      const badge = container.firstChild as HTMLElement
      badge.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      
      expect(handleDoubleClick).toHaveBeenCalled()
    })
  })

  describe('Conditional Rendering', () => {
    it('should render conditionally based on props', () => {
      const { rerender } = render(<Badge>Visible</Badge>)
      
      expect(screen.getByText('Visible')).toBeInTheDocument()
      
      rerender(<></>)
      
      expect(screen.queryByText('Visible')).not.toBeInTheDocument()
    })

    it('should change variant dynamically', () => {
      const { container, rerender } = render(<Badge variant="success">Status</Badge>)
      
      let badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-green-500')
      
      rerender(<Badge variant="destructive">Status</Badge>)
      
      badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-destructive')
    })
  })
})
