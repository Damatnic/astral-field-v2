'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { leagueCache } from '@/lib/cache/catalyst-cache'

interface RealtimeLeagueData {
  standings?: any[]
  scores?: any[]
  liveUpdates?: any[]
  lastUpdate?: string
}

interface RealtimeOptions {
  enabled?: boolean
  reconnectDelay?: number
  maxReconnectAttempts?: number
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useRealtimeLeague(leagueId: string, options: RealtimeOptions = {}) {
  const {
    enabled = true,
    reconnectDelay = 5000,
    maxReconnectAttempts = 10,
    onError,
    onConnect,
    onDisconnect
  } = options

  const [data, setData] = useState<RealtimeLeagueData>({})
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Catalyst: Create EventSource connection
  const connect = useCallback(() => {
    if (!enabled || !leagueId) return

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Create new EventSource
      const eventSource = new EventSource(`/api/realtime/league/${leagueId}`)
      eventSourceRef.current = eventSource

      // Connection opened
      eventSource.onopen = () => {
        setIsConnected(true)
        setIsReconnecting(false)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
        onConnect?.()
        console.log(`[Catalyst] Real-time connection established for league ${leagueId}`)
      }

      // Handle different event types
      eventSource.addEventListener('connected', (event) => {
        const eventData = JSON.parse(event.data)
        console.log('[Catalyst] Real-time connection confirmed:', eventData.message)
      })

      eventSource.addEventListener('league-update', (event) => {
        const eventData = JSON.parse(event.data)
        setData(prev => ({
          ...prev,
          standings: eventData.data,
          lastUpdate: eventData.timestamp
        }))
        
        // Update cache
        leagueCache.setLeagueStandings(leagueId, 4, eventData.data)
      })

      eventSource.addEventListener('score-update', (event) => {
        const eventData = JSON.parse(event.data)
        setData(prev => ({
          ...prev,
          scores: eventData.data,
          lastUpdate: eventData.timestamp
        }))
      })

      eventSource.addEventListener('live-scores', (event) => {
        const eventData = JSON.parse(event.data)
        setData(prev => ({
          ...prev,
          liveUpdates: eventData.data,
          lastUpdate: eventData.timestamp
        }))
      })

      eventSource.addEventListener('heartbeat', (event) => {
        // Keep connection alive - no action needed
        const eventData = JSON.parse(event.data)
        console.log('[Catalyst] Heartbeat received:', eventData.timestamp)
      })

      eventSource.addEventListener('error', (event) => {
        const eventData = JSON.parse(event.data)
        console.error('[Catalyst] Server error:', eventData.message)
        setConnectionError(eventData.message)
      })

      // Connection error or closed
      eventSource.onerror = (error) => {
        console.error('[Catalyst] EventSource error:', error)
        setIsConnected(false)
        setConnectionError('Connection lost')
        
        // Attempt reconnection if under limit
        if (reconnectAttemptsRef.current < maxReconnectAttempts && enabled) {
          setIsReconnecting(true)
          reconnectAttemptsRef.current++
          
          const delay = reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1)
          console.log(`[Catalyst] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          setIsReconnecting(false)
          onError?.(new Error('Max reconnection attempts exceeded'))
          onDisconnect?.()
        }
      }

    } catch (error) {
      console.error('[Catalyst] Failed to create EventSource:', error)
      setConnectionError('Failed to establish connection')
      onError?.(error as Error)
    }
  }, [leagueId, enabled, reconnectDelay, maxReconnectAttempts, onError, onConnect, onDisconnect])

  // Catalyst: Manually trigger reconnection
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    setConnectionError(null)
    connect()
  }, [connect])

  // Catalyst: Disconnect
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    setIsConnected(false)
    setIsReconnecting(false)
    setConnectionError(null)
    onDisconnect?.()
  }, [onDisconnect])

  // Catalyst: Initialize connection
  useEffect(() => {
    if (enabled && leagueId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [leagueId, enabled, connect, disconnect])

  // Catalyst: Handle visibility changes (pause/resume on tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - disconnect to save resources
        if (eventSourceRef.current && isConnected) {
          console.log('[Catalyst] Tab hidden - maintaining connection')
          // Keep connection but reduce activity
        }
      } else {
        // Tab visible - ensure connection
        if (!isConnected && enabled) {
          console.log('[Catalyst] Tab visible - ensuring connection')
          connect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isConnected, enabled, connect])

  // Catalyst: Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    data,
    isConnected,
    isReconnecting,
    connectionError,
    reconnect,
    disconnect,
    // Utility methods
    getStandings: () => data.standings || [],
    getScores: () => data.scores || [],
    getLiveUpdates: () => data.liveUpdates || [],
    getLastUpdate: () => data.lastUpdate,
    hasData: () => Object.keys(data).length > 0
  }
}

// Catalyst: Provider for multiple components
export function useRealtimeLeagueWithCache(leagueId: string, options: RealtimeOptions = {}) {
  const realtime = useRealtimeLeague(leagueId, options)
  const [cachedData, setCachedData] = useState<any>(null)

  // Load initial cached data
  useEffect(() => {
    const loadCachedData = async () => {
      const cached = await leagueCache.getLeagueStandings(leagueId, 4)
      if (cached) {
        setCachedData(cached)
      }
    }

    loadCachedData()
  }, [leagueId])

  // Merge realtime with cached data
  const mergedData = {
    ...cachedData,
    ...realtime.data,
    // Prioritize realtime data
    standings: realtime.data.standings || cachedData?.standings || [],
    scores: realtime.data.scores || cachedData?.scores || [],
    liveUpdates: realtime.data.liveUpdates || []
  }

  return {
    ...realtime,
    data: mergedData,
    hasInitialData: () => !!cachedData || realtime.hasData()
  }
}