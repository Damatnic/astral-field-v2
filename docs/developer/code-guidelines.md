# Code Guidelines and Standards

## Overview

This document outlines the coding standards, best practices, and conventions used in the Astral Field V2.1 project. Following these guidelines ensures consistency, maintainability, and high code quality across the entire codebase.

## TypeScript Standards

### General Principles
- **Strict mode enabled** - Use strict TypeScript configuration
- **Type safety first** - Avoid `any` and `unknown` unless absolutely necessary
- **Explicit types** - Prefer explicit type annotations for public APIs
- **Interface over type** - Use interfaces for object shapes, types for unions

### Type Definitions

#### Interface Naming
```typescript
// ✅ Good - Use PascalCase with descriptive names
interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
}

// ✅ Good - Props interfaces end with 'Props'
interface TeamCardProps {
  team: Team
  isCurrentUser?: boolean
  onSelect?: (teamId: string) => void
}

// ❌ Bad - Generic or unclear names
interface Data {
  stuff: any
}
```

#### Type Safety
```typescript
// ✅ Good - Use proper type guards
function isValidEmail(email: string): email is string {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ✅ Good - Use discriminated unions
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string }

// ✅ Good - Use branded types for IDs
type UserId = string & { readonly brand: unique symbol }
type TeamId = string & { readonly brand: unique symbol }

// ❌ Bad - Using any
function processData(data: any): any {
  return data.whatever
}
```

#### Generic Conventions
```typescript
// ✅ Good - Descriptive generic names
interface Repository<TEntity, TKey = string> {
  findById(id: TKey): Promise<TEntity | null>
  save(entity: TEntity): Promise<TEntity>
}

// ✅ Good - Constrained generics
interface ApiEndpoint<
  TRequest extends Record<string, unknown>,
  TResponse
> {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  handler: (req: TRequest) => Promise<TResponse>
}
```

## React Component Standards

### Component Structure

#### Functional Components
```typescript
// ✅ Good - Complete component structure
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PlayerCardProps {
  player: Player
  isSelected?: boolean
  onSelect?: (playerId: string) => void
  className?: string
}

export const PlayerCard = forwardRef<HTMLDivElement, PlayerCardProps>(
  ({ player, isSelected = false, onSelect, className }, ref) => {
    const handleClick = () => {
      onSelect?.(player.id)
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border p-4 transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-primary',
          className
        )}
        onClick={handleClick}
      >
        <h3 className="font-semibold">{player.name}</h3>
        <p className="text-sm text-muted-foreground">
          {player.position} - {player.nflTeam}
        </p>
      </div>
    )
  }
)

PlayerCard.displayName = 'PlayerCard'
```

#### Component Organization
```typescript
// File: components/team/TeamManagement.tsx

// 1. Imports - external libraries first, then internal
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { useTeam } from '@/hooks/useTeam'
import { TeamService } from '@/lib/services/team'

// 2. Types and interfaces
interface TeamManagementProps {
  teamId: string
  isOwner: boolean
}

// 3. Constants
const ROSTER_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'] as const

// 4. Main component
export function TeamManagement({ teamId, isOwner }: TeamManagementProps) {
  // 4a. Hooks (state, effects, custom hooks)
  const router = useRouter()
  const { team, loading, updateTeam } = useTeam(teamId)
  const [isEditing, setIsEditing] = useState(false)

  // 4b. Event handlers
  const handleSave = async (updatedTeam: Partial<Team>) => {
    await updateTeam(updatedTeam)
    setIsEditing(false)
  }

  // 4c. Effects
  useEffect(() => {
    if (!isOwner) {
      router.push('/unauthorized')
    }
  }, [isOwner, router])

  // 4d. Early returns
  if (loading) return <LoadingSpinner />
  if (!team) return <ErrorMessage>Team not found</ErrorMessage>

  // 4e. Render
  return (
    <Card className="p-6">
      {/* Component JSX */}
    </Card>
  )
}

// 5. Sub-components (if needed)
function LoadingSpinner() {
  return <div className="animate-spin">Loading...</div>
}
```

### Hooks Standards

#### Custom Hook Conventions
```typescript
// ✅ Good - Custom hook structure
import { useState, useEffect, useCallback } from 'react'
import { Player } from '@prisma/client'

interface UsePlayerSearchOptions {
  position?: string
  team?: string
  available?: boolean
}

interface UsePlayerSearchReturn {
  players: Player[]
  loading: boolean
  error: string | null
  search: (query: string) => void
  clearSearch: () => void
}

export function usePlayerSearch(
  options: UsePlayerSearchOptions = {}
): UsePlayerSearchReturn {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery)
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/players/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, ...options }),
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setPlayers(data.players)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }, [options])

  const clearSearch = useCallback(() => {
    setQuery('')
    setPlayers([])
    setError(null)
  }, [])

  return { players, loading, error, search, clearSearch }
}
```

## API Route Standards

### Route Organization
```typescript
// File: app/api/teams/[id]/roster/route.ts

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateFromRequest } from '@/lib/auth'
import { getTeamRoster, updateTeamRoster } from '@/lib/services/roster'
import { ApiError, handleApiError } from '@/lib/api-utils'

// Request/Response schemas
const getRosterParamsSchema = z.object({
  id: z.string().cuid(),
})

const updateRosterBodySchema = z.object({
  lineup: z.record(z.string()),
  week: z.number().int().min(1).max(18),
})

// GET /api/teams/[id]/roster
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication
    const user = await authenticateFromRequest(request)
    if (!user) {
      throw new ApiError('Unauthorized', 401)
    }

    // 2. Input validation
    const { id: teamId } = getRosterParamsSchema.parse(params)

    // 3. Authorization check
    const team = await getTeam(teamId)
    if (!team || team.ownerId !== user.id) {
      throw new ApiError('Forbidden', 403)
    }

    // 4. Business logic
    const roster = await getTeamRoster(teamId)

    // 5. Response
    return Response.json({
      success: true,
      data: roster,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/teams/[id]/roster
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateFromRequest(request)
    if (!user) {
      throw new ApiError('Unauthorized', 401)
    }

    const { id: teamId } = getRosterParamsSchema.parse(params)
    const body = updateRosterBodySchema.parse(await request.json())

    const team = await getTeam(teamId)
    if (!team || team.ownerId !== user.id) {
      throw new ApiError('Forbidden', 403)
    }

    const updatedRoster = await updateTeamRoster(teamId, body)

    return Response.json({
      success: true,
      data: updatedRoster,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### Error Handling
```typescript
// lib/api-utils.ts
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): Response {
  console.error('API Error:', error)

  if (error instanceof ApiError) {
    return Response.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof z.ZodError) {
    return Response.json(
      {
        success: false,
        error: 'Validation failed',
        details: error.errors,
      },
      { status: 400 }
    )
  }

  // Unexpected errors
  return Response.json(
    {
      success: false,
      error: 'Internal server error',
    },
    { status: 500 }
  )
}
```

## Database and Prisma Standards

### Schema Organization
```prisma
// Good - Well-documented model with proper relationships
/// User model representing platform users
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?  @db.VarChar(255)
  role      UserRole @default(PLAYER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  teams  Team[]
  trades Trade[]

  // Indexes for performance
  @@index([email])
  @@index([role, createdAt])
  @@map("users")
}
```

### Query Patterns
```typescript
// ✅ Good - Reusable query functions
export async function getTeamWithRoster(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      roster: {
        include: {
          player: {
            select: {
              id: true,
              name: true,
              position: true,
              nflTeam: true,
              status: true,
            },
          },
        },
        orderBy: {
          rosterSlot: 'asc',
        },
      },
    },
  })
}

// ✅ Good - Transaction for data consistency
export async function executeTradeTransaction(tradeId: string) {
  return prisma.$transaction(async (tx) => {
    // Update trade status
    const trade = await tx.trade.update({
      where: { id: tradeId },
      data: { status: 'ACCEPTED', processedAt: new Date() },
      include: { items: true },
    })

    // Transfer players between teams
    for (const item of trade.items) {
      await tx.rosterPlayer.updateMany({
        where: { playerId: item.playerId },
        data: { teamId: item.toTeamId },
      })
    }

    return trade
  })
}
```

## Styling and CSS Standards

### Tailwind CSS Conventions
```typescript
// ✅ Good - Use cn utility for conditional classes
import { cn } from '@/lib/utils'

interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function Button({ variant = 'default', size = 'default', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        
        // Variant styles
        {
          'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
          'border border-input bg-background hover:bg-accent': variant === 'outline',
        },
        
        // Size styles
        {
          'h-9 px-3 text-sm': size === 'sm',
          'h-10 px-4 py-2': size === 'default',
          'h-11 px-8': size === 'lg',
        },
        
        className
      )}
      {...props}
    />
  )
}
```

### Component Variants with CVA
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        warning: 'border-warning/50 text-warning dark:border-warning [&>svg]:text-warning',
        success: 'border-success/50 text-success dark:border-success [&>svg]:text-success',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}
```

## Testing Standards

### Unit Test Structure
```typescript
// ✅ Good - Complete test structure
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { PlayerCard } from '@/components/player/PlayerCard'
import { mockPlayer } from '@/__tests__/mocks/player'

// Mock external dependencies
vi.mock('@/hooks/usePlayer', () => ({
  usePlayer: vi.fn(),
}))

describe('PlayerCard', () => {
  // Setup and teardown
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test cases organized by behavior
  describe('rendering', () => {
    it('displays player information correctly', () => {
      render(<PlayerCard player={mockPlayer} />)
      
      expect(screen.getByText(mockPlayer.name)).toBeInTheDocument()
      expect(screen.getByText(`${mockPlayer.position} - ${mockPlayer.nflTeam}`)).toBeInTheDocument()
    })

    it('shows selected state when selected', () => {
      render(<PlayerCard player={mockPlayer} isSelected />)
      
      expect(screen.getByRole('button')).toHaveClass('ring-2 ring-primary')
    })
  })

  describe('interactions', () => {
    it('calls onSelect when clicked', async () => {
      const onSelect = vi.fn()
      render(<PlayerCard player={mockPlayer} onSelect={onSelect} />)
      
      fireEvent.click(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith(mockPlayer.id)
      })
    })

    it('handles keyboard navigation', () => {
      const onSelect = vi.fn()
      render(<PlayerCard player={mockPlayer} onSelect={onSelect} />)
      
      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: 'Enter' })
      
      expect(onSelect).toHaveBeenCalledWith(mockPlayer.id)
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<PlayerCard player={mockPlayer} />)
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', expect.stringContaining(mockPlayer.name))
    })
  })
})
```

### Integration Test Example
```typescript
// ✅ Good - API integration test
import { testApiHandler } from 'next-test-api-route-handler'
import handler from '@/app/api/teams/[id]/route'
import { createMockUser, createMockTeam } from '@/__tests__/mocks'

describe('/api/teams/[id]', () => {
  it('returns team data for authenticated user', async () => {
    const mockUser = createMockUser()
    const mockTeam = createMockTeam({ ownerId: mockUser.id })

    await testApiHandler({
      handler,
      params: { id: mockTeam.id },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockUser.sessionToken}`,
          },
        })

        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.id).toBe(mockTeam.id)
      },
    })
  })

  it('returns 401 for unauthenticated requests', async () => {
    await testApiHandler({
      handler,
      params: { id: 'team_123' },
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' })

        expect(response.status).toBe(401)
      },
    })
  })
})
```

## Performance Standards

### Code Splitting
```typescript
// ✅ Good - Lazy load heavy components
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/loading'

const DraftRoom = lazy(() => import('@/components/draft/DraftRoom'))
const TradeAnalyzer = lazy(() => import('@/components/trade/TradeAnalyzer'))

export function FantasyDashboard() {
  return (
    <div>
      <Suspense fallback={<LoadingSpinner />}>
        <DraftRoom />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <TradeAnalyzer />
      </Suspense>
    </div>
  )
}
```

### Memoization
```typescript
// ✅ Good - Memoize expensive calculations
import { useMemo, memo } from 'react'

interface PlayerStatsProps {
  players: Player[]
  scoringSettings: ScoringSettings
}

export const PlayerStats = memo(function PlayerStats({ 
  players, 
  scoringSettings 
}: PlayerStatsProps) {
  const calculatedStats = useMemo(() => {
    return players.map(player => ({
      ...player,
      projectedPoints: calculateProjectedPoints(player, scoringSettings),
      fantasyValue: calculateFantasyValue(player, scoringSettings),
    }))
  }, [players, scoringSettings])

  return (
    <div>
      {calculatedStats.map(player => (
        <PlayerStatCard key={player.id} player={player} />
      ))}
    </div>
  )
})
```

## Security Standards

### Input Validation
```typescript
// ✅ Good - Comprehensive validation
import { z } from 'zod'

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, 'Team name is required')
    .max(50, 'Team name must be 50 characters or less')
    .regex(/^[a-zA-Z0-9\s-_]+$/, 'Team name contains invalid characters'),
  
  leagueId: z
    .string()
    .cuid('Invalid league ID format'),
    
  draftPosition: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
```

### Authentication Checks
```typescript
// ✅ Good - Consistent auth pattern
export async function requireAuth(request: NextRequest) {
  const user = await authenticateFromRequest(request)
  if (!user) {
    throw new ApiError('Authentication required', 401)
  }
  return user
}

export async function requireRole(
  request: NextRequest, 
  requiredRole: 'ADMIN' | 'COMMISSIONER'
) {
  const user = await requireAuth(request)
  if (!canAccessRole(user.role, requiredRole)) {
    throw new ApiError('Insufficient permissions', 403)
  }
  return user
}
```

## File and Directory Naming

### Conventions
- **PascalCase** - Components, types, classes
- **camelCase** - Functions, variables, files
- **kebab-case** - API routes, static files
- **SCREAMING_SNAKE_CASE** - Constants

### File Structure Examples
```
src/
├── components/
│   ├── ui/                    # Base UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── index.ts          # Re-exports
│   ├── forms/                 # Form-specific components
│   │   ├── LoginForm.tsx
│   │   └── TeamSettingsForm.tsx
│   └── feature/              # Feature-specific components
│       ├── PlayerCard.tsx
│       ├── PlayerList.tsx
│       └── __tests__/        # Co-located tests
├── hooks/
│   ├── useAuth.ts
│   ├── useTeam.ts
│   └── useLocalStorage.ts
├── lib/
│   ├── auth.ts              # Authentication utilities
│   ├── db.ts                # Database connection
│   ├── utils.ts             # General utilities
│   └── services/           # Service layer
│       ├── team.ts
│       └── player.ts
└── types/
    ├── api.ts              # API type definitions
    ├── fantasy.ts          # Fantasy-specific types
    └── global.d.ts         # Global type declarations
```

## Documentation Standards

### Code Comments
```typescript
/**
 * Calculates fantasy points for a player based on stats and scoring settings
 * 
 * @param player - Player with statistical data
 * @param stats - Raw statistical performance
 * @param scoring - League scoring configuration
 * @returns Calculated fantasy points rounded to 2 decimal places
 * 
 * @example
 * ```typescript
 * const points = calculateFantasyPoints(
 *   player,
 *   { passingYards: 300, touchdowns: 2 },
 *   { passingYards: 0.04, touchdowns: 6 }
 * )
 * // Returns: 18.00
 * ```
 */
export function calculateFantasyPoints(
  player: Player,
  stats: PlayerStats,
  scoring: ScoringSettings
): number {
  // Implementation
}
```

### README Documentation
Each major feature should include:
- Purpose and functionality
- Usage examples
- API documentation
- Testing instructions
- Performance considerations

Following these guidelines ensures consistent, maintainable, and high-quality code across the entire Astral Field platform.