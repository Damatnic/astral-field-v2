# AstralField v3.0 - Developer Onboarding Guide

## Welcome to AstralField Development

This comprehensive guide will get you from zero to productive development on AstralField v3.0 in under 30 minutes. Whether you're joining the team or contributing to the open-source project, this guide covers everything you need to know.

## Quick Start Checklist

- [ ] **Prerequisites installed** (Node.js 18+, Git, PostgreSQL)
- [ ] **Repository cloned and dependencies installed**
- [ ] **Environment variables configured**
- [ ] **Database setup completed**
- [ ] **Development servers running**
- [ ] **Test suite passing**
- [ ] **First feature branch created**

## Prerequisites

### Required Software

```bash
# Node.js 18+ (LTS recommended)
node --version  # Should be >= 18.17.0
npm --version   # Should be >= 9.0.0

# Git for version control
git --version

# PostgreSQL 15+ (or access to cloud database)
psql --version

# Optional: Docker for containerized development
docker --version
```

### Recommended Tools

```bash
# VS Code with extensions
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension prisma.prisma

# GitHub CLI for streamlined workflow
gh --version
```

## Project Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/astral-field-v1.git
cd astral-field-v1

# Install all dependencies (monorepo)
npm install

# Verify installation
npm run typecheck
```

### 2. Environment Configuration

Copy the example environment file and configure your local settings:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database (Required)
DATABASE_URL="postgresql://user:password@localhost:5432/astralfield_dev"
DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/astralfield_dev"

# NextAuth (Required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-minimum-32-characters"

# Development settings
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Feature flags (Optional)
ENABLE_LIVE_SCORING="true"
ENABLE_AI_COACH="true"
ENABLE_REAL_TIME_CHAT="true"

# External APIs (Optional - has defaults)
ESPN_BASE_URL="https://site.api.espn.com/apis/site/v2/sports/football/nfl"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with test data
npm run db:seed

# Verify database connection
npm run health:check
```

### 4. Start Development Servers

```bash
# Start all services (recommended)
npm run dev:all

# Or start individually:
npm run dev      # Next.js frontend (port 3000)
npm run dev:api  # Express API server (port 3001)
```

### 5. Verify Setup

Visit these URLs to verify everything is working:

- **Frontend**: http://localhost:3000
- **API Health**: http://localhost:3001/api/health
- **Test Login**: Use any test user with password `fantasy2025`

## Development Workflow

### Project Structure Overview

```
astral-field-v1/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/app/         # App Router pages
│   │   ├── src/components/  # React components
│   │   └── src/lib/         # Utilities
│   └── api/                 # Express.js API server
│       ├── src/routes/      # API endpoints
│       ├── src/middleware/  # Express middleware
│       └── src/services/    # Business logic
├── packages/
│   └── ui/                  # Shared UI components
├── providers/
│   └── sleeper/             # External integrations
├── prisma/                  # Database schema
├── scripts/                 # Automation scripts
└── docs/                    # Documentation
```

### Development Commands

```bash
# Development
npm run dev          # Start frontend only
npm run dev:api      # Start API only
npm run dev:all      # Start both frontend and API

# Building
npm run build        # Build all workspaces
npm run build:web    # Build frontend only
npm run build:api    # Build API only

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:migrate   # Create migration
npm run db:seed      # Seed test data
npm run db:reset     # Reset database

# Testing
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:watch   # Watch mode testing

# Code Quality
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run format       # Prettier
```

### Git Workflow

#### Branch Naming Convention
```bash
# Feature branches
feature/user-authentication
feature/draft-room-improvements

# Bug fixes
fix/login-redirect-issue
fix/draft-timer-bug

# Documentation
docs/api-reference-update
docs/deployment-guide

# Hotfixes
hotfix/security-patch
hotfix/critical-bug-fix
```

#### Commit Message Format
```bash
# Type: Brief description (50 chars max)
# 
# Longer explanation if needed (wrap at 72 chars)
# 
# - Bullet points for multiple changes
# - Reference issues: Fixes #123

feat: Add real-time chat to draft room

Implement WebSocket-based chat system for live
communication during drafts.

- Add chat UI components
- Implement Socket.IO integration
- Add message persistence
- Fixes #45, #67
```

#### Standard Workflow
```bash
# 1. Create feature branch
git checkout main
git pull origin main
git checkout -b feature/my-new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: implement new feature"

# 3. Push and create PR
git push origin feature/my-new-feature
gh pr create --title "Add new feature" --body "Description..."

# 4. After review, merge and cleanup
gh pr merge --squash
git checkout main
git pull origin main
git branch -d feature/my-new-feature
```

## Frontend Development

### Component Architecture

AstralField uses a component-driven architecture with the following patterns:

#### Component Organization
```
src/components/
├── ui/              # Base components (Button, Input, Modal)
├── dashboard/       # Dashboard-specific components
├── draft/          # Draft room components
├── players/        # Player management components
├── team/           # Team management components
└── layout/         # Layout components (Header, Sidebar)
```

#### Component Example
```typescript
// src/components/players/PlayerCard.tsx
import { Player } from '@prisma/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PlayerCardProps {
  player: Player
  onAddToWatchlist?: (playerId: string) => void
  showActions?: boolean
}

export function PlayerCard({ 
  player, 
  onAddToWatchlist, 
  showActions = true 
}: PlayerCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{player.name}</h3>
          <Badge variant="outline">{player.position}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{player.nflTeam}</p>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Rank: #{player.rank}</div>
          <div>ADP: {player.adp}</div>
        </div>
        
        {showActions && (
          <div className="mt-4 flex gap-2">
            <Button 
              size="sm" 
              onClick={() => onAddToWatchlist?.(player.id)}
            >
              Add to Watchlist
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### State Management

#### React Query for Server State
```typescript
// src/lib/queries/players.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function usePlayer(playerId: string) {
  return useQuery({
    queryKey: ['player', playerId],
    queryFn: () => api.players.get(playerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (playerId: string) => api.players.addToWatchlist(playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })
}
```

#### Zustand for Client State
```typescript
// src/lib/stores/draft.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface DraftState {
  draftId: string | null
  currentPick: number
  timeRemaining: number
  isMyTurn: boolean
  
  setDraftId: (id: string) => void
  updateTimer: (time: number) => void
  setMyTurn: (isMyTurn: boolean) => void
}

export const useDraftStore = create<DraftState>()(
  devtools(
    (set) => ({
      draftId: null,
      currentPick: 1,
      timeRemaining: 90,
      isMyTurn: false,
      
      setDraftId: (id) => set({ draftId: id }),
      updateTimer: (time) => set({ timeRemaining: time }),
      setMyTurn: (isMyTurn) => set({ isMyTurn }),
    }),
    { name: 'draft-store' }
  )
)
```

### Styling Guidelines

#### Tailwind CSS Patterns
```typescript
// Common utility patterns
const styles = {
  // Buttons
  button: "px-4 py-2 rounded-md font-medium transition-colors",
  buttonPrimary: "bg-blue-600 text-white hover:bg-blue-700",
  buttonSecondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  
  // Cards
  card: "bg-white rounded-lg border shadow-sm",
  cardHover: "hover:shadow-md transition-shadow",
  
  // Forms
  input: "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500",
  label: "block text-sm font-medium text-gray-700 mb-1",
  
  // Layout
  container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
}
```

#### Component Variants with CVA
```typescript
// src/components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-gray-300 bg-white hover:bg-gray-50",
        ghost: "hover:bg-gray-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-sm",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
```

## Backend Development

### API Route Structure

#### Express Route Pattern
```typescript
// src/routes/players.ts
import { Router } from 'express'
import { z } from 'zod'
import { validateRequest } from '../middleware/validation'
import { authMiddleware } from '../middleware/auth'
import { playerService } from '../services/players'

const router = Router()

// Schema definitions
const getPlayersSchema = z.object({
  search: z.string().optional(),
  position: z.enum(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// Routes
router.get(
  '/',
  authMiddleware,
  validateRequest(getPlayersSchema, 'query'),
  async (req, res) => {
    try {
      const players = await playerService.getPlayers(req.validated)
      res.json(players)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch players' })
    }
  }
)

router.get(
  '/:id',
  authMiddleware,
  async (req, res) => {
    try {
      const player = await playerService.getPlayer(req.params.id)
      if (!player) {
        return res.status(404).json({ error: 'Player not found' })
      }
      res.json({ player })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch player' })
    }
  }
)

export { router as playerRoutes }
```

#### Service Layer Pattern
```typescript
// src/services/players.ts
import { prisma } from '../server'
import { Prisma } from '@prisma/client'

export class PlayerService {
  async getPlayers(filters: {
    search?: string
    position?: string
    page: number
    limit: number
  }) {
    const where: Prisma.playersWhereInput = {
      isActive: true,
      isFantasyRelevant: true,
    }

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      }
    }

    if (filters.position) {
      where.position = filters.position as any
    }

    const [players, total] = await Promise.all([
      prisma.players.findMany({
        where,
        select: {
          id: true,
          name: true,
          position: true,
          nflTeam: true,
          rank: true,
          adp: true,
          imageUrl: true,
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { rank: 'asc' },
      }),
      prisma.players.count({ where }),
    ])

    return {
      players,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit),
      },
    }
  }

  async getPlayer(id: string) {
    return prisma.players.findUnique({
      where: { id },
      include: {
        player_stats: {
          where: { season: '2024' },
          orderBy: { week: 'desc' },
          take: 10,
        },
        player_projections: {
          where: { season: 2024 },
          orderBy: { week: 'desc' },
          take: 5,
        },
        player_news: {
          orderBy: { publishedAt: 'desc' },
          take: 3,
        },
      },
    })
  }
}

export const playerService = new PlayerService()
```

### Database Patterns

#### Prisma Query Optimization
```typescript
// Good: Use select to limit fields
const users = await prisma.users.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  }
})

// Good: Use include for relations
const league = await prisma.leagues.findUnique({
  where: { id: leagueId },
  include: {
    teams: {
      include: {
        roster_players: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                position: true,
              }
            }
          }
        }
      }
    }
  }
})

// Good: Use transactions for consistency
await prisma.$transaction(async (tx) => {
  await tx.roster_players.delete({
    where: { id: oldRosterPlayer.id }
  })
  
  await tx.roster_players.create({
    data: newRosterPlayerData
  })
})
```

#### Error Handling Patterns
```typescript
// src/middleware/error.ts
import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { logger } from '../server'

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('API Error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  })

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Resource already exists',
          field: error.meta?.target,
        })
      case 'P2025':
        return res.status(404).json({
          error: 'Resource not found',
        })
    }
  }

  // Validation errors
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.issues,
    })
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  })
}
```

## Testing Strategy

### Unit Testing with Jest

```typescript
// src/services/__tests__/players.test.ts
import { PlayerService } from '../players'
import { prisma } from '../../server'

// Mock Prisma
jest.mock('../../server', () => ({
  prisma: {
    players: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

describe('PlayerService', () => {
  let playerService: PlayerService

  beforeEach(() => {
    playerService = new PlayerService()
    jest.clearAllMocks()
  })

  describe('getPlayers', () => {
    it('should return paginated players', async () => {
      const mockPlayers = [
        { id: '1', name: 'Josh Allen', position: 'QB' },
        { id: '2', name: 'Derrick Henry', position: 'RB' },
      ]

      ;(prisma.players.findMany as jest.Mock).mockResolvedValue(mockPlayers)
      ;(prisma.players.count as jest.Mock).mockResolvedValue(50)

      const result = await playerService.getPlayers({
        page: 1,
        limit: 20,
      })

      expect(result.players).toEqual(mockPlayers)
      expect(result.pagination.total).toBe(50)
      expect(result.pagination.pages).toBe(3)
    })

    it('should filter by position', async () => {
      await playerService.getPlayers({
        position: 'QB',
        page: 1,
        limit: 20,
      })

      expect(prisma.players.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            position: 'QB',
          }),
        })
      )
    })
  })
})
```

### Integration Testing

```typescript
// src/routes/__tests__/players.integration.test.ts
import request from 'supertest'
import { app } from '../../server'
import { createTestUser, createTestToken } from '../../utils/test-helpers'

describe('Players API', () => {
  let authToken: string

  beforeAll(async () => {
    const user = await createTestUser()
    authToken = createTestToken(user.id)
  })

  describe('GET /api/players', () => {
    it('should return players list', async () => {
      const response = await request(app)
        .get('/api/players')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('players')
      expect(response.body).toHaveProperty('pagination')
      expect(Array.isArray(response.body.players)).toBe(true)
    })

    it('should require authentication', async () => {
      await request(app)
        .get('/api/players')
        .expect(401)
    })
  })
})
```

### E2E Testing with Playwright

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/auth/signin')

    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'fantasy2025')
    await page.click('[data-testid="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin')

    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'wrong-password')
    await page.click('[data-testid="submit"]')

    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Invalid credentials'
    )
  })
})
```

## Performance Best Practices

### Frontend Optimization

```typescript
// Use React.memo for expensive components
export const PlayerCard = React.memo(({ player, onAction }) => {
  // Component implementation
})

// Use useMemo for expensive calculations
function PlayerStats({ playerId }) {
  const stats = useMemo(() => {
    return calculateAdvancedStats(player.stats)
  }, [player.stats])
  
  return <div>{/* Render stats */}</div>
}

// Use useCallback for event handlers
function PlayerList({ players }) {
  const handlePlayerClick = useCallback((playerId: string) => {
    router.push(`/players/${playerId}`)
  }, [router])
  
  return (
    <div>
      {players.map(player => (
        <PlayerCard 
          key={player.id}
          player={player}
          onClick={handlePlayerClick}
        />
      ))}
    </div>
  )
}
```

### Backend Optimization

```typescript
// Use database indexes
// In Prisma schema
model players {
  // ... fields
  
  @@index([position, status])
  @@index([nflTeam])
  @@index([name])
}

// Use Redis caching
import { redis } from '../server'

async function getPopularPlayers() {
  const cacheKey = 'popular-players'
  const cached = await redis.get(cacheKey)
  
  if (cached) {
    return JSON.parse(cached)
  }
  
  const players = await prisma.players.findMany({
    where: { isFantasyRelevant: true },
    orderBy: { rank: 'asc' },
    take: 50,
  })
  
  await redis.setex(cacheKey, 300, JSON.stringify(players)) // 5 min cache
  return players
}

// Use database transactions for consistency
async function processTradeProposal(tradeId: string) {
  return await prisma.$transaction(async (tx) => {
    const trade = await tx.trade_proposals.update({
      where: { id: tradeId },
      data: { status: 'processing' }
    })
    
    // Move players between teams
    await Promise.all([
      tx.roster_players.updateMany({
        where: { id: { in: trade.givingPlayerIds } },
        data: { teamId: trade.receivingTeamId }
      }),
      tx.roster_players.updateMany({
        where: { id: { in: trade.receivingPlayerIds } },
        data: { teamId: trade.proposingTeamId }
      })
    ])
    
    await tx.trade_proposals.update({
      where: { id: tradeId },
      data: { status: 'completed' }
    })
    
    return trade
  })
}
```

## Debugging and Development Tools

### VS Code Configuration

```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### Browser DevTools Setup

```typescript
// Add React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}

// Add Redux DevTools for Zustand
import { devtools } from 'zustand/middleware'

export const useStore = create(
  devtools(
    (set) => ({
      // Store implementation
    }),
    { name: 'my-store' }
  )
)
```

### Database Debugging

```bash
# View database with Prisma Studio
npx prisma studio

# Generate ERD
npx prisma generate --schema=./prisma/schema.prisma

# View query logs in development
# Add to .env.local
DATABASE_LOG_LEVEL="query"
```

## Common Issues and Solutions

### 1. Database Connection Issues

```bash
# Check database status
pg_isready -h localhost -p 5432

# Reset database
npm run db:reset

# Check environment variables
echo $DATABASE_URL
```

### 2. TypeScript Errors

```bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
npm run db:generate

# Check TypeScript configuration
npx tsc --noEmit
```

### 3. Build Issues

```bash
# Clear all caches
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for circular dependencies
npx madge --circular src/
```

### 4. Performance Issues

```typescript
// Use React DevTools Profiler
// Add performance monitoring
import { logger } from '@/lib/logger'

function slowFunction() {
  const start = performance.now()
  // ... function logic
  const end = performance.now()
  
  if (end - start > 100) { // Log if > 100ms
    logger.warn('Slow function detected', {
      function: 'slowFunction',
      duration: end - start
    })
  }
}
```

## Next Steps

After completing this guide, you should be able to:

1. **Run the full development environment**
2. **Make your first code contribution**
3. **Write tests for new features**
4. **Debug issues effectively**
5. **Follow the team's coding standards**

### Recommended Learning Path

1. **Week 1**: Get familiar with the codebase structure
2. **Week 2**: Implement a small feature (e.g., add a new player filter)
3. **Week 3**: Work on a medium complexity feature (e.g., improve draft UI)
4. **Week 4**: Contribute to a larger feature or refactor

### Resources

- **Architecture Documentation**: `/docs/ARCHITECTURE.md`
- **API Reference**: `/docs/API_REFERENCE.md`
- **Database Schema**: `/docs/DATABASE_SCHEMA.md`
- **Deployment Guide**: `/docs/DEPLOYMENT.md`
- **Team Slack**: #astralfield-dev
- **Code Reviews**: All PRs require review

---

Welcome to the AstralField development team! If you have any questions, don't hesitate to reach out to the team or create an issue in the repository.