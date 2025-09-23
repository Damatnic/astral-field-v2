import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@/components/ThemeProvider';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/players',
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
});

Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  value: 0,
});

// Simplified Players Page Component for testing
const PlayersPageIntegration = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedPosition, setSelectedPosition] = React.useState('ALL');
  const [selectedTeam, setSelectedTeam] = React.useState('ALL');
  const [sortBy, setSortBy] = React.useState('rank');
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(true);
  const [isLiveMode, setIsLiveMode] = React.useState(true);

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
      opponent: '@ SEA',
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
      opponent: 'vs ARI',
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
      opponent: 'vs MIA',
      likes: 156,
      notes: 12,
      isWatched: true,
      leagueOwnership: 94
    }
  ];

  const filteredPlayers = React.useMemo(() => {
    return mockPlayers.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition;
      const matchesTeam = selectedTeam === 'ALL' || player.team === selectedTeam;
      return matchesSearch && matchesPosition && matchesTeam;
    });
  }, [searchTerm, selectedPosition, selectedTeam]);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="players-page">
      {/* Header */}
      <header className="bg-white border-b border-gray-200" data-testid="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Players</h1>
              <p className="text-gray-600 mt-1">Browse and add players to your team</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  showAnalytics 
                    ? 'bg-field-green-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                data-testid="analytics-toggle"
              >
                📊 Analytics
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Analytics Sidebar */}
      {showAnalytics && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-xl z-30" data-testid="analytics-sidebar">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
              <button
                onClick={() => setShowAnalytics(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
                data-testid="close-analytics"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-gray-600" data-testid="analytics-content">
              Analytics for {filteredPlayers.length} players
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filters */}
        <div className="glass-card p-6 mb-8" data-testid="filters-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Search & Filter Players</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-field-green-600"
              data-testid="toggle-filters"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6" data-testid="filter-controls">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Search Players</label>
                <input
                  type="text"
                  placeholder="Search by name, position, or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg"
                  data-testid="search-input"
                />
              </div>

              {/* Position Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Position</label>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg"
                  data-testid="position-filter"
                >
                  <option value="ALL">All Positions</option>
                  <option value="QB">Quarterback</option>
                  <option value="RB">Running Back</option>
                  <option value="WR">Wide Receiver</option>
                  <option value="TE">Tight End</option>
                </select>
              </div>

              {/* Team Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Team</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg"
                  data-testid="team-filter"
                >
                  <option value="ALL">All Teams</option>
                  <option value="SF">SF</option>
                  <option value="LAR">LAR</option>
                  <option value="BUF">BUF</option>
                </select>
              </div>
            </div>
          )}

          {/* Advanced Controls */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded"
                data-testid="sort-select"
              >
                <option value="rank">Overall Rank</option>
                <option value="projection">Projection</option>
                <option value="ownership">Ownership</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`px-3 py-2 rounded ${isLiveMode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                data-testid="live-mode-toggle"
              >
                {isLiveMode ? '🟢 Live' : '⏸️ Paused'}
              </button>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6" data-testid="results-header">
          <p className="text-lg font-semibold text-gray-900">
            {filteredPlayers.length} Players Found
          </p>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="players-grid">
          {filteredPlayers.map((player) => (
            <div key={player.id} className="bg-white p-6 rounded-lg shadow" data-testid={`player-card-${player.id}`}>
              <h3 className="text-lg font-bold mb-2">{player.name}</h3>
              <div className="text-sm text-gray-600 mb-4">
                {player.position} - {player.team} {player.opponent}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500">Projection</div>
                  <div className="text-lg font-bold" data-testid={`projection-${player.id}`}>{player.projection}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Ownership</div>
                  <div className="text-lg font-bold" data-testid={`ownership-${player.id}`}>{player.ownership}%</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  data-testid={`add-player-${player.id}`}
                >
                  Add Player
                </button>
                <button 
                  className="px-3 py-2 border rounded hover:bg-gray-50"
                  data-testid={`view-details-${player.id}`}
                >
                  👁️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredPlayers.length === 0 && (
          <div className="text-center py-12" data-testid="no-results">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedPosition('ALL');
                setSelectedTeam('ALL');
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              data-testid="clear-filters"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Players Page Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should render the complete players page', () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    expect(screen.getByTestId('players-page')).toBeInTheDocument();
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('filters-section')).toBeInTheDocument();
    expect(screen.getByTestId('players-grid')).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
  });

  it('should display all players initially', () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    expect(screen.getByText('3 Players Found')).toBeInTheDocument();
    expect(screen.getByTestId('player-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('player-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('player-card-3')).toBeInTheDocument();
  });

  it('should filter players by search term', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'McCaffrey' } });

    await waitFor(() => {
      expect(screen.getByText('1 Players Found')).toBeInTheDocument();
      expect(screen.getByTestId('player-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('player-card-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-card-3')).not.toBeInTheDocument();
    });
  });

  it('should filter players by position', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    const positionFilter = screen.getByTestId('position-filter');
    fireEvent.change(positionFilter, { target: { value: 'QB' } });

    await waitFor(() => {
      expect(screen.getByText('1 Players Found')).toBeInTheDocument();
      expect(screen.queryByTestId('player-card-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-card-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('player-card-3')).toBeInTheDocument();
    });
  });

  it('should filter players by team', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    const teamFilter = screen.getByTestId('team-filter');
    fireEvent.change(teamFilter, { target: { value: 'SF' } });

    await waitFor(() => {
      expect(screen.getByText('1 Players Found')).toBeInTheDocument();
      expect(screen.getByTestId('player-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('player-card-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-card-3')).not.toBeInTheDocument();
    });
  });

  it('should show no results when filters match no players', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'NonexistentPlayer' } });

    await waitFor(() => {
      expect(screen.getByTestId('no-results')).toBeInTheDocument();
      expect(screen.getByText('No players found')).toBeInTheDocument();
      expect(screen.getByTestId('clear-filters')).toBeInTheDocument();
    });
  });

  it('should clear all filters when clear button is clicked', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    // Apply filters
    const searchInput = screen.getByTestId('search-input');
    const positionFilter = screen.getByTestId('position-filter');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.change(positionFilter, { target: { value: 'QB' } });

    await waitFor(() => {
      expect(screen.getByTestId('no-results')).toBeInTheDocument();
    });

    // Clear filters
    fireEvent.click(screen.getByTestId('clear-filters'));

    await waitFor(() => {
      expect(screen.getByText('3 Players Found')).toBeInTheDocument();
      expect(screen.queryByTestId('no-results')).not.toBeInTheDocument();
    });
  });

  it('should toggle analytics sidebar', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    // Initially analytics should be hidden
    expect(screen.queryByTestId('analytics-sidebar')).not.toBeInTheDocument();

    // Show analytics
    fireEvent.click(screen.getByTestId('analytics-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('analytics-sidebar')).toBeInTheDocument();
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Hide analytics via close button
    fireEvent.click(screen.getByTestId('close-analytics'));
    await waitFor(() => {
      expect(screen.queryByTestId('analytics-sidebar')).not.toBeInTheDocument();
    });
  });

  it('should toggle filters visibility', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    // Initially filters should be visible
    expect(screen.getByTestId('filter-controls')).toBeInTheDocument();

    // Hide filters
    fireEvent.click(screen.getByTestId('toggle-filters'));
    await waitFor(() => {
      expect(screen.queryByTestId('filter-controls')).not.toBeInTheDocument();
    });

    // Show filters
    fireEvent.click(screen.getByTestId('toggle-filters'));
    await waitFor(() => {
      expect(screen.getByTestId('filter-controls')).toBeInTheDocument();
    });
  });

  it('should toggle live mode', () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    const liveModeToggle = screen.getByTestId('live-mode-toggle');
    
    // Initially live mode should be on
    expect(liveModeToggle).toHaveTextContent('🟢 Live');

    // Toggle off
    fireEvent.click(liveModeToggle);
    expect(liveModeToggle).toHaveTextContent('⏸️ Paused');

    // Toggle back on
    fireEvent.click(liveModeToggle);
    expect(liveModeToggle).toHaveTextContent('🟢 Live');
  });

  it('should handle sort functionality', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    const sortSelect = screen.getByTestId('sort-select');
    
    // Change sort to projection
    fireEvent.change(sortSelect, { target: { value: 'projection' } });
    
    // Verify sort selection changed
    expect(sortSelect).toHaveValue('projection');
  });

  it('should handle multiple filter combinations', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    // Apply search and position filter
    const searchInput = screen.getByTestId('search-input');
    const positionFilter = screen.getByTestId('position-filter');
    
    fireEvent.change(searchInput, { target: { value: 'Josh' } });
    fireEvent.change(positionFilter, { target: { value: 'QB' } });

    await waitFor(() => {
      expect(screen.getByText('1 Players Found')).toBeInTheDocument();
      expect(screen.getByTestId('player-card-3')).toBeInTheDocument();
    });

    // Change position to something that doesn't match
    fireEvent.change(positionFilter, { target: { value: 'RB' } });

    await waitFor(() => {
      expect(screen.getByTestId('no-results')).toBeInTheDocument();
    });
  });

  it('should display player stats correctly', () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    // Check player 1 stats
    expect(screen.getByTestId('projection-1')).toHaveTextContent('22.1');
    expect(screen.getByTestId('ownership-1')).toHaveTextContent('99.8%');

    // Check player 2 stats
    expect(screen.getByTestId('projection-2')).toHaveTextContent('19.3');
    expect(screen.getByTestId('ownership-2')).toHaveTextContent('97.5%');

    // Check player 3 stats
    expect(screen.getByTestId('projection-3')).toHaveTextContent('23.5');
    expect(screen.getByTestId('ownership-3')).toHaveTextContent('94.2%');
  });

  it('should handle player card interactions', () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    // Check that action buttons exist for each player
    expect(screen.getByTestId('add-player-1')).toBeInTheDocument();
    expect(screen.getByTestId('view-details-1')).toBeInTheDocument();
    
    expect(screen.getByTestId('add-player-2')).toBeInTheDocument();
    expect(screen.getByTestId('view-details-2')).toBeInTheDocument();
    
    expect(screen.getByTestId('add-player-3')).toBeInTheDocument();
    expect(screen.getByTestId('view-details-3')).toBeInTheDocument();

    // Click add player button - should not throw error
    fireEvent.click(screen.getByTestId('add-player-1'));
    fireEvent.click(screen.getByTestId('view-details-1'));
  });

  it('should maintain filter state during interactions', async () => {
    render(
      <TestWrapper>
        <PlayersPageIntegration />
      </TestWrapper>
    );

    // Apply filters
    const searchInput = screen.getByTestId('search-input');
    const positionFilter = screen.getByTestId('position-filter');
    
    fireEvent.change(searchInput, { target: { value: 'Cooper' } });
    fireEvent.change(positionFilter, { target: { value: 'WR' } });

    await waitFor(() => {
      expect(screen.getByText('1 Players Found')).toBeInTheDocument();
    });

    // Toggle analytics (should maintain filters)
    fireEvent.click(screen.getByTestId('analytics-toggle'));
    
    await waitFor(() => {
      expect(screen.getByTestId('analytics-sidebar')).toBeInTheDocument();
      expect(screen.getByText('1 Players Found')).toBeInTheDocument();
    });

    // Close analytics (should maintain filters)
    fireEvent.click(screen.getByTestId('close-analytics'));
    
    await waitFor(() => {
      expect(screen.queryByTestId('analytics-sidebar')).not.toBeInTheDocument();
      expect(screen.getByText('1 Players Found')).toBeInTheDocument();
    });
  });
});