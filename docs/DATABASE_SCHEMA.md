# AstralField v3.0 - Database Schema Documentation

## Database Overview

AstralField uses **PostgreSQL** as its primary database with **Prisma ORM** for type-safe database access. The schema is designed to support comprehensive fantasy football league management with real-time features, AI coaching, and detailed analytics.

### Database Configuration
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5.7.1
- **Features**: Full-text search, PostgreSQL extensions
- **Connection**: Pool-based connection management

## Core Data Models

### User Management

#### users
Primary user account model with authentication and profile data.

```prisma
model users {
  id                    String   @id
  email                 String   @unique
  name                  String?
  image                 String?
  emailVerified         DateTime?
  role                  UserRole @default(PLAYER)
  teamName              String?
  hashedPassword        String?
  avatar                String?
  profileId             String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime
  isAdmin               Boolean  @default(false)
  lastActiveAt          DateTime?
  notificationSettings  Json?
  onboardingCompleted   Boolean  @default(false)
  onboardingCompletedAt DateTime?
  onboardingSteps       Json?
}
```

**Key Features:**
- Supports multiple authentication methods (email/password, OAuth)
- Role-based access control (ADMIN, COMMISSIONER, PLAYER)
- Onboarding tracking and user preferences
- Profile customization with avatars

#### accounts
OAuth provider account linkage for NextAuth integration.

```prisma
model accounts {
  id                String  @id
  userId            String
  type              String
  provider          String  // 'google', 'discord', etc.
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
}
```

#### sessions
User session management for NextAuth.

```prisma
model sessions {
  id           String   @id
  sessionToken String   @unique
  userId       String
  expires      DateTime
}
```

#### user_sessions
Extended session tracking for API authentication.

```prisma
model user_sessions {
  id           String   @id
  sessionId    String   @unique
  userId       String
  isActive     Boolean  @default(true)
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime
  lastActivity DateTime @default(now())
}
```

#### user_preferences
User-specific application preferences.

```prisma
model user_preferences {
  id                 String   @id
  userId             String   @unique
  emailNotifications Boolean  @default(true)
  pushNotifications  Boolean  @default(true)
  theme              String   @default("dark")
  timezone           String   @default("America/New_York")
  favoriteTeam       String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime
}
```

### League Management

#### leagues
Core league configuration and settings.

```prisma
model leagues {
  id              String   @id
  name            String
  commissionerId  String
  settings        Json     @default("{}")
  scoringSettings Json     @default("{}")
  rosterSettings  Json     @default("{}")
  draftSettings   Json     @default("{}")
  currentWeek     Int      @default(1)
  season          String   @default("2024")
  isActive        Boolean  @default(true)
  draftDate       DateTime?
  playoffs        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime
}
```

**Settings Structure:**
```json
{
  "settings": {
    "teamCount": 10,
    "playoffTeams": 4,
    "playoffWeeks": [15, 16, 17],
    "rosterLocks": "gameTime",
    "waiverType": "FAAB",
    "tradeDeadline": "2024-11-14"
  },
  "scoringSettings": {
    "passing": { "yards": 0.04, "touchdowns": 4, "interceptions": -2 },
    "rushing": { "yards": 0.1, "touchdowns": 6 },
    "receiving": { "yards": 0.1, "touchdowns": 6, "receptions": 1 },
    "kicking": { "fieldGoals": [3, 4, 5], "extraPoints": 1 },
    "defense": { "touchdowns": 6, "interceptions": 2, "fumbles": 2 }
  },
  "rosterSettings": {
    "positions": {
      "QB": 1, "RB": 2, "WR": 2, "TE": 1, "FLEX": 1, 
      "K": 1, "DEF": 1, "BENCH": 6, "IR": 1
    }
  }
}
```

#### teams
Fantasy teams within leagues.

```prisma
model teams {
  id                String   @id
  name              String
  logo              String?
  ownerId           String
  leagueId          String
  wins              Int      @default(0)
  losses            Int      @default(0)
  ties              Int      @default(0)
  pointsFor         Float    @default(0)
  pointsAgainst     Float    @default(0)
  standing          Int      @default(0)
  playoffSeed       Int?
  waiverPriority    Int      @default(10)
  faabBudget        Int      @default(1000)
  faabSpent         Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime
}
```

### Player Management

#### players
NFL player database with comprehensive stats and metadata.

```prisma
model players {
  id                 String   @id
  espnId             String   @unique
  yahooId            String?  @unique
  sleeperPlayerId    String?  @unique
  name               String
  firstName          String?
  lastName           String?
  position           Position
  nflTeam            String?
  team               String?
  jerseyNumber       Int?
  height             String?
  weight             String?
  age                Int?
  experience         Int?
  college            String?
  imageUrl           String?
  status             String   @default("active")
  injuryStatus       String?
  injuryDetails      String?
  byeWeek            Int?
  adp                Float?
  rank               Int?
  dynastyRank        Int?
  isActive           Boolean  @default(true)
  isDynastyTarget    Boolean  @default(false)
  isFantasyRelevant  Boolean  @default(true)
  isRookie           Boolean  @default(false)
  lastUpdated        DateTime @default(now())
  createdAt          DateTime @default(now())
  updatedAt          DateTime
}
```

**Position Enum:**
```prisma
enum Position {
  QB | RB | WR | TE | K | DEF | DST | FLEX | SUPER_FLEX | 
  BENCH | IR | LB | DB | DL | CB | S
}
```

#### player_stats
Weekly player statistics and fantasy points.

```prisma
model player_stats {
  id            String    @id
  playerId      String
  week          Int
  season        String
  gameId        String?
  gameDate      DateTime?
  opponent      String?
  stats         Json      // Raw statistics
  fantasyPoints Float     @default(0)
  isProjection  Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime
}
```

**Stats JSON Structure:**
```json
{
  "passing": { "attempts": 25, "completions": 18, "yards": 275, "touchdowns": 2, "interceptions": 1 },
  "rushing": { "attempts": 5, "yards": 23, "touchdowns": 0, "fumbles": 0 },
  "receiving": { "targets": 8, "receptions": 6, "yards": 85, "touchdowns": 1 },
  "kicking": { "fieldGoalAttempts": 2, "fieldGoalMade": 1, "extraPointAttempts": 3, "extraPointMade": 3 },
  "defense": { "tackles": 8, "sacks": 1.5, "interceptions": 0, "fumbleRecoveries": 0, "touchdowns": 0 }
}
```

#### player_projections
Weekly player projections from multiple sources.

```prisma
model player_projections {
  id         String   @id
  playerId   String
  week       Int
  season     Int
  points     Float
  source     String   // 'espn', 'fantasypros', 'internal'
  confidence Float?
  stats      Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime
}
```

#### player_news
Player news and injury updates.

```prisma
model player_news {
  id          String   @id
  playerId    String
  headline    String
  body        String
  source      String
  url         String?
  publishedAt DateTime
  createdAt   DateTime @default(now())
}
```

### Roster Management

#### roster
Active team rosters (legacy table, being migrated to roster_players).

```prisma
model roster {
  id              String   @id
  teamId          String
  playerId        String
  position        Position
  isStarter       Boolean  @default(true)
  isLocked        Boolean  @default(false)
  acquisitionDate DateTime @default(now())
  acquisitionType String   @default("draft")
}
```

#### roster_players
Enhanced roster management with detailed tracking.

```prisma
model roster_players {
  id              String   @id
  teamId          String
  playerId        String
  position        Position
  isStarter       Boolean  @default(true)
  isLocked        Boolean  @default(false)
  acquisitionDate DateTime @default(now())
  acquisitionType String   @default("draft")
  createdAt       DateTime @default(now())
  updatedAt       DateTime
}
```

### Draft Management

#### drafts
Draft room configuration and state.

```prisma
model drafts {
  id            String      @id
  leagueId      String
  status        DraftStatus @default(SCHEDULED)
  type          DraftType   @default(SNAKE)
  settings      Json
  currentRound  Int         @default(1)
  currentPick   Int         @default(1)
  currentTeamId String?
  timeRemaining Int         @default(90)
  totalRounds   Int         @default(15)
  timePerPick   Int         @default(90)
  startedAt     DateTime?
  pausedAt      DateTime?
  completedAt   DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime
}
```

**Draft Enums:**
```prisma
enum DraftStatus {
  SCHEDULED | IN_PROGRESS | PAUSED | COMPLETED | CANCELLED
}

enum DraftType {
  SNAKE | AUCTION | LINEAR
}
```

#### draft_order
Draft pick order for each team.

```prisma
model draft_order {
  id        String @id
  draftId   String
  teamId    String
  pickOrder Int
}
```

#### draft_picks
Individual draft pick records.

```prisma
model draft_picks {
  id             String   @id
  draftId        String
  pickNumber     Int
  round          Int
  pickInRound    Int
  teamId         String
  playerId       String?
  timeUsed       Int      @default(0)
  isAutoPick     Boolean  @default(false)
  autoPickReason String?
  pickMadeAt     DateTime @default(now())
}
```

### Game Management

#### matchups
Weekly head-to-head matchups.

```prisma
model matchups {
  id                               String   @id
  leagueId                         String
  week                             Int
  season                           String   @default("2024")
  homeTeamId                       String
  awayTeamId                       String
  homeScore                        Float    @default(0)
  awayScore                        Float    @default(0)
  isComplete                       Boolean  @default(false)
  isPlayoff                        Boolean  @default(false)
  createdAt                        DateTime @default(now())
  updatedAt                        DateTime
}
```

### Trading System

#### trade_proposals
Trade proposal management.

```prisma
model trade_proposals {
  id                 String    @id
  proposingTeamId    String
  receivingTeamId    String
  givingPlayerIds    String[]  // Array of player IDs
  receivingPlayerIds String[]  // Array of player IDs
  status             String    @default("pending")
  message            String?
  createdAt          DateTime  @default(now())
  respondedAt        DateTime?
}
```

#### transactions
All league transactions (trades, waivers, free agents).

```prisma
model transactions {
  id          String    @id
  leagueId    String
  teamId      String
  type        String    // 'trade', 'waiver', 'free_agent', 'drop'
  status      String    @default("pending")
  playerIds   String[]  // Array of affected player IDs
  relatedData Json?     // Additional transaction data
  processedAt DateTime?
  createdAt   DateTime  @default(now())
  week        Int?
}
```

### Communication

#### chat_messages
Real-time league chat system.

```prisma
model chat_messages {
  id                  String              @id
  leagueId            String
  userId              String
  content             String
  type                ChatMessageType     @default(TEXT)
  metadata            String?
  replyToId           String?
  edited              Boolean             @default(false)
  editedAt            DateTime?
  deleted             Boolean             @default(false)
  deletedAt           DateTime?
  createdAt           DateTime            @default(now())
}
```

**Chat Message Types:**
```prisma
enum ChatMessageType {
  TEXT | TRADE | SCORE_UPDATE | TRASH_TALK | ANNOUNCEMENT | POLL
}
```

#### message_reactions
Message reactions and emojis.

```prisma
model message_reactions {
  id        String   @id
  messageId String
  userId    String
  emoji     String
  createdAt DateTime @default(now())
}
```

#### messages
Simple league messaging (legacy).

```prisma
model messages {
  id        String   @id
  leagueId  String
  userId    String
  content   String
  createdAt DateTime @default(now())
}
```

### User Interaction

#### player_likes
Player popularity tracking.

```prisma
model player_likes {
  id        String   @id
  playerId  String
  userId    String
  createdAt DateTime @default(now())
}
```

#### player_watchlist
User player watchlists.

```prisma
model player_watchlist {
  id        String   @id
  playerId  String
  userId    String
  createdAt DateTime @default(now())
}
```

#### player_notes
User-specific player notes.

```prisma
model player_notes {
  id        String   @id
  playerId  String
  userId    String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime
}
```

#### player_activities
Player activity tracking and analytics.

```prisma
model player_activities {
  id        String   @id
  playerId  String
  userId    String
  type      String   // 'view', 'add_to_watchlist', 'remove_from_watchlist'
  action    String
  content   String?
  metadata  Json?
  createdAt DateTime @default(now())
}
```

### Notifications

#### notifications
System notification management.

```prisma
model notifications {
  id       String   @id
  type     String   // 'trade_proposal', 'waiver_claim', 'injury_update'
  title    String
  body     String   @default("")
  data     Json?
  priority String   @default("normal")
  message  String?
  userId   String?
  createdAt DateTime @default(now())
}
```

#### notification_targets
Notification targeting and delivery.

```prisma
model notification_targets {
  id             String   @id
  notificationId String
  userId         String
  teamId         String?
  leagueId       String?
  createdAt      DateTime @default(now())
}
```

#### notification_delivery
Notification delivery tracking.

```prisma
model notification_delivery {
  id             String    @id
  notificationId String
  userId         String
  status         String    // 'pending', 'delivered', 'read', 'failed'
  deliveredAt    DateTime?
  readAt         DateTime?
  error          String?
  createdAt      DateTime  @default(now())
}
```

#### push_subscriptions
Push notification subscriptions.

```prisma
model push_subscriptions {
  id        String   @id
  userId    String   @unique
  endpoint  String
  p256dh    String
  auth      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime
}
```

### Feedback & Support

#### feedback
User feedback and bug reports.

```prisma
model feedback {
  id                 String               @id
  userId             String
  type               FeedbackType         @default(GENERAL)
  category           FeedbackCategory     @default(GENERAL)
  title              String
  description        String
  priority           FeedbackPriority     @default(MEDIUM)
  status             FeedbackStatus       @default(OPEN)
  steps              String?
  expectedBehavior   String?
  actualBehavior     String?
  browserInfo        String?
  pageUrl            String?
  screenshot         String?
  rating             Int?
  lastResponseAt     DateTime?
  resolvedAt         DateTime?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime
}
```

**Feedback Enums:**
```prisma
enum FeedbackType {
  BUG | FEATURE_REQUEST | GENERAL | UI_UX | PERFORMANCE
}

enum FeedbackCategory {
  DRAFT | TRADES | SCORING | MOBILE | GENERAL | PERFORMANCE
}

enum FeedbackPriority {
  LOW | MEDIUM | HIGH | CRITICAL
}

enum FeedbackStatus {
  OPEN | ACKNOWLEDGED | IN_PROGRESS | RESOLVED | CLOSED
}
```

#### feedback_responses
Support team responses to feedback.

```prisma
model feedback_responses {
  id                  String         @id
  feedbackId          String
  respondedBy         String
  response            String
  status              FeedbackStatus
  estimatedResolution DateTime?
  createdAt           DateTime       @default(now())
}
```

### System Monitoring

#### audit_logs
System audit trail for security and compliance.

```prisma
model audit_logs {
  id        String   @id
  userId    String
  action    String   // 'login', 'logout', 'trade_proposal', 'draft_pick'
  details   Json?
  createdAt DateTime @default(now())
}
```

#### error_logs
Application error tracking and monitoring.

```prisma
model error_logs {
  id        String   @id
  message   String
  stack     String?
  url       String?
  userAgent String?
  timestamp DateTime
  category  String   // 'frontend', 'backend', 'database'
  severity  String   // 'low', 'medium', 'high', 'critical'
  userId    String?
  sessionId String?
  metadata  Json?
  resolved  Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

#### performance_metrics
System performance monitoring.

```prisma
model performance_metrics {
  id         String                @id
  metricName String
  metricType PerformanceMetricType
  value      Float
  metadata   Json?
  timestamp  DateTime              @default(now())
}
```

**Performance Metric Types:**
```prisma
enum PerformanceMetricType {
  PAGE_LOAD | API_RESPONSE | DATABASE_QUERY | CACHE_HIT | 
  ERROR_RATE | MEMORY_USAGE
}
```

#### job_executions
Background job tracking and monitoring.

```prisma
model job_executions {
  id           String    @id
  jobName      String
  jobType      String    // 'data_sync', 'score_update', 'notification'
  status       String    // 'pending', 'running', 'completed', 'failed'
  startedAt    DateTime  @default(now())
  completedAt  DateTime?
  error        String?
  metadata     Json?
  result       Json?
  duration     Int?
  retryCount   Int       @default(0)
  maxRetries   Int       @default(3)
  scheduledFor DateTime?
  leagueId     String?
}
```

## Relationships Summary

### Core Entity Relationships

```
users (1) ←→ (N) teams
users (1) ←→ (N) leagues [commissioner]
users (1) ←→ (N) accounts [OAuth]
users (1) ←→ (1) user_preferences

leagues (1) ←→ (N) teams
leagues (1) ←→ (N) drafts
leagues (1) ←→ (N) matchups
leagues (1) ←→ (N) chat_messages

teams (1) ←→ (N) roster_players
teams (1) ←→ (N) draft_picks
teams (1) ←→ (N) transactions

players (1) ←→ (N) roster_players
players (1) ←→ (N) player_stats
players (1) ←→ (N) player_projections
players (1) ←→ (N) player_news

drafts (1) ←→ (N) draft_picks
drafts (1) ←→ (N) draft_order
```

## Indexing Strategy

### Performance Indexes
```sql
-- User queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- League and team queries
CREATE INDEX idx_teams_league_id ON teams(leagueId);
CREATE INDEX idx_teams_owner_id ON teams(ownerId);
CREATE INDEX idx_leagues_commissioner ON leagues(commissionerId);
CREATE INDEX idx_leagues_season_active ON leagues(season, isActive);

-- Player queries
CREATE INDEX idx_players_position ON players(position);
CREATE INDEX idx_players_nfl_team ON players(nflTeam);
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_players_sleeper_id ON players(sleeperPlayerId);

-- Stats and projections
CREATE INDEX idx_player_stats_player_week_season ON player_stats(playerId, week, season);
CREATE INDEX idx_player_projections_player_week_season ON player_projections(playerId, week, season);

-- Real-time features
CREATE INDEX idx_chat_messages_league_created ON chat_messages(leagueId, createdAt);
CREATE INDEX idx_matchups_league_week ON matchups(leagueId, week);

-- Performance monitoring
CREATE INDEX idx_error_logs_category ON error_logs(category);
CREATE INDEX idx_error_logs_created ON error_logs(createdAt);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metricType);
```

## Migration Strategy

### Current Schema Version: 5.7.1
- All models are production-ready
- Comprehensive indexing implemented
- Foreign key constraints enforced
- Data validation at ORM level

### Future Migration Considerations
1. **roster → roster_players**: Complete migration to enhanced roster model
2. **Player data denormalization**: Consider caching frequently accessed player data
3. **Historical data archiving**: Strategy for old season data
4. **Sharding strategy**: Prepare for horizontal scaling

---

*This database schema documentation provides comprehensive coverage of AstralField v3.0's data model, enabling developers to understand relationships, optimize queries, and extend functionality effectively.*