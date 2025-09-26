import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '@/components/dashboard/sidebar'

// Mock the next/link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  teamName: 'Fire Breathing Rubber Ducks',
}

describe('Sidebar Component', () => {
  it('renders user information correctly', () => {
    render(<Sidebar user={mockUser} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Fire Breathing Rubber Ducks')).toBeInTheDocument()
  })

  it('displays all navigation items', () => {
    render(<Sidebar user={mockUser} />)
    
    const expectedNavItems = [
      'Dashboard',
      'My Team', 
      'Players',
      'Live Scoring',
      'Draft Room',
      'AI Coach',
      'League Chat',
      'Analytics',
      'Settings'
    ]

    expectedNavItems.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument()
    })
  })

  it('shows sign out button', () => {
    render(<Sidebar user={mockUser} />)
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('handles mobile menu toggle', () => {
    render(<Sidebar user={mockUser} />)
    
    // Mobile menu should be closed initially
    const mobileMenu = screen.getByRole('dialog', { hidden: true })
    expect(mobileMenu).toHaveClass('hidden')
    
    // Open mobile menu
    const menuButton = screen.getByLabelText('Open sidebar')
    fireEvent.click(menuButton)
    
    // Mobile menu should be visible
    expect(mobileMenu).not.toHaveClass('hidden')
  })

  it('displays user email when name is not available', () => {
    const userWithoutName = {
      name: null,
      email: 'test@example.com',
      teamName: 'Test Team',
    }
    
    render(<Sidebar user={userWithoutName} />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('displays default team name when not available', () => {
    const userWithoutTeam = {
      name: 'Test User',
      email: 'test@example.com',
      teamName: null,
    }
    
    render(<Sidebar user={userWithoutTeam} />)
    expect(screen.getByText('My Team')).toBeInTheDocument()
  })

  it('calls signOut when sign out button is clicked', async () => {
    const { signOut } = await import('next-auth/react')
    
    render(<Sidebar user={mockUser} />)
    
    const signOutButton = screen.getByText('Sign out')
    fireEvent.click(signOutButton)
    
    expect(signOut).toHaveBeenCalled()
  })
})