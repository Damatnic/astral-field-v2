# 🔧 Quick Fixes Needed - AstralField v3.0

**Priority:** Medium  
**Estimated Time:** 4-6 hours  
**Impact:** Prevents runtime errors in API routes

---

## 1. Add Missing Type Dependency

**Time:** 2 minutes

```bash
cd apps/web
npm install --save-dev @types/ws
```

---

## 2. Fix Icon Component Type Errors

**Time:** 10 minutes  
**Files:** `apps/web/src/app/page.tsx`

**Issue:** Custom icon components don't accept className prop

**Fix:**
```typescript
// apps/web/src/app/page.tsx
// Change from:
const ArrowRightIcon = () => <span className="w-5 h-5 flex items-center justify-center">→</span>

// To:
const ArrowRightIcon = ({ className }: { className?: string }) => 
  <span className={`w-5 h-5 flex items-center justify-center ${className || ''}`}>→</span>

// Apply to all icon components: ArrowRightIcon, SparklesIcon, ChartBarIcon, BoltIcon
```

---

## 3. Fix Prisma Relation Includes in Trades API

**Time:** 15 minutes  
**File:** `apps/web/src/app/api/trades/route.ts:389`

**Issue:** Missing owner relation in query

**Current:**
```typescript
const teams = await prisma.team.findMany({
  where: { ownerId: userId },
  include: {
    league: { /* config */ }
  }
})
```

**Fix:**
```typescript
const teams = await prisma.team.findMany({
  where: { ownerId: userId },
  include: {
    owner: { select: { id: true, name: true, email: true } },
    league: { /* config */ }
  }
})
```

---

## 4. Fix Analytics Vortex API (2 Options)

**Time:** 30 minutes (Option A) or 2 hours (Option B)

### Option A: Disable Advanced Analytics (Recommended)
**File:** `apps/web/src/app/api/analytics/vortex/route.ts`

```typescript
// Simplify to use only existing Prisma models
// Remove references to: weeklyTeamStats, matchupAnalytics, etc.
// Use existing: team, player, matchup models only

async function handleTeamsRequest(week: number, season: number, searchParams: URLSearchParams) {
  const teams = await prisma.team.findMany({
    include: {
      owner: true,
      league: true,
      roster: {
        include: {
          player: {
            include: {
              stats: { where: { week, season } }
            }
          }
        }
      }
    },
    take: parseInt(searchParams.get('limit') || '50')
  });
  
  // Calculate analytics from existing data instead of querying non-existent tables
  return NextResponse.json({ teams: teams.map(transformTeamData) });
}
```

### Option B: Add Missing Prisma Models (Future Enhancement)
Add to `prisma/schema.prisma`:

```prisma
model PlayerWeeklyAnalytics {
  id        String   @id @default(cuid())
  playerId  String
  week      Int
  season    Int
  points    Float
  createdAt DateTime @default(now())
  
  player    Player   @relation(fields: [playerId], references: [id])
  
  @@unique([playerId, week, season])
}

model WeeklyTeamStats {
  id        String   @id @default(cuid())
  teamId    String
  week      Int
  season    Int
  points    Float
  createdAt DateTime @default(now())
  
  team      Team     @relation(fields: [teamId], references: [id])
  
  @@unique([teamId, week, season])
}

// Add similar models for other analytics tables
```

Then run:
```bash
npx prisma generate
npx prisma db push
```

---

## 5. Fix Player Projections Queries

**Time:** 20 minutes  
**Files:** Multiple API routes

**Issue:** Querying `player.projectedPoints` field that doesn't exist

**Fix:** Use the `projections` relation instead:

**Before:**
```typescript
const players = await prisma.player.findMany({
  select: {
    id: true,
    name: true,
    projectedPoints: true  // ❌ Doesn't exist
  }
})
```

**After:**
```typescript
const players = await prisma.player.findMany({
  select: {
    id: true,
    name: true,
    projections: {  // ✅ Use relation
      where: { week, season },
      select: { projectedPoints: true }
    }
  }
})
```

**Files to Update:**
- `apps/web/src/app/api/analytics/vortex/route.ts` (lines 102, 158, 216, 225)
- Other files querying projectedPoints directly

---

## 6. Fix Missing Prisma Import in Health Check

**Time:** 1 minute  
**File:** `apps/web/src/app/api/health/database/route.ts`

**Already Fixed!** ✅

---

## 7. Update Icon Import in Vortex Dashboard

**Time:** 1 minute  
**File:** `apps/web/src/components/analytics/vortex-analytics-dashboard.tsx`

**Already Fixed!** ✅

---

## Priority Order:

1. ✅ **DONE:** Fix Refresh icon import
2. ✅ **DONE:** Add prisma import to health check
3. 🔧 **TODO:** Add @types/ws dependency
4. 🔧 **TODO:** Fix icon component types
5. 🔧 **TODO:** Fix trade API relation includes
6. 🔧 **TODO:** Fix analytics vortex (Option A recommended)
7. 🔧 **TODO:** Fix player projections queries

---

## Testing After Fixes:

```bash
# 1. Type check
cd apps/web
npm run typecheck

# 2. Build test
npm run build

# 3. Run development server
npm run dev

# 4. Test key pages:
# - http://localhost:3001/
# - http://localhost:3001/dashboard
# - http://localhost:3001/players
# - http://localhost:3001/trades
```

---

## Expected Results After Fixes:

- ✅ TypeScript compilation errors reduced from 267 to <50
- ✅ All user-facing pages working without runtime errors
- ✅ API routes returning proper data
- ✅ Build succeeds without errors
- ✅ Production-ready deployment

---

*Last Updated: October 8, 2025*


