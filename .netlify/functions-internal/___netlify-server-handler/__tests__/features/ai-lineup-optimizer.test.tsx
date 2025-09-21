import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import AILineupOptimizer from '@/components/lineup/AILineupOptimizer';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

describe('AI Lineup Optimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRoster = [
    {
      playerId: 'p1',
      playerName: 'Patrick Mahomes',
      position: 'QB',
      team: 'KC',
      opponent: 'LV',
      projectedPoints: 28.5,
      status: 'ACTIVE'
    },
    {
      playerId: 'p2',
      playerName: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF',
      opponent: 'SEA',
      projectedPoints: 22.3,
      status: 'ACTIVE'
    },
    {
      playerId: 'p3',
      playerName: 'Tyreek Hill',
      position: 'WR',
      team: 'MIA',
      opponent: 'BUF',
      projectedPoints: 18.7,
      status: 'ACTIVE'
    }
  ];

  it('renders lineup optimizer component', () => {
    render(<AILineupOptimizer roster={mockRoster} />);
    expect(screen.getByText('AI Lineup Optimizer')).toBeInTheDocument();
    expect(screen.getByText('Optimize Lineup')).toBeInTheDocument();
  });

  it('displays loading state when optimizing', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<AILineupOptimizer roster={mockRoster} />);
    
    const button = screen.getByText('Optimize Lineup');
    fireEvent.click(button);
    
    expect(screen.getByText('Analyzing roster...')).toBeInTheDocument();
  });

  it('displays optimization results', async () => {
    const mockResponse = {
      success: true,
      optimization: {
        optimalLineup: mockRoster,
        projectedPoints: 69.5,
        confidence: 0.85,
        winProbability: 0.72,
        recommendations: [
          {
            type: 'weather',
            player: 'Tyreek Hill',
            message: 'Strong winds expected, consider benching',
            impact: -3.2
          }
        ]
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AILineupOptimizer roster={mockRoster} />);
    
    const button = screen.getByText('Optimize Lineup');
    
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText('69.5')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('72%')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<AILineupOptimizer roster={mockRoster} />);
    
    const button = screen.getByText('Optimize Lineup');
    
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to optimize lineup/)).toBeInTheDocument();
    });
  });

  it('filters players by position', () => {
    render(<AILineupOptimizer roster={mockRoster} />);
    
    const qbFilter = screen.getByText('QB');
    fireEvent.click(qbFilter);
    
    expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument();
    expect(screen.queryByText('Christian McCaffrey')).not.toBeInTheDocument();
  });

  it('displays confidence scores for each player', async () => {
    const mockResponse = {
      success: true,
      optimization: {
        optimalLineup: mockRoster.map(p => ({
          ...p,
          confidence: Math.random() * 0.3 + 0.7,
          floor: p.projectedPoints * 0.8,
          ceiling: p.projectedPoints * 1.3
        })),
        projectedPoints: 69.5,
        confidence: 0.85,
        winProbability: 0.72,
        recommendations: []
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AILineupOptimizer roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Optimize Lineup'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Floor:/)).toBeInTheDocument();
      expect(screen.getByText(/Ceiling:/)).toBeInTheDocument();
    });
  });

  it('allows manual lineup adjustments after optimization', async () => {
    const mockResponse = {
      success: true,
      optimization: {
        optimalLineup: mockRoster,
        projectedPoints: 69.5,
        confidence: 0.85,
        winProbability: 0.72,
        recommendations: []
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const onLineupChange = jest.fn();
    render(<AILineupOptimizer roster={mockRoster} onLineupChange={onLineupChange} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Optimize Lineup'));
    });

    await waitFor(() => {
      const applyButton = screen.getByText('Apply Lineup');
      fireEvent.click(applyButton);
      expect(onLineupChange).toHaveBeenCalledWith(mockRoster);
    });
  });

  it('shows weather impact warnings', async () => {
    const mockResponse = {
      success: true,
      optimization: {
        optimalLineup: mockRoster,
        projectedPoints: 69.5,
        confidence: 0.85,
        winProbability: 0.72,
        recommendations: [
          {
            type: 'weather',
            player: 'Tyreek Hill',
            message: 'Strong winds (25+ mph) expected',
            impact: -3.2
          }
        ]
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AILineupOptimizer roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Optimize Lineup'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Strong winds/)).toBeInTheDocument();
      expect(screen.getByText(/-3.2/)).toBeInTheDocument();
    });
  });

  it('calculates alternative lineups', async () => {
    render(<AILineupOptimizer roster={mockRoster} />);
    
    const strategyButton = screen.getByText(/High Floor/);
    fireEvent.click(strategyButton);
    
    expect(screen.getByText(/Optimizing for high floor/)).toBeInTheDocument();
  });

  it('exports lineup data', async () => {
    const mockResponse = {
      success: true,
      optimization: {
        optimalLineup: mockRoster,
        projectedPoints: 69.5,
        confidence: 0.85,
        winProbability: 0.72,
        recommendations: []
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AILineupOptimizer roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Optimize Lineup'));
    });

    await waitFor(() => {
      const exportButton = screen.getByText(/Export/);
      expect(exportButton).toBeInTheDocument();
    });
  });
});