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
  const { enabled = true } = options
  
  const [scores, setScores] = useState<LiveScore[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isSubscribed = true

    const connect = () => {
      // Don't reconnect if already connected or unsubscribed
      if (!isSubscribed || (eventSource && eventSource.readyState === EventSource.OPEN)) {
        return
      }

      try {
        eventSource = new EventSource('/api/live/scores')

        eventSource.onopen = () => {
          if (!isSubscribed) return
          console.log('✅ Connected to live scores')
          setConnected(true)
          setError(null)
          options.onConnect?.()
        }

        eventSource.addEventListener('score', (event) => {
          if (!isSubscribed) return
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
          // Keep connection alive - don't log to reduce console spam
        })

        eventSource.onerror = (err) => {
          if (!isSubscribed) return
          console.error('❌ Live scores connection error')
          setConnected(false)
          setError('Connection lost. Reconnecting...')
          options.onError?.(err)
          
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }

          // Only reconnect if still subscribed
          if (isSubscribed && !reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null
              connect()
            }, 5000)
          }
        }
      } catch (err) {
        console.error('Failed to connect:', err)
        setError('Failed to connect to live scores')
        options.onError?.(err)
      }
    }

    connect()

    return () => {
      isSubscribed = false
      if (eventSource) {
        eventSource.close()
        eventSource = null
        setConnected(false)
        options.onDisconnect?.()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
    }
  }, [enabled]) // Remove callback dependencies to prevent reconnection loop

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

