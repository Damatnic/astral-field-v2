import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the player data and PlayerCard component from the players page
const mockPlayer = {
  id: '1',
  name: 'Christian McCaffrey',
  position: 'RB',
  team: 'SF',
  rank: 1,
  adp: 1.2,
  points: 312.5,
  avgPoints: 19.5,
  ownership: 99.8,
  trend: 'up',
  status: 'healthy',
  opponent: '@ SEA',
  projection: 22.1,
  salary: 9800,
  notes: 3,
  likes: 124,
  isWatched: false,
  leagueOwnership: 87
};

// Import the PlayerCard component inline for testing
const PlayerCard = ({ player }: { player: typeof mockPlayer }) => {
  const [isLiked, setIsLiked] = React.useState(false);
  const [isWatchlisted, setIsWatchlisted] = React.useState(player.isWatched);
  const [showNotes, setShowNotes] = React.useState(false);

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'RB': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'WR': return 'bg-green-100 text-green-700 border-green-200';
      case 'TE': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'K': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'DST': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'questionable': return 'text-orange-600 bg-orange-50';
      case 'out': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="player-card-premium touch-feedback group" data-testid="player-card">
      {/* Player Info */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-field-green-700 transition-colors">
          {player.name}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-semibold">{player.team}</span>
          <span className="text-gray-400">vs</span>
          <span>{player.opponent}</span>
        </div>
      </div>

      {/* Position Badge */}
      <div className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 ${getPositionColor(player.position)} shadow-sm`}>
        {player.position}
      </div>

      {/* Rank */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500">#</span>
        <span className="text-sm font-bold text-gray-700">{player.rank}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1">Projection</p>
          <p className="text-xl font-bold text-gray-900 mb-1" data-testid="projection">{player.projection}</p>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{width: `${(player.projection / 30) * 100}%`}}></div>
          </div>
        </div>
        
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1">Avg Points</p>
          <p className="text-xl font-bold text-gray-900 mb-1" data-testid="avg-points">{player.avgPoints}</p>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{width: `${(player.avgPoints / 25) * 100}%`}}></div>
          </div>
        </div>
        
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1">Ownership</p>
          <p className="text-xl font-bold text-gray-900 mb-1" data-testid="ownership">{player.ownership}%</p>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{width: `${player.ownership}%`}}></div>
          </div>
        </div>
        
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              player.status === 'healthy' ? 'bg-green-500' :
              player.status === 'questionable' ? 'bg-orange-500' :
              'bg-red-500'
            }`}></div>
            <span className={`text-sm font-semibold ${getStatusColor(player.status).replace('bg-', 'text-').replace('-50', '-600')}`} data-testid="status">
              {player.status === 'healthy' ? 'Healthy' : player.status === 'questionable' ? 'Questionable' : 'Out'}
            </span>
          </div>
        </div>
      </div>

      {/* League Ownership Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>League Ownership</span>
          <span data-testid="league-ownership">{player.leagueOwnership}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
            style={{width: `${player.leagueOwnership}%`}}
            data-testid="league-ownership-bar"
          ></div>
        </div>
      </div>

      {/* Social Interactions */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLiked(!isLiked)}
            className={`flex items-center gap-1 transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
            data-testid="like-button"
          >
            <span data-testid="like-count">{player.likes + (isLiked ? 1 : 0)}</span>
          </button>
          
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
            data-testid="notes-button"
          >
            <span data-testid="notes-count">{player.notes}</span>
          </button>
          
          <button className="flex items-center gap-1 text-gray-500 hover:text-field-green-500 transition-colors" data-testid="share-button">
            Share
          </button>
        </div>
        
        <button 
          onClick={() => setIsWatchlisted(!isWatchlisted)}
          className={`p-1.5 rounded-full transition-all ${
            isWatchlisted 
              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
              : 'bg-gray-100 text-gray-500 hover:bg-yellow-100 hover:text-yellow-600'
          }`}
          data-testid="watchlist-button"
        >
          ⭐
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="btn-gradient flex-1 flex items-center justify-center gap-2 touch-feedback" data-testid="add-player-button">
          <span>Add Player</span>
        </button>
        
        <button className="glass-card px-4 py-3 flex items-center justify-center hover:scale-105 transition-all duration-200 touch-feedback" data-testid="view-details-button">
          👁️
        </button>
      </div>
    </div>
  );
};

describe('Enhanced PlayerCard', () => {
  it('should render player information correctly', () => {
    render(<PlayerCard player={mockPlayer} />);

    expect(screen.getByText('Christian McCaffrey')).toBeInTheDocument();
    expect(screen.getByText('SF')).toBeInTheDocument();
    expect(screen.getByText('@ SEA')).toBeInTheDocument();
    expect(screen.getByTestId('projection')).toHaveTextContent('22.1');
    expect(screen.getByTestId('avg-points')).toHaveTextContent('19.5');
    expect(screen.getByTestId('ownership')).toHaveTextContent('99.8%');
  });

  it('should display position badge with correct styling', () => {
    render(<PlayerCard player={mockPlayer} />);

    const positionBadge = screen.getByText('RB');
    expect(positionBadge).toBeInTheDocument();
    expect(positionBadge).toHaveClass('bg-blue-100', 'text-blue-700', 'border-blue-200');
  });

  it('should display status correctly', () => {
    render(<PlayerCard player={mockPlayer} />);

    expect(screen.getByTestId('status')).toHaveTextContent('Healthy');
    
    // Test with different status
    const questionablePlayer = { ...mockPlayer, status: 'questionable' };
    render(<PlayerCard player={questionablePlayer} />);
    
    expect(screen.getAllByTestId('status')[1]).toHaveTextContent('Questionable');
  });

  it('should handle like button interaction', () => {
    render(<PlayerCard player={mockPlayer} />);

    const likeButton = screen.getByTestId('like-button');
    const likeCount = screen.getByTestId('like-count');
    
    expect(likeCount).toHaveTextContent('124');
    
    fireEvent.click(likeButton);
    
    expect(likeCount).toHaveTextContent('125');
    
    fireEvent.click(likeButton);
    
    expect(likeCount).toHaveTextContent('124');
  });

  it('should handle watchlist button interaction', () => {
    render(<PlayerCard player={mockPlayer} />);

    const watchlistButton = screen.getByTestId('watchlist-button');
    
    // Initially not watchlisted
    expect(watchlistButton).toHaveClass('bg-gray-100', 'text-gray-500');
    
    fireEvent.click(watchlistButton);
    
    // Should be watchlisted now
    expect(watchlistButton).toHaveClass('bg-yellow-100', 'text-yellow-600');
    
    fireEvent.click(watchlistButton);
    
    // Should be back to not watchlisted
    expect(watchlistButton).toHaveClass('bg-gray-100', 'text-gray-500');
  });

  it('should handle initially watchlisted player', () => {
    const watchlistedPlayer = { ...mockPlayer, isWatched: true };
    render(<PlayerCard player={watchlistedPlayer} />);

    const watchlistButton = screen.getByTestId('watchlist-button');
    expect(watchlistButton).toHaveClass('bg-yellow-100', 'text-yellow-600');
  });

  it('should handle notes button interaction', () => {
    render(<PlayerCard player={mockPlayer} />);

    const notesButton = screen.getByTestId('notes-button');
    const notesCount = screen.getByTestId('notes-count');
    
    expect(notesCount).toHaveTextContent('3');
    
    fireEvent.click(notesButton);
    
    // Notes functionality is tracked but doesn't change count in this implementation
    expect(notesCount).toHaveTextContent('3');
  });

  it('should display league ownership bar correctly', () => {
    render(<PlayerCard player={mockPlayer} />);

    expect(screen.getByTestId('league-ownership')).toHaveTextContent('87%');
    
    const ownershipBar = screen.getByTestId('league-ownership-bar');
    expect(ownershipBar).toHaveStyle('width: 87%');
  });

  it('should have accessible action buttons', () => {
    render(<PlayerCard player={mockPlayer} />);

    expect(screen.getByTestId('add-player-button')).toBeInTheDocument();
    expect(screen.getByTestId('view-details-button')).toBeInTheDocument();
    expect(screen.getByTestId('share-button')).toBeInTheDocument();
  });

  it('should handle different position colors', () => {
    const positions = [
      { position: 'QB', expectedClass: 'bg-pink-100 text-pink-700 border-pink-200' },
      { position: 'WR', expectedClass: 'bg-green-100 text-green-700 border-green-200' },
      { position: 'TE', expectedClass: 'bg-orange-100 text-orange-700 border-orange-200' },
      { position: 'K', expectedClass: 'bg-purple-100 text-purple-700 border-purple-200' },
      { position: 'DST', expectedClass: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
    ];

    positions.forEach(({ position, expectedClass }) => {
      const testPlayer = { ...mockPlayer, position };
      render(<PlayerCard player={testPlayer} />);
      
      const positionBadge = screen.getByText(position);
      expectedClass.split(' ').forEach(className => {
        expect(positionBadge).toHaveClass(className);
      });
    });
  });

  it('should handle stat bar visualizations', () => {
    render(<PlayerCard player={mockPlayer} />);

    // Check that stat bars exist
    const statBars = document.querySelectorAll('.stat-bar');
    expect(statBars).toHaveLength(3); // projection, avg points, ownership

    const statBarFills = document.querySelectorAll('.stat-bar-fill');
    expect(statBarFills).toHaveLength(3);
  });

  it('should handle edge case values', () => {
    const edgeCasePlayer = {
      ...mockPlayer,
      projection: 0,
      avgPoints: 0,
      ownership: 0,
      leagueOwnership: 0,
      likes: 0,
      notes: 0
    };

    render(<PlayerCard player={edgeCasePlayer} />);

    expect(screen.getByTestId('projection')).toHaveTextContent('0');
    expect(screen.getByTestId('avg-points')).toHaveTextContent('0');
    expect(screen.getByTestId('ownership')).toHaveTextContent('0%');
    expect(screen.getByTestId('league-ownership')).toHaveTextContent('0%');
    expect(screen.getByTestId('like-count')).toHaveTextContent('0');
    expect(screen.getByTestId('notes-count')).toHaveTextContent('0');
  });

  it('should handle high stat values', () => {
    const highValuePlayer = {
      ...mockPlayer,
      projection: 50,
      avgPoints: 40,
      ownership: 100,
      leagueOwnership: 100
    };

    render(<PlayerCard player={highValuePlayer} />);

    expect(screen.getByTestId('projection')).toHaveTextContent('50');
    expect(screen.getByTestId('avg-points')).toHaveTextContent('40');
    expect(screen.getByTestId('ownership')).toHaveTextContent('100%');
    expect(screen.getByTestId('league-ownership')).toHaveTextContent('100%');
    
    const ownershipBar = screen.getByTestId('league-ownership-bar');
    expect(ownershipBar).toHaveStyle('width: 100%');
  });
});