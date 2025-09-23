import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '@/components/Navigation';

// Mock AuthProvider
jest.mock('@/components/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = require('@/components/AuthProvider');

describe('Navigation', () => {
  beforeEach(() => {
    // Use the global mocks from jest.setup.js
    global.mockUsePathname.mockReturnValue('/dashboard');
    useAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com' },
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation when user is authenticated', () => {
    render(<Navigation />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Team')).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Trades')).toBeInTheDocument();
    expect(screen.getByText('Standings')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('shows sign in button when user is not authenticated', () => {
    useAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<Navigation />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    global.mockUsePathname.mockReturnValue('/players');
    
    render(<Navigation />);
    
    const playersLink = screen.getByText('Players').closest('a');
    expect(playersLink).toHaveClass('bg-field-green-50');
    expect(playersLink).toHaveClass('text-field-green-700');
  });

  it('shows user menu', () => {
    render(<Navigation />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders mobile menu button', () => {
    render(<Navigation />);
    
    // Look for the mobile menu button by its class (lg:hidden indicates mobile menu)
    const mobileMenuButton = document.querySelector('button.lg\\:hidden');
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('toggles mobile menu when button is clicked', () => {
    render(<Navigation />);
    
    // Find the mobile menu button by its class
    const mobileMenuButton = document.querySelector('button.lg\\:hidden');
    fireEvent.click(mobileMenuButton!);
    
    // Mobile menu should be visible - look for the "Menu" text in the mobile menu header
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('contains correct navigation links', () => {
    render(<Navigation />);
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /my team/i })).toHaveAttribute('href', '/roster');
    expect(screen.getByRole('link', { name: /players/i })).toHaveAttribute('href', '/players');
    expect(screen.getByRole('link', { name: /trades/i })).toHaveAttribute('href', '/trades');
    expect(screen.getByRole('link', { name: /standings/i })).toHaveAttribute('href', '/standings');
    expect(screen.getByRole('link', { name: /analytics/i })).toHaveAttribute('href', '/analytics');
  });

  it('displays correct icons for navigation items', () => {
    render(<Navigation />);
    
    // Check that icons are rendered by looking for SVG elements within navigation links
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const dashboardIcon = dashboardLink?.querySelector('svg');
    expect(dashboardIcon).toBeInTheDocument();
  });

  it('shows settings and profile options in user menu', () => {
    render(<Navigation />);
    
    // Click on user menu to open it
    const userButton = screen.getByText('Test User');
    fireEvent.click(userButton);
    
    // Check for settings and profile links
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('navigates correctly when navigation items are clicked', () => {
    render(<Navigation />);
    
    const playersLink = screen.getByRole('link', { name: /players/i });
    expect(playersLink).toHaveAttribute('href', '/players');
    
    const tradesLink = screen.getByRole('link', { name: /trades/i });
    expect(tradesLink).toHaveAttribute('href', '/trades');
  });
});