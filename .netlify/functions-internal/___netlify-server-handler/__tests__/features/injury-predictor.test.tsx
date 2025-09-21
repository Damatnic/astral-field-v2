import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import InjuryPredictor from '@/components/injury/InjuryPredictor';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

describe('Injury Predictor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRoster = [
    {
      playerId: 'p1',
      playerName: 'Saquon Barkley',
      position: 'RB',
      team: 'NYG',
      age: 26,
      injuryHistory: ['Ankle - 2022', 'ACL - 2020'],
      currentStatus: 'ACTIVE',
      gamesPlayed: 14,
      snapCount: 850
    },
    {
      playerId: 'p2',
      playerName: 'Mike Evans',
      position: 'WR',
      team: 'TB',
      age: 30,
      injuryHistory: ['Hamstring - 2023'],
      currentStatus: 'QUESTIONABLE',
      gamesPlayed: 16,
      snapCount: 950
    },
    {
      playerId: 'p3',
      playerName: 'Travis Kelce',
      position: 'TE',
      team: 'KC',
      age: 34,
      injuryHistory: [],
      currentStatus: 'ACTIVE',
      gamesPlayed: 17,
      snapCount: 1100
    }
  ];

  it('renders injury predictor component', () => {
    render(<InjuryPredictor roster={mockRoster} />);
    expect(screen.getByText('Injury Risk Analysis')).toBeInTheDocument();
    expect(screen.getByText('Analyze Risk')).toBeInTheDocument();
  });

  it('displays player injury history', () => {
    render(<InjuryPredictor roster={mockRoster} />);
    
    expect(screen.getByText('Saquon Barkley')).toBeInTheDocument();
    expect(screen.getByText(/Ankle - 2022/)).toBeInTheDocument();
    expect(screen.getByText(/ACL - 2020/)).toBeInTheDocument();
  });

  it('calculates injury risk scores', async () => {
    const mockResponse = {
      success: true,
      predictions: [
        {
          playerId: 'p1',
          playerName: 'Saquon Barkley',
          riskScore: 72,
          confidence: 0.85,
          riskFactors: [
            'Previous ACL injury',
            'High workload (850+ snaps)',
            'RB position vulnerability'
          ],
          projectedGamesImpacted: 2.3
        },
        {
          playerId: 'p2',
          playerName: 'Mike Evans',
          riskScore: 45,
          confidence: 0.78,
          riskFactors: [
            'Recent hamstring issue',
            'Age 30+'
          ],
          projectedGamesImpacted: 1.1
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<InjuryPredictor roster={mockRoster} />);
    
    const button = screen.getByText('Analyze Risk');
    
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Previous ACL injury')).toBeInTheDocument();
    });
  });

  it('shows risk level indicators with colors', async () => {
    const mockResponse = {
      success: true,
      predictions: [
        {
          playerId: 'p1',
          riskScore: 85,
          riskLevel: 'HIGH',
          confidence: 0.88
        },
        {
          playerId: 'p2',
          riskScore: 45,
          riskLevel: 'MEDIUM',
          confidence: 0.75
        },
        {
          playerId: 'p3',
          riskScore: 15,
          riskLevel: 'LOW',
          confidence: 0.92
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<InjuryPredictor roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Risk'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('risk-high')).toHaveClass('bg-red-500');
      expect(screen.getByTestId('risk-medium')).toHaveClass('bg-yellow-500');
      expect(screen.getByTestId('risk-low')).toHaveClass('bg-green-500');
    });
  });

  it('provides backup player recommendations', async () => {
    const mockResponse = {
      success: true,
      predictions: [
        {
          playerId: 'p1',
          riskScore: 75,
          backupRecommendations: [
            {
              playerId: 'b1',
              playerName: 'Tony Pollard',
              position: 'RB',
              availability: 'FA',
              projectedPoints: 12.5
            },
            {
              playerId: 'b2',
              playerName: 'Rachaad White',
              position: 'RB',
              availability: 'WAIVER',
              projectedPoints: 11.8
            }
          ]
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<InjuryPredictor roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Risk'));
    });

    await waitFor(() => {
      expect(screen.getByText('Backup Options')).toBeInTheDocument();
      expect(screen.getByText('Tony Pollard')).toBeInTheDocument();
      expect(screen.getByText('Rachaad White')).toBeInTheDocument();
    });
  });

  it('displays workload analysis', async () => {
    const mockResponse = {
      success: true,
      predictions: [
        {
          playerId: 'p1',
          workloadAnalysis: {
            snapPercentage: 78,
            touchesPerGame: 22.5,
            targetShare: 0.15,
            trend: 'INCREASING',
            fatigueFactor: 0.68
          }
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<InjuryPredictor roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Risk'));
    });

    await waitFor(() => {
      expect(screen.getByText(/78% snap share/)).toBeInTheDocument();
      expect(screen.getByText(/22.5 touches\/game/)).toBeInTheDocument();
      expect(screen.getByText(/Workload: INCREASING/)).toBeInTheDocument();
    });
  });

  it('shows historical injury patterns', async () => {
    const mockResponse = {
      success: true,
      predictions: [
        {
          playerId: 'p1',
          historicalPatterns: {
            averageGamesPlayed: 14.2,
            injuryFrequency: 0.35,
            recoveryTime: '2-3 weeks average',
            recurringTypes: ['Soft tissue', 'Lower body']
          }
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<InjuryPredictor roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Risk'));
    });

    await waitFor(() => {
      expect(screen.getByText(/14.2 games per season/)).toBeInTheDocument();
      expect(screen.getByText(/2-3 weeks average/)).toBeInTheDocument();
      expect(screen.getByText(/Soft tissue/)).toBeInTheDocument();
    });
  });

  it('filters players by risk level', async () => {
    const mockResponse = {
      success: true,
      predictions: mockRoster.map((p, i) => ({
        ...p,
        riskScore: [85, 45, 15][i],
        riskLevel: ['HIGH', 'MEDIUM', 'LOW'][i]
      }))
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<InjuryPredictor roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Risk'));
    });

    await waitFor(() => {
      const highRiskFilter = screen.getByText('High Risk Only');
      fireEvent.click(highRiskFilter);
      
      expect(screen.getByText('Saquon Barkley')).toBeInTheDocument();
      expect(screen.queryByText('Travis Kelce')).not.toBeInTheDocument();
    });
  });

  it('exports injury report', async () => {
    const mockResponse = {
      success: true,
      predictions: mockRoster.map(p => ({
        ...p,
        riskScore: Math.floor(Math.random() * 100)
      }))
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<InjuryPredictor roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Risk'));
    });

    await waitFor(() => {
      const exportButton = screen.getByText('Export Report');
      expect(exportButton).toBeInTheDocument();
      fireEvent.click(exportButton);
      expect(screen.getByText(/CSV/)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<InjuryPredictor roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Risk'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to analyze injury risk/)).toBeInTheDocument();
    });
  });

  it('shows confidence scores for predictions', async () => {
    const mockResponse = {
      success: true,
      predictions: [
        {
          playerId: 'p1',
          riskScore: 72,
          confidence: 0.92,
          confidenceFactors: [
            'Extensive injury history data',
            'Similar player comparisons available',
            'Recent medical reports'
          ]
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<InjuryPredictor roster={mockRoster} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Risk'));
    });

    await waitFor(() => {
      expect(screen.getByText('92% confidence')).toBeInTheDocument();
      expect(screen.getByText(/Extensive injury history data/)).toBeInTheDocument();
    });
  });
});