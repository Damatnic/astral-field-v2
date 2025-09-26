import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import type { DraftEvent, LiveScoreEvent, ChatMessage } from '@/lib/websocket-server'

interface UseWebSocketOptions {
  autoConnect?: boolean
  reconnection?: boolean
}

interface WebSocketState {
  connected: boolean
  connecting: boolean
  error: string | null
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session } = useSession()
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null
  })

  const { autoConnect = true, reconnection = true } = options

  useEffect(() => {
    if (!session?.user?.id || !autoConnect) return

    const connect = () => {
      setState(prev => ({ ...prev, connecting: true, error: null }))

      // Initialize WebSocket server
      fetch('/api/socket')

      const socket = io({
        transports: ['websocket', 'polling'],
        reconnection,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      socket.on('connect', () => {
        console.log('WebSocket connected')
        setState({ connected: true, connecting: false, error: null })
        
        // Authenticate user
        socket.emit('authenticate', { 
          userId: session.user.id
        })
      })

      socket.on('authenticated', (data: { success: boolean, user: any }) => {
        console.log('WebSocket authenticated:', data.user)
      })

      socket.on('authentication_error', (error: { message: string }) => {
        console.error('WebSocket authentication failed:', error.message)
        setState(prev => ({ ...prev, error: error.message }))
      })

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason)
        setState(prev => ({ ...prev, connected: false }))
      })

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false, 
          error: error.message 
        }))
      })

      socketRef.current = socket
    }

    connect()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [session?.user?.id, autoConnect, reconnection])

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setState({ connected: false, connecting: false, error: null })
    }
  }

  const emit = (event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }

  return {
    socket: socketRef.current,
    state,
    emit,
    on,
    off,
    disconnect
  }
}

// Specialized hooks for different features

export function useDraftRoom(leagueId: string | null) {
  const { socket, state, emit, on, off } = useWebSocket()
  const [draftState, setDraftState] = useState<any>(null)
  const [draftEvents, setDraftEvents] = useState<DraftEvent[]>([])
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null)

  useEffect(() => {
    if (!socket || !leagueId) return

    const handleDraftState = (state: any) => {
      setDraftState(state)
      setCurrentTeamId(state.currentPick?.teamId || null)
    }

    const handleDraftEvent = (event: DraftEvent) => {
      setDraftEvents(prev => [...prev, event])
      if (event.nextTeamId) {
        setCurrentTeamId(event.nextTeamId)
      }
      if (event.timeRemaining) {
        setTimeRemaining(event.timeRemaining)
      }
    }

    const handleDraftTimer = (data: { teamId: string, timeRemaining: number }) => {
      setTimeRemaining(data.timeRemaining)
    }

    const handleAutoPick = (data: any) => {
      console.log('Auto-pick executed:', data)
    }

    socket.on('draft_state', handleDraftState)
    socket.on('draft_event', handleDraftEvent)
    socket.on('draft_timer', handleDraftTimer)
    socket.on('auto_pick', handleAutoPick)

    // Join draft room
    emit('join_draft', { leagueId })

    return () => {
      socket.off('draft_state', handleDraftState)
      socket.off('draft_event', handleDraftEvent)
      socket.off('draft_timer', handleDraftTimer)
      socket.off('auto_pick', handleAutoPick)
    }
  }, [socket, leagueId])

  const draftPlayer = (data: {
    playerId: string
    teamId: string
    pick: number
    round: number
  }) => {
    if (leagueId) {
      emit('draft_player', { ...data, leagueId })
    }
  }

  return {
    state,
    draftState,
    draftEvents,
    timeRemaining,
    currentTeamId,
    draftPlayer
  }
}

export function useLiveScoring(leagueId: string | null, week: number) {
  const { socket, state, on, emit } = useWebSocket()
  const [scores, setScores] = useState<Record<string, any>>({})
  const [liveEvents, setLiveEvents] = useState<LiveScoreEvent[]>([])

  useEffect(() => {
    if (!socket || !leagueId) return

    const handleScoreUpdate = (event: LiveScoreEvent) => {
      setLiveEvents(prev => [...prev, event])
      
      if (event.type === 'SCORE_UPDATE' && event.matchupId) {
        setScores(prev => ({
          ...prev,
          [event.matchupId!]: {
            ...prev[event.matchupId!],
            ...event.gameInfo
          }
        }))
      }
    }

    socket.on('score_update', handleScoreUpdate)
    emit('join_scoring', { leagueId, week })

    return () => {
      socket.off('score_update', handleScoreUpdate)
    }
  }, [socket, leagueId, week])

  return {
    state,
    scores,
    liveEvents
  }
}

export function useLeagueChat(leagueId: string | null) {
  const { socket, state, emit, on } = useWebSocket()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typing, setTyping] = useState<string[]>([])

  useEffect(() => {
    if (!socket || !leagueId) return

    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message])
    }

    const handleUserTyping = (data: { userId: string, userName: string, typing: boolean }) => {
      setTyping(prev => 
        data.typing 
          ? [...prev.filter(id => id !== data.userId), data.userId]
          : prev.filter(id => id !== data.userId)
      )
    }

    socket.on('chat_message', handleChatMessage)
    socket.on('user_typing', handleUserTyping)
    emit('join_chat', { leagueId })

    return () => {
      socket.off('chat_message', handleChatMessage)
      socket.off('user_typing', handleUserTyping)
    }
  }, [socket, leagueId])

  const sendMessage = (message: string, type: 'TEXT' | 'TRADE' = 'TEXT') => {
    if (leagueId && message.trim()) {
      emit('send_message', { leagueId, message: message.trim(), type: type === 'TEXT' ? undefined : type })
    }
  }

  const sendTyping = (typing: boolean) => {
    if (leagueId) {
      emit('typing', { leagueId, typing })
    }
  }

  return {
    state,
    messages,
    typing,
    sendMessage,
    sendTyping
  }
}

export function useTradeNotifications() {
  const { socket, state, on } = useWebSocket()
  const [tradeProposals, setTradeProposals] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!socket) return

    const handleTradeProposal = (proposal: any) => {
      setTradeProposals(prev => [...prev, proposal])
      setNotifications(prev => [...prev, {
        id: proposal.tradeId,
        type: 'trade_proposal',
        title: 'New Trade Proposal',
        message: `${proposal.fromOwner} has proposed a trade`,
        timestamp: new Date()
      }])
    }

    const handleTradeUpdate = (update: any) => {
      setNotifications(prev => [...prev, {
        id: update.tradeId,
        type: 'trade_update',
        title: 'Trade Update',
        message: update.message,
        timestamp: new Date()
      }])
    }

    socket.on('trade_proposal', handleTradeProposal)
    socket.on('trade_update', handleTradeUpdate)

    return () => {
      socket.off('trade_proposal', handleTradeProposal)
      socket.off('trade_update', handleTradeUpdate)
    }
  }, [socket])

  const proposeTrade = (data: {
    fromTeamId: string
    toTeamId: string
    leagueId: string
    offeredPlayers: string[]
    requestedPlayers: string[]
    message?: string
  }) => {
    if (socket) {
      socket.emit('propose_trade', data)
    }
  }

  return {
    state,
    tradeProposals,
    notifications,
    proposeTrade
  }
}