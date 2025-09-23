import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import HomePage from '@/app/page';
import { useAuth } from '@/components/AuthProvider';

// Mock the hooks
jest.mock('next/navigation');
jest.mock('@/components/AuthProvider');

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('HomePage', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(<HomePage />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to dashboard when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com' },
      isLoading: false,
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('renders homepage when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<HomePage />);
    
    expect(screen.getByText('Fantasy Football')).toBeInTheDocument();
    expect(screen.getByText('League')).toBeInTheDocument();
    expect(screen.getByText('Everything you need to win')).toBeInTheDocument();
  });

  it('navigates to login when Get Started button is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<HomePage />);
    
    const getStartedButton = screen.getByText('Get Started');
    fireEvent.click(getStartedButton);
    
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('navigates to login when Sign In Now button is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<HomePage />);
    
    const signInButton = screen.getByText('Sign In Now');
    fireEvent.click(signInButton);
    
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('displays correct stats on homepage', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<HomePage />);
    
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('Season')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('Prize')).toBeInTheDocument();
  });

  it('displays feature cards with correct information', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<HomePage />);
    
    expect(screen.getByText('Team Management')).toBeInTheDocument();
    expect(screen.getByText('Live Scoring')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });
});