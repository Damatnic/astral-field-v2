/**
 * Button Component Tests
 * 
 * Comprehensive test suite for UI Button component
 * Demonstrates testing of styled components with variants
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<Button>Click me</Button>)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should render children correctly', () => {
      render(<Button>Test Button</Button>)
      
      expect(screen.getByText('Test Button')).toBeInTheDocument()
    })

    it('should render as a button element by default', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('should apply default variant classes', () => {
      render(<Button>Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
    })

    it('should apply default size classes', () => {
      render(<Button>Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
    })
  })

  describe('Variants', () => {
    it('should apply default variant', () => {
      render(<Button variant="default">Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
    })

    it('should apply destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
    })

    it('should apply outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
    })

    it('should apply secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary')
    })

    it('should apply ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('should apply link variant', () => {
      render(<Button variant="link">Link</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('underline-offset-4')
    })
  })

  describe('Sizes', () => {
    it('should apply default size', () => {
      render(<Button size="default">Default Size</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
    })

    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9')
    })

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11')
    })

    it('should apply icon size', () => {
      render(<Button size="icon">🔍</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
      expect(button).toHaveClass('w-10')
    })
  })

  describe('Custom Classes', () => {
    it('should accept custom className', () => {
      render(<Button className="custom-class">Custom</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('should merge custom classes with variant classes', () => {
      render(<Button variant="outline" className="custom-class">Custom</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
      expect(button).toHaveClass('border')
    })
  })

  describe('HTML Attributes', () => {
    it('should accept type attribute', () => {
      render(<Button type="submit">Submit</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('should accept disabled attribute', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled:opacity-50')
    })

    it('should accept aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Close dialog')
    })

    it('should accept data attributes', () => {
      render(<Button data-testid="custom-button">Test</Button>)
      
      const button = screen.getByTestId('custom-button')
      expect(button).toBeInTheDocument()
    })

    it('should accept id attribute', () => {
      render(<Button id="submit-btn">Submit</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('id', 'submit-btn')
    })
  })

  describe('User Interactions', () => {
    it('should handle click events', async () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not trigger click when disabled', async () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick} disabled>Click me</Button>)
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should handle double click', async () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      await userEvent.dblClick(button)
      
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('should handle keyboard events', async () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      await userEvent.keyboard('{Enter}')
      
      expect(handleClick).toHaveBeenCalled()
    })

    it('should handle space key', async () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      await userEvent.keyboard(' ')
      
      expect(handleClick).toHaveBeenCalled()
    })
  })

  describe('Ref Forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Button ref={ref}>Button</Button>)
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('should allow ref manipulation', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Button ref={ref}>Button</Button>)
      
      expect(ref.current?.tagName).toBe('BUTTON')
      expect(ref.current?.textContent).toBe('Button')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<Button>Accessible</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      
      expect(button).toHaveFocus()
    })

    it('should have proper focus styles', () => {
      render(<Button>Focus me</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:outline-none')
      expect(button).toHaveClass('focus-visible:ring-2')
    })

    it('should support aria-disabled', () => {
      render(<Button aria-disabled="true">Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })

    it('should have proper role', () => {
      render(<Button>Button</Button>)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Variant Combinations', () => {
    it('should combine variant and size', () => {
      render(<Button variant="outline" size="lg">Large Outline</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('h-11')
    })

    it('should combine destructive variant with small size', () => {
      render(<Button variant="destructive" size="sm">Delete</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
      expect(button).toHaveClass('h-9')
    })

    it('should combine ghost variant with icon size', () => {
      render(<Button variant="ghost" size="icon">×</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
      expect(button).toHaveClass('w-10')
    })
  })

  describe('Complex Children', () => {
    it('should render with icon and text', () => {
      render(
        <Button>
          <span>🔍</span>
          <span>Search</span>
        </Button>
      )
      
      expect(screen.getByText('🔍')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should render with nested elements', () => {
      render(
        <Button>
          <div>
            <span>Click</span>
            <strong>Here</strong>
          </div>
        </Button>
      )
      
      expect(screen.getByText('Click')).toBeInTheDocument()
      expect(screen.getByText('Here')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button></Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button.textContent).toBe('')
    })

    it('should handle null children', () => {
      render(<Button>{null}</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should handle undefined children', () => {
      render(<Button>{undefined}</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should handle very long text', () => {
      const longText = 'a'.repeat(1000)
      render(<Button>{longText}</Button>)
      
      const button = screen.getByRole('button')
      expect(button.textContent).toBe(longText)
    })

    it('should handle special characters', () => {
      render(<Button>{"<>&\"'"}</Button>)
      
      expect(screen.getByText('<>&"\'')).toBeInTheDocument()
    })
  })

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(Button.displayName).toBe('Button')
    })
  })

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = Date.now()
      render(<Button>Performance Test</Button>)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })

    it('should handle multiple renders efficiently', () => {
      const { rerender } = render(<Button>Initial</Button>)
      
      const start = Date.now()
      for (let i = 0; i < 10; i++) {
        rerender(<Button>Render {i}</Button>)
      }
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(500)
    })
  })

  describe('Form Integration', () => {
    it('should work in a form', () => {
      const handleSubmit = jest.fn((e) => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      )
      
      const button = screen.getByRole('button')
      button.click()
      
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('should support reset type', () => {
      render(<Button type="reset">Reset</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'reset')
    })

    it('should support button type', () => {
      render(<Button type="button">Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'button')
    })
  })
})
