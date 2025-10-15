# 🔧 Developer Guide - Elite Fantasy Platform

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Library](#component-library)
3. [API Routes](#api-routes)
4. [Database Schema](#database-schema)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Best Practices](#best-practices)

---

## Architecture Overview

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js
- **Real-time:** Server-Sent Events (SSE)

### Project Structure
```
apps/web/
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (auth)/       # Authentication pages
│   │   ├── api/          # API routes
│   │   └── [pages]/      # Feature pages
│   ├── components/        # React components
│   │   ├── player/       # Player-related components
│   │   ├── lineup/       # Lineup editor
│   │   ├── trades/       # Trading components
│   │   ├── waivers/      # Waiver wire
│   │   ├── live/         # Live scoring
│   │   ├── analytics/    # Charts & analytics
│   │   ├── research/     # Research tools
│   │   ├── league/       # League features
│   │   ├── mobile/       # Mobile components
│   │   ├── error/        # Error handling
│   │   └── ui/           # Shared UI components
│   ├── lib/               # Utilities & services
│   │   ├── database/     # Prisma client
│   │   ├── services/     # Business logic
│   │   └── utils.ts      # Common utilities
│   └── hooks/             # Custom React hooks
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed-all.ts        # Complete seeding
│   ├── seed-stats.ts      # Stats seeding
│   └── seed-rosters.ts    # Roster seeding
├── __tests__/             # Test files
└── public/                # Static assets
```

---

## Component Library

### Elite Components (16)

#### 1. EnhancedPlayerCard
**Path:** `src/components/player/enhanced-player-card.tsx`

**Props:**
```typescript
{
  player: {
    id: string
    name: string
    position: string
    team: string
    fantasyPoints: number
    projectedPoints: number
    status?: 'ACTIVE' | 'INJURED' | 'OUT' | 'QUESTIONABLE'
    trending?: 'up' | 'down' | 'hot'
    lastFiveGames?: number[]
    ownership?: number
    isOnMyTeam?: boolean
  }
  variant?: 'compact' | 'expanded' | 'detailed'
  onAction?: (action: string, playerId: string) => void
  showQuickActions?: boolean
}
```

**Features:**
- Quick actions menu (Add/Drop/Trade/Stats/News/AI)
- Expandable details with last 5 games chart
- Status badges and trending indicators
- Optimized with React.memo

**Usage:**
```tsx
<EnhancedPlayerCard
  player={player}
  variant="expanded"
  onAction={handlePlayerAction}
  showQuickActions={true}
/>
```

#### 2. DragDropLineupEditor
**Path:** `src/components/lineup/drag-drop-lineup-editor.tsx`

**Props:**
```typescript
{
  roster: Player[]
  onSave: (roster: Player[]) => Promise<void>
  rosterSettings?: {
    positions: string[]
    benchSize: number
  }
}
```

**Features:**
- Drag-and-drop with @dnd-kit
- Undo/Redo stack
- Auto-optimize button
- Real-time projection updates

**Usage:**
```tsx
<DragDropLineupEditor
  roster={roster}
  onSave={async (roster) => await saveLineup(roster)}
  rosterSettings={{
    positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
    benchSize: 6
  }}
/>
```

#### 3. VisualTradeBuilder
**Path:** `src/components/trades/visual-trade-builder.tsx`

**Features:**
- Visual trade construction
- AI fairness analysis
- Trade impact projections
- "Make Fair" button

#### 4. SmartWaiverWire
**Path:** `src/components/waivers/smart-waiver-wire.tsx`

**Features:**
- AI-powered rankings
- Breakout candidate detection
- Advanced filtering
- Waiver assistant

[Continue for all 16 components...]

---

## API Routes

### Team Management

#### GET /api/teams
**Description:** Fetch user's team with roster and stats

**Query Params:**
- `userId` (required): User ID

**Response:**
```json
{
  "id": "team-id",
  "name": "Team Name",
  "roster": [...],
  "league": {...},
  "totalPoints": 450.5,
  "projectedPoints": 115.2
}
```

**Caching:** 5 minutes (private)

#### POST /api/teams/lineup
**Description:** Save lineup changes

**Body:**
```json
{
  "teamId": "team-id",
  "roster": [
    { "playerId": "player-id", "isStarter": true }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updated": 9
}
```

### Player Research

#### GET /api/players
**Description:** Search and filter players

**Query Params:**
- `search` (optional): Search term
- `position` (optional): Filter by position
- `team` (optional): Filter by NFL team
- `page` (optional): Page number (default: 1)

**Response:**
```json
{
  "players": [...],
  "total": 1500,
  "pages": 63,
  "currentPage": 1
}
```

**Caching:** 10 minutes (private)

[Continue for all API routes...]

---

## Database Schema

### Key Models

#### Player
```prisma
model Player {
  id                String
  name              String
  position          String
  nflTeam           String
  isFantasyRelevant Boolean
  adp               Float?
  rank              Int?
  stats             PlayerStats[]
  projections       PlayerProjection[]
  roster            RosterPlayer[]
}
```

#### Team
```prisma
model Team {
  id           String
  name         String
  ownerId      String
  leagueId     String
  wins         Int
  losses       Int
  ties         Int
  roster       RosterPlayer[]
}
```

#### RosterPlayer
```prisma
model RosterPlayer {
  id        String
  teamId    String
  playerId  String
  position  String
  isStarter Boolean
  player    Player
  team      Team
}
```

[Continue for all models...]

---

## Testing

### Test Suite
- **Framework:** Jest + Testing Library
- **Coverage:** 30+ test cases
- **Files:** 4 test files

### Running Tests
```bash
cd apps/web
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

### Writing Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { EnhancedPlayerCard } from '@/components/player/enhanced-player-card'

describe('EnhancedPlayerCard', () => {
  it('renders player information', () => {
    render(<EnhancedPlayerCard player={mockPlayer} />)
    expect(screen.getByText('Josh Allen')).toBeInTheDocument()
  })
})
```

---

## Deployment

### Vercel Deployment
**Automatic deployment on push to master**

1. Push to GitHub
2. Vercel auto-deploys
3. Runs build & tests
4. Updates production URL

### Environment Variables
Required in `.env.local`:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret
- `NEXTAUTH_URL` - App URL

### Build Commands
```bash
npm run build    # Production build
npm start        # Start production server
```

---

## Best Practices

### Component Development
1. Use TypeScript strict mode
2. Implement React.memo for expensive components
3. Add ARIA labels for accessibility
4. Handle loading/error states
5. Write comprehensive tests

### Performance
1. Use Prisma includes to avoid N+1 queries
2. Implement proper caching strategies
3. Lazy load heavy components
4. Optimize images and assets
5. Use GPU-accelerated animations

### Accessibility
1. Add ARIA labels to interactive elements
2. Ensure keyboard navigation
3. Maintain color contrast ratios
4. Provide focus indicators
5. Support screen readers

### Code Quality
1. Follow TypeScript strict mode
2. Keep linting errors at zero
3. Document complex functions with JSDoc
4. Use consistent naming conventions
5. Handle edge cases gracefully

---

## Common Tasks

### Adding a New Component
```bash
# 1. Create component file
touch src/components/feature/new-component.tsx

# 2. Write component with TypeScript
# 3. Add to page/parent component
# 4. Write tests
touch __tests__/components/new-component.test.tsx

# 5. Run tests
npm test
```

### Adding an API Route
```bash
# 1. Create route file
touch src/app/api/feature/route.ts

# 2. Implement GET/POST handler
export async function GET(request: NextRequest) {
  // Implementation
}

# 3. Add caching headers
# 4. Handle errors gracefully
# 5. Write tests
```

### Database Changes
```bash
# 1. Update schema.prisma
# 2. Create migration
npx prisma migrate dev --name feature_name

# 3. Generate client
npx prisma generate

# 4. Update seed scripts if needed
```

---

## Troubleshooting

### Common Issues

**Build Errors:**
```bash
rm -rf .next
npm install
npx prisma generate
npm run build
```

**Type Errors:**
```bash
npx tsc --noEmit
```

**Test Failures:**
```bash
npm test -- --clearCache
npm test
```

---

## Support

For questions or issues:
1. Check documentation files
2. Review test examples
3. Inspect component source code
4. Check GitHub issues

---

**Last Updated:** Latest  
**Version:** 3.0.0 Elite  
**Status:** Production Ready

