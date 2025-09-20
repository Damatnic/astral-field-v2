# Database Schema Documentation

## Overview

The Astral Field database is built on PostgreSQL with Prisma ORM, featuring 25+ interconnected models that support comprehensive fantasy football league management. The schema is designed for performance, data integrity, and scalability.

## Database Connection

### Configuration
```typescript
// Database URLs
DATABASE_URL="postgresql://user:password@host:5432/db?pgbouncer=true"
DATABASE_URL_UNPOOLED="postgresql://user:password@host:5432/db"
```

### Connection Pooling
- **Pooled**: Primary connection for application queries
- **Unpooled**: Direct connection for migrations and admin operations
- **PgBouncer**: Connection pooling for better performance

## Core Models

### User Management

#### User Model
Primary user entity with authentication and profile information.

```prisma
model User {
  id                     String                    @id @default(cuid())
  profileId              String?                   @unique
  email                  String                    @unique
  password               String?                   @db.VarChar(255)
  name                   String?                   @db.VarChar(255)
  image                  String?                   @db.VarChar(1000)
  role                   UserRole                  @default(PLAYER)
  teamName               String?                   @db.VarChar(255)
  avatar                 String?                   @db.VarChar(10)
  createdAt              DateTime                  @default(now())
  updatedAt              DateTime                  @updatedAt
  
  // Relations
  leagues                LeagueMember[]
  commissionedLeagues    League[]                  @relation("Commissioner")
  teams                  Team[]
  // ... additional relations
}

enum UserRole {
  ADMIN
  COMMISSIONER
  PLAYER
}
```

**Key Features:**
- CUID primary keys for better performance
- Email uniqueness constraint
- Bcrypt password hashing
- Role-based access control
- Soft deletion support

#### UserSession Model
Database-backed session management for security.

```prisma
model UserSession {
  id          String    @id @default(cuid())
  userId      String
  sessionId   String    @unique
  ipAddress   String?
  userAgent   String?
  isActive    Boolean   @default(true)
  lastActivity DateTime @default(now())
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### League Management

#### League Model
Core league configuration and settings.

```prisma
model League {
  id            String         @id @default(cuid())
  name          String         @db.VarChar(255)
  description   String?        @db.Text
  season        Int            @default(2024)
  isActive      Boolean        @default(true)
  currentWeek   Int?           @default(1)
  commissionerId String?
  
  // Relations
  commissioner  User?          @relation("Commissioner", fields: [commissionerId], references: [id])
  members      LeagueMember[]
  teams        Team[]
  settings     Settings?
  // ... additional relations
}
```

#### Settings Model
League-specific configuration stored as JSON.

```prisma
model Settings {
  id            String     @id @default(cuid())
  leagueId      String     @unique
  rosterSlots   Json       // {"QB": 1, "RB": 2, ...}
  scoringSystem Json       // Scoring configuration
  waiverMode    WaiverMode @default(ROLLING)
  tradeDeadline DateTime?
  playoffWeeks  Json       // [15, 16, 17, 18]
  
  league        League     @relation(fields: [leagueId], references: [id])
}
```

#### LeagueMember Model
Many-to-many relationship between users and leagues.

```prisma
model LeagueMember {
  id       String   @id @default(cuid())
  userId   String
  leagueId String
  role     RoleType @default(OWNER)
  
  user     User     @relation(fields: [userId], references: [id])
  league   League   @relation(fields: [leagueId], references: [id])
  
  @@unique([userId, leagueId])
}
```

### Team Management

#### Team Model
Fantasy team ownership and statistics.

```prisma
model Team {
  id             String         @id @default(cuid())
  name           String         @db.VarChar(255)
  leagueId       String
  ownerId        String
  wins           Int            @default(0)
  losses         Int            @default(0)
  ties           Int            @default(0)
  pointsFor      Decimal        @default(0) @db.Decimal(8, 2)
  pointsAgainst  Decimal        @default(0) @db.Decimal(8, 2)
  waiverPriority Int            @default(1)
  faabBudget     Int            @default(100)
  faabSpent      Int            @default(0)
  draftPosition  Int?
  
  // Relations
  league         League         @relation(fields: [leagueId], references: [id])
  owner          User           @relation(fields: [ownerId], references: [id])
  roster         RosterPlayer[]
  // ... additional relations
}
```

### Player Data

#### Player Model
NFL player database with comprehensive information.

```prisma
model Player {
  id              String             @id @default(cuid())
  nflId           String?            @unique
  sleeperPlayerId String?            @unique
  name            String             @db.VarChar(255)
  firstName       String?            @db.VarChar(255)
  lastName        String?            @db.VarChar(255)
  position        Position
  nflTeam         String?            @db.VarChar(10)
  byeWeek         Int?
  status          PlayerStatus       @default(ACTIVE)
  injuryStatus    String?            @db.VarChar(50)
  isRookie        Boolean            @default(false)
  yearsExperience Int                @default(0)
  age             Int?
  height          String?            @db.VarChar(10)
  weight          String?            @db.VarChar(10)
  college         String?            @db.VarChar(255)
  searchRank      Int?
  fantasyPositions Json?
  adp             Float?
  isFantasyRelevant Boolean          @default(false)
  lastUpdated     DateTime           @default(now())
  
  // Relations
  playerStats     PlayerStats[]
  projections     PlayerProjection[]
  rosterPlayers   RosterPlayer[]
  // ... additional relations
}
```

#### RosterPlayer Model
Team roster management with lineup positions.

```prisma
model RosterPlayer {
  id              String          @id @default(cuid())
  teamId          String
  playerId        String
  rosterSlot      RosterSlot
  position        RosterSlot      @default(BENCH)
  isLocked        Boolean         @default(false)
  acquisitionDate DateTime        @default(now())
  acquisitionType AcquisitionType @default(DRAFT)
  week            Int?
  
  player          Player          @relation(fields: [playerId], references: [id])
  team            Team            @relation(fields: [teamId], references: [id])
  
  @@unique([teamId, playerId])
}
```

### Scoring and Statistics

#### PlayerStats Model
Player performance data by week and season.

```prisma
model PlayerStats {
  id            String    @id @default(cuid())
  playerId      String
  week          Int
  season        Int
  gameId        String?   @db.VarChar(50)
  team          String?   @db.VarChar(10)
  opponent      String?   @db.VarChar(10)
  stats         Json      // Raw statistical data
  fantasyPoints Decimal?  @default(0) @db.Decimal(8, 2)
  projectedPoints Decimal? @default(0) @db.Decimal(8, 2)
  isProjected   Boolean   @default(false)
  
  player        Player    @relation(fields: [playerId], references: [id])
  
  @@unique([playerId, week, season])
}
```

#### Matchup Model
Head-to-head scoring between teams.

```prisma
model Matchup {
  id         String   @id @default(cuid())
  leagueId   String
  week       Int
  season     Int      @default(2024)
  homeTeamId String
  awayTeamId String
  homeScore  Decimal  @default(0) @db.Decimal(8, 2)
  awayScore  Decimal  @default(0) @db.Decimal(8, 2)
  isComplete Boolean  @default(false)
  
  homeTeam   Team     @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeam   Team     @relation("AwayTeam", fields: [awayTeamId], references: [id])
  league     League   @relation(fields: [leagueId], references: [id])
  
  @@unique([leagueId, week, homeTeamId, awayTeamId])
}
```

### Trading System

#### Trade Model
Trade proposal and execution tracking.

```prisma
model Trade {
  id          String      @id @default(cuid())
  leagueId    String
  proposerId  String
  status      TradeStatus @default(PENDING)
  expiresAt   DateTime?
  processedAt DateTime?
  notes       String?     @db.Text
  
  items       TradeItem[]
  votes       TradeVote[]
  league      League      @relation(fields: [leagueId], references: [id])
  proposer    User        @relation(fields: [proposerId], references: [id])
}

enum TradeStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
  VETOED
}
```

#### TradeItem Model
Individual items within a trade proposal.

```prisma
model TradeItem {
  id         String        @id @default(cuid())
  tradeId    String
  fromTeamId String
  toTeamId   String
  playerId   String?
  itemType   TradeItemType
  metadata   Json?
  
  player     Player?       @relation(fields: [playerId], references: [id])
  trade      Trade         @relation(fields: [tradeId], references: [id])
}

enum TradeItemType {
  PLAYER
  DRAFT_PICK
  FAAB_MONEY
}
```

### Waiver System

#### WaiverClaim Model
FAAB and priority-based waiver claims.

```prisma
model WaiverClaim {
  id           String       @id @default(cuid())
  leagueId     String
  teamId       String
  userId       String
  playerId     String
  dropPlayerId String?
  priority     Int
  faabBid      Int?
  status       WaiverStatus @default(PENDING)
  processedAt  DateTime?
  successful   Boolean?
  failureReason String?
  weekNumber   Int          @default(1)
  
  league       League       @relation(fields: [leagueId], references: [id])
  player       Player       @relation(fields: [playerId], references: [id])
  team         Team         @relation(fields: [teamId], references: [id])
  user         User         @relation(fields: [userId], references: [id])
}
```

### Draft Management

#### Draft Model
Draft configuration and status tracking.

```prisma
model Draft {
  id             String      @id @default(cuid())
  leagueId       String
  status         DraftStatus @default(PENDING)
  type           DraftType   @default(SNAKE)
  rounds         Int         @default(16)
  pickTimeLimit  Int         @default(120)
  currentRound   Int         @default(1)
  currentPick    Int         @default(1)
  scheduledStart DateTime?
  startedAt      DateTime?
  completedAt    DateTime?
  
  league         League      @relation(fields: [leagueId], references: [id])
  picks          DraftPick[]
}
```

#### DraftPick Model
Individual draft selections.

```prisma
model DraftPick {
  id           String   @id @default(cuid())
  draftId      String
  teamId       String
  playerId     String
  round        Int
  pick         Int
  overallPick  Int
  pickTime     DateTime @default(now())
  
  draft        Draft    @relation(fields: [draftId], references: [id])
  team         Team     @relation(fields: [teamId], references: [id])
  player       Player   @relation(fields: [playerId], references: [id])
  
  @@unique([draftId, teamId, playerId])
  @@unique([draftId, round, pick])
}
```

### Communication

#### Message Model
League chat and communication system.

```prisma
model Message {
  id        String      @id @default(cuid())
  leagueId  String
  userId    String?
  content   String      @db.Text
  type      MessageType @default(GENERAL)
  metadata  Json?
  createdAt DateTime    @default(now())
  
  league    League      @relation(fields: [leagueId], references: [id])
  user      User?       @relation(fields: [userId], references: [id])
}

enum MessageType {
  GENERAL
  TRADE_PROPOSAL
  WAIVER_CLAIM
  TRASH_TALK
  ANNOUNCEMENT
}
```

#### Notification Model
User notification system.

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String           @db.VarChar(255)
  content   String           @db.Text
  metadata  Json?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())
  
  user      User             @relation(fields: [userId], references: [id])
}
```

## Advanced Features

### Job Management System

For background processing and scheduled tasks.

```prisma
model JobExecution {
  id            String          @id @default(cuid())
  jobId         String
  jobType       String
  queueName     String
  status        JobStatus       @default(PENDING)
  attempts      Int             @default(0)
  maxAttempts   Int             @default(3)
  data          Json?
  result        Json?
  error         String?
  startedAt     DateTime?
  completedAt   DateTime?
  duration      Int?
  
  auditLogs     JobAuditLog[]
}
```

### Analytics and Tracking

```prisma
model PlayerProjection {
  id              String   @id @default(cuid())
  playerId        String
  week            Int
  season          Int      @default(2024)
  projectedPoints Decimal  @db.Decimal(6, 2)
  confidence      Int      @default(50)
  source          String   @default("SYSTEM")
  
  player          Player   @relation(fields: [playerId], references: [id])
  
  @@unique([playerId, week, season, source])
}
```

## Enums Reference

### Position Types
```prisma
enum Position {
  QB    // Quarterback
  RB    // Running Back
  WR    // Wide Receiver
  TE    // Tight End
  K     // Kicker
  DST   // Defense/Special Teams
  LB    // Linebacker (IDP)
  DB    // Defensive Back (IDP)
  DL    // Defensive Line (IDP)
}
```

### Roster Slots
```prisma
enum RosterSlot {
  QB
  RB
  WR
  TE
  FLEX         // RB/WR/TE
  SUPER_FLEX   // QB/RB/WR/TE
  K
  DST
  BENCH
  IR           // Injured Reserve
  TAXI         // Taxi Squad (Dynasty)
}
```

## Database Indexes

### Performance Optimization

Key indexes for optimal query performance:

```sql
-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- League indexes
CREATE INDEX idx_leagues_season_active ON leagues(season, is_active);
CREATE INDEX idx_leagues_commissioner ON leagues(commissioner_id);

-- Team indexes  
CREATE INDEX idx_teams_league_points ON teams(league_id, points_for);
CREATE INDEX idx_teams_waiver_priority ON teams(league_id, waiver_priority);

-- Player indexes
CREATE INDEX idx_players_position_team ON players(position, nfl_team);
CREATE INDEX idx_players_fantasy_relevant ON players(is_fantasy_relevant);
CREATE INDEX idx_players_search_rank ON players(search_rank);

-- Roster indexes
CREATE INDEX idx_roster_team_position ON roster_players(team_id, roster_slot);
CREATE INDEX idx_roster_player_locked ON roster_players(player_id, is_locked);

-- Matchup indexes
CREATE INDEX idx_matchups_league_week ON matchups(league_id, season, week);
CREATE INDEX idx_matchups_complete ON matchups(season, is_complete);

-- Stats indexes
CREATE INDEX idx_player_stats_week_season ON player_stats(week, season);
CREATE INDEX idx_player_stats_player_season ON player_stats(player_id, season);
```

## Data Integrity

### Constraints and Relations

- **Foreign Key Constraints**: Enforce referential integrity
- **Unique Constraints**: Prevent duplicate data
- **Check Constraints**: Validate data ranges and formats
- **Cascade Deletes**: Maintain data consistency

### Data Validation

```typescript
// Example Prisma validation
const createTeam = await prisma.team.create({
  data: {
    name: z.string().min(1).max(255).parse(teamName),
    leagueId: z.string().cuid().parse(leagueId),
    ownerId: z.string().cuid().parse(ownerId),
    faabBudget: z.number().min(0).max(1000).parse(budget)
  }
});
```

## Migration Strategy

### Development Workflow

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Create and apply migrations
npx prisma migrate dev --name migration_name

# Seed database with initial data
npx prisma db seed
```

### Production Migrations

```bash
# Deploy migrations to production
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

## Backup and Recovery

### Database Backup Strategy

```sql
-- Daily automated backups
pg_dump -Fc astralfield_prod > backup_$(date +%Y%m%d).sql

-- Point-in-time recovery capability
-- Retained for 30 days minimum
```

### Data Retention Policies

- **User Data**: Retained indefinitely unless deleted
- **Session Data**: 7 day expiration with cleanup
- **Analytics Data**: 2 year retention
- **Audit Logs**: 1 year retention
- **Performance Logs**: 30 day retention

This comprehensive database schema supports all fantasy football features while maintaining performance, data integrity, and scalability for future growth.