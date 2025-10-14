/**
 * ActionButton Component Tests
 * Comprehensive test coverage for action button component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ActionButton } from '@/components/ui/action-button'
import { Plus, Check } from 'lucide-react'

describe('ActionButton Component', () => {
  describe('Basic Rendering', () => {
    it('should render button with text', () => {
      render(<ActionButton>Click Me</ActionButton>)
      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument()
    })

    it('should handle click events', () => {
      const handleClick = jest.fn()
      render(<ActionButton onClick={handleClick}>Click</ActionButton>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should be disabled when disabled prop is true', () => {
      render(<ActionButton disabled>Disabled</ActionButton>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should be disabled when loading is true', () => {
      render(<ActionButton loading>Loading</ActionButton>)
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Variants', () => {
    it('should apply primary variant styles', () => {
      const { container } = render(
        <ActionButton variant="primary">Primary</ActionButton>
      )
      const button = container.firstChild
      expect(button).toHaveClass('bg-blue-600')
    })

    it('should apply secondary variant styles', () => {
      const { container } = render(
        <ActionButton variant="secondary">Secondary</ActionButton>
      )
      const button = container.firstChild
      expect(button).toHaveClass('bg-slate-700')
    })

    it('should apply success variant styles', () => {
      const { container } = render(
        <ActionButton variant="success">Success</ActionButton>
      )
      const button = container.firstChild
      expect(button).toHaveClass('bg-emerald-600')
    })

    it('should apply danger variant styles', () => {
      const { container } = render(
        <ActionButton variant="danger">Danger</ActionButton>
      )
      const button = container.firstChild
      expect(button).toHaveClass('bg-red-600')
    })

    it('should apply ghost variant styles', () => {
      const { container } = render(
        <ActionButton variant="ghost">Ghost</ActionButton>
      )
      const button = container.firstChild
      expect(button).toHaveClass('bg-transparent')
    })

    it('should apply outline variant styles', () => {
      const { container } = render(
        <ActionButton variant="outline">Outline</ActionButton>
      )
      const button = container.firstChild
      expect(button).toHaveClass('bg-transparent')
    })
  })

  describe('Sizes', () => {
    it('should apply small size styles', () => {
      const { container } = render(
        <ActionButton size="sm">Small</ActionButton>
      )
      expect(container.firstChild).toHaveClass('h-8')
    })

    it('should apply medium size styles', () => {
      const { container } = render(
        <ActionButton size="md">Medium</ActionButton>
      )
      expect(container.firstChild).toHaveClass('h-10')
    })

    it('should apply large size styles', () => {
      const { container } = render(
        <ActionButton size="lg">Large</ActionButton>
      )
      expect(container.firstChild).toHaveClass('h-12')
    })
  })

  describe('Icons', () => {
    it('should render icon on left by default', () => {
      const { container } = render(
        <ActionButton icon={Plus}>With Icon</ActionButton>
      )
      // Icon should be in the button
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('should render icon on right when specified', () => {
      const { container } = render(
        <ActionButton icon={Plus} iconPosition="right">Icon Right</ActionButton>
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      const { container } = render(
        <ActionButton loading>Loading</ActionButton>
      )
      // Check for loader icon
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should hide content when loading', () => {
      render(<ActionButton loading>Hidden Content</ActionButton>)
      const content = screen.getByText('Hidden Content')
      expect(content.parentElement).toHaveClass('opacity-0')
    })

    it('should not trigger click when loading', () => {
      const handleClick = jest.fn()
      render(
        <ActionButton loading onClick={handleClick}>
          Loading Button
        </ActionButton>
      )
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Full Width', () => {
    it('should apply full width when fullWidth is true', () => {
      const { container } = render(
        <ActionButton fullWidth>Full Width</ActionButton>
      )
      expect(container.firstChild).toHaveClass('w-full')
    })

    it('should not apply full width by default', () => {
      const { container } = render(
        <ActionButton>Normal Width</ActionButton>
      )
      expect(container.firstChild).not.toHaveClass('w-full')
    })
  })

  describe('Accessibility', () => {
    it('should support custom className', () => {
      const { container } = render(
        <ActionButton className="custom-class">Button</ActionButton>
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<ActionButton ref={ref}>Button</ActionButton>)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('should apply opacity when disabled', () => {
      const { container } = render(
        <ActionButton disabled>Disabled</ActionButton>
      )
      expect(container.firstChild).toHaveClass('opacity-50')
    })
  })

  describe('Complex Scenarios', () => {
    it('should render button with all features', () => {
      const handleClick = jest.fn()
      
      render(
        <ActionButton
          variant="primary"
          size="lg"
          icon={Check}
          iconPosition="left"
          fullWidth
          onClick={handleClick}
          className="test-class"
        >
          Complete Button
        </ActionButton>
      )

      const button = screen.getByRole('button', { name: /Complete Button/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-blue-600')
      expect(button).toHaveClass('h-12')
      expect(button).toHaveClass('w-full')
      expect(button).toHaveClass('test-class')

      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })
})

