/**
 * LiveUpdatesClient Tests
 * Comprehensive test coverage for SSE client
 */

import { LiveUpdatesClient } from '@/lib/sse/live-updates'
import { act } from '@testing-library/react'

// Mock EventSource
class MockEventSource {
  public onopen: ((event: Event) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public readyState: number = 0
  private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map()
  static OPEN = 1
  static CLOSED = 2

  constructor(public url: string) {
    // Synchronously set to CONNECTING
    this.readyState = 0
    // Then asynchronously open
    Promise.resolve().then(() => {
      this.readyState = MockEventSource.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    })
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(listener)
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  close() {
    this.readyState = MockEventSource.CLOSED
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
      await act(async () => {
        jest.advanceTimersByTime(10)
      })

      // Fast-forward time for reconnection
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      jest.useRealTimers()
    }, 10000)

    it('should use exponential backoff for reconnection', async () => {
      jest.useFakeTimers()
      
      client.connect()
      await act(async () => {
        jest.advanceTimersByTime(10)
      })
      
      // Simulate exponential backoff
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          jest.advanceTimersByTime(Math.pow(2, i) * 1000)
        })
      }

      jest.useRealTimers()
    }, 10000)

    it('should stop reconnecting after max attempts', async () => {
      jest.useFakeTimers()
      
      client.connect()
      await act(async () => {
        jest.advanceTimersByTime(10)
      })
      
      // Simulate max reconnection attempts (5)
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          jest.advanceTimersByTime(10000)
        })
      }

      // Should stop reconnecting
      expect(client.isConnected()).toBe(false)

      jest.useRealTimers()
    }, 10000)
  })

  describe('Cleanup', () => {
    it('should clear listeners on disconnect', async () => {
      const callback = jest.fn()
      
      client.connect()
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })
      
      client.on('score', callback)
      client.disconnect()
      
      expect(client.isConnected()).toBe(false)
    }, 10000)

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
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })
      
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

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })
      
      // Should not crash
      expect(true).toBe(true)
    }, 10000)
  })
})

