import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileDashboard } from '@/components/mobile/MobileDashboard';

// Mock the auth provider
const mockUser = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'PLAYER'
};

jest.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    logout: jest.fn()
  })
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Wifi: () => <div data-testid="wifi-icon" />,
  WifiOff: () => <div data-testid="wifi-off-icon" />,
  Download: () => <div data-testid="download-icon" />,
}));

// Mock performance manager
jest.mock('@/lib/mobile/performance', () => ({
  performanceManager: {
    onNetworkStatusChange: jest.fn(),
    getInstance: () => ({
      onNetworkStatusChange: jest.fn()
    })
  }
}));

describe('MobileDashboard', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock window.addEventListener
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render mobile dashboard', () => {
    render(<MobileDashboard />);
    
    expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
    expect(screen.getByText('Live updates')).toBeInTheDocument();
  });

  it('should display quick actions', () => {
    render(<MobileDashboard />);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Set Lineup')).toBeInTheDocument();
    expect(screen.getByText('Waivers')).toBeInTheDocument();
    expect(screen.getByText('Trades')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  it('should display team overview stats', () => {
    render(<MobileDashboard />);
    
    expect(screen.getByText('Team Overview')).toBeInTheDocument();
    expect(screen.getByText('League Rank')).toBeInTheDocument();
    expect(screen.getByText('Total Points')).toBeInTheDocument();
    expect(screen.getByText('Record')).toBeInTheDocument();
    expect(screen.getByText('Win Streak')).toBeInTheDocument();
  });

  it('should display recent activity', () => {
    render(<MobileDashboard />);
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Lineup Updated')).toBeInTheDocument();
    expect(screen.getByText('Waiver Claim Successful')).toBeInTheDocument();
  });

  it('should handle refresh button click', () => {
    render(<MobileDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    // Should trigger refresh animation
    expect(refreshButton).toBeInTheDocument();
  });

  it('should show offline indicator when offline', () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    render(<MobileDashboard />);
    
    // Simulate going offline
    fireEvent(window, new Event('offline'));
    
    expect(screen.getByText('Offline mode')).toBeInTheDocument();
  });

  it('should update last updated timestamp', async () => {
    render(<MobileDashboard />);
    
    // Should show a timestamp
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it('should display notifications badge', () => {
    render(<MobileDashboard />);
    
    const notificationButton = screen.getByRole('button', { name: /notifications/i });
    expect(notificationButton).toBeInTheDocument();
    
    // Should show badge with count
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should handle network status changes', () => {
    render(<MobileDashboard />);
    
    // Mock going offline
    Object.defineProperty(navigator, 'onLine', {
      value: false
    });
    
    // Fire offline event
    fireEvent(window, new Event('offline'));
    
    // Should show offline indicator
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
  });

  it('should display user greeting with first name only', () => {
    render(<MobileDashboard />);
    
    expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
  });

  it('should show priority-based quick actions', () => {
    render(<MobileDashboard />);
    
    // Quick actions should be in priority order
    const quickActions = screen.getAllByRole('link');
    expect(quickActions.length).toBeGreaterThan(0);
  });

  it('should handle empty user name gracefully', () => {
    // Mock user with no name
    jest.mock('@/components/AuthProvider', () => ({
      useAuth: () => ({
        user: { ...mockUser, name: null },
        isLoading: false,
        logout: jest.fn()
      })
    }));

    render(<MobileDashboard />);
    
    // Should still render without crashing
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
  });

  it('should display activity with proper timestamps', () => {
    render(<MobileDashboard />);
    
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('should show proper trend indicators', () => {
    render(<MobileDashboard />);
    
    // Should show trending up icons for positive trends
    const trendingUpIcons = screen.getAllByTestId('trending-up-icon');
    expect(trendingUpIcons.length).toBeGreaterThan(0);
  });

  it('should handle pull-to-refresh gesture', () => {
    render(<MobileDashboard />);
    
    const dashboard = screen.getByText('Welcome back, John!').closest('div');
    
    // Mock touch events for pull to refresh
    fireEvent.touchStart(dashboard!, {
      touches: [{ clientX: 0, clientY: 100 }]
    });
    
    fireEvent.touchMove(dashboard!, {
      touches: [{ clientX: 0, clientY: 200 }]
    });
    
    fireEvent.touchEnd(dashboard!);
    
    // Should handle gesture without error
    expect(dashboard).toBeInTheDocument();
  });

  it('should display proper loading states', async () => {
    render(<MobileDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    // Should show loading state briefly
    await waitFor(() => {
      expect(refreshButton).not.toHaveClass('animate-spin');
    }, { timeout: 2000 });
  });

  it('should handle responsive design', () => {
    render(<MobileDashboard />);
    
    // Should have mobile-optimized classes
    const dashboard = screen.getByText('Welcome back, John!').closest('div');
    expect(dashboard).toHaveClass('min-h-screen');
  });

  it('should show network status indicator', () => {
    render(<MobileDashboard />);
    
    // Should show online status
    expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
  });

  it('should handle card interactions', () => {
    render(<MobileDashboard />);
    
    const quickActionCards = screen.getAllByRole('link');
    const firstCard = quickActionCards[0];
    
    fireEvent.click(firstCard);
    
    // Should handle click without error
    expect(firstCard).toBeInTheDocument();
  });

  it('should display proper stat values', () => {
    render(<MobileDashboard />);
    
    expect(screen.getByText('3rd')).toBeInTheDocument(); // League rank
    expect(screen.getByText('1,847')).toBeInTheDocument(); // Total points
    expect(screen.getByText('9-5-0')).toBeInTheDocument(); // Record
  });

  it('should show activity priority indicators', () => {
    render(<MobileDashboard />);
    
    // Recent activity should have priority-based styling
    const activityItems = screen.getByText('Recent Activity').parentElement;
    expect(activityItems).toBeInTheDocument();
  });

  it('should handle offline data caching notification', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false
    });

    render(<MobileDashboard />);
    
    // Fire offline event
    fireEvent(window, new Event('offline'));
    
    expect(screen.getByText(/viewing cached data/i)).toBeInTheDocument();
  });
});