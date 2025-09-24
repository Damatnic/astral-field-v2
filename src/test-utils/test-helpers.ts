/**
 * Test Helpers and Utilities
 * Common testing utilities for API testing, mocking, and assertions
 */

import { createMocks } from 'node-mocks-http'
import { TestDatabase } from './test-database'
import { sign } from 'jsonwebtoken'

// Request should be available from jest.setup.js

// Mock NextRequest for testing
interface MockNextRequest extends Request {
  params?: Record<string, string>
}

export class TestHelpers {
  /**
   * Create a mock NextRequest for API testing
   */
  static createMockRequest(options: {
    method?: string
    url?: string
    body?: any
    headers?: Record<string, string>
    cookies?: Record<string, string>
    params?: Record<string, string>
  } = {}): MockNextRequest {
    const {
      method = 'GET',
      url = 'http://localhost:3000/test',
      body,
      headers = {},
      cookies = {},
      params = {}
    } = options

    const { req } = createMocks({
      method,
      url,
      headers: {
        'content-type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      cookies
    })

    // Create request with cookies in headers
    const cookieHeader = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')

    const requestHeaders = {
      'content-type': 'application/json',
      ...headers
    }

    if (cookieHeader) {
      requestHeaders.cookie = cookieHeader
    }

    // Create mock request
    const request = new Request(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    }) as MockNextRequest

    // Add params for dynamic routes
    request.params = params

    return request
  }

  /**
   * Create authenticated request with JWT token
   */
  static async createAuthenticatedRequest(options: {
    method?: string
    url?: string
    body?: any
    userEmail?: string
    role?: string
  } = {}) {
    const { userEmail = 'commissioner@test.com', role = 'COMMISSIONER', ...requestOptions } = options
    
    // Get test user
    const user = await TestDatabase.getTestUser(userEmail)
    if (!user) {
      throw new Error(`Test user not found: ${userEmail}`)
    }

    // Create JWT token
    const token = sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.NEXTAUTH_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )

    return this.createMockRequest({
      ...requestOptions,
      headers: {
        ...requestOptions.headers,
        authorization: `Bearer ${token}`
      },
      cookies: {
        'auth-token': token
      }
    })
  }

  /**
   * Assert API response structure and status
   */
  static async assertApiResponse(
    response: Response,
    expectedStatus: number,
    expectedProperties?: string[]
  ) {
    expect(response.status).toBe(expectedStatus)
    
    if (expectedProperties) {
      const data = await response.json()
      expectedProperties.forEach(prop => {
        expect(data).toHaveProperty(prop)
      })
      return data
    }
    
    return response
  }

  /**
   * Assert successful API response with data
   */
  static async assertSuccessResponse(response: Response, expectedProperties?: string[]) {
    const data = await this.assertApiResponse(response, 200, expectedProperties)
    expect(data.success).toBe(true)
    return data
  }

  /**
   * Assert error API response
   */
  static async assertErrorResponse(response: Response, expectedStatus: number = 400) {
    const data = await this.assertApiResponse(response, expectedStatus, ['error'])
    expect(data.success).toBeFalsy()
    return data
  }

  /**
   * Mock external API calls
   */
  static mockExternalAPIs() {
    // Mock fetch for external APIs
    global.fetch = jest.fn()

    // Mock Sleeper API responses
    this.mockSleeperAPI()
    
    // Mock ESPN API responses  
    this.mockESPNAPI()
  }

  private static mockSleeperAPI() {
    const mockSleeperResponses = {
      '/v1/players/nfl': {
        '4046': {
          player_id: '4046',
          full_name: 'Josh Allen',
          position: 'QB',
          team: 'BUF',
          active: true
        },
        '4029': {
          player_id: '4029',
          full_name: 'Christian McCaffrey',
          position: 'RB', 
          team: 'SF',
          active: true
        }
      },
      '/v1/stats/nfl/2024/1': {
        '4046': {
          pts_ppr: 24.5,
          pass_yd: 275,
          pass_td: 2,
          rush_yd: 18,
          rush_td: 1
        }
      }
    }

    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      const urlPath = new URL(url).pathname
      
      if (url.includes('sleeper.app')) {
        const mockData = mockSleeperResponses[urlPath as keyof typeof mockSleeperResponses]
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData || {})
        })
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      })
    })
  }

  private static mockESPNAPI() {
    const mockESPNData = {
      athletes: [
        {
          id: 3139477,
          fullName: 'Josh Allen',
          position: { abbreviation: 'QB' },
          team: { abbreviation: 'BUF' }
        },
        {
          id: 3916387,
          fullName: 'Christian McCaffrey',
          position: { abbreviation: 'RB' },
          team: { abbreviation: 'SF' }
        }
      ]
    }

    // ESPN API responses are already handled by the main fetch mock
    // Just ensure ESPN patterns return appropriate data
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('espn.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockESPNData)
        })
      }
      
      // Chain to existing Sleeper mock
      return this.mockSleeperAPI()
    })
  }

  /**
   * Mock WebSocket for real-time features
   */
  static mockWebSocket() {
    class MockWebSocket {
      static CONNECTING = 0
      static OPEN = 1
      static CLOSING = 2
      static CLOSED = 3

      readyState = MockWebSocket.OPEN
      onopen: ((event: Event) => void) | null = null
      onclose: ((event: CloseEvent) => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      constructor(public url: string) {
        setTimeout(() => {
          if (this.onopen) {
            this.onopen(new Event('open'))
          }
        }, 0)
      }

      send(data: string) {
        // Mock sending data
        console.log('Mock WebSocket send:', data)
      }

      close() {
        this.readyState = MockWebSocket.CLOSED
        if (this.onclose) {
          this.onclose(new CloseEvent('close'))
        }
      }

      // Helper for testing - simulate receiving messages
      simulateMessage(data: any) {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', {
            data: JSON.stringify(data)
          }))
        }
      }
    }

    ;(global as any).WebSocket = MockWebSocket
    return MockWebSocket
  }

  /**
   * Mock console methods for cleaner test output
   */
  static mockConsole() {
    const originalConsole = { ...console }
    
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {})
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    return originalConsole
  }

  /**
   * Create test data factories for common entities
   */
  static factories = {
    user: (overrides: any = {}) => ({
      email: `test${Date.now()}@example.com`,
      name: 'Test User',
      role: 'PLAYER',
      teamName: 'Test Team',
      ...overrides
    }),

    league: (overrides: any = {}) => ({
      name: `Test League ${Date.now()}`,
      description: 'Test league description',
      maxTeams: 10,
      draftType: 'SNAKE',
      scoringType: 'PPR',
      ...overrides
    }),

    player: (overrides: any = {}) => ({
      name: `Test Player ${Date.now()}`,
      position: 'RB',
      team: 'TEST',
      byeWeek: 10,
      isActive: true,
      espnId: Math.floor(Math.random() * 100000),
      ...overrides
    }),

    trade: (overrides: any = {}) => ({
      status: 'PENDING',
      proposedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ...overrides
    })
  }

  /**
   * Time manipulation for testing
   */
  static time = {
    freeze: (date?: Date) => {
      jest.useFakeTimers()
      if (date) {
        jest.setSystemTime(date)
      }
    },

    travel: (ms: number) => {
      jest.advanceTimersByTime(ms)
    },

    restore: () => {
      jest.useRealTimers()
    }
  }

  /**
   * Database transaction helpers for isolated tests
   */
  static async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return await TestDatabase.prisma.$transaction(async (tx) => {
      const result = await callback()
      // Transaction will be rolled back after test
      throw new Error('ROLLBACK') // This will rollback the transaction
    }).catch(error => {
      if (error.message === 'ROLLBACK') {
        // This is our intentional rollback, return the result
        return callback() // Run again without transaction for the actual result
      }
      throw error
    })
  }

  /**
   * Performance testing helpers
   */
  static async measurePerformance<T>(
    name: string,
    operation: () => Promise<T>,
    maxDurationMs: number = 1000
  ): Promise<T> {
    const start = performance.now()
    const result = await operation()
    const duration = performance.now() - start
    
    console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`)
    
    if (duration > maxDurationMs) {
      console.warn(`⚠️  Performance warning: ${name} took ${duration.toFixed(2)}ms (max: ${maxDurationMs}ms)`)
    }
    
    return result
  }

  /**
   * Cleanup helper for tests
   */
  static async cleanup() {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Reset fetch mock
    if (global.fetch && jest.isMockFunction(global.fetch)) {
      (global.fetch as jest.Mock).mockReset()
    }
    
    // Clear any test data
    await TestDatabase.cleanup()
  }
}