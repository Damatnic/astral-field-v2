import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LeagueChat } from '@/components/chat/league-chat'
import { useLeagueChat } from '@/hooks/use-websocket'

// Mock the WebSocket hook
jest.mock('@/hooks/use-websocket')
const mockUseLeagueChat = useLeagueChat as jest.MockedFunction<typeof useLeagueChat>

const mockMessages = [
  {
    id: 'msg1',
    userId: 'user1',
    userName: 'John Doe',
    message: 'Who wants to trade for a RB?',
    timestamp: new Date('2024-09-22T14:30:00Z'),
    leagueId: 'league1',
    type: 'TEXT' as const
  },
  {
    id: 'msg2', 
    userId: 'user2',
    userName: 'Jane Smith',
    message: 'I have Saquon available',
    timestamp: new Date('2024-09-22T14:32:00Z'),
    leagueId: 'league1',
    type: 'TEXT' as const
  },
  {
    id: 'msg3',
    userId: 'user1',
    userName: 'John Doe',
    message: 'Trade proposal sent to Jane Smith',
    timestamp: new Date('2024-09-22T14:35:00Z'),
    leagueId: 'league1',
    type: 'TRADE' as const
  },
  {
    id: 'msg4',
    userId: 'system',
    userName: 'System',
    message: 'Week 14 waivers cleared',
    timestamp: new Date('2024-09-22T14:40:00Z'),
    leagueId: 'league1',
    type: 'ANNOUNCEMENT' as const
  }
]

const mockTypingUsers = [
  {
    userId: 'user3',
    userName: 'Bob Wilson',
    timestamp: new Date()
  }
]

const mockChatActions = {
  sendMessage: jest.fn(),
  joinChat: jest.fn(),
  leaveChat: jest.fn(),
  startTyping: jest.fn(),
  stopTyping: jest.fn()
}

describe('LeagueChat Component', () => {
  const defaultProps = {
    leagueId: 'league1',
    currentUserId: 'user1',
    currentUserName: 'John Doe'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLeagueChat.mockReturnValue({
      messages: mockMessages,
      typingUsers: mockTypingUsers,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockChatActions
    })
  })

  it('renders league chat interface correctly', () => {
    render(<LeagueChat {...defaultProps} />)
    
    expect(screen.getByText('League Chat')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('displays chat messages correctly', () => {
    render(<LeagueChat {...defaultProps} />)
    
    expect(screen.getByText('Who wants to trade for a RB?')).toBeInTheDocument()
    expect(screen.getByText('I have Saquon available')).toBeInTheDocument()
    expect(screen.getByText('Trade proposal sent to Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Week 14 waivers cleared')).toBeInTheDocument()
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('shows message timestamps', () => {
    render(<LeagueChat {...defaultProps} />)
    
    // Should show relative timestamps
    expect(screen.getByText(/2:30 PM/)).toBeInTheDocument()
    expect(screen.getByText(/2:32 PM/)).toBeInTheDocument()
  })

  it('distinguishes message types with different styling', () => {
    render(<LeagueChat {...defaultProps} />)
    
    const textMessage = screen.getByText('Who wants to trade for a RB?').closest('.message')
    const tradeMessage = screen.getByText('Trade proposal sent to Jane Smith').closest('.message')
    const announcementMessage = screen.getByText('Week 14 waivers cleared').closest('.message')
    
    expect(textMessage).toHaveClass('bg-white')
    expect(tradeMessage).toHaveClass('bg-blue-50')
    expect(announcementMessage).toHaveClass('bg-yellow-50')
  })

  it('highlights current user messages differently', () => {
    render(<LeagueChat {...defaultProps} />)
    
    const userMessage = screen.getByText('Who wants to trade for a RB?').closest('.message')
    const otherMessage = screen.getByText('I have Saquon available').closest('.message')
    
    expect(userMessage).toHaveClass('ml-auto', 'bg-blue-500')
    expect(otherMessage).not.toHaveClass('ml-auto')
  })

  it('sends message when send button is clicked', async () => {
    render(<LeagueChat {...defaultProps} />)
    
    const messageInput = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    fireEvent.change(messageInput, { target: { value: 'Looking for a WR trade' } })
    fireEvent.click(sendButton)
    
    expect(mockChatActions.sendMessage).toHaveBeenCalledWith('Looking for a WR trade', 'TEXT')
    
    await waitFor(() => {
      expect(messageInput).toHaveValue('')
    })
  })

  it('sends message when Enter key is pressed', () => {
    render(<LeagueChat {...defaultProps} />)
    
    const messageInput = screen.getByPlaceholderText('Type your message...')
    
    fireEvent.change(messageInput, { target: { value: 'Need a QB for playoffs' } })
    fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter' })
    
    expect(mockChatActions.sendMessage).toHaveBeenCalledWith('Need a QB for playoffs', 'TEXT')
  })

  it('does not send empty messages', () => {
    render(<LeagueChat {...defaultProps} />)
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(sendButton)
    
    expect(mockChatActions.sendMessage).not.toHaveBeenCalled()
  })

  it('shows typing indicators', () => {
    render(<LeagueChat {...defaultProps} />)
    
    expect(screen.getByText('Bob Wilson is typing...')).toBeInTheDocument()
  })

  it('starts and stops typing indicators', () => {
    render(<LeagueChat {...defaultProps} />)
    
    const messageInput = screen.getByPlaceholderText('Type your message...')
    
    // Start typing
    fireEvent.focus(messageInput)
    fireEvent.change(messageInput, { target: { value: 'T' } })
    
    expect(mockChatActions.startTyping).toHaveBeenCalled()
    
    // Stop typing after delay (simulated)
    fireEvent.change(messageInput, { target: { value: '' } })
    
    setTimeout(() => {
      expect(mockChatActions.stopTyping).toHaveBeenCalled()
    }, 1000)
  })

  it('scrolls to bottom when new messages arrive', () => {
    const scrollIntoViewMock = jest.fn()
    Element.prototype.scrollIntoView = scrollIntoViewMock
    
    const { rerender } = render(<LeagueChat {...defaultProps} />)
    
    // Add new message
    const newMessages = [...mockMessages, {
      id: 'msg5',
      userId: 'user3',
      userName: 'Bob Wilson',
      message: 'New message',
      timestamp: new Date(),
      leagueId: 'league1',
      type: 'TEXT' as const
    }]
    
    mockUseLeagueChat.mockReturnValue({
      messages: newMessages,
      typingUsers: mockTypingUsers,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockChatActions
    })
    
    rerender(<LeagueChat {...defaultProps} />)
    
    expect(scrollIntoViewMock).toHaveBeenCalled()
  })

  it('shows connection status', () => {
    render(<LeagueChat {...defaultProps} />)
    
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByTestId('connection-status')).toHaveClass('text-green-600')
  })

  it('handles disconnection gracefully', () => {
    mockUseLeagueChat.mockReturnValue({
      messages: mockMessages,
      typingUsers: [],
      isConnected: false,
      isLoading: false,
      error: null,
      ...mockChatActions
    })

    render(<LeagueChat {...defaultProps} />)
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
    expect(screen.getByTestId('connection-status')).toHaveClass('text-red-600')
    
    const messageInput = screen.getByPlaceholderText('Type your message...')
    expect(messageInput).toBeDisabled()
  })

  it('shows loading state', () => {
    mockUseLeagueChat.mockReturnValue({
      messages: [],
      typingUsers: [],
      isConnected: false,
      isLoading: true,
      error: null,
      ...mockChatActions
    })

    render(<LeagueChat {...defaultProps} />)
    
    expect(screen.getByText('Loading chat...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays error message', () => {
    mockUseLeagueChat.mockReturnValue({
      messages: [],
      typingUsers: [],
      isConnected: false,
      isLoading: false,
      error: 'Failed to connect to chat',
      ...mockChatActions
    })

    render(<LeagueChat {...defaultProps} />)
    
    expect(screen.getByText('Failed to connect to chat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('filters messages by type', () => {
    render(<LeagueChat {...defaultProps} />)
    
    // Show all messages initially
    expect(screen.getByText('Who wants to trade for a RB?')).toBeInTheDocument()
    expect(screen.getByText('Trade proposal sent to Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Week 14 waivers cleared')).toBeInTheDocument()
    
    // Filter to only trade messages
    const tradeFilter = screen.getByRole('button', { name: /trade/i })
    fireEvent.click(tradeFilter)
    
    expect(screen.queryByText('Who wants to trade for a RB?')).not.toBeInTheDocument()
    expect(screen.getByText('Trade proposal sent to Jane Smith')).toBeInTheDocument()
    expect(screen.queryByText('Week 14 waivers cleared')).not.toBeInTheDocument()
  })

  it('shows message count badge', () => {
    render(<LeagueChat {...defaultProps} />)
    
    expect(screen.getByText('4')).toBeInTheDocument() // Total messages
  })

  it('allows mentioning users with @ symbol', () => {
    render(<LeagueChat {...defaultProps} />)
    
    const messageInput = screen.getByPlaceholderText('Type your message...')
    
    fireEvent.change(messageInput, { target: { value: '@Jane ' } })
    
    // Should show autocomplete dropdown
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    
    // Select user
    fireEvent.click(screen.getByText('Jane Smith'))
    
    expect(messageInput).toHaveValue('@Jane Smith ')
  })

  it('formats trade messages with special styling', () => {
    render(<LeagueChat {...defaultProps} />)
    
    const tradeMessage = screen.getByText('Trade proposal sent to Jane Smith')
    expect(tradeMessage.closest('.message')).toHaveClass('border-l-4', 'border-blue-400')
  })

  it('shows online status for active users', () => {
    const mockOnlineUsers = ['user1', 'user2']
    
    mockUseLeagueChat.mockReturnValue({
      messages: mockMessages,
      typingUsers: mockTypingUsers,
      onlineUsers: mockOnlineUsers,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockChatActions
    })

    render(<LeagueChat {...defaultProps} />)
    
    expect(screen.getByText('2 online')).toBeInTheDocument()
  })

  it('joins chat room on mount', () => {
    render(<LeagueChat {...defaultProps} />)
    
    expect(mockChatActions.joinChat).toHaveBeenCalledWith('league1')
  })

  it('leaves chat room on unmount', () => {
    const { unmount } = render(<LeagueChat {...defaultProps} />)
    
    unmount()
    
    expect(mockChatActions.leaveChat).toHaveBeenCalled()
  })

  it('supports emoji picker', () => {
    render(<LeagueChat {...defaultProps} />)
    
    const emojiButton = screen.getByRole('button', { name: /emoji/i })
    fireEvent.click(emojiButton)
    
    // Should open emoji picker
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument()
    
    // Select an emoji
    const laughingEmoji = screen.getByText('😂')
    fireEvent.click(laughingEmoji)
    
    const messageInput = screen.getByPlaceholderText('Type your message...')
    expect(messageInput).toHaveValue('😂')
  })

  it('handles long messages with text wrapping', () => {
    const longMessage = 'This is a very long message that should wrap properly in the chat interface without breaking the layout or causing any display issues'
    
    const messagesWithLongMessage = [...mockMessages, {
      id: 'msg5',
      userId: 'user1',
      userName: 'John Doe',
      message: longMessage,
      timestamp: new Date(),
      leagueId: 'league1',
      type: 'TEXT' as const
    }]
    
    mockUseLeagueChat.mockReturnValue({
      messages: messagesWithLongMessage,
      typingUsers: mockTypingUsers,
      isConnected: true,
      isLoading: false,
      error: null,
      ...mockChatActions
    })

    render(<LeagueChat {...defaultProps} />)
    
    const messageElement = screen.getByText(longMessage)
    expect(messageElement).toHaveClass('break-words')
  })
})