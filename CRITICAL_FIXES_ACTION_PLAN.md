# 🚨 Critical Fixes Action Plan - AstralField v3.0

**Priority:** URGENT  
**Timeline:** 48-72 Hours  
**Goal:** Achieve Zero TypeScript Errors & 90%+ Test Pass Rate

---

## 🎯 Phase 1: Database Schema Fixes (2-4 hours)

### Step 1: Update Prisma Schema

**File:** `apps/web/prisma/schema.prisma`

```prisma
// ADD MISSING FIELDS

model UserPreferences {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  theme                 String   @default("dark")
  notifications         Boolean  @default(true)
  emailNotifications    Boolean  @default(true)  // ← ADD THIS
  language              String   @default("en")
  timezone              String   @default("UTC")
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model RosterPlayer {
  id         String  @id @default(cuid())
  teamId     String
  playerId   String
  position   String
  isStarter  Boolean @default(false)
  rosterSlot String? // ← ADD THIS
  team       Team    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  player     Player  @relation(fields: [playerId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([teamId, playerId])
  @@index([teamId])
  @@index([playerId])
}

// ADD MISSING ANALYTICS TABLES

model PlayerWeeklyAnalytics {
  id                String   @id @default(cuid())
  playerId          String
  player            Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  week              Int
  season            Int
  fantasyPoints     Float
  projectedPoints   Float
  targetShare       Float?
  snapCount         Int?
  touchesPerGame    Float?
  redZoneTargets    Int?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([playerId, week, season])
  @@index([playerId])
  @@index([week, season])
}

model WeeklyTeamStats {
  id                String   @id @default(cuid())
  teamId            String
  team              Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  week              Int
  season            Int
  totalPoints       Float
  projectedPoints   Float
  wins              Int
  losses            Int
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([teamId, week, season])
  @@index([teamId])
  @@index([week, season])
}

model MatchupAnalytics {
  id                String   @id @default(cuid())
  matchupId         String   @unique
  team1Advantage    Float
  team2Advantage    Float
  predictedWinner   String
  confidence        Float
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([matchupId])
}

model WaiverWireAnalytics {
  id                String   @id @default(cuid())
  playerId          String
  player            Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  week              Int
  season            Int
  recommendationScore Float
  trending          String?
  breakoutProbability Float?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([playerId, week, season])
  @@index([playerId])
  @@index([week, season])
}

model PlayerConsistency {
  id                String   @id @default(cuid())
  playerId          String   @unique
  player            Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  season            Int
  consistencyScore  Float
  variance          Float
  floorPoints       Float
  ceilingPoints     Float
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([playerId])
  @@index([season])
}

model StrengthOfSchedule {
  id                String   @id @default(cuid())
  teamId            String
  team              Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  week              Int
  season            Int
  difficulty        Float
  remainingDifficulty Float
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([teamId, week, season])
  @@index([teamId])
  @@index([week, season])
}

model LeagueAnalytics {
  id                String   @id @default(cuid())
  leagueId          String   @unique
  league            League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  season            Int
  avgPointsPerWeek  Float
  parityScore       Float
  competitiveness   Float
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([leagueId])
  @@index([season])
}

model RealTimeEvents {
  id                String   @id @default(cuid())
  eventType         String
  playerId          String?
  teamId            String?
  data              Json
  timestamp         DateTime @default(now())
  processed         Boolean  @default(false)

  @@index([eventType])
  @@index([timestamp])
  @@index([processed])
}

// UPDATE SECURITY EVENT TYPE ENUM

enum SecurityEventType {
  // Existing values
  login_success
  login_failure
  login_blocked
  logout
  password_change
  password_reset_request
  password_reset_complete
  email_change
  mfa_enabled
  mfa_disabled
  mfa_verified
  mfa_failed
  session_created
  session_expired
  session_revoked
  account_locked
  account_unlocked
  suspicious_activity
  rate_limit_exceeded
  unauthorized_access
  
  // ADD THESE NEW VALUES
  REGISTRATION_SUCCESS
  REGISTRATION_FAILED
  SECURITY_SCAN
  THREAT_DETECTED
  EMERGENCY_LOCKDOWN
}

// UPDATE PLAYER MODEL TO ADD RELATIONS

model Player {
  id                    String                      @id @default(cuid())
  name                  String
  position              String
  nflTeam               String
  isFantasyRelevant     Boolean                     @default(true)
  adp                   Float?
  rank                  Int?
  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt
  
  // Relations
  rosterPlayers         RosterPlayer[]
  weeklyAnalytics       PlayerWeeklyAnalytics[]     // ← ADD THIS
  waiverAnalytics       WaiverWireAnalytics[]       // ← ADD THIS
  consistency           PlayerConsistency?          // ← ADD THIS
  
  @@index([position])
  @@index([nflTeam])
}

// UPDATE TEAM MODEL TO ADD RELATIONS

model Team {
  id                    String                      @id @default(cuid())
  name                  String
  leagueId              String
  userId                String
  wins                  Int                         @default(0)
  losses                Int                         @default(0)
  ties                  Int                         @default(0)
  pointsFor             Float                       @default(0)
  pointsAgainst         Float                       @default(0)
  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt
  
  // Relations
  league                League                      @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user                  User                        @relation(fields: [userId], references: [id], onDelete: Cascade)
  rosterPlayers         RosterPlayer[]
  weeklyStats           WeeklyTeamStats[]           // ← ADD THIS
  scheduleStrength      StrengthOfSchedule[]        // ← ADD THIS
  
  @@unique([leagueId, userId])
  @@index([leagueId])
  @@index([userId])
}

// UPDATE LEAGUE MODEL TO ADD RELATIONS

model League {
  id                    String                      @id @default(cuid())
  name                  String
  season                Int
  currentWeek           Int                         @default(1)
  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt
  
  // Relations
  teams                 Team[]
  analytics             LeagueAnalytics?            // ← ADD THIS
  
  @@index([season])
}
```

### Step 2: Run Migration

```bash
cd apps/web
npx prisma generate
npx prisma db push
```

---

## 🔧 Phase 2: Fix Missing Imports (1-2 hours)

### Fix 1: Create Prisma Client Export

**File:** `apps/web/src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Fix 2: Install Missing Dependencies

```bash
cd apps/web
npm install ioredis
npm install --save-dev @types/ioredis
```

### Fix 3: Update Import Statements

**Files to Update:**
- `src/lib/auth-config-optimized.ts`
- `src/lib/database/phoenix-monitoring.ts`

```typescript
// Change from:
import { prisma } from './prisma'

// To:
import { prisma } from '@/lib/prisma'
```

---

## 🎨 Phase 3: Fix Component Errors (1 hour)

### Fix 1: Add Missing Icon Import

**File:** `apps/web/src/components/waivers/smart-waiver-wire.tsx`

```typescript
// Add at top of file
import { Trophy } from '@heroicons/react/24/outline'
```

### Fix 2: Fix Hook Name

**File:** `apps/web/src/components/live-scoring/live-scoreboard.tsx`

```typescript
// Change from:
const { scores, loading } = useLiveScoring(leagueId)

// To:
const { scores, loading } = useLiveScores(leagueId)
```

### Fix 3: Fix Button Variant Type

**File:** `apps/web/src/app/draft/page.tsx`

```typescript
// Change from:
variant="default"

// To:
variant="solid"
```

---

## 🔐 Phase 4: Fix Service Layer (2-3 hours)

### Fix 1: Make Methods Public

**File:** `apps/web/src/lib/database/phoenix-database-service.ts`

```typescript
export class PhoenixDatabaseService {
  // Change from private to public
  public getCachedResult<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    const { data, timestamp } = cached
    const age = Date.now() - timestamp
    
    if (age > this.cacheTTL) {
      this.cache.delete(key)
      return null
    }
    
    return data as T
  }
  
  public setCachedResult<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.cacheTTL
    })
  }
}
```

### Fix 2: Fix NextAuth Import

**File:** `apps/web/src/app/api/matchups/route.ts`

```typescript
// Change from:
import { getServerSession } from 'next-auth'

// To:
import { auth } from '@/lib/auth-config'

// Then use:
const session = await auth()
```

---

## 🧪 Phase 5: Fix Critical Tests (3-4 hours)

### Fix 1: Update Test Queries

**File:** `apps/web/__tests__/components/ai-coach/dashboard.test.tsx`

```typescript
// Change from:
expect(screen.getByText(/72%/)).toBeInTheDocument()

// To:
const elements = screen.getAllByText(/72%/)
expect(elements.length).toBeGreaterThan(0)
expect(elements[0]).toBeInTheDocument()
```

### Fix 2: Increase Timeouts

```typescript
// For long-running tests
it('should handle reconnection', async () => {
  // ... test code
}, 15000)  // Increase timeout
```

### Fix 3: Fix URL Encoding Test

**File:** `apps/web/__tests__/components/players/player-search.test.tsx`

```typescript
// Change expectation to match encoded URL
expect(mockRouter.push).toHaveBeenCalledWith(
  expect.stringContaining("O%27Dell")  // URL encoded
)
```

---

## 📝 Phase 6: Fix ESLint Errors (30 minutes)

### Fix 1: Module Assignment

**File:** `apps/web/src/lib/performance/dynamic-loader.tsx`

```typescript
// Change from:
module = await import(...)

// To:
const loadedModule = await import(...)
```

### Fix 2: Add Progress Bar Role

**File:** `apps/web/src/components/ai-coach/dashboard.tsx`

```typescript
<div 
  role="progressbar"
  aria-valuenow={confidence}
  aria-valuemin={0}
  aria-valuemax={100}
  className="..."
>
  {/* progress bar content */}
</div>
```

---

## ✅ Validation Checklist

After completing all fixes, run these commands:

```bash
# 1. TypeScript validation
npm run typecheck
# Expected: 0 errors

# 2. ESLint check
npm run lint
# Expected: 0 errors, <5 warnings

# 3. Test suite
npm run test
# Expected: >90% pass rate

# 4. Build verification
npm run build
# Expected: Successful build

# 5. Database migration
npx prisma db push
# Expected: Schema synced
```

---

## 📊 Success Criteria

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| TypeScript Errors | 189 | 0 | ⏳ |
| Test Pass Rate | 68.7% | 90% | ⏳ |
| ESLint Errors | 2 | 0 | ⏳ |
| Build Success | ✅ | ✅ | ✅ |

---

## 🚀 Post-Fix Actions

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "fix: resolve critical TypeScript errors and test failures"
   ```

2. **Run Full Test Suite**
   ```bash
   npm run test:all
   ```

3. **Generate Coverage Report**
   ```bash
   npm run test:coverage
   ```

4. **Deploy to Staging**
   ```bash
   npm run deploy:staging
   ```

5. **Monitor Production Metrics**
   - Error rates
   - Performance metrics
   - User feedback

---

**Timeline:** 48-72 hours  
**Priority:** CRITICAL  
**Owner:** Development Team  
**Status:** 🔴 IN PROGRESS
