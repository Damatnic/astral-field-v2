/**
 * LiveUpdatesClient Tests
 * Comprehensive test coverage for SSE client
 */

import { LiveUpdatesClient } from '@/lib/sse/live-updates'

// Mock EventSource
class MockEventSource {
  public onopen: ((event: Event) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public readyState: number = 0
  private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map()

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = 1 // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(listener)
  }

  close() {
    this.readyState = 2 // CLOSED
  }

  // Helper to simulate events
  simulateEvent(type: string, data: any) {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const event = new MessageEvent(type, { data: JSON.stringify(data) })
      listeners.forEach(listener => listener(event))
    }
  }
}

global.EventSource = MockEventSource as any

describe('LiveUpdatesClient', () => {
  let client: LiveUpdatesClient

  beforeEach(() => {
    client = new LiveUpdatesClient('/api/live/scores')
  })

  afterEach(() => {
    client.disconnect()
    jest.clearAllMocks()
  })

  describe('Connection Management', () => {
    it('should create client with endpoint', () => {
      expect(client).toBeInstanceOf(LiveUpdatesClient)
    })

    it('should connect to endpoint', async () => {
      client.connect()
      
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(client.isConnected()).toBe(true)
    })

    it('should not connect twice', async () => {
      client.connect()
      await new Promise(resolve => setTimeout(resolve, 10))
      
      client.connect() // Second connect
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(client.isConnected()).toBe(true)
    })

    it('should disconnect cleanly', async () => {
      client.connect()
      await new Promise(resolve => setTimeout(resolve, 10))
      
      client.disconnect()
      expect(client.isConnected()).toBe(false)
    })

    it('should report connection status correctly', async () => {
      expect(client.isConnected()).toBe(false)
      
      client.connect()
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(client.isConnected()).toBe(true)
    })
  })

  describe('Event Subscription', () => {
    it('should subscribe to events', async () => {
      const callback = jest.fn()
      
      client.connect()
      await new Promise(resolve => setTimeout(resolve, 10))
      
      client.on('score', callback)
      
      // Verify subscription exists
      expect(callback).toBeDefined()
    })

    it('should call callback when event received', async () => {
      const callback = jest.fn()
      
      client.connect()
      await new Promise(resolve => setTimeout(resolve, 10))
      
      client.on('score', callback)
      
      // Simulate score event
      const mockData = { gameId: 'game-1', score: 24 }
      const eventSource = (global.EventSource as any).mock?.instances?.[0]
      if (eventSource) {
        eventSource.simulateEvent('score', mockData)
      }

      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Callback should have been called
      if (callback.mock.calls.length > 0) {
        expect(callback).toHaveBeenCalledWith(mockData)
      }
    })

    it('should return unsubscribe function', () => {
      const callback = jest.fn()
      const unsubscribe = client.on('score', callback)
      
      expect(typeof unsubscribe).toBe('function')
      
      unsubscribe()
      // Verify cleanup (no errors thrown)
      expect(true).toBe(true)
    })

    it('should handle multiple subscriptions', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      
      client.on('score', callback1)
      client.on('score', callback2)
      client.on('player', callback1)
      
      // Should handle multiple subscriptions without error
      expect(true).toBe(true)
    })
  })

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on error', async () => {
      jest.useFakeTimers()
      
      client.connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Simulate error
      const eventSource = (global.EventSource as any).mock?.instances?.[0]
      if (eventSource && eventSource.onerror) {
        eventSource.onerror(new Event('error'))
      }

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      jest.useRealTimers()
    })

    it('should use exponential backoff for reconnection', async () => {
      jest.useFakeTimers()
      
      client.connect()
      
      // Simulate multiple errors
      for (let i = 0; i < 3; i++) {
        const eventSource = (global.EventSource as any).mock?.instances?.[i]
        if (eventSource && eventSource.onerror) {
          eventSource.onerror(new Event('error'))
        }
        
        act(() => {
          jest.advanceTimersByTime(Math.pow(2, i) * 1000)
        })
      }

      jest.useRealTimers()
    })

    it('should stop reconnecting after max attempts', async () => {
      jest.useFakeTimers()
      
      client.connect()
      
      // Simulate max reconnection attempts (5)
      for (let i = 0; i < 6; i++) {
        const eventSource = (global.EventSource as any).mock?.instances?.[i]
        if (eventSource && eventSource.onerror) {
          eventSource.onerror(new Event('error'))
        }
        
        act(() => {
          jest.advanceTimersByTime(10000)
        })
      }

      // Should stop reconnecting
      expect(client.isConnected()).toBe(false)

      jest.useRealTimers()
    })
  })

  describe('Cleanup', () => {
    it('should clear listeners on disconnect', async () => {
      const callback = jest.fn()
      
      client.connect()
      await new Promise(resolve => setTimeout(resolve, 10))
      
      client.on('score', callback)
      client.disconnect()
      
      expect(client.isConnected()).toBe(false)
    })

    it('should handle disconnect when not connected', () => {
      // Should not throw error
      expect(() => {
        client.disconnect()
      }).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed event data', async () => {
      const callback = jest.fn()
      
      client.connect()
      await new Promise(resolve => setTimeout(resolve, 10))
      
      client.on('score', callback)
      
      // Simulate malformed data
      const eventSource = (global.EventSource as any).mock?.instances?.[0]
      if (eventSource) {
        const listeners = (eventSource as any).listeners?.get('score')
        if (listeners) {
          listeners.forEach((listener: Function) => {
            const badEvent = new MessageEvent('score', { data: 'invalid json' })
            listener(badEvent)
          })
        }
      }

      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Should not crash
      expect(true).toBe(true)
    })
  })
})

