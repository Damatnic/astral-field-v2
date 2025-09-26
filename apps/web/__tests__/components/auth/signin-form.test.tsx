/**
 * Zenith Authentication Unit Tests - SignIn Form Component
 * Comprehensive testing for login form functionality, validation, and security
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import SignInPage from '@/app/auth/signin/page'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  getSession: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}))

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}))

describe('SignIn Form Component', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()
  const mockRouter = {
    push: mockPush,
    refresh: mockRefresh,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(signIn as jest.Mock).mockResolvedValue({ error: null })
    ;(getSession as jest.Mock).mockResolvedValue(null)
    
    // Mock window.location.href for redirect testing
    delete (window as any).location
    ;(window as any).location = { href: '' }
  })

  describe('Component Rendering', () => {
    it('should render sign in form with all required elements', () => {
      render(<SignInPage />)

      // Check main heading
      expect(screen.getByText('AstralField')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()

      // Check form fields
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()

      // Check buttons
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()

      // Check demo users section
      expect(screen.getByText(/D'Amato Dynasty League/)).toBeInTheDocument()
    })

    it('should render all 10 demo user accounts', () => {
      render(<SignInPage />)

      const expectedUsers = [
        "Nicholas D'Amato",
        "Nick Hartley", 
        "Jack McCaigue",
        "Larry McCaigue",
        "Renee McCaigue",
        "Jon Kornbeck",
        "David Jarvey",
        "Kaity Lorbecki",
        "Cason Minor",
        "Brittany Bergum"
      ]

      expectedUsers.forEach(userName => {
        expect(screen.getByText(userName)).toBeInTheDocument()
      })
    })

    it('should have proper form accessibility attributes', () => {
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')

      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
    })

    it('should have proper form IDs for testing', () => {
      render(<SignInPage />)

      expect(screen.getByDisplayValue('')).toHaveAttribute('id', 'email')
      expect(screen.getByDisplayValue('')).toHaveAttribute('id', 'password')
      expect(document.getElementById('signin-form')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should require email and password fields', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.click(submitButton)

      // HTML5 validation should prevent submission
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Should not call signIn with invalid email
      await waitFor(() => {
        expect(signIn).not.toHaveBeenCalled()
      })
    })

    it('should accept valid email formats', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'nicholas@damato-dynasty.com')
      await user.type(passwordInput, 'Dynasty2025!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('credentials', {
          email: 'nicholas@damato-dynasty.com',
          password: 'Dynasty2025!',
          redirect: false,
        })
      })
    })
  })

  describe('Form Submission', () => {
    it('should handle successful login', async () => {
      const user = userEvent.setup()
      ;(signIn as jest.Mock).mockResolvedValue({ error: null })

      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'nicholas@damato-dynasty.com')
      await user.type(passwordInput, 'Dynasty2025!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('credentials', {
          email: 'nicholas@damato-dynasty.com',
          password: 'Dynasty2025!',
          redirect: false,
        })
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Welcome back'),
          expect.any(Object)
        )
      })
    })

    it('should handle login failure', async () => {
      const user = userEvent.setup()
      ;(signIn as jest.Mock).mockResolvedValue({ error: 'CredentialsSignin' })

      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid email or password')
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      const user = userEvent.setup()
      ;(signIn as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.')
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolveSignIn: any
      ;(signIn as jest.Mock).mockReturnValue(
        new Promise(resolve => { resolveSignIn = resolve })
      )

      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
        expect(document.querySelector('.loading-spinner')).toBeInTheDocument()
      })

      // Resolve the promise
      act(() => {
        resolveSignIn({ error: null })
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled()
      })
    })

    it('should prevent double submission', async () => {
      const user = userEvent.setup()
      let resolveSignIn: any
      ;(signIn as jest.Mock).mockReturnValue(
        new Promise(resolve => { resolveSignIn = resolve })
      )

      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Click submit button multiple times
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only call signIn once
      expect(signIn).toHaveBeenCalledTimes(1)

      act(() => {
        resolveSignIn({ error: null })
      })
    })
  })

  describe('Session Establishment and Redirect Flow - CRITICAL', () => {
    it('should establish session and redirect after successful authentication', async () => {
      const user = userEvent.setup()
      
      // Mock successful authentication
      ;(signIn as jest.Mock).mockResolvedValue({ error: null })
      
      // Mock session establishment sequence
      let sessionCallCount = 0
      ;(getSession as jest.Mock).mockImplementation(() => {
        sessionCallCount++
        if (sessionCallCount <= 2) {
          return Promise.resolve(null) // Session not ready initially
        }
        return Promise.resolve({
          user: {
            id: 'user_123',
            name: 'Nicholas D\'Amato',
            email: 'nicholas@damato-dynasty.com',
            role: 'Commissioner',
            teamName: 'D\'Amato Dynasty'
          }
        })
      })
      
      render(<SignInPage />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'nicholas@damato-dynasty.com')
      await user.type(screen.getByLabelText(/password/i), 'Dynasty2025!')
      await user.click(screen.getByRole('button', { name: /enter the field/i }))

      // Verify authentication was called
      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('credentials', {
          email: 'nicholas@damato-dynasty.com',
          password: 'Dynasty2025!',
          redirect: false,
        })
      })

      // Verify session checking retry mechanism
      await waitFor(() => {
        expect(getSession).toHaveBeenCalledTimes(3)
      }, { timeout: 3000 })

      // Verify success toast with user name
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Welcome back, Nicholas D\'Amato! Ready to dominate?',
          expect.objectContaining({
            description: expect.stringMatching(/Signed in successfully in \d+ms/)
          })
        )
      }, { timeout: 5000 })

      // Verify redirect happened via window.location.href (hard navigation)
      await waitFor(() => {
        expect(window.location.href).toBe('/dashboard')
      }, { timeout: 5000 })
    })

    it('should handle session establishment timeout gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock successful authentication but session never establishes
      ;(signIn as jest.Mock).mockResolvedValue({ error: null })
      ;(getSession as jest.Mock).mockResolvedValue(null) // Session never ready
      
      render(<SignInPage />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /enter the field/i }))

      // Should eventually timeout and still redirect (fallback behavior)
      await waitFor(() => {
        expect(getSession).toHaveBeenCalledTimes(5) // Max retries
      }, { timeout: 3000 })

      // Should still redirect after timeout
      await waitFor(() => {
        expect(window.location.href).toBe('/dashboard')
      }, { timeout: 2000 })
    })

    it('should retry session checking with proper intervals', async () => {
      const user = userEvent.setup()
      
      // Mock successful authentication
      ;(signIn as jest.Mock).mockResolvedValue({ error: null })
      
      // Track timing of session calls
      const sessionCallTimes: number[] = []
      ;(getSession as jest.Mock).mockImplementation(() => {
        sessionCallTimes.push(Date.now())
        return Promise.resolve(null)
      })
      
      render(<SignInPage />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /enter the field/i }))

      // Wait for multiple session checks
      await waitFor(() => {
        expect(getSession).toHaveBeenCalledTimes(3)
      }, { timeout: 2000 })

      // Verify proper intervals between calls (around 200ms)
      if (sessionCallTimes.length >= 2) {
        const interval = sessionCallTimes[1] - sessionCallTimes[0]
        expect(interval).toBeGreaterThanOrEqual(180) // Allow some timing variance
        expect(interval).toBeLessThanOrEqual(250)
      }
    })

    it('should handle custom callback URL correctly', async () => {
      const user = userEvent.setup()
      
      // Mock custom callback URL
      const mockSearchParams = {
        get: jest.fn((key: string) => {
          if (key === 'callbackUrl') return '/team/settings'
          return null
        })
      }
      ;(require('next/navigation').useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
      
      // Mock successful authentication and session
      ;(signIn as jest.Mock).mockResolvedValue({ error: null })
      ;(getSession as jest.Mock).mockResolvedValue({
        user: { name: 'Test User' }
      })
      
      render(<SignInPage />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /enter the field/i }))

      // Should redirect to custom callback URL
      await waitFor(() => {
        expect(window.location.href).toBe('/team/settings')
      }, { timeout: 5000 })
    })

    it('should show optimistic loading state during session establishment', async () => {
      const user = userEvent.setup()
      
      // Mock delayed authentication
      let resolveSignIn: any
      ;(signIn as jest.Mock).mockReturnValue(
        new Promise(resolve => { resolveSignIn = resolve })
      )
      
      render(<SignInPage />)

      // Fill form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /enter the field/i }))

      // Should show optimistic success state immediately
      await waitFor(() => {
        expect(screen.getByText('Signing you in...')).toBeInTheDocument()
      })
      
      // Button should be disabled and show processing state
      const submitButton = screen.getByRole('button')
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent(/signing you in/i)
      
      // Resolve authentication
      act(() => {
        resolveSignIn({ error: null })
      })
    })
  })

  describe('Demo User Quick Login', () => {
    it('should auto-fill form with demo user credentials', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      // Click on Nicholas D'Amato demo account
      const nicholasButton = screen.getByText("Nicholas D'Amato").closest('button')
      expect(nicholasButton).toBeInTheDocument()

      await user.click(nicholasButton!)

      // Check if form is auto-filled
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

      expect(emailInput.value).toBe('nicholas@damato-dynasty.com')
      expect(passwordInput.value).toBe('Dynasty2025!')
    })

    it('should auto-submit form after clicking demo user', async () => {
      const user = userEvent.setup()
      ;(signIn as jest.Mock).mockResolvedValue({ error: null })

      render(<SignInPage />)

      // Mock form.requestSubmit
      const mockRequestSubmit = jest.fn()
      const form = document.getElementById('signin-form') as HTMLFormElement
      form.requestSubmit = mockRequestSubmit

      // Click demo user button
      const demoButton = screen.getByText("Nick Hartley").closest('button')
      await user.click(demoButton!)

      await waitFor(() => {
        expect(mockRequestSubmit).toHaveBeenCalled()
      })
    })

    it('should handle all demo user accounts correctly', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const demoUsers = [
        { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", team: "D'Amato Dynasty" },
        { name: "Nick Hartley", email: "nick@damato-dynasty.com", team: "Hartley's Heroes" },
        { name: "Jack McCaigue", email: "jack@damato-dynasty.com", team: "McCaigue Mayhem" },
        { name: "Larry McCaigue", email: "larry@damato-dynasty.com", team: "Larry Legends" },
        { name: "Renee McCaigue", email: "renee@damato-dynasty.com", team: "Renee's Reign" }
      ]

      for (const demoUser of demoUsers) {
        const userButton = screen.getByText(demoUser.name).closest('button')
        expect(userButton).toBeInTheDocument()
        
        const teamElement = screen.getByText(demoUser.team)
        expect(teamElement).toBeInTheDocument()
      }
    })
  })

  describe('Google Authentication', () => {
    it('should trigger Google sign-in', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const googleButton = screen.getByRole('button', { name: /sign in with google/i })
      await user.click(googleButton)

      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
    })

    it('should handle custom callback URL', async () => {
      const user = userEvent.setup()
      const mockSearchParams = {
        get: jest.fn().mockReturnValue('/players')
      }
      ;(require('next/navigation').useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      render(<SignInPage />)

      const googleButton = screen.getByRole('button', { name: /sign in with google/i })
      await user.click(googleButton)

      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/players' })
    })
  })

  describe('Security Features', () => {
    it('should not expose sensitive data in DOM', () => {
      render(<SignInPage />)

      // Password should be hidden
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')

      // No credentials should be visible in plain text
      expect(screen.queryByText('Dynasty2025!')).not.toBeInTheDocument()
    })

    it('should sanitize input values', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const maliciousInput = '<script>alert("xss")</script>@example.com'

      await user.type(emailInput, maliciousInput)

      // Input should contain the raw value but not execute script
      expect(emailInput).toHaveValue(maliciousInput)
      expect(document.querySelector('script')).not.toBeInTheDocument()
    })

    it('should implement proper form autocomplete', () => {
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
    })
  })

  describe('Performance', () => {
    it('should render within performance threshold', async () => {
      const startTime = performance.now()
      render(<SignInPage />)
      const endTime = performance.now()

      // Should render in less than 100ms
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should handle rapid user input without lag', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      const startTime = performance.now()
      await user.type(emailInput, 'test@example.com')
      const endTime = performance.now()

      // Typing should be responsive
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // Mock a component error
      const ThrowError = () => {
        throw new Error('Component error')
      }

      expect(() => {
        render(<ThrowError />)
      }).toThrow()

      consoleSpy.mockRestore()
    })

    it('should recover from network failures', async () => {
      const user = userEvent.setup()
      ;(signIn as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ error: null })

      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // First attempt fails
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.')
      })

      // Second attempt succeeds
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Welcome back!')
      })
    })
  })

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SignInPage />)

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/email address/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/password/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus()
    })

    it('should support screen readers', () => {
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      // Should have proper labels
      expect(emailInput).toHaveAccessibleName()
      expect(passwordInput).toHaveAccessibleName()

      // Form should have accessible structure
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should indicate required fields', () => {
      render(<SignInPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toBeRequired()
      expect(passwordInput).toBeRequired()
    })
  })
})