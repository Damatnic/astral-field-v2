import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the analytics calculations and components
const mockPlayers = [
  {
    id: '1',
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'SF',
    rank: 1,
    projection: 22.1,
    ownership: 99.8,
    trend: 'up',
    status: 'healthy',
    likes: 124,
    notes: 3,
    isWatched: false,
    leagueOwnership: 87
  },
  {
    id: '2',
    name: 'Cooper Kupp',
    position: 'WR',
    team: 'LAR',
    rank: 2,
    projection: 19.3,
    ownership: 97.5,
    trend: 'up',
    status: 'healthy',
    likes: 89,
    notes: 7,
    isWatched: true,
    leagueOwnership: 72
  },
  {
    id: '3',
    name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    rank: 1,
    projection: 23.5,
    ownership: 94.2,
    trend: 'stable',
    status: 'healthy',
    likes: 156,
    notes: 12,
    isWatched: true,
    leagueOwnership: 94
  },
  {
    id: '4',
    name: 'Travis Kelce',
    position: 'TE',
    team: 'KC',
    rank: 1,
    projection: 15.8,
    ownership: 89.1,
    trend: 'down',
    status: 'questionable',
    likes: 67,
    notes: 5,
    isWatched: false,
    leagueOwnership: 45
  }
];

const POSITIONS = [
  { value: 'ALL', label: 'All Positions' },
  { value: 'QB', label: 'Quarterback' },
  { value: 'RB', label: 'Running Back' },
  { value: 'WR', label: 'Wide Receiver' },
  { value: 'TE', label: 'Tight End' }
];

// Mock analytics dashboard component
const AnalyticsDashboard = ({ 
  players, 
  showAnalytics, 
  onClose 
}: { 
  players: typeof mockPlayers;
  showAnalytics: boolean;
  onClose: () => void;
}) => {
  const analytics = React.useMemo(() => {
    const totalPlayers = players.length;
    
    return {
      totalPlayers,
      avgProjection: totalPlayers > 0 ? (players.reduce((acc, p) => acc + p.projection, 0) / totalPlayers).toFixed(1) : '0.0',
      avgOwnership: totalPlayers > 0 ? (players.reduce((acc, p) => acc + p.ownership, 0) / totalPlayers).toFixed(1) : '0.0',
      topPerformers: players.filter(p => p.trend === 'up').length,
      healthyConcerns: players.filter(p => p.status !== 'healthy').length,
      highValueTargets: players.filter(p => p.projection > 18 && p.ownership < 70).length,
      positionBreakdown: POSITIONS.slice(1).map(pos => ({
        position: pos.label,
        count: players.filter(p => p.position === pos.value).length,
        avgProjection: players.filter(p => p.position === pos.value).length > 0 
          ? (players.filter(p => p.position === pos.value).reduce((acc, p) => acc + p.projection, 0) / 
             players.filter(p => p.position === pos.value).length).toFixed(1) 
          : '0.0'
      })),
      trendingPlayers: players.filter(p => p.trend === 'up').slice(0, 3),
      sleepers: players.filter(p => p.projection > 15 && p.ownership < 50).slice(0, 3)
    };
  }, [players]);

  if (!showAnalytics) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-xl z-30 overflow-y-auto" data-testid="analytics-sidebar">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
            data-testid="close-analytics"
          >
            ×
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-field-green-600" data-testid="avg-projection">{analytics.avgProjection}</div>
            <div className="text-xs text-gray-600">Avg Projection</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-orange-600" data-testid="avg-ownership">{analytics.avgOwnership}%</div>
            <div className="text-xs text-gray-600">Avg Ownership</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="top-performers">{analytics.topPerformers}</div>
            <div className="text-xs text-gray-600">Trending Up</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-red-600" data-testid="health-concerns">{analytics.healthyConcerns}</div>
            <div className="text-xs text-gray-600">Health Concerns</div>
          </div>
        </div>

        {/* Value Targets */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            🎯 High-Value Targets
          </h3>
          <div className="bg-field-green-50 border border-field-green-200 rounded-lg p-3">
            <div className="text-lg font-bold text-field-green-700" data-testid="high-value-targets">{analytics.highValueTargets}</div>
            <div className="text-sm text-field-green-600">Players with 18+ projection & &lt;70% ownership</div>
          </div>
        </div>

        {/* Position Breakdown */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            📊 Position Distribution
          </h3>
          <div className="space-y-2" data-testid="position-breakdown">
            {analytics.positionBreakdown.map((pos, index) => (
              <div key={index} className="flex items-center justify-between text-sm" data-testid={`position-${pos.position.toLowerCase().replace(/\s+/g, '-')}`}>
                <span className="text-gray-700">{pos.position}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600" data-testid={`${pos.position.toLowerCase().replace(/\s+/g, '-')}-count`}>{pos.count}</span>
                  <span className="text-field-green-600 font-medium" data-testid={`${pos.position.toLowerCase().replace(/\s+/g, '-')}-avg`}>{pos.avgProjection}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Players */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            ⚡ Trending Players
          </h3>
          <div className="space-y-2" data-testid="trending-players">
            {analytics.trendingPlayers.map((player, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-green-50 p-2 rounded" data-testid={`trending-player-${index}`}>
                <span className="font-medium text-gray-900">{player.name}</span>
                <span className="text-green-600">{player.projection}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sleeper Picks */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            💫 Sleeper Picks
          </h3>
          <div className="space-y-2" data-testid="sleeper-picks">
            {analytics.sleepers.map((player, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-purple-50 p-2 rounded" data-testid={`sleeper-${index}`}>
                <span className="font-medium text-gray-900">{player.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-purple-600">{player.projection}</span>
                  <span className="text-xs text-gray-500">{player.ownership}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Test component that manages analytics state
const AnalyticsTestWrapper = ({ players = mockPlayers }: { players?: typeof mockPlayers }) => {
  const [showAnalytics, setShowAnalytics] = React.useState(false);

  return (
    <div>
      <button
        onClick={() => setShowAnalytics(!showAnalytics)}
        data-testid="toggle-analytics"
      >
        {showAnalytics ? 'Hide' : 'Show'} Analytics
      </button>
      <AnalyticsDashboard
        players={players}
        showAnalytics={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
    </div>
  );
};

describe('Analytics Dashboard', () => {
  it('should not render when showAnalytics is false', () => {
    render(
      <AnalyticsDashboard
        players={mockPlayers}
        showAnalytics={false}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByTestId('analytics-sidebar')).not.toBeInTheDocument();
  });

  it('should render when showAnalytics is true', () => {
    render(
      <AnalyticsDashboard
        players={mockPlayers}
        showAnalytics={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('analytics-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
  });

  it('should calculate and display correct metrics', () => {
    render(
      <AnalyticsDashboard
        players={mockPlayers}
        showAnalytics={true}
        onClose={jest.fn()}
      />
    );

    // Check average projection: (22.1 + 19.3 + 23.5 + 15.8) / 4 = 20.2
    expect(screen.getByTestId('avg-projection')).toHaveTextContent('20.2');

    // Check average ownership: (99.8 + 97.5 + 94.2 + 89.1) / 4 = 95.2
    expect(screen.getByTestId('avg-ownership')).toHaveTextContent('95.2%');

    // Check trending players: 2 players with 'up' trend
    expect(screen.getByTestId('top-performers')).toHaveTextContent('2');

    // Check health concerns: 1 player with non-healthy status
    expect(screen.getByTestId('health-concerns')).toHaveTextContent('1');
  });

  it('should calculate high-value targets correctly', () => {
    render(
      <AnalyticsDashboard
        players={mockPlayers}
        showAnalytics={true}
        onClose={jest.fn()}
      />
    );

    // Players with 18+ projection and <70% ownership: none in mock data meet both criteria
    expect(screen.getByTestId('high-value-targets')).toHaveTextContent('0');
  });

  it('should display position breakdown correctly', () => {
    render(
      <AnalyticsDashboard
        players={mockPlayers}
        showAnalytics={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('position-breakdown')).toBeInTheDocument();

    // Check QB position
    expect(screen.getByTestId('quarterback-count')).toHaveTextContent('1');
    expect(screen.getByTestId('quarterback-avg')).toHaveTextContent('23.5');

    // Check RB position
    expect(screen.getByTestId('running-back-count')).toHaveTextContent('1');
    expect(screen.getByTestId('running-back-avg')).toHaveTextContent('22.1');

    // Check WR position
    expect(screen.getByTestId('wide-receiver-count')).toHaveTextContent('1');
    expect(screen.getByTestId('wide-receiver-avg')).toHaveTextContent('19.3');

    // Check TE position
    expect(screen.getByTestId('tight-end-count')).toHaveTextContent('1');
    expect(screen.getByTestId('tight-end-avg')).toHaveTextContent('15.8');
  });

  it('should display trending players', () => {
    render(
      <AnalyticsDashboard
        players={mockPlayers}
        showAnalytics={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('trending-players')).toBeInTheDocument();
    
    // Should show Christian McCaffrey and Cooper Kupp (both trending up)
    expect(screen.getByTestId('trending-player-0')).toBeInTheDocument();
    expect(screen.getByTestId('trending-player-1')).toBeInTheDocument();
    expect(screen.queryByTestId('trending-player-2')).not.toBeInTheDocument(); // Only 2 trending players
  });

  it('should display sleeper picks', () => {
    render(
      <AnalyticsDashboard
        players={mockPlayers}
        showAnalytics={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('sleeper-picks')).toBeInTheDocument();
    
    // Players with >15 projection and <50% ownership: none in mock data
    expect(screen.queryByTestId('sleeper-0')).not.toBeInTheDocument();
  });

  it('should handle close button click', () => {
    const onCloseMock = jest.fn();
    
    render(
      <AnalyticsDashboard
        players={mockPlayers}
        showAnalytics={true}
        onClose={onCloseMock}
      />
    );

    const closeButton = screen.getByTestId('close-analytics');
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should handle empty player data', () => {
    render(
      <AnalyticsDashboard
        players={[]}
        showAnalytics={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('avg-projection')).toHaveTextContent('0.0');
    expect(screen.getByTestId('avg-ownership')).toHaveTextContent('0.0%');
    expect(screen.getByTestId('top-performers')).toHaveTextContent('0');
    expect(screen.getByTestId('health-concerns')).toHaveTextContent('0');
    expect(screen.getByTestId('high-value-targets')).toHaveTextContent('0');
  });

  it('should integrate with toggle functionality', async () => {
    render(<AnalyticsTestWrapper />);

    // Initially hidden
    expect(screen.queryByTestId('analytics-sidebar')).not.toBeInTheDocument();

    // Show analytics
    fireEvent.click(screen.getByTestId('toggle-analytics'));
    await waitFor(() => {
      expect(screen.getByTestId('analytics-sidebar')).toBeInTheDocument();
    });

    // Hide analytics via close button
    fireEvent.click(screen.getByTestId('close-analytics'));
    await waitFor(() => {
      expect(screen.queryByTestId('analytics-sidebar')).not.toBeInTheDocument();
    });
  });

  it('should handle different player compositions', () => {
    const customPlayers = [
      ...mockPlayers,
      {
        id: '5',
        name: 'Test Player',
        position: 'RB',
        team: 'TEST',
        rank: 5,
        projection: 25.0,
        ownership: 45.0,
        trend: 'up',
        status: 'healthy',
        likes: 50,
        notes: 1,
        isWatched: false,
        leagueOwnership: 30
      }
    ];

    render(
      <AnalyticsDashboard
        players={customPlayers}
        showAnalytics={true}
        onClose={jest.fn()}
      />
    );

    // Should now have a high-value target (25.0 projection, 45% ownership)
    expect(screen.getByTestId('high-value-targets')).toHaveTextContent('1');

    // Should have 3 trending players now
    expect(screen.getByTestId('trending-player-2')).toBeInTheDocument();

    // Should show Test Player as sleeper (25.0 projection, 45% ownership)
    expect(screen.getByTestId('sleeper-0')).toBeInTheDocument();
  });

  it('should have correct accessibility attributes', () => {
    render(
      <AnalyticsDashboard
        players={mockPlayers}
        showAnalytics={true}
        onClose={jest.fn()}
      />
    );

    const sidebar = screen.getByTestId('analytics-sidebar');
    expect(sidebar).toHaveClass('fixed', 'inset-y-0', 'right-0');

    const closeButton = screen.getByTestId('close-analytics');
    expect(closeButton).toBeInTheDocument();

    // Check that all sections have proper headings
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('High-Value Targets')).toBeInTheDocument();
    expect(screen.getByText('Position Distribution')).toBeInTheDocument();
    expect(screen.getByText('Trending Players')).toBeInTheDocument();
    expect(screen.getByText('Sleeper Picks')).toBeInTheDocument();
  });
});