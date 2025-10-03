# 🧪 Comprehensive Testing Guide

## Overview

This guide provides everything you need to write high-quality tests for the Astral Field V1 project and achieve 100% test coverage.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Test Structure](#test-structure)
3. [Testing Components](#testing-components)
4. [Testing API Routes](#testing-api-routes)
5. [Testing Utilities](#testing-utilities)
6. [Integration Testing](#integration-testing)
7. [E2E Testing](#e2e-testing)
8. [Best Practices](#best-practices)
9. [Coverage Goals](#coverage-goals)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- path/to/test.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"
```

### Test File Location

```
apps/web/__tests__/
├── components/          # Component tests
├── api/                 # API route tests
├── lib/                 # Utility/library tests
├── integration/         # Integration tests
├── e2e/                 # End-to-end tests
├── setup/               # Test configuration
└── templates/           # Test templates
```

---

## 🏗️ Test Structure

### Basic Test Structure

```typescript
describe('ComponentName or Feature', () => {
  // Setup
  beforeEach(() => {
    // Runs before each test
  })

  afterEach(() => {
    // Runs after each test
  })

  describe('Specific Feature', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'
      
      // Act
      const result = someFunction(input)
      
      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### Test Organization

Group related tests using nested `describe` blocks:

```typescript
describe('UserProfile', () => {
  describe('Rendering', () => {
    it('should render user name', () => {})
    it('should render user avatar', () => {})
  })

  describe('User Interactions', () => {
    it('should handle edit button click', () => {})
    it('should handle save button click', () => {})
  })

  describe('Error States', () => {
    it('should display error message', () => {})
    it('should handle retry', () => {})
  })
})
```

---

## 🎨 Testing Components

### Using Templates

1. Copy the component test template:
```bash
cp __tests__/templates/component.test.template.tsx __tests__/components/YourComponent.test.tsx
```

2. Replace `[ComponentName]` with your component name

3. Fill in the test cases

### Component Test Checklist

- [ ] **Rendering**
  - Renders without crashing
  - Renders with required props
  - Renders with optional props
  - Conditional rendering

- [ ] **Props**
  - Required props validation
  - Optional props handling
  - Prop type validation
  - Default props

- [ ] **User Interactions**
  - Click events
  - Input changes
  - Form submissions
  - Keyboard navigation

- [ ] **State Management**
  - Initial state
  - State updates
  - State reset
  - Side effects

- [ ] **Loading States**
  - Loading indicator
  - Loading completion
  - Loading errors

- [ ] **Error States**
  - Error display
  - Error recovery
  - Error boundaries

- [ ] **Accessibility**
  - ARIA labels
  - Keyboard navigation
  - Focus management
  - Screen reader support

- [ ] **Edge Cases**
  - Empty data
  - Null/undefined values
  - Very long text
  - Rapid interactions

### Example Component Test

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerCard } from '@/components/players/player-card'

describe('PlayerCard', () => {
  const mockPlayer = {
    id: '1',
    name: 'Patrick Mahomes',
    position: 'QB',
    team: 'KC',
    points: 25.4
  }

  it('should render player information', () => {
    render(<PlayerCard player={mockPlayer} />)
    
    expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    expect(screen.getByText('QB')).toBeInTheDocument()
    expect(screen.getByText('KC')).toBeInTheDocument()
    expect(screen.getByText('25.4')).toBeInTheDocument()
  })

  it('should handle add to roster click', async () => {
    const handleAdd = jest.fn()
    render(<PlayerCard player={mockPlayer} onAdd={handleAdd} />)
    
    const addButton = screen.getByRole('button', { name: /add/i })
    await userEvent.click(addButton)
    
    expect(handleAdd).toHaveBeenCalledWith(mockPlayer)
  })

  it('should be keyboard accessible', async () => {
    const handleAdd = jest.fn()
    render(<PlayerCard player={mockPlayer} onAdd={handleAdd} />)
    
    const addButton = screen.getByRole('button', { name: /add/i })
    addButton.focus()
    
    expect(addButton).toHaveFocus()
    
    await userEvent.keyboard('{Enter}')
    expect(handleAdd).toHaveBeenCalled()
  })
})
```

---

## 🔌 Testing API Routes

### Using Templates

1. Copy the API route test template:
```bash
cp __tests__/templates/api-route.test.template.ts __tests__/api/your-route.test.ts
```

2. Replace `[RouteName]` with your route name

3. Fill in the test cases

### API Test Checklist

- [ ] **HTTP Methods**
  - GET requests
  - POST requests
  - PUT/PATCH requests
  - DELETE requests

- [ ] **Authentication**
  - Authenticated requests
  - Unauthenticated requests
  - Token validation

- [ ] **Authorization**
  - Role-based access
  - Resource ownership
  - Permission checks

- [ ] **Input Validation**
  - Required fields
  - Field types
  - Field formats
  - Field lengths

- [ ] **Error Handling**
  - 400 Bad Request
  - 401 Unauthorized
  - 403 Forbidden
  - 404 Not Found
  - 500 Internal Server Error

- [ ] **Security**
  - SQL injection prevention
  - XSS prevention
  - CSRF protection
  - Rate limiting

- [ ] **Performance**
  - Response time
  - Pagination
  - Caching

### Example API Test

```typescript
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/players/route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma')

describe('API: /api/players', () => {
  describe('GET', () => {
    it('should return players list', async () => {
      const mockPlayers = [
        { id: '1', name: 'Player 1', position: 'QB' }
      ]
      
      ;(prisma.player.findMany as jest.Mock).mockResolvedValue(mockPlayers)

      const request = new NextRequest('http://localhost:3000/api/players')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockPlayers)
    })

    it('should filter by position', async () => {
      ;(prisma.player.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/players?position=QB')
      await GET(request)

      expect(prisma.player.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { position: 'QB' }
        })
      )
    })
  })

  describe('POST', () => {
    it('should create player', async () => {
      const newPlayer = { name: 'New Player', position: 'RB' }
      ;(prisma.player.create as jest.Mock).mockResolvedValue({
        id: '1',
        ...newPlayer
      })

      const request = new NextRequest('http://localhost:3000/api/players', {
        method: 'POST',
        body: JSON.stringify(newPlayer)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data).toMatchObject(newPlayer)
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/players', {
        method: 'POST',
        body: JSON.stringify({}) // Missing required fields
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
```

---

## 🛠️ Testing Utilities

### Testing Pure Functions

```typescript
import { calculateFantasyPoints } from '@/lib/utils/fantasy-points'

describe('calculateFantasyPoints', () => {
  it('should calculate QB points correctly', () => {
    const stats = {
      passingYards: 300,
      passingTDs: 3,
      interceptions: 1
    }

    const points = calculateFantasyPoints('QB', stats)

    expect(points).toBe(23) // 300/25 + 3*4 - 1*2
  })

  it('should handle zero stats', () => {
    const points = calculateFantasyPoints('QB', {})
    expect(points).toBe(0)
  })

  it('should handle negative points', () => {
    const stats = { interceptions: 5 }
    const points = calculateFantasyPoints('QB', stats)
    expect(points).toBe(-10)
  })
})
```

### Testing Async Functions

```typescript
import { fetchPlayerData } from '@/lib/api/players'

describe('fetchPlayerData', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('should fetch player data successfully', async () => {
    const mockData = { id: '1', name: 'Player' }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData
    })

    const result = await fetchPlayerData('1')

    expect(result).toEqual(mockData)
    expect(global.fetch).toHaveBeenCalledWith('/api/players/1')
  })

  it('should handle fetch errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    await expect(fetchPlayerData('1')).rejects.toThrow('Network error')
  })
})
```

---

## 🔗 Integration Testing

### Testing Component Integration

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerList } from '@/components/players/player-list'
import { PlayerCard } from '@/components/players/player-card'

describe('PlayerList Integration', () => {
  it('should display players and handle selection', async () => {
    const players = [
      { id: '1', name: 'Player 1' },
      { id: '2', name: 'Player 2' }
    ]

    render(<PlayerList players={players} />)

    expect(screen.getByText('Player 1')).toBeInTheDocument()
    expect(screen.getByText('Player 2')).toBeInTheDocument()

    const firstPlayer = screen.getByText('Player 1')
    await userEvent.click(firstPlayer)

    await waitFor(() => {
      expect(screen.getByText(/selected/i)).toBeInTheDocument()
    })
  })
})
```

### Testing API Integration

```typescript
import { testApiHandler } from 'next-test-api-route-handler'
import * as handler from '@/app/api/players/route'

describe('API Integration: Players', () => {
  it('should create and retrieve player', async () => {
    // Create player
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          body: JSON.stringify({ name: 'Test Player' })
        })
        expect(res.status).toBe(201)
        const data = await res.json()
        const playerId = data.data.id

        // Retrieve player
        const getRes = await fetch({
          method: 'GET',
          url: `/api/players/${playerId}`
        })
        expect(getRes.status).toBe(200)
        const player = await getRes.json()
        expect(player.data.name).toBe('Test Player')
      }
    })
  })
})
```

---

## 🌐 E2E Testing

### Using Playwright

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Authentication Flow', () => {
  test('should sign in successfully', async ({ page }) => {
    await page.goto('/auth/signin')

    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=Welcome back')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin')

    await page.fill('[name="email"]', 'wrong@example.com')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })
})
```

---

## ✅ Best Practices

### 1. Test Naming

```typescript
// ❌ Bad
it('test 1', () => {})
it('works', () => {})

// ✅ Good
it('should render player name', () => {})
it('should handle click event', () => {})
it('should display error when API fails', () => {})
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should calculate total points', () => {
  // Arrange
  const player = { touchdowns: 2, yards: 100 }
  
  // Act
  const points = calculatePoints(player)
  
  // Assert
  expect(points).toBe(22)
})
```

### 3. Test Independence

```typescript
// ❌ Bad - Tests depend on each other
let userId
it('should create user', () => {
  userId = createUser()
})
it('should update user', () => {
  updateUser(userId) // Depends on previous test
})

// ✅ Good - Tests are independent
it('should create user', () => {
  const userId = createUser()
  expect(userId).toBeDefined()
})
it('should update user', () => {
  const userId = createUser() // Create fresh user
  updateUser(userId)
})
```

### 4. Mock External Dependencies

```typescript
// Mock API calls
jest.mock('@/lib/api', () => ({
  fetchData: jest.fn()
}))

// Mock database
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn()
    }
  }
}))
```

### 5. Test Edge Cases

```typescript
describe('calculateAge', () => {
  it('should handle normal dates', () => {
    expect(calculateAge('1990-01-01')).toBe(34)
  })

  it('should handle leap years', () => {
    expect(calculateAge('2000-02-29')).toBe(24)
  })

  it('should handle invalid dates', () => {
    expect(calculateAge('invalid')).toBeNull()
  })

  it('should handle future dates', () => {
    expect(calculateAge('2050-01-01')).toBe(0)
  })
})
```

---

## 📊 Coverage Goals

### Target Coverage

- **Overall:** 100%
- **Statements:** 100%
- **Branches:** 100%
- **Functions:** 100%
- **Lines:** 100%

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage Thresholds

Configure in `jest.config.js`:

```javascript
module.exports = {
  coverageThresholds: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    }
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Router.prefetch is not a function

**Solution:** Already fixed in jest.setup.js - router.prefetch now returns a resolved promise.

#### 2. Module not found

```typescript
// Add to jest.config.js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1'
}
```

#### 3. Async tests timing out

```typescript
// Increase timeout
it('should complete async operation', async () => {
  // test code
}, 10000) // 10 second timeout
```

#### 4. Mock not working

```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
})
```

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Test Templates](./apps/web/__tests__/templates/)

---

## 🎯 Next Steps

1. Review test templates
2. Start with component tests
3. Move to API route tests
4. Add integration tests
5. Complete E2E tests
6. Achieve 100% coverage

---

**Happy Testing! 🧪**
