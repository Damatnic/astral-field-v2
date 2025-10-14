/**
 * Modern Live Updates System using Server-Sent Events (SSE)
 * Replaces Socket.IO for Vercel-compatible real-time updates
 */

export interface LiveScore {
  gameId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  quarter: string
  timeRemaining: string
  status: 'scheduled' | 'live' | 'final'
  lastUpdate: string
}

export interface PlayerUpdate {
  playerId: string
  playerName: string
  team: string
  position: string
  stats: {
    points: number
    yards?: number
    touchdowns?: number
    receptions?: number
  }
  timestamp: string
}

export interface LiveUpdateEvent {
  type: 'score' | 'player' | 'news' | 'heartbeat'
  data: LiveScore | PlayerUpdate | any
  timestamp: string
}

/**
 * Client-side SSE manager
 */
export class LiveUpdatesClient {
  private eventSource: EventSource | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  constructor(private endpoint: string) {}

  connect(): void {
    if (this.eventSource) {
      return
    }

    try {
      this.eventSource = new EventSource(this.endpoint)

      this.eventSource.onopen = () => {
        console.log('✅ Live updates connected')
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
      }

      this.eventSource.onerror = (error) => {
        console.error('❌ Live updates error:', error)
        this.handleDisconnect()
      }

      this.eventSource.addEventListener('score', (event) => {
        this.handleEvent('score', event)
      })

      this.eventSource.addEventListener('player', (event) => {
        this.handleEvent('player', event)
      })

      this.eventSource.addEventListener('news', (event) => {
        this.handleEvent('news', event)
      })

      this.eventSource.addEventListener('heartbeat', (event) => {
        this.handleEvent('heartbeat', event)
      })
    } catch (error) {
      console.error('Failed to connect to live updates:', error)
      this.handleDisconnect()
    }
  }

  private handleEvent(type: string, event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      const listeners = this.listeners.get(type)
      
      if (listeners) {
        listeners.forEach(callback => callback(data))
      }
    } catch (error) {
      console.error(`Error parsing ${type} event:`, error)
    }
  }

  private handleDisconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      
      console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`)
      
      setTimeout(() => {
        this.connect()
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  on(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    
    this.listeners.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType)
      if (listeners) {
        listeners.delete(callback)
      }
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.listeners.clear()
    console.log('🔌 Live updates disconnected')
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
  }
}

/**
 * React hook for live updates
 */
export function useLiveUpdates(endpoint: string) {
  const [client, setClient] = React.useState<LiveUpdatesClient | null>(null)
  const [connected, setConnected] = React.useState(false)

  React.useEffect(() => {
    const liveClient = new LiveUpdatesClient(endpoint)
    liveClient.connect()
    setClient(liveClient)

    const interval = setInterval(() => {
      setConnected(liveClient.isConnected())
    }, 1000)

    return () => {
      clearInterval(interval)
      liveClient.disconnect()
    }
  }, [endpoint])

  const subscribe = React.useCallback((eventType: string, callback: (data: any) => void) => {
    if (!client) return () => {}
    return client.on(eventType, callback)
  }, [client])

  return {
    connected,
    subscribe,
    disconnect: () => client?.disconnect(),
  }
}

// For non-React usage
import React from 'react'

export const liveUpdates = {
  createClient: (endpoint: string) => new LiveUpdatesClient(endpoint),
}

