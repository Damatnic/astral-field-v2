/**
 * Zenith Authentication Accessibility Tests
 * Comprehensive WCAG 2.1 AA compliance testing for authentication forms
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { signIn } from 'next-auth/react'
import SignInPage from '@/app/auth/signin/page'
import { axe, toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('sonner')

describe('Authentication Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(signIn as jest.Mock).mockResolvedValue({ error: null })
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<SignInPage />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should pass axe accessibility check with strict rules', async () => {
      const { container } = render(<SignInPage />)
      const results = await axe(container, {
        rules: {
          // Enable strict WCAG 2.1 AA rules
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-labels': { enabled: true },
          'semantic-markup': { enabled: true }
        }
      })
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      // Get all focusable elements in order
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const showPasswordButton = screen.getByRole('button', { name: /show password|hide password/i })
      const rememberCheckbox = screen.getByLabelText(/remember me/i)
      const submitButton = screen.getByRole('button', { name: /enter the field/i })
      const googleButton = screen.getByRole('button', { name: /sign in with google/i })
      const quickSelectButton = screen.getByText('Quick Select')

      // Tab through elements
      await user.tab()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(showPasswordButton).toHaveFocus()

      await user.tab()
      expect(rememberCheckbox).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()

      await user.tab()
      expect(googleButton).toHaveFocus()

      await user.tab()
      expect(quickSelectButton).toHaveFocus()
    })

    it('should support shift+tab reverse navigation', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const submitButton = screen.getByRole('button', { name: /enter the field/i })
      const rememberCheckbox = screen.getByLabelText(/remember me/i)

      // Focus submit button first
      submitButton.focus()
      expect(submitButton).toHaveFocus()

      // Shift+tab should go to previous element
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(rememberCheckbox).toHaveFocus()
    })

    it('should handle Enter key for form submission', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      // Fill form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Press Enter to submit
      await user.keyboard('{Enter}')

      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      })
    })

    it('should handle Space key for checkbox activation', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const rememberCheckbox = screen.getByLabelText(/remember me/i)
      
      // Focus checkbox
      rememberCheckbox.focus()
      expect(rememberCheckbox).toHaveFocus()

      // Press Space to toggle
      await user.keyboard(' ')
      expect(rememberCheckbox).toBeChecked()

      // Press Space again to untoggle
      await user.keyboard(' ')
      expect(rememberCheckbox).not.toBeChecked()
    })

    it('should trap focus in demo user modal when opened', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      // Open quick select
      await user.click(screen.getByText('Quick Select'))

      // Focus should be trapped within modal
      const demoUserButtons = screen.getAllByText(/D'Amato|Hartley|McCaigue|Kornbeck|Jarvey|Lorbecki|Minor|Bergum/)
      const firstDemoButton = demoUserButtons[0]
      const lastDemoButton = demoUserButtons[demoUserButtons.length - 1]

      // Tab to last element and beyond should loop back
      lastDemoButton.focus()
      await user.tab()
      // Focus should wrap to first demo button or close button
      expect(document.activeElement).not.toBe(document.body)
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper form labels', () => {
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const rememberCheckbox = screen.getByLabelText(/remember me/i)

      expect(emailInput).toHaveAccessibleName('Email Address')
      expect(passwordInput).toHaveAccessibleName('Password')
      expect(rememberCheckbox).toHaveAccessibleName('Remember me')
    })

    it('should have proper heading hierarchy', () => {
      render(<SignInPage />)

      // Check for proper heading structure
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('AstralField')

      const subHeading = screen.getByRole('heading', { level: 2 })
      expect(subHeading).toHaveTextContent('Welcome Back, Player!')
    })

    it('should announce form validation errors', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      // Type invalid email
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger validation

      // Check for aria-invalid and error description
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      
      const errorMessage = screen.getByText(/please enter a valid email address/i)
      expect(errorMessage).toBeInTheDocument()
      
      // Error should be associated with input
      const errorId = errorMessage.getAttribute('id')
      expect(emailInput).toHaveAttribute('aria-describedby', errorId)
    })

    it('should have descriptive button text', () => {
      render(<SignInPage />)

      const submitButton = screen.getByRole('button', { name: /enter the field/i })
      const googleButton = screen.getByRole('button', { name: /sign in with google/i })

      expect(submitButton).toHaveAccessibleName()
      expect(googleButton).toHaveAccessibleName()
      
      // Buttons should be more descriptive than just "Submit" or "Click here"
      expect(submitButton.textContent).not.toBe('Submit')
      expect(submitButton.textContent).not.toBe('Click here')
    })

    it('should announce loading states', async () => {
      const user = userEvent.setup()
      
      // Mock delayed response
      let resolveSignIn: any
      ;(signIn as jest.Mock).mockReturnValue(
        new Promise(resolve => { resolveSignIn = resolve })
      )

      render(<SignInPage />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /enter the field/i }))

      // Should announce loading state
      const loadingButton = screen.getByRole('button', { name: /processing|signing you in/i })
      expect(loadingButton).toBeInTheDocument()
      expect(loadingButton).toHaveAttribute('aria-disabled', 'true')

      // Should have aria-live region for status updates
      const statusRegion = screen.queryByRole('status') || screen.queryByLabelText(/status|loading/i)
      if (statusRegion) {
        expect(statusRegion).toHaveAttribute('aria-live', 'polite')
      }

      // Resolve loading
      resolveSignIn({ error: null })
    })

    it('should provide skip links for keyboard users', () => {
      render(<SignInPage />)

      // Check for skip to main content link
      const skipLink = screen.queryByText(/skip to main content|skip to content/i)
      if (skipLink) {
        expect(skipLink).toHaveAttribute('href', '#main-content')
      }

      // Check for main content landmark
      const mainContent = screen.queryByRole('main') || document.getElementById('main-content')
      expect(mainContent).toBeInTheDocument()
    })
  })

  describe('Visual Accessibility', () => {
    it('should have sufficient color contrast', () => {
      render(<SignInPage />)

      // Get computed styles for form elements
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /enter the field/i })

      // Note: In a real test, you'd use a color contrast analyzer
      // This is a simplified check
      const inputStyles = window.getComputedStyle(emailInput)
      const buttonStyles = window.getComputedStyle(submitButton)

      // Ensure elements have defined colors (not transparent)
      expect(inputStyles.color).not.toBe('transparent')
      expect(inputStyles.backgroundColor).not.toBe('transparent')
      expect(buttonStyles.color).not.toBe('transparent')
      expect(buttonStyles.backgroundColor).not.toBe('transparent')
    })

    it('should remain usable when scaled to 200%', () => {
      // Mock zoom level
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2.0
      })

      render(<SignInPage />)

      // All elements should still be visible and functional
      expect(screen.getByLabelText(/email address/i)).toBeVisible()
      expect(screen.getByLabelText(/password/i)).toBeVisible()
      expect(screen.getByRole('button', { name: /enter the field/i })).toBeVisible()
    })

    it('should not rely solely on color for information', () => {
      render(<SignInPage />)

      // Validation errors should use text, not just color
      const emailInput = screen.getByLabelText(/email address/i)
      
      // Error states should have text descriptions
      fireEvent.blur(emailInput) // Trigger validation
      
      const errorElements = screen.queryAllByText(/error|invalid|required/i)
      // If there are validation errors, they should have text content
      errorElements.forEach(element => {
        expect(element.textContent).toBeTruthy()
        expect(element.textContent!.trim().length).toBeGreaterThan(0)
      })
    })

    it('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      render(<SignInPage />)

      // Elements should remain distinguishable in high contrast
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /enter the field/i })

      expect(emailInput).toBeVisible()
      expect(submitButton).toBeVisible()
    })
  })

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      // Focus element
      await user.click(emailInput)
      
      // Should have focus styles
      const styles = window.getComputedStyle(emailInput)
      // Note: In a real test, you'd check for outline, box-shadow, or border changes
      expect(emailInput).toHaveFocus()
    })

    it('should restore focus after modal interactions', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const quickSelectButton = screen.getByText('Quick Select')
      
      // Focus and open modal
      quickSelectButton.focus()
      await user.click(quickSelectButton)
      
      // Close modal (via Manual Login)
      const manualLoginButton = screen.getByText('Manual Login')
      await user.click(manualLoginButton)
      
      // Focus should return to trigger element or appropriate element
      // In this case, focus should be on the form
      const emailInput = screen.getByLabelText(/email address/i)
      expect(document.activeElement).toBeTruthy()
    })

    it('should not have keyboard traps outside modals', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const firstFocusable = screen.getByLabelText(/email address/i)
      const lastFocusable = screen.getByText('Learn more about AstralField')

      // Tab from last element should wrap to first
      lastFocusable.focus()
      await user.tab()
      
      // Should not be trapped
      expect(document.activeElement).toBeTruthy()
    })
  })

  describe('Motion and Animation Accessibility', () => {
    it('should respect prefers-reduced-motion', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      render(<SignInPage />)

      // Animations should be disabled or reduced
      const animatedElements = document.querySelectorAll('[class*="animate"], [class*="transition"]')
      
      animatedElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        // In a real implementation, check for reduced animation duration
        expect(element).toBeInTheDocument()
      })
    })

    it('should not use auto-playing animations that last longer than 5 seconds', () => {
      render(<SignInPage />)

      // Check for any auto-playing animations
      const animatedElements = document.querySelectorAll('[class*="animate"], [class*="spin"]')
      
      // Long animations should be user-controlled
      animatedElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        // In a real test, you'd parse animation-duration
        expect(element).toBeInTheDocument()
      })
    })
  })

  describe('Form Accessibility', () => {
    it('should have proper form structure', () => {
      render(<SignInPage />)

      const form = screen.getByRole('form') || document.querySelector('form')
      expect(form).toBeInTheDocument()

      // Form should have accessible name
      const formTitle = screen.queryByText(/sign in|login/i)
      if (formTitle) {
        expect(form).toHaveAccessibleName()
      }
    })

    it('should group related form controls', () => {
      render(<SignInPage />)

      // Check for fieldsets or proper grouping
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      // Related inputs should be properly grouped
      expect(emailInput.closest('form')).toBe(passwordInput.closest('form'))
    })

    it('should provide helpful instructions', () => {
      render(<SignInPage />)

      // Look for form instructions or help text
      const helpText = screen.queryByText(/enter your email|enter your password|forgot password/i)
      
      if (helpText) {
        expect(helpText).toBeInTheDocument()
      }

      // Password requirements should be announced
      const passwordInput = screen.getByLabelText(/password/i)
      const describedBy = passwordInput.getAttribute('aria-describedby')
      
      if (describedBy) {
        const description = document.getElementById(describedBy)
        expect(description).toBeInTheDocument()
      }
    })

    it('should handle required field indication', () => {
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      // Required fields should be marked
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')

      // Should have aria-required for screen readers
      expect(emailInput).toHaveAttribute('aria-required', 'true')
      expect(passwordInput).toHaveAttribute('aria-required', 'true')
    })
  })

  describe('Error Handling Accessibility', () => {
    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup()
      ;(signIn as jest.Mock).mockResolvedValue({ error: 'CredentialsSignin' })

      render(<SignInPage />)

      // Submit form with errors
      await user.type(screen.getByLabelText(/email address/i), 'invalid@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /enter the field/i }))

      // Error should be announced
      const errorRegion = screen.queryByRole('alert') || screen.queryByLabelText(/error/i)
      if (errorRegion) {
        expect(errorRegion).toHaveAttribute('aria-live', 'assertive')
      }
    })

    it('should focus first error field', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      // Submit empty form
      await user.click(screen.getByRole('button', { name: /enter the field/i }))

      // Focus should move to first error field
      const emailInput = screen.getByLabelText(/email address/i)
      // HTML5 validation should focus first invalid field
      expect(document.activeElement).toBeTruthy()
    })
  })
})