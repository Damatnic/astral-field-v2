import { render, screen, fireEvent } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { ModernSidebar } from '@/components/navigation/modern-sidebar'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('next-auth/react')
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

const mockUser = {
  name: 'Test User',
  email: 'test@example.com',
  teamName: 'Test Team'
}

describe('ModernSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
  })

  it('renders sidebar with user information', () => {
    render(<ModernSidebar user={mockUser} />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Test Team')).toBeInTheDocument()
    expect(screen.getByText('AstralField')).toBeInTheDocument()
  })

  it('renders navigation sections', () => {
    render(<ModernSidebar user={mockUser} />)

    expect(screen.getByText('MAIN')).toBeInTheDocument()
    expect(screen.getByText('MANAGE')).toBeInTheDocument()
    expect(screen.getByText('ANALYZE')).toBeInTheDocument()
  })

  it('renders navigation items', () => {
    render(<ModernSidebar user={mockUser} />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('My Team')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Standings')).toBeInTheDocument()
    expect(screen.getByText('Set Lineup')).toBeInTheDocument()
    expect(screen.getByText('Waivers')).toBeInTheDocument()
    expect(screen.getByText('Trades')).toBeInTheDocument()
    expect(screen.getByText('Players')).toBeInTheDocument()
    expect(screen.getByText('Matchup')).toBeInTheDocument()
    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(screen.getByText('AI Coach')).toBeInTheDocument()
  })

  it('highlights active navigation item', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')

    render(<ModernSidebar user={mockUser} />)

    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveClass('bg-blue-600', 'text-white')
  })

  it('toggles section collapse when section header is clicked', () => {
    render(<ModernSidebar user={mockUser} />)

    const mainSection = screen.getByText('MAIN')
    fireEvent.click(mainSection)

    // Section should be collapsed (items not visible)
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('shows mobile menu button on mobile', () => {
    render(<ModernSidebar user={mockUser} />)

    const mobileButton = screen.getByRole('button', { name: /menu/i })
    expect(mobileButton).toBeInTheDocument()
  })

  it('opens mobile sidebar when menu button is clicked', () => {
    render(<ModernSidebar user={mockUser} />)

    const mobileButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(mobileButton)

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('translate-x-0')
  })

  it('closes mobile sidebar when close button is clicked', () => {
    render(<ModernSidebar user={mockUser} />)

    // Open sidebar first
    const mobileButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(mobileButton)

    // Then close it
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('-translate-x-full')
  })

  it('calls signOut when sign out button is clicked', () => {
    render(<ModernSidebar user={mockUser} />)

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    expect(signOut).toHaveBeenCalled()
  })

  it('handles missing user data gracefully', () => {
    const userWithoutName = {
      name: null,
      email: null,
      teamName: null
    }

    render(<ModernSidebar user={userWithoutName} />)

    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('No Team')).toBeInTheDocument()
  })

  it('displays user avatar with first letter', () => {
    render(<ModernSidebar user={mockUser} />)

    expect(screen.getByText('T')).toBeInTheDocument() // First letter of "Test User"
  })

  it('displays settings link', () => {
    render(<ModernSidebar user={mockUser} />)

    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('applies correct CSS classes for sidebar structure', () => {
    render(<ModernSidebar user={mockUser} />)

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('fixed', 'top-0', 'left-0', 'h-full', 'w-64', 'bg-slate-900')
  })

  it('renders logo with correct styling', () => {
    render(<ModernSidebar user={mockUser} />)

    const logo = screen.getByText('AstralField')
    expect(logo).toHaveClass('text-xl', 'font-bold', 'text-white')
  })

  it('handles long team names with truncation', () => {
    const userWithLongTeamName = {
      ...mockUser,
      teamName: 'Very Long Team Name That Should Be Truncated'
    }

    render(<ModernSidebar user={userWithLongTeamName} />)

    const teamNameElement = screen.getByText('Very Long Team Name That Should Be Truncated')
    expect(teamNameElement).toHaveClass('truncate')
  })
})
