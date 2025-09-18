import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import LiveScoringDashboard from '@/components/scoring/LiveScoringDashboard';
import '@testing-library/jest-dom';

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = WebSocket.CONNECTING;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen(new Event('open'));
    }, 10);
  }

  send(data: string) {}
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose(new CloseEvent('close'));
  }
}

global.WebSocket = MockWebSocket as any;

describe('Live Scoring Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMatchup = {
    teamA: {
      teamId: 't1',
      teamName: 'Power Squad',
      score: 89.5,
      projected: 110.2,
      players: [
        {
          playerId: 'p1',
          playerName: 'Patrick Mahomes',
          position: 'QB',
          points: 22.4,
          projected: 28.5,
          status: 'PLAYING'
        }
      ]
    },
    teamB: {
      teamId: 't2',
      teamName: 'Dynasty Kings',
      score: 92.3,
      projected: 108.7,
      players: [
        {
          playerId: 'p2',
          playerName: 'Josh Allen',
          position: 'QB',
          points: 24.8,
          projected: 27.2,
          status: 'PLAYING'
        }
      ]
    }
  };

  it('renders live scoring dashboard', () => {
    render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    expect(screen.getByText('Live Scoring')).toBeInTheDocument();
    expect(screen.getByText(/Connecting/)).toBeInTheDocument();
  });

  it('establishes WebSocket connection', async () => {
    render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Connected/)).toBeInTheDocument();
    });
  });

  it('displays real-time score updates', async () => {
    const { container } = render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    // Simulate WebSocket message
    await act(async () => {
      const ws = (global.WebSocket as any).instances[0];
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'score_update',
            data: mockMatchup
          })
        }));
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Power Squad')).toBeInTheDocument();
      expect(screen.getByText('89.5')).toBeInTheDocument();
      expect(screen.getByText('Dynasty Kings')).toBeInTheDocument();
      expect(screen.getByText('92.3')).toBeInTheDocument();
    });
  });

  it('shows play-by-play updates', async () => {
    render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    const playUpdate = {
      type: 'play_update',
      data: {
        playerId: 'p1',
        playerName: 'Patrick Mahomes',
        play: 'TD Pass to Tyreek Hill - 35 yards',
        points: 6.4,
        timestamp: Date.now()
      }
    };

    await act(async () => {
      const ws = (global.WebSocket as any).instances[0];
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify(playUpdate)
        }));
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/TD Pass to Tyreek Hill/)).toBeInTheDocument();
      expect(screen.getByText(/6.4 pts/)).toBeInTheDocument();
    });
  });

  it('displays win probability chart', async () => {
    render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    const winProbUpdate = {
      type: 'win_probability',
      data: {
        teamA: 0.48,
        teamB: 0.52,
        history: [
          { time: '1:00 PM', teamA: 0.50, teamB: 0.50 },
          { time: '1:15 PM', teamA: 0.48, teamB: 0.52 }
        ]
      }
    };

    await act(async () => {
      const ws = (global.WebSocket as any).instances[0];
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify(winProbUpdate)
        }));
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/48%/)).toBeInTheDocument();
      expect(screen.getByText(/52%/)).toBeInTheDocument();
    });
  });

  it('handles player status changes', async () => {
    render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    const statusUpdate = {
      type: 'player_status',
      data: {
        playerId: 'p1',
        playerName: 'Christian McCaffrey',
        status: 'INJURED',
        description: 'Questionable - Hamstring'
      }
    };

    await act(async () => {
      const ws = (global.WebSocket as any).instances[0];
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify(statusUpdate)
        }));
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Christian McCaffrey/)).toBeInTheDocument();
      expect(screen.getByText(/Questionable - Hamstring/)).toBeInTheDocument();
      expect(screen.getByTestId('injury-alert')).toHaveClass('text-red-500');
    });
  });

  it('shows game clock and quarter info', async () => {
    render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    const gameUpdate = {
      type: 'game_clock',
      data: {
        gameId: 'g1',
        team1: 'KC',
        team2: 'LV',
        quarter: 3,
        time: '8:45',
        score: '21-17'
      }
    };

    await act(async () => {
      const ws = (global.WebSocket as any).instances[0];
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify(gameUpdate)
        }));
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Q3 8:45/)).toBeInTheDocument();
      expect(screen.getByText(/21-17/)).toBeInTheDocument();
    });
  });

  it('handles WebSocket reconnection', async () => {
    const { rerender } = render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    // Simulate disconnect
    await act(async () => {
      const ws = (global.WebSocket as any).instances[0];
      if (ws) {
        ws.close();
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Reconnecting/)).toBeInTheDocument();
    });

    // Simulate reconnect
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for reconnect attempt
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected/)).toBeInTheDocument();
    });
  });

  it('displays projected vs actual comparison', async () => {
    render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    await act(async () => {
      const ws = (global.WebSocket as any).instances[0];
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'score_update',
            data: mockMatchup
          })
        }));
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/89.5/)).toBeInTheDocument(); // Actual
      expect(screen.getByText(/110.2/)).toBeInTheDocument(); // Projected
      expect(screen.getByTestId('projection-variance')).toBeInTheDocument();
    });
  });

  it('allows filtering by game status', () => {
    render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    const filterButtons = ['All Games', 'Live', 'Final', 'Upcoming'];
    
    filterButtons.forEach(filter => {
      const button = screen.getByText(filter);
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(button).toHaveClass('bg-blue-500');
    });
  });

  it('exports scoring data', async () => {
    render(<LiveScoringDashboard leagueId="league123" userId="user123" />);
    
    await act(async () => {
      const ws = (global.WebSocket as any).instances[0];
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'score_update',
            data: mockMatchup
          })
        }));
      }
    });

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    expect(screen.getByText(/Export Format/)).toBeInTheDocument();
  });
});