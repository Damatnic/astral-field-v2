import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import AdvancedTradeAnalyzer from '@/components/trade/AdvancedTradeAnalyzer';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

describe('Advanced Trade Analyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTeamPlayers = [
    {
      playerId: 't1',
      playerName: 'Justin Jefferson',
      position: 'WR',
      team: 'MIN',
      age: 24,
      dynastyValue: 95,
      projectedPoints: 19.5
    },
    {
      playerId: 't2',
      playerName: 'Josh Jacobs',
      position: 'RB',
      team: 'LV',
      age: 26,
      dynastyValue: 72,
      projectedPoints: 16.3
    }
  ];

  const mockTradePlayers = [
    {
      playerId: 'p1',
      playerName: 'CeeDee Lamb',
      position: 'WR',
      team: 'DAL',
      age: 25,
      dynastyValue: 88,
      projectedPoints: 18.2
    },
    {
      playerId: 'p2',
      playerName: 'Travis Etienne',
      position: 'RB',
      team: 'JAC',
      age: 24,
      dynastyValue: 68,
      projectedPoints: 14.8
    }
  ];

  it('renders trade analyzer component', () => {
    render(<AdvancedTradeAnalyzer />);
    expect(screen.getByText('Advanced Trade Analyzer')).toBeInTheDocument();
    expect(screen.getByText('Your Players')).toBeInTheDocument();
    expect(screen.getByText('Trade Partners Players')).toBeInTheDocument();
  });

  it('adds players to trade sides', () => {
    render(<AdvancedTradeAnalyzer />);
    
    const yourPlayerSelect = screen.getByLabelText('Add Your Player');
    const tradePlayerSelect = screen.getByLabelText('Add Trade Player');
    
    fireEvent.change(yourPlayerSelect, { target: { value: 't1' } });
    fireEvent.change(tradePlayerSelect, { target: { value: 'p1' } });
    
    expect(screen.getByText('Justin Jefferson')).toBeInTheDocument();
    expect(screen.getByText('CeeDee Lamb')).toBeInTheDocument();
  });

  it('analyzes trade fairness', async () => {
    const mockResponse = {
      success: true,
      analysis: {
        fairnessScore: 85,
        teamAValue: 167,
        teamBValue: 156,
        winProbabilityImpact: 0.03,
        dynastyImpact: {
          year1: -2.5,
          year2: 1.8,
          year3: 4.2
        },
        recommendation: 'Slightly favors Team A',
        warnings: ['Age difference significant']
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AdvancedTradeAnalyzer />);
    
    const analyzeButton = screen.getByText('Analyze Trade');
    
    await act(async () => {
      fireEvent.click(analyzeButton);
    });

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('Slightly favors Team A')).toBeInTheDocument();
      expect(screen.getByText('Age difference significant')).toBeInTheDocument();
    });
  });

  it('displays dynasty value projections', async () => {
    const mockResponse = {
      success: true,
      analysis: {
        fairnessScore: 78,
        teamAValue: 167,
        teamBValue: 156,
        winProbabilityImpact: 0.03,
        dynastyImpact: {
          year1: -2.5,
          year2: 1.8,
          year3: 4.2,
          projections: {
            teamA: [167, 165, 170],
            teamB: [156, 160, 158]
          }
        },
        recommendation: 'Fair trade'
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AdvancedTradeAnalyzer />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Trade'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Year 1:/)).toBeInTheDocument();
      expect(screen.getByText(/-2.5/)).toBeInTheDocument();
      expect(screen.getByText(/Year 3:/)).toBeInTheDocument();
      expect(screen.getByText(/4.2/)).toBeInTheDocument();
    });
  });

  it('handles multiple player trades', async () => {
    render(<AdvancedTradeAnalyzer />);
    
    // Add multiple players to each side
    const addYourPlayer = screen.getByTestId('add-your-player');
    const addTradePlayer = screen.getByTestId('add-trade-player');
    
    fireEvent.click(addYourPlayer);
    fireEvent.select(screen.getByLabelText('Select Player'), mockTeamPlayers[0]);
    
    fireEvent.click(addYourPlayer);
    fireEvent.select(screen.getByLabelText('Select Player'), mockTeamPlayers[1]);
    
    fireEvent.click(addTradePlayer);
    fireEvent.select(screen.getByLabelText('Select Player'), mockTradePlayers[0]);
    
    expect(screen.getAllByTestId('player-card')).toHaveLength(3);
  });

  it('includes draft picks in trade analysis', async () => {
    render(<AdvancedTradeAnalyzer />);
    
    const addPickButton = screen.getByText('Add Draft Pick');
    fireEvent.click(addPickButton);
    
    const yearSelect = screen.getByLabelText('Year');
    const roundSelect = screen.getByLabelText('Round');
    
    fireEvent.change(yearSelect, { target: { value: '2025' } });
    fireEvent.change(roundSelect, { target: { value: '1' } });
    
    expect(screen.getByText('2025 1st Round')).toBeInTheDocument();
  });

  it('shows trade history comparison', async () => {
    const mockResponse = {
      success: true,
      analysis: {
        fairnessScore: 82,
        historicalComparison: {
          similarTrades: 15,
          averageFairness: 79,
          percentile: 68
        }
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AdvancedTradeAnalyzer />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Trade'));
    });

    await waitFor(() => {
      expect(screen.getByText(/15 similar trades/)).toBeInTheDocument();
      expect(screen.getByText(/68th percentile/)).toBeInTheDocument();
    });
  });

  it('provides counter-offer suggestions', async () => {
    const mockResponse = {
      success: true,
      analysis: {
        fairnessScore: 65,
        counterOffers: [
          {
            description: 'Add 2025 2nd round pick',
            newFairness: 83
          },
          {
            description: 'Replace Josh Jacobs with Nick Chubb',
            newFairness: 79
          }
        ]
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AdvancedTradeAnalyzer />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Trade'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Counter-Offer Suggestions/)).toBeInTheDocument();
      expect(screen.getByText(/Add 2025 2nd round pick/)).toBeInTheDocument();
      expect(screen.getByText(/New Fairness: 83/)).toBeInTheDocument();
    });
  });

  it('calculates positional scarcity impact', async () => {
    const mockResponse = {
      success: true,
      analysis: {
        fairnessScore: 75,
        scarcityAnalysis: {
          rbScarcity: 0.85,
          wrScarcity: 0.45,
          impact: 'RB scarcity increases trade value by 8%'
        }
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<AdvancedTradeAnalyzer />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Trade'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Positional Scarcity/)).toBeInTheDocument();
      expect(screen.getByText(/RB scarcity increases trade value/)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<AdvancedTradeAnalyzer />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Trade'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to analyze trade/)).toBeInTheDocument();
    });
  });
});