import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { ModernLayout } from '@/components/layout/modern-layout'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('@/components/navigation/modern-sidebar', () => ({
  ModernSidebar: ({ user }: { user: any }) => <div data-testid="modern-sidebar">{user.name}</div>
}))
jest.mock('@/components/navigation/top-nav', () => ({
  TopNav: ({ currentWeek, leagueName }: { currentWeek?: number, leagueName?: string }) => (
    <div data-testid="top-nav">
      Week {currentWeek} - {leagueName}
    </div>
  )
}))

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    teamName: 'Test Team'
  }
}

describe('ModernLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children correctly', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(
      <ModernLayout>
        <div>Test Content</div>
      </ModernLayout>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders sidebar with user information', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(
      <ModernLayout>
        <div>Test Content</div>
      </ModernLayout>
    )

    expect(screen.getByTestId('modern-sidebar')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('renders top navigation with default props', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(
      <ModernLayout>
        <div>Test Content</div>
      </ModernLayout>
    )

    expect(screen.getByTestId('top-nav')).toBeInTheDocument()
    expect(screen.getByText('Week 1 - My League')).toBeInTheDocument()
  })

  it('renders top navigation with custom props', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(
      <ModernLayout currentWeek={5} leagueName="Custom League">
        <div>Test Content</div>
      </ModernLayout>
    )

    expect(screen.getByText('Week 5 - Custom League')).toBeInTheDocument()
  })

  it('handles missing user data gracefully', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(
      <ModernLayout>
        <div>Test Content</div>
      </ModernLayout>
    )

    expect(screen.getByTestId('modern-sidebar')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument() // Default fallback
  })

  it('applies correct CSS classes for layout structure', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(
      <ModernLayout>
        <div>Test Content</div>
      </ModernLayout>
    )

    const container = screen.getByText('Test Content').closest('.min-h-screen')
    expect(container).toHaveClass('bg-slate-950')
  })

  it('applies responsive layout classes', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(
      <ModernLayout>
        <div>Test Content</div>
      </ModernLayout>
    )

    const mainContent = screen.getByText('Test Content').closest('.lg\\:pl-64')
    expect(mainContent).toHaveClass('lg:pl-64')
  })

  it('renders main content with proper padding', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(
      <ModernLayout>
        <div>Test Content</div>
      </ModernLayout>
    )

    const main = screen.getByText('Test Content').closest('main')
    expect(main).toHaveClass('pt-16', 'min-h-screen')
  })
})
