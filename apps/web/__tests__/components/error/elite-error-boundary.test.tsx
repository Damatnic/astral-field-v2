import { render, screen, fireEvent } from '@testing-library/react'
import { EliteErrorBoundary } from '@/components/error/elite-error-boundary'
import '@testing-library/jest-dom'

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('EliteErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <EliteErrorBoundary>
        <div>Test content</div>
      </EliteErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when there is an error', () => {
    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('We encountered an unexpected error. Our team has been notified and we\'re working on a fix.')).toBeInTheDocument()
  })

  it('displays error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    expect(screen.getByText('Error Details (Dev Mode):')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('does not display error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    expect(screen.queryByText('Error Details (Dev Mode):')).not.toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('renders try again button', () => {
    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('renders go home button', () => {
    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    const goHomeButton = screen.getByText('Go Home')
    expect(goHomeButton).toBeInTheDocument()
    expect(goHomeButton.closest('a')).toHaveAttribute('href', '/dashboard')
  })

  it('renders support link', () => {
    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    const supportLink = screen.getByText('Contact Support')
    expect(supportLink).toBeInTheDocument()
    expect(supportLink.closest('a')).toHaveAttribute('href', '/support')
  })

  it('displays quick fixes tips', () => {
    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    expect(screen.getByText('Quick Fixes:')).toBeInTheDocument()
    expect(screen.getByText('• Try refreshing the page')).toBeInTheDocument()
    expect(screen.getByText('• Clear your browser cache')).toBeInTheDocument()
    expect(screen.getByText('• Check your internet connection')).toBeInTheDocument()
    expect(screen.getByText('• Try again in a few minutes')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <EliteErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument()
  })

  it('applies correct CSS classes for error UI', () => {
    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    const container = screen.getByText('Oops! Something went wrong').closest('.min-h-screen')
    expect(container).toHaveClass('bg-slate-950', 'flex', 'items-center', 'justify-center', 'p-6')
  })

  it('applies correct CSS classes for error card', () => {
    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    const errorCard = screen.getByText('Oops! Something went wrong').closest('.p-8')
    expect(errorCard).toHaveClass('rounded-2xl', 'bg-gradient-to-br', 'from-slate-800/50', 'to-slate-900/50', 'border-2', 'border-red-500/30')
  })

  it('renders error icon', () => {
    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    // The AlertTriangle icon should be present
    const iconContainer = screen.getByText('Oops! Something went wrong').closest('div')?.querySelector('.p-4')
    expect(iconContainer).toHaveClass('rounded-full', 'bg-red-500/10')
  })

  it('logs error to console in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <EliteErrorBoundary>
        <ThrowError shouldThrow={true} />
      </EliteErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalledWith('Elite Error Boundary caught an error:', expect.any(Error), expect.any(Object))

    consoleSpy.mockRestore()
    process.env.NODE_ENV = originalEnv
  })
})
