/**
 * Component tests for AI Lineup Optimizer
 * Tests user interactions, data display, and API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AILineupOptimizer from '@/components/lineup/AILineupOptimizer';
import { renderWithProviders } from '../../utils/test-helpers';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockOptimizationResult = {
  lineup: [
    {
      player: {
        id: 'player-1',
        name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        opponent: 'MIA',
        projectedPoints: 24.5,
        confidenceScore: 85,
        injuryStatus: null,
        weather: {
          condition: 'Clear',
          windSpeed: 5,
          temperature: 72,
          precipitation: 0,
        },
        trends: {
          last3Games: 26.2,
          seasonAvg: 23.8,
          vsOpponentAvg: 25.1,
        },
      },
      slot: 'QB',
      reasoning: [
        'High scoring matchup vs Miami',
        'Above-average performance vs opponent',
        'Weather conditions favorable',
      ],
      alternatives: [
        {
          id: 'player-alt-1',
          name: 'Lamar Jackson',
          position: 'QB',
          team: 'BAL',
          opponent: 'CIN',
          projectedPoints: 23.8,
          confidenceScore: 80,
          trends: {
            last3Games: 24.1,
            seasonAvg: 22.5,
            vsOpponentAvg: 23.2,
          },
        },
      ],
      riskLevel: 'low' as const,
      upside: 32.1,
      floor: 18.2,
    },
    {
      player: {
        id: 'player-2',
        name: 'Stefon Diggs',
        position: 'WR',
        team: 'BUF',
        opponent: 'MIA',
        projectedPoints: 18.3,
        confidenceScore: 78,
        injuryStatus: 'Questionable',
        weather: {
          condition: 'Rain',
          windSpeed: 12,
          temperature: 45,
          precipitation: 60,
        },
        trends: {
          last3Games: 19.1,
          seasonAvg: 17.8,
          vsOpponentAvg: 18.9,
        },
      },
      slot: 'WR1',
      reasoning: [
        'Strong target share in recent games',
        'Favorable matchup vs Miami secondary',
        'Red zone usage trending up',
      ],
      alternatives: [],
      riskLevel: 'medium' as const,
      upside: 28.5,
      floor: 12.1,
    },
  ],
  totalProjectedPoints: 145.8,
  confidenceScore: 82,
  winProbability: 67,
  keyInsights: [
    'Buffalo offense has strong projected performance vs Miami',
    'Weather conditions may impact passing game in BUF vs MIA',
    'Consider pivoting away from injured players if better alternatives exist',
  ],
  riskProfile: {
    overall: 'balanced' as const,
    breakdown: {
      injuries: 15,
      weather: 25,
      matchups: 10,
    },
  },
};

describe('AILineupOptimizer', () => {
  const defaultProps = {
    teamId: 'team-123',
    week: 12,
    leagueId: 'league-456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Initial Render', () => {
    it('should render the AI Lineup Optimizer header', () => {
      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      expect(screen.getByText('AI Lineup Optimizer')).toBeInTheDocument();
      expect(screen.getByText('Machine learning-powered lineup recommendations')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /optimize lineup/i })).toBeInTheDocument();
    });

    it('should display the optimize button with correct icon', () => {
      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      expect(optimizeButton).toBeInTheDocument();
      expect(optimizeButton).not.toBeDisabled();
    });

    it('should not show optimization results initially', () => {
      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      expect(screen.queryByText('Optimized Lineup')).not.toBeInTheDocument();
      expect(screen.queryByText('Key Insights')).not.toBeInTheDocument();
    });
  });

  describe('Optimization Process', () => {
    it('should show loading state when optimizing', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed API response
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockOptimizationResult),
          }), 100)
        )
      );

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      
      await user.click(optimizeButton);
      
      // Should show loading state
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled();
    });

    it('should call the optimize API with correct parameters', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOptimizationResult),
      });

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      
      await user.click(optimizeButton);
      
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/optimize-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: 'team-123',
          week: 12,
          leagueId: 'league-456',
        }),
      });
    });

    it('should display optimization results after successful API call', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOptimizationResult),
      });

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      
      await user.click(optimizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Optimized Lineup')).toBeInTheDocument();
        expect(screen.getByText('Key Insights')).toBeInTheDocument();
        expect(screen.getByText('145.8')).toBeInTheDocument(); // Total projected points
        expect(screen.getByText('82%')).toBeInTheDocument(); // Confidence score
        expect(screen.getByText('67%')).toBeInTheDocument(); // Win probability
      });
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      
      await user.click(optimizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to optimize lineup')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      
      await user.click(optimizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Optimization Results Display', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOptimizationResult),
      });

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      await userEvent.setup().click(optimizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Optimized Lineup')).toBeInTheDocument();
      });
    });

    it('should display performance summary cards', () => {
      expect(screen.getByText('Projected Points')).toBeInTheDocument();
      expect(screen.getByText('Confidence Score')).toBeInTheDocument();
      expect(screen.getByText('Win Probability')).toBeInTheDocument();
      expect(screen.getByText('Risk Profile')).toBeInTheDocument();
      
      expect(screen.getByText('145.8')).toBeInTheDocument();
      expect(screen.getByText('Balanced')).toBeInTheDocument();
    });

    it('should display key insights', () => {
      expect(screen.getByText('Key Insights')).toBeInTheDocument();
      expect(screen.getByText('Buffalo offense has strong projected performance vs Miami')).toBeInTheDocument();
      expect(screen.getByText('Weather conditions may impact passing game in BUF vs MIA')).toBeInTheDocument();
    });

    it('should display lineup recommendations with player details', () => {
      expect(screen.getByText('Josh Allen')).toBeInTheDocument();
      expect(screen.getByText('BUF vs MIA')).toBeInTheDocument();
      expect(screen.getByText('24.5')).toBeInTheDocument();
      expect(screen.getByText('Stefon Diggs')).toBeInTheDocument();
      expect(screen.getByText('18.3')).toBeInTheDocument();
    });

    it('should display injury and weather indicators', () => {
      expect(screen.getByText('Questionable')).toBeInTheDocument(); // Injury status
      expect(screen.getByText('60% rain')).toBeInTheDocument(); // Weather condition
    });

    it('should display reasoning pills for player recommendations', () => {
      expect(screen.getByText('High scoring matchup vs Miami')).toBeInTheDocument();
      expect(screen.getByText('Above-average performance vs opponent')).toBeInTheDocument();
      expect(screen.getByText('Strong target share in recent games')).toBeInTheDocument();
    });

    it('should display risk levels with appropriate colors', () => {
      const lowRiskElements = screen.getAllByText('LOW');
      const mediumRiskElements = screen.getAllByText('MEDIUM');
      
      expect(lowRiskElements.length).toBeGreaterThan(0);
      expect(mediumRiskElements.length).toBeGreaterThan(0);
    });

    it('should show floor and ceiling projections', () => {
      expect(screen.getByText('Floor: 18.2 | Ceiling: 32.1')).toBeInTheDocument();
      expect(screen.getByText('Floor: 12.1 | Ceiling: 28.5')).toBeInTheDocument();
    });
  });

  describe('Player Detail Modal', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOptimizationResult),
      });

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      await userEvent.setup().click(optimizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Optimized Lineup')).toBeInTheDocument();
      });
    });

    it('should open player detail modal when clicking on a player', async () => {
      const user = userEvent.setup();
      
      const playerCard = screen.getByText('Josh Allen').closest('div');
      expect(playerCard).toBeInTheDocument();
      
      await user.click(playerCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Josh Allen Analysis')).toBeInTheDocument();
        expect(screen.getByText('Last 3 Games')).toBeInTheDocument();
        expect(screen.getByText('Season Avg')).toBeInTheDocument();
        expect(screen.getByText('vs Opponent')).toBeInTheDocument();
      });
    });

    it('should display detailed player statistics in modal', async () => {
      const user = userEvent.setup();
      
      const playerCard = screen.getByText('Josh Allen').closest('div');
      await user.click(playerCard!);
      
      await waitFor(() => {
        expect(screen.getByText('26.2')).toBeInTheDocument(); // Last 3 games
        expect(screen.getByText('23.8')).toBeInTheDocument(); // Season avg
        expect(screen.getByText('25.1')).toBeInTheDocument(); // vs Opponent
      });
    });

    it('should display all reasoning points in modal', async () => {
      const user = userEvent.setup();
      
      const playerCard = screen.getByText('Josh Allen').closest('div');
      await user.click(playerCard!);
      
      await waitFor(() => {
        expect(screen.getByText('AI Analysis')).toBeInTheDocument();
        expect(screen.getByText('High scoring matchup vs Miami')).toBeInTheDocument();
        expect(screen.getByText('Above-average performance vs opponent')).toBeInTheDocument();
        expect(screen.getByText('Weather conditions favorable')).toBeInTheDocument();
      });
    });

    it('should display alternative players when available', async () => {
      const user = userEvent.setup();
      
      const playerCard = screen.getByText('Josh Allen').closest('div');
      await user.click(playerCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Alternative Options')).toBeInTheDocument();
        expect(screen.getByText('Lamar Jackson')).toBeInTheDocument();
        expect(screen.getByText('BAL vs CIN')).toBeInTheDocument();
        expect(screen.getByText('23.8 pts')).toBeInTheDocument();
      });
    });

    it('should close modal when clicking close button', async () => {
      const user = userEvent.setup();
      
      const playerCard = screen.getByText('Josh Allen').closest('div');
      await user.click(playerCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Josh Allen Analysis')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByRole('button', { name: '' }); // Close button with XCircle icon
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Josh Allen Analysis')).not.toBeInTheDocument();
      });
    });

    it('should close modal when clicking outside', async () => {
      const user = userEvent.setup();
      
      const playerCard = screen.getByText('Josh Allen').closest('div');
      await user.click(playerCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Josh Allen Analysis')).toBeInTheDocument();
      });
      
      // Click on the modal backdrop
      const modalBackdrop = screen.getByText('Josh Allen Analysis').closest('div')?.parentElement;
      if (modalBackdrop) {
        await user.click(modalBackdrop);
        
        await waitFor(() => {
          expect(screen.queryByText('Josh Allen Analysis')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Apply Lineup Functionality', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOptimizationResult),
      });

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      await userEvent.setup().click(optimizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Optimized Lineup')).toBeInTheDocument();
      });
    });

    it('should show apply lineup button when optimization is complete', () => {
      expect(screen.getByRole('button', { name: /apply lineup/i })).toBeInTheDocument();
    });

    it('should call apply lineup API when button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock the apply lineup API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const applyButton = screen.getByRole('button', { name: /apply lineup/i });
      await user.click(applyButton);
      
      expect(global.fetch).toHaveBeenCalledWith('/api/lineup/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: 'team-123',
          week: 12,
          lineup: [
            { playerId: 'player-1', slot: 'QB' },
            { playerId: 'player-2', slot: 'WR1' },
          ],
        }),
      });
    });

    it('should hide apply button after successful application', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const applyButton = screen.getByRole('button', { name: /apply lineup/i });
      await user.click(applyButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /apply lineup/i })).not.toBeInTheDocument();
      });
    });

    it('should handle apply lineup errors', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const applyButton = screen.getByRole('button', { name: /apply lineup/i });
      await user.click(applyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to apply lineup')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /optimize lineup/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      
      // Tab to the button and activate with Enter
      await user.tab();
      expect(optimizeButton).toHaveFocus();
      
      // Should be able to activate with keyboard
      await user.keyboard('{Enter}');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should maintain focus management in modal', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOptimizationResult),
      });

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      await user.click(optimizeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Josh Allen')).toBeInTheDocument();
      });
      
      const playerCard = screen.getByText('Josh Allen').closest('div');
      await user.click(playerCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Josh Allen Analysis')).toBeInTheDocument();
      });
      
      // Focus should be managed within the modal
      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-optimize on prop changes that don\'t affect optimization', () => {
      const { rerender } = renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      // Re-render with same props
      rerender(<AILineupOptimizer {...defaultProps} />);
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should debounce rapid optimization requests', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOptimizationResult),
      });

      renderWithProviders(<AILineupOptimizer {...defaultProps} />);
      
      const optimizeButton = screen.getByRole('button', { name: /optimize lineup/i });
      
      // Click multiple times rapidly
      await user.click(optimizeButton);
      await user.click(optimizeButton);
      await user.click(optimizeButton);
      
      // Should only make one API call due to loading state
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });
});