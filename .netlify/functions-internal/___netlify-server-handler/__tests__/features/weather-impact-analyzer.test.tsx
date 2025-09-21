import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import WeatherImpactAnalyzer from '@/components/weather/WeatherImpactAnalyzer';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

describe('Weather Impact Analyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockGames = [
    {
      gameId: 'g1',
      homeTeam: 'GB',
      awayTeam: 'CHI',
      location: 'Green Bay, WI',
      kickoff: '2024-01-14T18:00:00Z',
      stadium: 'Lambeau Field',
      surface: 'grass'
    },
    {
      gameId: 'g2',
      homeTeam: 'MIA',
      awayTeam: 'BUF',
      location: 'Miami, FL',
      kickoff: '2024-01-14T21:00:00Z',
      stadium: 'Hard Rock Stadium',
      surface: 'grass'
    }
  ];

  const mockPlayers = [
    {
      playerId: 'p1',
      playerName: 'Aaron Rodgers',
      position: 'QB',
      team: 'GB',
      gameId: 'g1'
    },
    {
      playerId: 'p2',
      playerName: 'Tyreek Hill',
      position: 'WR',
      team: 'MIA',
      gameId: 'g2'
    }
  ];

  it('renders weather impact analyzer', () => {
    render(<WeatherImpactAnalyzer games={mockGames} players={mockPlayers} />);
    expect(screen.getByText('Weather Impact Analysis')).toBeInTheDocument();
    expect(screen.getByText('Analyze Weather')).toBeInTheDocument();
  });

  it('fetches and displays weather data', async () => {
    const mockResponse = {
      success: true,
      weatherData: [
        {
          gameId: 'g1',
          temperature: 18,
          windSpeed: 22,
          precipitation: 0.8,
          humidity: 75,
          conditions: 'Snow',
          impact: {
            passing: -15,
            rushing: -5,
            kicking: -25
          }
        },
        {
          gameId: 'g2',
          temperature: 82,
          windSpeed: 8,
          precipitation: 0,
          humidity: 65,
          conditions: 'Clear',
          impact: {
            passing: 0,
            rushing: 0,
            kicking: 0
          }
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<WeatherImpactAnalyzer games={mockGames} players={mockPlayers} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Weather'));
    });

    await waitFor(() => {
      expect(screen.getByText(/18°F/)).toBeInTheDocument();
      expect(screen.getByText(/Snow/)).toBeInTheDocument();
      expect(screen.getByText(/22 mph winds/)).toBeInTheDocument();
    });
  });

  it('shows position-specific impacts', async () => {
    const mockResponse = {
      success: true,
      playerImpacts: [
        {
          playerId: 'p1',
          playerName: 'Aaron Rodgers',
          position: 'QB',
          weatherImpact: -3.2,
          adjustedProjection: 22.8,
          factors: ['Snow affects passing accuracy', 'Cold weather reduces grip']
        },
        {
          playerId: 'p2',
          playerName: 'Tyreek Hill',
          position: 'WR',
          weatherImpact: 0,
          adjustedProjection: 18.5,
          factors: ['Favorable conditions']
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<WeatherImpactAnalyzer games={mockGames} players={mockPlayers} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Weather'));
    });

    await waitFor(() => {
      expect(screen.getByText('Aaron Rodgers')).toBeInTheDocument();
      expect(screen.getByText(/-3.2 pts/)).toBeInTheDocument();
      expect(screen.getByText(/Snow affects passing accuracy/)).toBeInTheDocument();
    });
  });

  it('displays severe weather warnings', async () => {
    const mockResponse = {
      success: true,
      warnings: [
        {
          gameId: 'g1',
          severity: 'HIGH',
          message: 'Blizzard conditions expected',
          recommendation: 'Consider benching pass-catchers'
        }
      ],
      weatherData: [
        {
          gameId: 'g1',
          temperature: 10,
          windSpeed: 35,
          conditions: 'Blizzard'
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<WeatherImpactAnalyzer games={mockGames} players={mockPlayers} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Weather'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Blizzard conditions expected/)).toBeInTheDocument();
      expect(screen.getByText(/Consider benching pass-catchers/)).toBeInTheDocument();
      expect(screen.getByTestId('severe-warning')).toHaveClass('bg-red-100');
    });
  });

  it('shows historical weather performance', async () => {
    const mockResponse = {
      success: true,
      historicalData: [
        {
          playerId: 'p1',
          playerName: 'Aaron Rodgers',
          coldWeatherStats: {
            gamesPlayed: 25,
            averagePoints: 21.3,
            variance: -2.8
          },
          windyConditions: {
            gamesPlayed: 18,
            averagePoints: 19.5,
            variance: -4.6
          }
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<WeatherImpactAnalyzer games={mockGames} players={mockPlayers} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Weather'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Cold Weather: 21.3 pts avg/)).toBeInTheDocument();
      expect(screen.getByText(/Windy: 19.5 pts avg/)).toBeInTheDocument();
      expect(screen.getByText(/-4.6 vs normal/)).toBeInTheDocument();
    });
  });

  it('provides lineup recommendations', async () => {
    const mockResponse = {
      success: true,
      recommendations: [
        {
          action: 'BENCH',
          player: 'Will Lutz',
          position: 'K',
          reason: 'High winds (25+ mph) severely impact kicking'
        },
        {
          action: 'START',
          player: 'Nick Chubb',
          position: 'RB',
          reason: 'Running games thrive in poor weather'
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<WeatherImpactAnalyzer games={mockGames} players={mockPlayers} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Weather'));
    });

    await waitFor(() => {
      expect(screen.getByText(/BENCH: Will Lutz/)).toBeInTheDocument();
      expect(screen.getByText(/START: Nick Chubb/)).toBeInTheDocument();
      expect(screen.getByText(/High winds.*severely impact kicking/)).toBeInTheDocument();
    });
  });

  it('filters by weather severity', () => {
    render(<WeatherImpactAnalyzer games={mockGames} players={mockPlayers} />);
    
    const filters = ['All', 'Severe', 'Moderate', 'Minimal'];
    
    filters.forEach(filter => {
      const button = screen.getByText(filter);
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Weather API Error'));

    render(<WeatherImpactAnalyzer games={mockGames} players={mockPlayers} />);
    
    await act(async () => {
      fireEvent.click(screen.getByText('Analyze Weather'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch weather data/)).toBeInTheDocument();
    });
  });
});