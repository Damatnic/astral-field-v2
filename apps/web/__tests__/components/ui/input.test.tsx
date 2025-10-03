/**
 * Input Component Tests
 * 
 * Comprehensive test suite for UI Input component
 * Demonstrates testing of form input components with variants
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'
import React from 'react'

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<Input />)
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should render as an input element', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input.tagName).toBe('INPUT')
    })

    it('should apply default variant classes', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-slate-600')
      expect(input).toHaveClass('bg-slate-800')
    })

    it('should apply default size classes', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('h-10')
    })

    it('should have default type text', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'text')
    })
  })

  describe('Variants', () => {
    it('should apply default variant', () => {
      render(<Input variant="default" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('bg-slate-800')
    })

    it('should apply outline variant', () => {
      render(<Input variant="outline" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('bg-transparent')
    })

    it('should apply ghost variant', () => {
      render(<Input variant="ghost" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('bg-slate-800/50')
    })
  })

  describe('Sizes', () => {
    it('should apply default size', () => {
      render(<Input size="default" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('h-10')
    })

    it('should apply small size', () => {
      render(<Input size="sm" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('h-9')
    })

    it('should apply large size', () => {
      render(<Input size="lg" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('h-11')
    })
  })

  describe('Input Types', () => {
    it('should accept text type', () => {
      render(<Input type="text" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should accept email type', () => {
      render(<Input type="email" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('should accept password type', () => {
      render(<Input type="password" />)
      
      const input = document.querySelector('input[type="password"]')
      expect(input).toBeInTheDocument()
    })

    it('should accept number type', () => {
      render(<Input type="number" />)
      
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('should accept tel type', () => {
      render(<Input type="tel" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'tel')
    })

    it('should accept url type', () => {
      render(<Input type="url" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'url')
    })

    it('should accept search type', () => {
      render(<Input type="search" />)
      
      const input = screen.getByRole('searchbox')
      expect(input).toHaveAttribute('type', 'search')
    })
  })

  describe('HTML Attributes', () => {
    it('should accept placeholder', () => {
      render(<Input placeholder="Enter text..." />)
      
      const input = screen.getByPlaceholderText('Enter text...')
      expect(input).toBeInTheDocument()
    })

    it('should accept value', () => {
      render(<Input value="test value" readOnly />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('test value')
    })

    it('should accept disabled attribute', () => {
      render(<Input disabled />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('should apply disabled styles', () => {
      render(<Input disabled />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('disabled:opacity-50')
      expect(input).toHaveClass('disabled:cursor-not-allowed')
    })

    it('should accept readOnly attribute', () => {
      render(<Input readOnly />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('readOnly')
    })

    it('should accept required attribute', () => {
      render(<Input required />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeRequired()
    })

    it('should accept name attribute', () => {
      render(<Input name="username" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('name', 'username')
    })

    it('should accept id attribute', () => {
      render(<Input id="email-input" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('id', 'email-input')
    })

    it('should accept aria-label', () => {
      render(<Input aria-label="Search field" />)
      
      const input = screen.getByLabelText('Search field')
      expect(input).toBeInTheDocument()
    })

    it('should accept maxLength', () => {
      render(<Input maxLength={10} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('maxLength', '10')
    })

    it('should accept minLength', () => {
      render(<Input minLength={3} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('minLength', '3')
    })

    it('should accept pattern', () => {
      render(<Input pattern="[0-9]*" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('pattern', '[0-9]*')
    })

    it('should accept autoComplete', () => {
      render(<Input autoComplete="email" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('autoComplete', 'email')
    })

    it('should accept autoFocus', () => {
      render(<Input autoFocus />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveFocus()
    })
  })

  describe('User Interactions', () => {
    it('should handle text input', async () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Hello World')
      
      expect(input).toHaveValue('Hello World')
    })

    it('should handle onChange events', async () => {
      const handleChange = jest.fn()
      render(<Input onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')
      
      expect(handleChange).toHaveBeenCalled()
    })

    it('should handle onFocus events', async () => {
      const handleFocus = jest.fn()
      render(<Input onFocus={handleFocus} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      
      expect(handleFocus).toHaveBeenCalled()
    })

    it('should handle onBlur events', async () => {
      const handleBlur = jest.fn()
      render(<Input onBlur={handleBlur} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.tab()
      
      expect(handleBlur).toHaveBeenCalled()
    })

    it('should handle onKeyDown events', async () => {
      const handleKeyDown = jest.fn()
      render(<Input onKeyDown={handleKeyDown} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'a')
      
      expect(handleKeyDown).toHaveBeenCalled()
    })

    it('should not accept input when disabled', async () => {
      render(<Input disabled />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')
      
      expect(input).toHaveValue('')
    })

    it('should not accept input when readOnly', async () => {
      render(<Input readOnly value="" />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')
      
      expect(input).toHaveValue('')
    })

    it('should handle clear/delete', async () => {
      render(<Input defaultValue="test" />)
      
      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      
      expect(input).toHaveValue('')
    })

    it('should handle paste events', async () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.paste('pasted text')
      
      expect(input).toHaveValue('pasted text')
    })
  })

  describe('Ref Forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Input ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    it('should allow ref manipulation', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Input ref={ref} />)
      
      expect(ref.current?.tagName).toBe('INPUT')
      ref.current?.focus()
      expect(ref.current).toHaveFocus()
    })
  })

  describe('Custom Classes', () => {
    it('should accept custom className', () => {
      render(<Input className="custom-class" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-class')
    })

    it('should merge custom classes with variant classes', () => {
      render(<Input variant="outline" className="custom-class" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-class')
      expect(input).toHaveClass('bg-transparent')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      input.focus()
      
      expect(input).toHaveFocus()
    })

    it('should have proper focus styles', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('focus-visible:outline-none')
      expect(input).toHaveClass('focus-visible:ring-2')
    })

    it('should support aria-describedby', () => {
      render(<Input aria-describedby="error-message" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'error-message')
    })

    it('should support aria-invalid', () => {
      render(<Input aria-invalid="true" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Variant Combinations', () => {
    it('should combine variant and size', () => {
      render(<Input variant="outline" size="lg" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('bg-transparent')
      expect(input).toHaveClass('h-11')
    })

    it('should combine ghost variant with small size', () => {
      render(<Input variant="ghost" size="sm" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('bg-slate-800/50')
      expect(input).toHaveClass('h-9')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long values', () => {
      const longValue = 'a'.repeat(1000)
      render(<Input value={longValue} readOnly />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue(longValue)
    })

    it('should handle special characters', () => {
      render(<Input value="<>&\"'" readOnly />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('<>&"\'')
    })

    it('should handle empty value', () => {
      render(<Input value="" readOnly />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('')
    })

    it('should handle null placeholder', () => {
      render(<Input placeholder={undefined} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(Input.displayName).toBe('Input')
    })
  })

  describe('Form Integration', () => {
    it('should work in a form', () => {
      const handleSubmit = jest.fn((e) => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <Input name="username" />
          <button type="submit">Submit</button>
        </form>
      )
      
      const button = screen.getByRole('button')
      button.click()
      
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('should submit form value', async () => {
      const handleSubmit = jest.fn((e) => {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)
        return formData.get('username')
      })
      
      render(
        <form onSubmit={handleSubmit}>
          <Input name="username" />
          <button type="submit">Submit</button>
        </form>
      )
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'testuser')
      
      const button = screen.getByRole('button')
      button.click()
      
      expect(handleSubmit).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = Date.now()
      render(<Input />)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })

    it('should handle rapid input efficiently', async () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      const start = Date.now()
      
      await userEvent.type(input, 'a'.repeat(100))
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(2000)
    })
  })

  describe('Number Input Specific', () => {
    it('should handle number input', async () => {
      render(<Input type="number" />)
      
      const input = screen.getByRole('spinbutton')
      await userEvent.type(input, '123')
      
      expect(input).toHaveValue(123)
    })

    it('should accept min and max for number input', () => {
      render(<Input type="number" min={0} max={100} />)
      
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '100')
    })

    it('should accept step for number input', () => {
      render(<Input type="number" step={0.1} />)
      
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('step', '0.1')
    })
  })
})
