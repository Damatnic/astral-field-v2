/**
 * League Chat Component Tests
 * 
 * Tests for league chat component with WebSocket integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LeagueChat } from '@/components/chat/league-chat'
import { useLeagueChat, useTradeNotifications } from '@/hooks/use-websocket'

// Mock WebSocket hooks
jest.mock('@/hooks/use-websocket', () => ({
  useLeagueChat: jest.fn(),
  useTradeNotifications: jest.fn()
}))

describe('LeagueChat Component', () => {
  const mockProps = {
    leagueId: 'league-123',
    currentUserId: 'user-123',
    currentUserName: 'Test User'
  }

  const mockMessages = [
    {
      id: 'msg-1',
      userId: 'user-456',
      userName: 'Other User',
      message: 'Hello everyone!',
      timestamp: new Date('2024-01-01T10:00:00'),
      type: 'MESSAGE'
    },
    {
      id: 'msg-2',
      userId: 'user-123',
      userName: 'Test User',
      message: 'Hi there!',
      timestamp: new Date('2024-01-01T10:01:00'),
      type: 'MESSAGE'
    },
    {
      id: 'msg-3',
      userId: 'user-789',
      userName: 'Admin',
      message: 'Trade proposal submitted',
      timestamp: new Date('2024-01-01T10:02:00'),
      type: 'TRADE'
    }
  ]

  const mockNotifications = [
    {
      id: 'notif-1',
      type: 'trade_proposal',
      title: 'New Trade Proposal',
      message: 'You have received a trade proposal from Team Alpha',
      timestamp: new Date('2024-01-01T10:00:00')
    }
  ]

  const mockChatState = {
    state: { connected: true },
    messages: mockMessages,
    typing: [],
    sendMessage: jest.fn(),
    sendTyping: jest.fn()
  }

  const mockTradeState = {
    tradeProposals: [],
    notifications: mockNotifications,
    proposeTrade: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useLeagueChat as jest.Mock).mockReturnValue(mockChatState)
    ;(useTradeNotifications as jest.Mock).mockReturnValue(mockTradeState)
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<LeagueChat {...mockProps} />)
      expect(screen.getByText('Chat')).toBeInTheDocument()
    })

    it('should show connecting state when not connected', () => {
      ;(useLeagueChat as jest.Mock).mockReturnValue({
        ...mockChatState,
        state: { connected: false }
      })

      render(<LeagueChat {...mockProps} />)
      expect(screen.getByText('Connecting to chat...')).toBeInTheDocument()
    })

    it('should display header with tabs', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('Chat')).toBeInTheDocument()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })

    it('should display propose trade button', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('Propose Trade')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should start with chat tab active', () => {
      render(<LeagueChat {...mockProps} />)
      
      const chatTab = screen.getByText('Chat').closest('button')
      expect(chatTab).toHaveClass('bg-blue-600')
    })

    it('should switch to notifications tab', () => {
      render(<LeagueChat {...mockProps} />)
      
      const notificationsTab = screen.getByText('Notifications').closest('button')
      fireEvent.click(notificationsTab!)
      
      expect(notificationsTab).toHaveClass('bg-blue-600')
    })

    it('should show message count badge', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('3')).toBeInTheDocument() // 3 messages
    })

    it('should show notification count badge', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('1')).toBeInTheDocument() // 1 notification
    })
  })

  describe('Messages Display', () => {
    it('should display all messages', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument()
      expect(screen.getByText('Hi there!')).toBeInTheDocument()
      expect(screen.getByText('Trade proposal submitted')).toBeInTheDocument()
    })

    it('should show sender name for other users', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('Other User')).toBeInTheDocument()
    })

    it('should not show sender name for own messages', () => {
      render(<LeagueChat {...mockProps} />)
      
      const myMessage = screen.getByText('Hi there!').closest('div')
      expect(myMessage).not.toHaveTextContent('Test User')
    })

    it('should style own messages differently', () => {
      render(<LeagueChat {...mockProps} />)
      
      const myMessage = screen.getByText('Hi there!').closest('div')
      expect(myMessage).toHaveClass('bg-blue-600')
    })

    it('should style trade messages differently', () => {
      render(<LeagueChat {...mockProps} />)
      
      const tradeMessage = screen.getByText('Trade proposal submitted').closest('div')
      expect(tradeMessage).toHaveClass('bg-orange-600')
    })

    it('should display message timestamps', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText(/10:00/)).toBeInTheDocument()
    })

    it('should show trade icon for trade messages', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('Trade Proposal')).toBeInTheDocument()
    })
  })

  describe('Typing Indicators', () => {
    it('should show typing indicator when users are typing', () => {
      ;(useLeagueChat as jest.Mock).mockReturnValue({
        ...mockChatState,
        typing: ['user-456']
      })

      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('1 person typing...')).toBeInTheDocument()
    })

    it('should show multiple users typing', () => {
      ;(useLeagueChat as jest.Mock).mockReturnValue({
        ...mockChatState,
        typing: ['user-456', 'user-789']
      })

      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('2 people typing...')).toBeInTheDocument()
    })

    it('should not show typing indicator when no one is typing', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.queryByText(/typing/)).not.toBeInTheDocument()
    })
  })

  describe('Message Input', () => {
    it('should render message input', () => {
      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })

    it('should update input value on change', () => {
      render(<LeagueChat {...mockProps} />)
      
      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Test message' } })
      
      expect(input.value).toBe('Test message')
    })

    it('should send message on form submit', () => {
      render(<LeagueChat {...mockProps} />)
      
      const input = screen.getByPlaceholderText('Type a message...')
      const form = input.closest('form')!
      
      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.submit(form)
      
      expect(mockChatState.sendMessage).toHaveBeenCalledWith('Test message')
    })

    it('should clear input after sending', () => {
      render(<LeagueChat {...mockProps} />)
      
      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement
      const form = input.closest('form')!
      
      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.submit(form)
      
      expect(input.value).toBe('')
    })

    it('should not send empty messages', () => {
      render(<LeagueChat {...mockProps} />)
      
      const input = screen.getByPlaceholderText('Type a message...')
      const form = input.closest('form')!
      
      fireEvent.change(input, { target: { value: '   ' } })
      fireEvent.submit(form)
      
      expect(mockChatState.sendMessage).not.toHaveBeenCalled()
    })

    it('should disable send button when input is empty', () => {
      render(<LeagueChat {...mockProps} />)
      
      const sendButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')
      )
      
      expect(sendButton).toBeDisabled()
    })

    it('should send typing indicator when typing', () => {
      render(<LeagueChat {...mockProps} />)
      
      const input = screen.getByPlaceholderText('Type a message...')
      fireEvent.change(input, { target: { value: 'T' } })
      
      expect(mockChatState.sendTyping).toHaveBeenCalledWith(true)
    })

    it('should stop typing indicator on blur', () => {
      render(<LeagueChat {...mockProps} />)
      
      const input = screen.getByPlaceholderText('Type a message...')
      fireEvent.change(input, { target: { value: 'Test' } })
      fireEvent.blur(input)
      
      expect(mockChatState.sendTyping).toHaveBeenCalledWith(false)
    })
  })

  describe('Notifications Tab', () => {
    beforeEach(() => {
      render(<LeagueChat {...mockProps} />)
      const notificationsTab = screen.getByText('Notifications').closest('button')
      fireEvent.click(notificationsTab!)
    })

    it('should display notifications', () => {
      expect(screen.getByText('New Trade Proposal')).toBeInTheDocument()
      expect(screen.getByText(/received a trade proposal/)).toBeInTheDocument()
    })

    it('should show empty state when no notifications', () => {
      ;(useTradeNotifications as jest.Mock).mockReturnValue({
        ...mockTradeState,
        notifications: []
      })

      render(<LeagueChat {...mockProps} />)
      const notificationsTab = screen.getByText('Notifications').closest('button')
      fireEvent.click(notificationsTab!)
      
      expect(screen.getByText('No notifications yet')).toBeInTheDocument()
    })

    it('should display notification timestamps', () => {
      expect(screen.getByText(/10:00/)).toBeInTheDocument()
    })

    it('should show view button for trade proposals', () => {
      expect(screen.getByText('View')).toBeInTheDocument()
    })
  })

  describe('Trade Dialog', () => {
    it('should open trade dialog on button click', () => {
      render(<LeagueChat {...mockProps} />)
      
      const proposeButton = screen.getByText('Propose Trade')
      fireEvent.click(proposeButton)
      
      expect(screen.getByText('Trade with')).toBeInTheDocument()
    })

    it('should display team selector', () => {
      render(<LeagueChat {...mockProps} />)
      
      const proposeButton = screen.getByText('Propose Trade')
      fireEvent.click(proposeButton)
      
      expect(screen.getByText('Select team...')).toBeInTheDocument()
    })

    it('should display message textarea', () => {
      render(<LeagueChat {...mockProps} />)
      
      const proposeButton = screen.getByText('Propose Trade')
      fireEvent.click(proposeButton)
      
      expect(screen.getByPlaceholderText(/Add a message/)).toBeInTheDocument()
    })

    it('should close dialog on cancel', () => {
      render(<LeagueChat {...mockProps} />)
      
      const proposeButton = screen.getByText('Propose Trade')
      fireEvent.click(proposeButton)
      
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)
      
      expect(screen.queryByText('Trade with')).not.toBeInTheDocument()
    })

    it('should have create trade button', () => {
      render(<LeagueChat {...mockProps} />)
      
      const proposeButton = screen.getByText('Propose Trade')
      fireEvent.click(proposeButton)
      
      expect(screen.getByText('Create Trade')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<LeagueChat {...mockProps} />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have accessible form', () => {
      render(<LeagueChat {...mockProps} />)
      
      const input = screen.getByPlaceholderText('Type a message...')
      expect(input).toHaveAttribute('type', 'text')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty messages array', () => {
      ;(useLeagueChat as jest.Mock).mockReturnValue({
        ...mockChatState,
        messages: []
      })

      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })

    it('should handle messages without timestamps', () => {
      const messagesWithoutTime = [{
        ...mockMessages[0],
        timestamp: null
      }]

      ;(useLeagueChat as jest.Mock).mockReturnValue({
        ...mockChatState,
        messages: messagesWithoutTime
      })

      render(<LeagueChat {...mockProps} />)
      
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument()
    })
  })
})
