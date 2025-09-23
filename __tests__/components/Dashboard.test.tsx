import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/(dashboard)/dashboard/page';
import { useAuth } from '@/components/AuthProvider';

// Mock the hooks
jest.mock('@/components/AuthProvider');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch
global.fetch = jest.fn();

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com' },
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<DashboardPage />);
    
    expect(screen.getByText('Loading Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Fetching your team data...')).toBeInTheDocument();
  });

  it('renders dashboard after loading', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    // Mock team data response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          team: { id: '1', name: 'Test Team' },
          record: { wins: 5, losses: 2, ties: 0 },
          pointsFor: 850.5,
          pointsAgainst: 720.3,
          standing: 2,
        }
      }),
    } as Response);

    // Mock matchup data response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          opponent: { name: 'Opponent Team', wins: 3, losses: 4 },
          matchup: { week: 7 }
        }
      }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
    });
  });

  it('renders stat cards', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          team: { id: '1', name: 'Test Team' },
          record: { wins: 5, losses: 2, ties: 0 },
          pointsFor: 850.5,
          pointsAgainst: 720.3,
          standing: 2,
        }
      }),
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('League Standing')).toBeInTheDocument();
      expect(screen.getByText('Record')).toBeInTheDocument();
      expect(screen.getByText('Points For')).toBeInTheDocument();
      expect(screen.getByText('Points Against')).toBeInTheDocument();
    });
  });

  it('renders quick actions', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Set Lineup')).toBeInTheDocument();
      expect(screen.getByText('Waiver Wire')).toBeInTheDocument();
      expect(screen.getByText('Trade Center')).toBeInTheDocument();
      expect(screen.getByText('League Standings')).toBeInTheDocument();
    });
  });

  it('renders recent activity', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  it('renders league leaders', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    } as Response);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('League Leaders')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<DashboardPage />);

    // Should still render the dashboard even with API errors
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});