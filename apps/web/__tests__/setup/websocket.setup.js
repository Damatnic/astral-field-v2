/**
 * Zenith WebSocket Test Setup
 * Mocks WebSocket functionality for testing real-time features
 */

import { jest } from '@jest/globals'

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    this.onopen = null
    this.onclose = null
    this.onmessage = null
    this.onerror = null
    this.listeners = new Map()
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) this.onopen()
      this.emit('open')
    }, 0)
  }
  
  send(data) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    // Store sent messages for testing
    this.lastSentMessage = data
  }
  
  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) this.onclose()
    this.emit('close')
  }
  
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }
  
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data))
    }
  }
  
  // Test helper to simulate receiving messages
  mockReceive(data) {
    const event = { data: JSON.stringify(data) }
    if (this.onmessage) this.onmessage(event)
    this.emit('message', event)
  }
  
  // Test helper to simulate errors
  mockError(error) {
    const event = { error }
    if (this.onerror) this.onerror(event)
    this.emit('error', event)
  }
}

// Set WebSocket constants
MockWebSocket.CONNECTING = 0
MockWebSocket.OPEN = 1
MockWebSocket.CLOSING = 2
MockWebSocket.CLOSED = 3

global.WebSocket = MockWebSocket

// Mock Socket.IO client
const mockSocketIO = {
  connect: jest.fn(() => mockSocket),
  disconnect: jest.fn(),
}

const mockSocket = {
  connected: false,
  id: 'mock-socket-id',
  
  // Event handlers
  on: jest.fn((event, callback) => {
    mockSocket.listeners = mockSocket.listeners || new Map()
    if (!mockSocket.listeners.has(event)) {
      mockSocket.listeners.set(event, [])
    }
    mockSocket.listeners.get(event).push(callback)
  }),
  
  off: jest.fn((event, callback) => {
    if (mockSocket.listeners && mockSocket.listeners.has(event)) {
      const callbacks = mockSocket.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }),
  
  emit: jest.fn((event, data) => {
    // Store emitted events for testing
    mockSocket.emittedEvents = mockSocket.emittedEvents || []
    mockSocket.emittedEvents.push({ event, data })
  }),
  
  connect: jest.fn(() => {
    mockSocket.connected = true
    mockSocket.mockEmit('connect')
  }),
  
  disconnect: jest.fn(() => {
    mockSocket.connected = false
    mockSocket.mockEmit('disconnect')
  }),
  
  // Test helpers
  mockEmit: (event, data) => {
    if (mockSocket.listeners && mockSocket.listeners.has(event)) {
      mockSocket.listeners.get(event).forEach(callback => callback(data))
    }
  },
  
  mockConnect: () => {
    mockSocket.connected = true
    mockSocket.mockEmit('connect')
  },
  
  mockDisconnect: () => {
    mockSocket.connected = false
    mockSocket.mockEmit('disconnect')
  },
  
  mockReceive: (event, data) => {
    mockSocket.mockEmit(event, data)
  },
  
  // Reset for tests
  mockReset: () => {
    mockSocket.connected = false
    mockSocket.listeners = new Map()
    mockSocket.emittedEvents = []
    jest.clearAllMocks()
  }
}

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => mockSocket),
  io: jest.fn(() => mockSocket),
}))

// Mock the draft room hook
jest.mock('@/hooks/use-websocket', () => ({
  useDraftRoom: jest.fn(() => ({
    draftState: null,
    availablePlayers: [],
    isConnected: false,
    isLoading: false,
    error: null,
    draftPlayer: jest.fn(),
    joinDraft: jest.fn(),
    leaveDraft: jest.fn(),
  })),
  
  useWebSocket: jest.fn(() => ({
    socket: mockSocket,
    isConnected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
}))

// Export mocks for test usage
global.mockWebSocket = MockWebSocket
global.mockSocket = mockSocket
global.mockSocketIO = mockSocketIO

// Reset function for individual tests
global.resetWebSocketMocks = () => {
  mockSocket.mockReset()
  jest.clearAllMocks()
}