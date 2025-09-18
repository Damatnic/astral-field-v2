import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import SocialHub from '@/components/social/SocialHub';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

describe('Social Hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockLeagueId = 'league123';
  const mockUserId = 'user123';
  const mockUserName = 'TestUser';

  it('renders social hub with all tabs', () => {
    render(
      <SocialHub 
        leagueId={mockLeagueId} 
        userId={mockUserId}
        userName={mockUserName}
      />
    );
    
    expect(screen.getByText('League Chat')).toBeInTheDocument();
    expect(screen.getByText('Trophy Room')).toBeInTheDocument();
    expect(screen.getByText('Trash Talk')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(
      <SocialHub 
        leagueId={mockLeagueId} 
        userId={mockUserId}
        userName={mockUserName}
      />
    );
    
    const chatTab = screen.getByText('League Chat');
    const trophyTab = screen.getByText('Trophy Room');
    const trashTab = screen.getByText('Trash Talk');
    
    fireEvent.click(trophyTab);
    expect(screen.getByText(/Achievements & Trophies/)).toBeInTheDocument();
    
    fireEvent.click(trashTab);
    expect(screen.getByText(/Quick Burns/)).toBeInTheDocument();
    
    fireEvent.click(chatTab);
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  describe('League Chat', () => {
    it('sends a message', async () => {
      const mockResponse = {
        success: true,
        message: {
          id: 'm1',
          userId: mockUserId,
          userName: mockUserName,
          message: 'Hello team!',
          timestamp: Date.now()
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByTestId('send-message');
      
      fireEvent.change(input, { target: { value: 'Hello team!' } });
      
      await act(async () => {
        fireEvent.click(sendButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Hello team!')).toBeInTheDocument();
        expect(input.value).toBe('');
      });
    });

    it('displays message reactions', async () => {
      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      // Simulate existing message with reactions
      const mockMessages = [
        {
          id: 'm1',
          userName: 'Player1',
          message: 'Great trade!',
          timestamp: Date.now(),
          reactions: {
            '👍': 3,
            '🔥': 2
          }
        }
      ];

      await act(async () => {
        // Simulate loading messages
        screen.getByText('League Chat').click();
      });

      const reactionButton = screen.getByTestId('add-reaction');
      fireEvent.click(reactionButton);
      
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('shows typing indicators', async () => {
      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      const input = screen.getByPlaceholderText('Type a message...');
      
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Typing...' } });
      
      // Simulate other user typing
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });
  });

  describe('Trophy Room', () => {
    it('displays achievements', async () => {
      const mockAchievements = {
        success: true,
        achievements: [
          {
            id: 'a1',
            name: 'Championship Winner',
            description: 'Won the league championship',
            icon: '🏆',
            rarity: 'legendary',
            unlockedAt: '2024-01-01'
          },
          {
            id: 'a2',
            name: 'Trade Master',
            description: 'Completed 10 successful trades',
            icon: '💱',
            rarity: 'rare',
            unlockedAt: '2023-12-15'
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAchievements
      });

      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      fireEvent.click(screen.getByText('Trophy Room'));
      
      await waitFor(() => {
        expect(screen.getByText('Championship Winner')).toBeInTheDocument();
        expect(screen.getByText('Trade Master')).toBeInTheDocument();
        expect(screen.getByText('🏆')).toBeInTheDocument();
      });
    });

    it('shows achievement rarity', async () => {
      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      fireEvent.click(screen.getByText('Trophy Room'));
      
      await waitFor(() => {
        expect(screen.getByTestId('rarity-legendary')).toHaveClass('text-yellow-500');
        expect(screen.getByTestId('rarity-epic')).toHaveClass('text-purple-500');
        expect(screen.getByTestId('rarity-rare')).toHaveClass('text-blue-500');
      });
    });

    it('displays locked achievements', () => {
      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      fireEvent.click(screen.getByText('Trophy Room'));
      
      const lockedAchievements = screen.getAllByTestId('locked-achievement');
      expect(lockedAchievements.length).toBeGreaterThan(0);
      expect(lockedAchievements[0]).toHaveClass('opacity-50');
    });
  });

  describe('Trash Talk Board', () => {
    it('posts a trash talk message', async () => {
      const mockResponse = {
        success: true,
        post: {
          id: 'tt1',
          userId: mockUserId,
          userName: mockUserName,
          message: 'My team is unstoppable!',
          timestamp: Date.now(),
          likes: 0
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      fireEvent.click(screen.getByText('Trash Talk'));
      
      const input = screen.getByPlaceholderText('Drop your best trash talk...');
      const postButton = screen.getByText('Post');
      
      fireEvent.change(input, { target: { value: 'My team is unstoppable!' } });
      
      await act(async () => {
        fireEvent.click(postButton);
      });

      await waitFor(() => {
        expect(screen.getByText('My team is unstoppable!')).toBeInTheDocument();
      });
    });

    it('uses quick burns', async () => {
      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      fireEvent.click(screen.getByText('Trash Talk'));
      
      const quickBurn = screen.getByText("Your lineup's weaker than my bench!");
      fireEvent.click(quickBurn);
      
      const input = screen.getByPlaceholderText('Drop your best trash talk...');
      expect(input.value).toBe("Your lineup's weaker than my bench!");
    });

    it('likes trash talk posts', async () => {
      const mockResponse = {
        success: true,
        likes: 5
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      fireEvent.click(screen.getByText('Trash Talk'));
      
      const likeButton = screen.getByTestId('like-button');
      
      await act(async () => {
        fireEvent.click(likeButton);
      });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('shows recent trash talk history', async () => {
      const mockHistory = {
        success: true,
        posts: [
          {
            id: 'tt1',
            userName: 'Player1',
            message: 'Championship incoming!',
            timestamp: Date.now() - 3600000,
            likes: 8
          },
          {
            id: 'tt2',
            userName: 'Player2',
            message: 'Not if I have anything to say about it!',
            timestamp: Date.now() - 1800000,
            likes: 12
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory
      });

      render(
        <SocialHub 
          leagueId={mockLeagueId} 
          userId={mockUserId}
          userName={mockUserName}
        />
      );
      
      fireEvent.click(screen.getByText('Trash Talk'));
      
      await waitFor(() => {
        expect(screen.getByText('Championship incoming!')).toBeInTheDocument();
        expect(screen.getByText('Not if I have anything to say about it!')).toBeInTheDocument();
      });
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(
      <SocialHub 
        leagueId={mockLeagueId} 
        userId={mockUserId}
        userName={mockUserName}
      />
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByTestId('send-message');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
    });
  });

  it('shows notification badges for unread items', () => {
    render(
      <SocialHub 
        leagueId={mockLeagueId} 
        userId={mockUserId}
        userName={mockUserName}
        unreadMessages={5}
        newAchievements={2}
      />
    );
    
    expect(screen.getByTestId('chat-badge')).toHaveTextContent('5');
    expect(screen.getByTestId('trophy-badge')).toHaveTextContent('2');
  });
});