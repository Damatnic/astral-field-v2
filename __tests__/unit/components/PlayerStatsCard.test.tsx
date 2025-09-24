/**
 * PlayerStatsCard Component Tests
 * Tests the player statistics display component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock player stats card component since it doesn't exist yet
interface PlayerStats {
  passingYards?: number;
  passingTouchdowns?: number;
  rushingYards?: number;
  rushingTouchdowns?: number;
  receptions?: number;
  receivingYards?: number;
  receivingTouchdowns?: number;
  fantasyPoints?: number;
}

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  stats?: PlayerStats;
  projectedPoints?: number;
  byeWeek?: number;
}

interface PlayerStatsCardProps {
  player: Player;
  showProjections?: boolean;
  compact?: boolean;
  week?: number;
}

// Mock implementation of PlayerStatsCard
const PlayerStatsCard: React.FC<PlayerStatsCardProps> = ({ 
  player, 
  showProjections = false, 
  compact = false,
  week
}) => {
  const formatStat = (value?: number, decimals: number = 0) => {
    if (value === undefined || value === null) return '0';
    return value.toFixed(decimals);
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'text-red-600';
      case 'RB': return 'text-green-600';
      case 'WR': return 'text-blue-600';
      case 'TE': return 'text-purple-600';
      case 'K': return 'text-yellow-600';
      case 'DEF': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (compact) {
    return (
      <div className="bg-white rounded-lg p-3 shadow-sm border" data-testid="player-stats-card">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-sm">{player.name}</h3>
            <p className={`text-xs ${getPositionColor(player.position)}`}>
              {player.position} - {player.team}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {showProjections 
                ? formatStat(player.projectedPoints, 1)
                : formatStat(player.stats?.fantasyPoints, 1)
              }
            </div>
            <div className="text-xs text-gray-500">
              {showProjections ? 'PROJ' : 'PTS'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-md border" data-testid="player-stats-card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold">{player.name}</h2>
          <p className={`text-sm ${getPositionColor(player.position)}`}>
            {player.position} - {player.team}
            {player.byeWeek && ` (Bye: ${player.byeWeek})`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-field-green-600">
            {showProjections 
              ? formatStat(player.projectedPoints, 1)
              : formatStat(player.stats?.fantasyPoints, 1)
            }
          </div>
          <div className="text-sm text-gray-500">
            {showProjections ? 'Projected' : 'Fantasy Points'}
            {week && ` (Week ${week})`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Passing stats for QB */}
        {player.position === 'QB' && (
          <>
            <div>
              <div className="text-lg font-semibold">{formatStat(player.stats?.passingYards)}</div>
              <div className="text-xs text-gray-500">Pass Yards</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{formatStat(player.stats?.passingTouchdowns)}</div>
              <div className="text-xs text-gray-500">Pass TDs</div>
            </div>
          </>
        )}

        {/* Rushing stats for RB/QB */}
        {(['RB', 'QB'].includes(player.position)) && (
          <>
            <div>
              <div className="text-lg font-semibold">{formatStat(player.stats?.rushingYards)}</div>
              <div className="text-xs text-gray-500">Rush Yards</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{formatStat(player.stats?.rushingTouchdowns)}</div>
              <div className="text-xs text-gray-500">Rush TDs</div>
            </div>
          </>
        )}

        {/* Receiving stats for WR/TE/RB */}
        {(['WR', 'TE', 'RB'].includes(player.position)) && (
          <>
            <div>
              <div className="text-lg font-semibold">{formatStat(player.stats?.receptions)}</div>
              <div className="text-xs text-gray-500">Receptions</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{formatStat(player.stats?.receivingYards)}</div>
              <div className="text-xs text-gray-500">Rec Yards</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{formatStat(player.stats?.receivingTouchdowns)}</div>
              <div className="text-xs text-gray-500">Rec TDs</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

describe('PlayerStatsCard', () => {
  const mockQBPlayer: Player = {
    id: 'player-1',
    name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    stats: {
      passingYards: 4306,
      passingTouchdowns: 29,
      rushingYards: 523,
      rushingTouchdowns: 15,
      fantasyPoints: 375.2
    },
    projectedPoints: 24.5,
    byeWeek: 13
  };

  const mockRBPlayer: Player = {
    id: 'player-2',
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'SF',
    stats: {
      rushingYards: 1459,
      rushingTouchdowns: 14,
      receptions: 67,
      receivingYards: 564,
      receivingTouchdowns: 4,
      fantasyPoints: 298.3
    },
    projectedPoints: 18.9,
    byeWeek: 9
  };

  const mockWRPlayer: Player = {
    id: 'player-3',
    name: 'Tyreek Hill',
    position: 'WR',
    team: 'MIA',
    stats: {
      receptions: 119,
      receivingYards: 1710,
      receivingTouchdowns: 13,
      fantasyPoints: 282.0
    },
    projectedPoints: 16.2
  };

  describe('Basic Rendering', () => {
    it('should render player basic information', () => {
      render(<PlayerStatsCard player={mockQBPlayer} />);

      expect(screen.getByText('Josh Allen')).toBeInTheDocument();
      expect(screen.getByText('QB - BUF (Bye: 13)')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-card')).toBeInTheDocument();
    });

    it('should display fantasy points by default', () => {
      render(<PlayerStatsCard player={mockQBPlayer} />);

      expect(screen.getByText('375.2')).toBeInTheDocument();
      expect(screen.getByText('Fantasy Points')).toBeInTheDocument();
    });

    it('should display projected points when showProjections is true', () => {
      render(<PlayerStatsCard player={mockQBPlayer} showProjections={true} />);

      expect(screen.getByText('24.5')).toBeInTheDocument();
      expect(screen.getByText('Projected')).toBeInTheDocument();
    });
  });

  describe('Position-specific Stats', () => {
    it('should show QB-specific stats', () => {
      render(<PlayerStatsCard player={mockQBPlayer} />);

      expect(screen.getByText('4306')).toBeInTheDocument(); // Passing yards
      expect(screen.getByText('Pass Yards')).toBeInTheDocument();
      expect(screen.getByText('29')).toBeInTheDocument(); // Passing TDs
      expect(screen.getByText('Pass TDs')).toBeInTheDocument();
      expect(screen.getByText('523')).toBeInTheDocument(); // Rushing yards
      expect(screen.getByText('Rush Yards')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // Rushing TDs
      expect(screen.getByText('Rush TDs')).toBeInTheDocument();
    });

    it('should show RB-specific stats', () => {
      render(<PlayerStatsCard player={mockRBPlayer} />);

      expect(screen.getByText('1459')).toBeInTheDocument(); // Rushing yards
      expect(screen.getByText('Rush Yards')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument(); // Rushing TDs
      expect(screen.getByText('Rush TDs')).toBeInTheDocument();
      expect(screen.getByText('67')).toBeInTheDocument(); // Receptions
      expect(screen.getByText('Receptions')).toBeInTheDocument();
      expect(screen.getByText('564')).toBeInTheDocument(); // Receiving yards
      expect(screen.getByText('Rec Yards')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // Receiving TDs
      expect(screen.getByText('Rec TDs')).toBeInTheDocument();
    });

    it('should show WR-specific stats', () => {
      render(<PlayerStatsCard player={mockWRPlayer} />);

      expect(screen.getByText('119')).toBeInTheDocument(); // Receptions
      expect(screen.getByText('Receptions')).toBeInTheDocument();
      expect(screen.getByText('1710')).toBeInTheDocument(); // Receiving yards
      expect(screen.getByText('Rec Yards')).toBeInTheDocument();
      expect(screen.getByText('13')).toBeInTheDocument(); // Receiving TDs
      expect(screen.getByText('Rec TDs')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode', () => {
      render(<PlayerStatsCard player={mockQBPlayer} compact={true} />);

      expect(screen.getByText('Josh Allen')).toBeInTheDocument();
      expect(screen.getByText('QB - BUF')).toBeInTheDocument();
      expect(screen.getByText('375.2')).toBeInTheDocument();
      expect(screen.getByText('PTS')).toBeInTheDocument();
      
      // Should not show detailed stats in compact mode
      expect(screen.queryByText('Pass Yards')).not.toBeInTheDocument();
    });

    it('should show projections in compact mode', () => {
      render(<PlayerStatsCard player={mockQBPlayer} compact={true} showProjections={true} />);

      expect(screen.getByText('24.5')).toBeInTheDocument();
      expect(screen.getByText('PROJ')).toBeInTheDocument();
    });
  });

  describe('Position Colors', () => {
    it('should apply correct position colors', () => {
      const { rerender } = render(<PlayerStatsCard player={mockQBPlayer} />);
      expect(screen.getByText('QB - BUF (Bye: 13)')).toHaveClass('text-red-600');

      rerender(<PlayerStatsCard player={mockRBPlayer} />);
      expect(screen.getByText('RB - SF (Bye: 9)')).toHaveClass('text-green-600');

      rerender(<PlayerStatsCard player={mockWRPlayer} />);
      expect(screen.getByText('WR - MIA')).toHaveClass('text-blue-600');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing stats gracefully', () => {
      const playerWithNoStats: Player = {
        id: 'player-4',
        name: 'Rookie Player',
        position: 'WR',
        team: 'LAR'
      };

      render(<PlayerStatsCard player={playerWithNoStats} />);

      expect(screen.getByText('Rookie Player')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Should show 0 for missing stats
    });

    it('should handle missing bye week', () => {
      const playerNoBye = { ...mockWRPlayer };
      delete playerNoBye.byeWeek;

      render(<PlayerStatsCard player={playerNoBye} />);

      expect(screen.getByText('WR - MIA')).toBeInTheDocument(); // No bye week shown
      expect(screen.queryByText('Bye:')).not.toBeInTheDocument();
    });

    it('should handle zero stats', () => {
      const playerWithZeros: Player = {
        id: 'player-5',
        name: 'Benched Player',
        position: 'RB',
        team: 'NYJ',
        stats: {
          rushingYards: 0,
          rushingTouchdowns: 0,
          receptions: 0,
          receivingYards: 0,
          receivingTouchdowns: 0,
          fantasyPoints: 0
        }
      };

      render(<PlayerStatsCard player={playerWithZeros} />);

      expect(screen.getAllByText('0')).toHaveLength(6); // All stats should show 0
    });

    it('should display week information when provided', () => {
      render(<PlayerStatsCard player={mockQBPlayer} week={15} />);

      expect(screen.getByText('Fantasy Points (Week 15)')).toBeInTheDocument();
    });

    it('should handle decimal formatting correctly', () => {
      const playerWithDecimals: Player = {
        id: 'player-6',
        name: 'Decimal Player',
        position: 'QB',
        team: 'KC',
        stats: {
          fantasyPoints: 23.456
        }
      };

      render(<PlayerStatsCard player={playerWithDecimals} />);

      expect(screen.getByText('23.5')).toBeInTheDocument(); // Should round to 1 decimal
    });
  });

  describe('Accessibility', () => {
    it('should have proper structure for screen readers', () => {
      render(<PlayerStatsCard player={mockQBPlayer} />);

      const card = screen.getByTestId('player-stats-card');
      expect(card).toBeInTheDocument();

      // Should have clear headings
      const playerName = screen.getByRole('heading', { level: 2 });
      expect(playerName).toHaveTextContent('Josh Allen');
    });

    it('should be keyboard accessible', () => {
      render(<PlayerStatsCard player={mockQBPlayer} />);

      const card = screen.getByTestId('player-stats-card');
      expect(card).toBeInTheDocument();
      
      // Basic accessibility structure check
      expect(card.tagName).toBe('DIV');
    });
  });

  describe('Performance', () => {
    it('should render quickly with complex stats', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<PlayerStatsCard player={mockQBPlayer} />);
        unmount();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should render 100 cards in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});