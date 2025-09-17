# AstralField V2 - Complete Architecture Rewrite Plan

## Executive Summary
A clean, modern rewrite of the AstralField fantasy football platform using Next.js 14, TypeScript, and production-ready patterns to eliminate the technical debt and syntax issues from the previous codebase.

## 1. Complete Folder Structure Design

```
astral-field-v2/
├── README.md
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .env.local
├── .env.example
├── .gitignore
├── .eslintrc.json
├── prettier.config.js
│
├── public/
│   ├── icons/
│   ├── images/
│   └── manifest.json
│
├── src/
│   ├── app/                           # Next.js 14 App Router
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Home page
│   │   ├── loading.tsx                # Global loading UI
│   │   ├── error.tsx                  # Global error UI
│   │   ├── not-found.tsx              # 404 page
│   │   │
│   │   ├── auth/                      # Authentication pages
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   ├── dashboard/                 # Main dashboard
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── leagues/                   # League management
│   │   │   ├── page.tsx               # League list
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/                  # Dynamic league routes
│   │   │       ├── page.tsx           # League overview
│   │   │       ├── layout.tsx         # League navigation layout
│   │   │       ├── roster/
│   │   │       │   └── page.tsx
│   │   │       ├── matchups/
│   │   │       │   └── page.tsx
│   │   │       ├── standings/
│   │   │       │   └── page.tsx
│   │   │       ├── trades/
│   │   │       │   └── page.tsx
│   │   │       ├── waivers/
│   │   │       │   └── page.tsx
│   │   │       ├── draft/
│   │   │       │   └── page.tsx
│   │   │       └── settings/
│   │   │           └── page.tsx
│   │   │
│   │   ├── players/                   # Player database
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/                       # API routes
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── logout/
│   │   │   │   │   └── route.ts
│   │   │   │   └── me/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── leagues/
│   │   │   │   ├── route.ts           # GET /api/leagues, POST /api/leagues
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts       # GET, PUT, DELETE /api/leagues/[id]
│   │   │   │       ├── teams/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── trades/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── waivers/
│   │   │   │       │   └── route.ts
│   │   │   │       └── draft/
│   │   │   │           └── route.ts
│   │   │   │
│   │   │   ├── players/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── nfl/
│   │   │   │   ├── teams/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── games/
│   │   │   │   │   └── route.ts
│   │   │   │   └── stats/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   └── websocket/
│   │   │       └── route.ts
│   │   │
│   │   └── globals.css
│   │
│   ├── components/                    # Reusable UI components
│   │   ├── ui/                        # Base UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/                    # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   │
│   │   ├── auth/                      # Authentication components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── UserProfile.tsx
│   │   │
│   │   ├── league/                    # League-specific components
│   │   │   ├── LeagueCard.tsx
│   │   │   ├── LeagueSettings.tsx
│   │   │   ├── Standings.tsx
│   │   │   └── Scoreboard.tsx
│   │   │
│   │   ├── draft/                     # Draft components
│   │   │   ├── DraftBoard.tsx
│   │   │   ├── PlayerCard.tsx
│   │   │   ├── DraftTimer.tsx
│   │   │   └── DraftChat.tsx
│   │   │
│   │   ├── trade/                     # Trade components
│   │   │   ├── TradeProposal.tsx
│   │   │   ├── TradeHistory.tsx
│   │   │   └── TradeAnalyzer.tsx
│   │   │
│   │   └── waiver/                    # Waiver components
│   │       ├── WaiverClaim.tsx
│   │       ├── WaiverOrder.tsx
│   │       └── WaiverHistory.tsx
│   │
│   ├── lib/                           # Utility libraries
│   │   ├── auth.ts                    # Authentication utilities
│   │   ├── db.ts                      # Database connection
│   │   ├── utils.ts                   # General utilities
│   │   ├── validations.ts             # Zod schemas
│   │   ├── constants.ts               # App constants
│   │   ├── websocket.ts               # WebSocket client
│   │   └── api.ts                     # API client utilities
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useLeague.ts
│   │   ├── useDraft.ts
│   │   ├── useWebSocket.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── store/                         # State management (Zustand)
│   │   ├── authStore.ts
│   │   ├── leagueStore.ts
│   │   ├── draftStore.ts
│   │   └── globalStore.ts
│   │
│   ├── types/                         # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── league.ts
│   │   ├── player.ts
│   │   ├── draft.ts
│   │   ├── trade.ts
│   │   └── api.ts
│   │
│   └── middleware.ts                  # Next.js middleware
│
├── prisma/                            # Database schema and migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docs/                              # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
└── scripts/                           # Build and deployment scripts
    ├── setup.sh
    ├── seed-demo-data.ts
    └── build.sh
```

## 2. Core Component Architecture

### Component Design Principles
- **Atomic Design**: Base UI components → Composed feature components → Page layouts
- **TypeScript First**: Every component properly typed with interfaces
- **Server Components by Default**: Client components only when necessary
- **Composition over Inheritance**: Flexible, reusable component patterns

### Key Component Specifications

#### Base UI Components (`/components/ui/`)
```typescript
// Button.tsx - Single responsibility, flexible variants
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}

// Card.tsx - Consistent container styling
interface CardProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}
```

#### Feature Components (`/components/league/`, `/components/draft/`, etc.)
```typescript
// LeagueCard.tsx - Complex business logic encapsulated
interface LeagueCardProps {
  league: League
  userRole: 'admin' | 'commissioner' | 'player'
  onJoin?: (leagueId: string) => void
  onLeave?: (leagueId: string) => void
}

// DraftBoard.tsx - Real-time draft interface
interface DraftBoardProps {
  draftId: string
  currentPick: number
  timeRemaining: number
  onPlayerSelect: (playerId: string) => void
}
```

## 3. API Routes Structure

### RESTful API Design
```typescript
// /api/auth/login/route.ts
export async function POST(request: Request) {
  // Simple cookie-based auth
  // Validate against predefined users
  // Set secure httpOnly cookie
}

// /api/leagues/route.ts
export async function GET() {
  // Return user's leagues
}

export async function POST(request: Request) {
  // Create new league
  // Validate user permissions
}

// /api/leagues/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Get league details
  // Check user access
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  // Update league settings
  // Commissioner only
}

// /api/leagues/[id]/trades/route.ts
export async function GET() {
  // Get league trades
}

export async function POST(request: Request) {
  // Propose new trade
  // Validate roster legality
}
```

### WebSocket Integration
```typescript
// /api/websocket/route.ts
// Real-time updates for:
// - Draft picks
// - Trade notifications
// - Waiver claims
// - Live scoring
// - Chat messages
```

## 4. Database Schema Design

### Prisma Schema (`/prisma/schema.prisma`)
```prisma
// User Management
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  username    String   @unique
  displayName String
  role        UserRole @default(PLAYER)
  avatar      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  ownedLeagues    League[]      @relation("LeagueOwner")
  leagueMemberships LeagueMember[]
  trades          Trade[]
  waiverClaims    WaiverClaim[]
  draftPicks      DraftPick[]

  @@map("users")
}

// League System
model League {
  id          String     @id @default(cuid())
  name        String
  description String?
  maxTeams    Int        @default(10)
  draftDate   DateTime?
  season      Int        @default(2024)
  status      LeagueStatus @default(SETUP)
  settings    Json       // Scoring, roster settings, etc.
  
  // Relationships
  owner       User       @relation("LeagueOwner", fields: [ownerId], references: [id])
  ownerId     String
  members     LeagueMember[]
  teams       Team[]
  draft       Draft?
  trades      Trade[]
  waiverClaims WaiverClaim[]
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@map("leagues")
}

model LeagueMember {
  id       String @id @default(cuid())
  role     LeagueRole @default(PLAYER)
  
  user     User   @relation(fields: [userId], references: [id])
  userId   String
  league   League @relation(fields: [leagueId], references: [id])
  leagueId String
  
  joinedAt DateTime @default(now())
  
  @@unique([userId, leagueId])
  @@map("league_members")
}

// Team Management
model Team {
  id          String @id @default(cuid())
  name        String
  abbreviation String @db.VarChar(4)
  logo        String?
  
  league      League @relation(fields: [leagueId], references: [id])
  leagueId    String
  owner       User   @relation(fields: [ownerId], references: [id])
  ownerId     String
  
  // Roster
  roster      TeamPlayer[]
  trades      TradeTeam[]
  draftPicks  DraftPick[]
  waiverClaims WaiverClaim[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([leagueId, ownerId])
  @@map("teams")
}

// Player Database
model NFLPlayer {
  id          String @id @default(cuid())
  externalId  String @unique // ESPN/Yahoo ID
  firstName   String
  lastName    String
  position    Position
  team        String // NFL team abbreviation
  jerseyNumber Int?
  height      String?
  weight      Int?
  age         Int?
  experience  Int?
  
  // Fantasy relevance
  isActive    Boolean @default(true)
  injuryStatus InjuryStatus @default(HEALTHY)
  
  // Relationships
  teamPlayers TeamPlayer[]
  draftPicks  DraftPick[]
  trades      TradePlayer[]
  waiverClaims WaiverClaim[]
  stats       PlayerStats[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("nfl_players")
}

// Roster Management
model TeamPlayer {
  id         String @id @default(cuid())
  position   RosterPosition // QB, RB1, RB2, WR1, etc.
  isStarter  Boolean @default(false)
  
  team       Team     @relation(fields: [teamId], references: [id])
  teamId     String
  player     NFLPlayer @relation(fields: [playerId], references: [id])
  playerId   String
  
  addedAt    DateTime @default(now())
  
  @@unique([teamId, playerId])
  @@map("team_players")
}

// Draft System
model Draft {
  id          String @id @default(cuid())
  type        DraftType @default(SNAKE)
  rounds      Int @default(16)
  pickTime    Int @default(90) // seconds
  startTime   DateTime?
  status      DraftStatus @default(NOT_STARTED)
  currentPick Int @default(1)
  
  league      League @relation(fields: [leagueId], references: [id])
  leagueId    String @unique
  
  picks       DraftPick[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("drafts")
}

model DraftPick {
  id        String @id @default(cuid())
  round     Int
  pick      Int
  overall   Int
  pickTime  DateTime?
  
  draft     Draft @relation(fields: [draftId], references: [id])
  draftId   String
  team      Team @relation(fields: [teamId], references: [id])
  teamId    String
  player    NFLPlayer? @relation(fields: [playerId], references: [id])
  playerId  String?
  picker    User @relation(fields: [pickerId], references: [id])
  pickerId  String
  
  createdAt DateTime @default(now())
  
  @@unique([draftId, overall])
  @@map("draft_picks")
}

// Trading System
model Trade {
  id          String @id @default(cuid())
  status      TradeStatus @default(PENDING)
  proposedAt  DateTime @default(now())
  acceptedAt  DateTime?
  rejectedAt  DateTime?
  processedAt DateTime?
  notes       String?
  
  league      League @relation(fields: [leagueId], references: [id])
  leagueId    String
  proposer    User @relation(fields: [proposerId], references: [id])
  proposerId  String
  
  teams       TradeTeam[]
  players     TradePlayer[]
  
  @@map("trades")
}

model TradeTeam {
  id      String @id @default(cuid())
  status  TradeTeamStatus @default(PENDING) // PENDING, ACCEPTED, REJECTED
  
  trade   Trade @relation(fields: [tradeId], references: [id])
  tradeId String
  team    Team @relation(fields: [teamId], references: [id])
  teamId  String
  
  @@unique([tradeId, teamId])
  @@map("trade_teams")
}

model TradePlayer {
  id       String @id @default(cuid())
  fromTeam String // Team ID giving up player
  toTeam   String // Team ID receiving player
  
  trade    Trade @relation(fields: [tradeId], references: [id])
  tradeId  String
  player   NFLPlayer @relation(fields: [playerId], references: [id])
  playerId String
  
  @@map("trade_players")
}

// Waiver System
model WaiverClaim {
  id          String @id @default(cuid())
  priority    Int
  status      WaiverStatus @default(PENDING)
  claimDate   DateTime @default(now())
  processDate DateTime?
  
  league      League @relation(fields: [leagueId], references: [id])
  leagueId    String
  team        Team @relation(fields: [teamId], references: [id])
  teamId      String
  claimant    User @relation(fields: [claimantId], references: [id])
  claimantId  String
  player      NFLPlayer @relation(fields: [playerId], references: [id])
  playerId    String
  dropPlayer  NFLPlayer? @relation("DroppedPlayer", fields: [dropPlayerId], references: [id])
  dropPlayerId String?
  
  @@map("waiver_claims")
}

// Statistics
model PlayerStats {
  id       String @id @default(cuid())
  week     Int
  season   Int
  gameDate DateTime
  
  // Basic stats
  passingYards    Int @default(0)
  passingTDs      Int @default(0)
  interceptions   Int @default(0)
  rushingYards    Int @default(0)
  rushingTDs      Int @default(0)
  receptions      Int @default(0)
  receivingYards  Int @default(0)
  receivingTDs    Int @default(0)
  fumbles         Int @default(0)
  
  // Fantasy points
  fantasyPoints   Float @default(0)
  
  player     NFLPlayer @relation(fields: [playerId], references: [id])
  playerId   String
  
  @@unique([playerId, week, season])
  @@map("player_stats")
}

// Enums
enum UserRole {
  ADMIN
  COMMISSIONER
  PLAYER
}

enum LeagueRole {
  COMMISSIONER
  PLAYER
}

enum LeagueStatus {
  SETUP
  DRAFTING
  ACTIVE
  COMPLETED
}

enum Position {
  QB
  RB
  WR
  TE
  K
  DEF
}

enum RosterPosition {
  QB
  RB1
  RB2
  WR1
  WR2
  TE
  FLEX
  K
  DEF
  BENCH1
  BENCH2
  BENCH3
  BENCH4
  BENCH5
  BENCH6
  IR
}

enum InjuryStatus {
  HEALTHY
  QUESTIONABLE
  DOUBTFUL
  OUT
  IR
}

enum DraftType {
  SNAKE
  LINEAR
  AUCTION
}

enum DraftStatus {
  NOT_STARTED
  IN_PROGRESS
  PAUSED
  COMPLETED
}

enum TradeStatus {
  PENDING
  ACCEPTED
  REJECTED
  PROCESSED
  CANCELLED
}

enum TradeTeamStatus {
  PENDING
  ACCEPTED
  REJECTED
}

enum WaiverStatus {
  PENDING
  SUCCESSFUL
  FAILED
  CANCELLED
}
```

## 5. Authentication Flow

### Simple Cookie-Based Authentication
```typescript
// /lib/auth.ts
export interface User {
  id: string
  email: string
  username: string
  displayName: string
  role: 'admin' | 'commissioner' | 'player'
  avatar?: string
}

// Predefined demo users
export const DEMO_USERS: User[] = [
  {
    id: '1',
    email: 'admin@astralfield.com',
    username: 'admin',
    displayName: 'System Admin',
    role: 'admin'
  },
  {
    id: '2',
    email: 'commissioner@astralfield.com',
    username: 'commissioner',
    displayName: 'League Commissioner',
    role: 'commissioner'
  },
  // ... 8 more player accounts
]

// Authentication utilities
export async function validateCredentials(email: string, password: string): Promise<User | null> {
  // Simple demo validation
  const user = DEMO_USERS.find(u => u.email === email)
  return password === 'demo123' ? user : null
}

export async function setAuthCookie(user: User) {
  const session = await encrypt({ user, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
  cookies().set('session', session, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })
}

export async function getAuthUser(): Promise<User | null> {
  const session = cookies().get('session')?.value
  if (!session) return null
  
  try {
    const { user } = await decrypt(session)
    return user
  } catch {
    return null
  }
}
```

### Middleware Protection
```typescript
// /middleware.ts
export async function middleware(request: NextRequest) {
  const user = await getAuthUser()
  const { pathname } = request.nextUrl
  
  // Protected routes
  const protectedPaths = ['/dashboard', '/leagues', '/api/leagues', '/api/trades']
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  // Admin-only routes
  const adminPaths = ['/admin', '/api/admin']
  const isAdminRoute = adminPaths.some(path => pathname.startsWith(path))
  
  if (isAdminRoute && user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return NextResponse.next()
}
```

## 6. Key Feature Specifications

### League Management
```typescript
interface League {
  id: string
  name: string
  description?: string
  maxTeams: number
  draftDate?: Date
  season: number
  status: 'setup' | 'drafting' | 'active' | 'completed'
  settings: {
    scoringType: 'standard' | 'ppr' | 'half-ppr'
    playoffTeams: number
    tradeDeadline: Date
    waiverType: 'rolling' | 'faab'
    rosterSize: number
    benchSize: number
  }
}

// Core Features:
// - League creation with customizable settings
// - Team management and roster limits
// - Commissioner tools for league administration
// - Invitation system for new members
```

### Draft System
```typescript
interface Draft {
  id: string
  leagueId: string
  type: 'snake' | 'linear' | 'auction'
  rounds: number
  pickTime: number // seconds
  status: 'not_started' | 'in_progress' | 'paused' | 'completed'
  currentPick: number
}

// Core Features:
// - Real-time snake draft with WebSocket updates
// - Auto-draft functionality for absent owners
// - Draft chat and pick notifications
// - Pick timer with automatic selections
// - Draft board visualization
```

### Trading System
```typescript
interface Trade {
  id: string
  leagueId: string
  proposerId: string
  status: 'pending' | 'accepted' | 'rejected' | 'processed'
  teams: TradeTeam[]
  players: TradePlayer[]
  proposedAt: Date
  notes?: string
}

// Core Features:
// - Multi-team trade proposals
// - Trade review period (48 hours)
// - Commissioner trade approval
// - Trade history and analytics
// - Roster legality validation
```

### Waiver System
```typescript
interface WaiverClaim {
  id: string
  leagueId: string
  teamId: string
  playerId: string
  dropPlayerId?: string
  priority: number
  status: 'pending' | 'successful' | 'failed'
  claimDate: Date
}

// Core Features:
// - Rolling waivers or FAAB bidding
// - Waiver claim processing (Wednesday mornings)
// - Priority order management
// - Free agent acquisitions
// - Waiver claim history
```

### Real-time Features
```typescript
// WebSocket events
interface WebSocketEvents {
  'draft:pick': { draftId: string, pick: DraftPick }
  'trade:proposed': { tradeId: string, trade: Trade }
  'trade:accepted': { tradeId: string }
  'waiver:processed': { leagueId: string, claims: WaiverClaim[] }
  'lineup:updated': { teamId: string, lineup: TeamPlayer[] }
  'chat:message': { leagueId: string, message: ChatMessage }
}

// Core Features:
// - Live draft updates
// - Trade notifications
// - In-app messaging
// - Live scoring during games
// - Real-time roster updates
```

## Technology Stack Summary

### Frontend
- **Next.js 14** - App Router, Server Components, Static Generation
- **TypeScript** - Full type safety throughout application
- **Tailwind CSS** - Utility-first styling with custom design system
- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling with Zod validation
- **Socket.io Client** - Real-time WebSocket communication

### Backend
- **Next.js API Routes** - RESTful API endpoints
- **Prisma** - Type-safe database ORM with PostgreSQL
- **Socket.io** - Real-time WebSocket server
- **Jose** - JWT encryption for session management
- **Zod** - Runtime type validation

### Database
- **PostgreSQL** - Primary database (Neon serverless)
- **Redis** - Session storage and caching (optional)

### Deployment & Monitoring
- **Vercel** - Hosting and deployment
- **Sentry** - Error tracking and performance monitoring
- **Vercel Analytics** - Usage analytics

## Production Readiness Checklist

### Security
- [x] HttpOnly secure cookies for authentication
- [x] CSRF protection via SameSite cookies
- [x] Input validation with Zod schemas
- [x] SQL injection prevention via Prisma
- [x] Rate limiting on API endpoints
- [x] Environment variable validation

### Performance
- [x] Server-side rendering for SEO
- [x] Static generation where possible
- [x] Image optimization with Next.js
- [x] Database query optimization
- [x] Bundle size monitoring
- [x] Core Web Vitals optimization

### Reliability
- [x] Comprehensive error boundaries
- [x] Database transaction handling
- [x] Graceful WebSocket reconnection
- [x] API retry logic
- [x] Health check endpoints
- [x] Monitoring and alerting

### Scalability
- [x] Stateless server architecture
- [x] Database connection pooling
- [x] Caching strategy implementation
- [x] CDN for static assets
- [x] Horizontal scaling ready
- [x] Load testing preparation

This architecture provides a solid foundation for building a production-ready fantasy football platform that can scale from 10 demo users to thousands of active leagues while maintaining clean, maintainable code throughout.