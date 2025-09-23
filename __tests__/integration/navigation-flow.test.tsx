import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/AuthProvider';

// Mock the hooks
jest.mock('next/navigation');
jest.mock('@/components/AuthProvider');

const mockPush = jest.fn();
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Navigation Flow Integration', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'PLAYER' as any },
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('navigates between all main pages', async () => {
    // Start on dashboard
    mockUsePathname.mockReturnValue('/dashboard');
    
    const { rerender } = render(<Navigation />);
    
    // Verify dashboard is active
    expect(screen.getByText('Dashboard').closest('a')).toHaveClass('text-field-green-600');
    
    // Navigate to Players
    mockUsePathname.mockReturnValue('/players');
    rerender(<Navigation />);
    expect(screen.getByText('Players').closest('a')).toHaveClass('text-field-green-600');
    
    // Navigate to Trades
    mockUsePathname.mockReturnValue('/trades');
    rerender(<Navigation />);
    expect(screen.getByText('Trades').closest('a')).toHaveClass('text-field-green-600');
    
    // Navigate to Standings
    mockUsePathname.mockReturnValue('/standings');
    rerender(<Navigation />);
    expect(screen.getByText('Standings').closest('a')).toHaveClass('text-field-green-600');
    
    // Navigate to Analytics
    mockUsePathname.mockReturnValue('/analytics');
    rerender(<Navigation />);
    expect(screen.getByText('Analytics').closest('a')).toHaveClass('text-field-green-600');
  });

  it('opens and closes mobile menu', async () => {
    mockUsePathname.mockReturnValue('/dashboard');
    
    render(<Navigation />);
    
    // Open mobile menu
    const mobileMenuButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(mobileMenuButton);
    
    // Verify mobile menu is open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    // Close mobile menu by clicking outside or close button
    const closeButton = screen.getByRole('button', { name: /close menu/i });
    fireEvent.click(closeButton);
    
    // Verify mobile menu is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens and manages user menu', async () => {
    mockUsePathname.mockReturnValue('/dashboard');
    
    render(<Navigation />);
    
    // Click on user menu
    const userButton = screen.getByText('Test User');
    fireEvent.click(userButton);
    
    // Verify user menu options
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });

  it('handles navigation without authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    const { container } = render(<Navigation />);
    
    // Navigation should not render
    expect(container.firstChild).toBeNull();
  });

  it('handles loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { container } = render(<Navigation />);
    
    // Navigation should not render during loading
    expect(container.firstChild).toBeNull();
  });

  it('maintains active state across navigation', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    
    const { rerender } = render(<Navigation />);
    
    // Dashboard should be active
    expect(screen.getByText('Dashboard').closest('a')).toHaveClass('text-field-green-600');
    expect(screen.getByText('Players').closest('a')).not.toHaveClass('text-field-green-600');
    
    // Change to players page
    mockUsePathname.mockReturnValue('/players');
    rerender(<Navigation />);
    
    // Players should now be active
    expect(screen.getByText('Players').closest('a')).toHaveClass('text-field-green-600');
    expect(screen.getByText('Dashboard').closest('a')).not.toHaveClass('text-field-green-600');
  });

  it('navigates to correct routes', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    
    render(<Navigation />);
    
    // Check all navigation links have correct hrefs
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('My Team').closest('a')).toHaveAttribute('href', '/roster');
    expect(screen.getByText('Players').closest('a')).toHaveAttribute('href', '/players');
    expect(screen.getByText('Trades').closest('a')).toHaveAttribute('href', '/trades');
    expect(screen.getByText('Standings').closest('a')).toHaveAttribute('href', '/standings');
    expect(screen.getByText('Analytics').closest('a')).toHaveAttribute('href', '/analytics');
  });

  it('handles responsive navigation behavior', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    
    render(<Navigation />);
    
    // Desktop navigation should be visible
    const desktopNav = screen.getByRole('navigation');
    expect(desktopNav).toBeInTheDocument();
    
    // Mobile menu button should be present
    const mobileMenuButton = screen.getByRole('button', { name: /open menu/i });
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('displays correct user information', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    
    render(<Navigation />);
    
    // User name should be displayed
    expect(screen.getByText('Test User')).toBeInTheDocument();
    
    // User email might be displayed in dropdown (when opened)
    const userButton = screen.getByText('Test User');
    fireEvent.click(userButton);
    
    // Profile information should be accessible
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });
});