import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import LoginPage from '@/app/login/page';
import { useAuth } from '@/components/AuthProvider';

// Mock the hooks
jest.mock('next/navigation');
jest.mock('@/components/AuthProvider');

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock fetch
global.fetch = jest.fn();

describe('Login Flow Integration', () => {
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
      user: null,
      isLoading: false,
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Mock window.location
    delete (window as any).location;
    window.location = { href: '' } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('completes full login flow successfully', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    // Mock successful login response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    // Mock successful session check
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    render(<LoginPage />);
    
    // Step 1: Select a team
    expect(screen.getByText('Choose Your Team')).toBeInTheDocument();
    const teamButton = screen.getByText('Team Alpha');
    fireEvent.click(teamButton);
    
    // Step 2: Verify form appears
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    });
    
    // Step 3: Fill out login form
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    
    fireEvent.change(emailInput, { target: { value: 'john.smith@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Dynasty2025!' } });
    
    // Step 4: Submit form
    const submitButton = screen.getByText('Sign In');
    fireEvent.click(submitButton);
    
    // Step 5: Verify API calls
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: 'john.smith@test.com',
          password: 'Dynasty2025!'
        })
      });
    });
    
    // Step 6: Verify session check
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
        credentials: 'include'
      });
    });
    
    // Step 7: Verify redirect
    await waitFor(() => {
      expect(window.location.href).toBe('/dashboard');
    });
  });

  it('handles login failure gracefully', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    // Mock failed login response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    } as Response);

    render(<LoginPage />);
    
    // Select team and fill form
    const teamButton = screen.getByText('Team Alpha');
    fireEvent.click(teamButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    });
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    
    fireEvent.change(emailInput, { target: { value: 'john.smith@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    
    const submitButton = screen.getByText('Sign In');
    fireEvent.click(submitButton);
    
    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
    
    // Verify no redirect occurred
    expect(window.location.href).toBe('');
  });

  it('allows user to change team selection', async () => {
    render(<LoginPage />);
    
    // Step 1: Select initial team
    const teamButton = screen.getByText('Team Alpha');
    fireEvent.click(teamButton);
    
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    
    // Step 2: Change team
    const changeTeamButton = screen.getByText('Choose Different Team');
    fireEvent.click(changeTeamButton);
    
    // Step 3: Verify back to team selection
    expect(screen.getByText('Choose Your Team')).toBeInTheDocument();
    
    // Step 4: Select different team
    const newTeamButton = screen.getByText('Power Squad');
    fireEvent.click(newTeamButton);
    
    await waitFor(() => {
      expect(screen.getByText('Power Squad')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  it('handles network errors during login', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<LoginPage />);
    
    // Select team and fill form
    const teamButton = screen.getByText('Team Alpha');
    fireEvent.click(teamButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    });
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    
    fireEvent.change(emailInput, { target: { value: 'john.smith@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Dynasty2025!' } });
    
    const submitButton = screen.getByText('Sign In');
    fireEvent.click(submitButton);
    
    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows loading state during login', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    // Mock delayed response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response), 100)
      )
    );

    render(<LoginPage />);
    
    // Select team and fill form
    const teamButton = screen.getByText('Team Alpha');
    fireEvent.click(teamButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    });
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    
    fireEvent.change(emailInput, { target: { value: 'john.smith@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Dynasty2025!' } });
    
    const submitButton = screen.getByText('Sign In');
    fireEvent.click(submitButton);
    
    // Verify loading state
    expect(screen.getByText('Signing In...')).toBeInTheDocument();
  });
});