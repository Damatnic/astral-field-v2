import { render, screen, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { TopNav } from '@/components/navigation/top-nav'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next-auth/react')

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com'
  }
}

describe('TopNav', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default props', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    expect(screen.getByText('Week 1')).toBeInTheDocument()
    expect(screen.getByText('My League')).toBeInTheDocument()
  })

  it('renders with custom props', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav currentWeek={5} leagueName="Custom League" />)

    expect(screen.getByText('Week 5')).toBeInTheDocument()
    expect(screen.getByText('Custom League')).toBeInTheDocument()
  })

  it('renders search input', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    expect(screen.getByPlaceholderText('Search players, teams...')).toBeInTheDocument()
  })

  it('updates search query when typing', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    const searchInput = screen.getByPlaceholderText('Search players, teams...')
    fireEvent.change(searchInput, { target: { value: 'Josh Allen' } })

    expect(searchInput).toHaveValue('Josh Allen')
  })

  it('renders notifications button', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    const notificationsButton = screen.getByRole('button', { name: /notifications/i })
    expect(notificationsButton).toBeInTheDocument()
  })

  it('toggles notifications dropdown when clicked', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    const notificationsButton = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(notificationsButton)

    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('No new notifications')).toBeInTheDocument()
  })

  it('closes notifications dropdown when clicking outside', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    // Open dropdown
    const notificationsButton = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(notificationsButton)

    expect(screen.getByText('Notifications')).toBeInTheDocument()

    // Click outside to close
    const overlay = screen.getByText('Notifications').closest('div')?.previousElementSibling
    if (overlay) {
      fireEvent.click(overlay)
    }

    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
  })

  it('renders user menu with user information', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('T')).toBeInTheDocument() // First letter of name
  })

  it('handles missing user data gracefully', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(<TopNav />)

    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('U')).toBeInTheDocument() // Default fallback
  })

  it('applies correct CSS classes for header structure', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    const header = screen.getByRole('banner')
    expect(header).toHaveClass('fixed', 'top-0', 'right-0', 'left-0', 'lg:left-64', 'h-16', 'bg-slate-900')
  })

  it('applies responsive classes correctly', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    const header = screen.getByRole('banner')
    expect(header).toHaveClass('lg:left-64')
  })

  it('renders notification badge', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    const notificationsButton = screen.getByRole('button', { name: /notifications/i })
    const badge = notificationsButton.querySelector('.bg-red-500')
    expect(badge).toBeInTheDocument()
  })

  it('focuses search input when clicked', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    const searchInput = screen.getByPlaceholderText('Search players, teams...')
    fireEvent.focus(searchInput)

    expect(searchInput).toHaveFocus()
  })

  it('handles search input blur', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<TopNav />)

    const searchInput = screen.getByPlaceholderText('Search players, teams...')
    fireEvent.focus(searchInput)
    fireEvent.blur(searchInput)

    expect(searchInput).not.toHaveFocus()
  })
})
