/**
 * React hook for live score updates using SSE
 * Replaces useWebSocket
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

interface LiveScore {
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

interface UseLiveScoresOptions {
  enabled?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: any) => void
}

export function useLiveScores(options: UseLiveScoresOptions = {}) {
  const { enabled = true, onConnect, onDisconnect, onError } = options
  
  const [scores, setScores] = useState<LiveScore[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout

    const connect = () => {
      try {
        eventSource = new EventSource('/api/live/scores')

        eventSource.onopen = () => {
          console.log('✅ Connected to live scores')
          setConnected(true)
          setError(null)
          onConnect?.()
        }

        eventSource.addEventListener('score', (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.data && Array.isArray(data.data)) {
              setScores(data.data)
            }
          } catch (err) {
            console.error('Error parsing score data:', err)
          }
        })

        eventSource.addEventListener('heartbeat', (event) => {
          // Keep connection alive
          console.log('💓 Heartbeat')
        })

        eventSource.onerror = (err) => {
          console.error('❌ Live scores connection error:', err)
          setConnected(false)
          setError('Connection lost. Reconnecting...')
          onError?.(err)
          
          if (eventSource) {
            eventSource.close()
          }

          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000)
        }
      } catch (err) {
        console.error('Failed to connect:', err)
        setError('Failed to connect to live scores')
        onError?.(err)
      }
    }

    connect()

    return () => {
      if (eventSource) {
        eventSource.close()
        setConnected(false)
        onDisconnect?.()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [enabled, onConnect, onDisconnect, onError])

  const refresh = useCallback(() => {
    // Force refresh by reconnecting
    setConnected(false)
  }, [])

  return {
    scores,
    connected,
    error,
    refresh,
  }
}

