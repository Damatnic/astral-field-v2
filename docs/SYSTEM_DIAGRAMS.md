# AstralField v3.0 - System Architecture Diagrams

## Overview

This document contains visual representations of AstralField's system architecture, data flow patterns, and component relationships. These diagrams provide a comprehensive view of how the system operates at various levels.

## High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Web UI - React/Next.js]
        Mobile[Mobile - PWA]
        API_Client[API Client]
    end
    
    subgraph "Application Layer"
        NextJS[Next.js App]
        Express[Express.js API]
        WebSocket[Socket.IO Server]
    end
    
    subgraph "Service Layer"
        Auth[Authentication Service]
        Draft[Draft Service]
        AI[AI Coach Service]
        Player[Player Service]
        League[League Service]
    end
    
    subgraph "Data Layer"
        Prisma[Prisma ORM]
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis Cache)]
    end
    
    subgraph "External Services"
        ESPN[ESPN API]
        Sleeper[Sleeper API]
        CDN[Image CDN]
    end
    
    UI --> NextJS
    Mobile --> NextJS
    API_Client --> Express
    
    NextJS --> Auth
    Express --> Auth
    WebSocket --> Auth
    
    NextJS --> Player
    Express --> Draft
    Express --> AI
    Express --> League
    
    Auth --> Prisma
    Draft --> Prisma
    AI --> Prisma
    Player --> Prisma
    League --> Prisma
    
    Prisma --> PostgreSQL
    Auth --> Redis
    Player --> Redis
    
    Player --> ESPN
    Player --> Sleeper
    UI --> CDN
```

## Detailed Component Architecture

```mermaid
graph TB
    subgraph "Frontend - Next.js Application"
        subgraph "Pages (App Router)"
            Homepage[/ - Landing Page]
            Dashboard[/dashboard - Main Dashboard]
            Draft[/draft - Draft Room]
            Players[/players - Player Database]
            Team[/team - Team Management]
            Auth[/auth - Authentication]
        end
        
        subgraph "Components"
            Layout[Layout Components]
            DraftUI[Draft UI Components]
            PlayerUI[Player Components]
            DashUI[Dashboard Components]
            SharedUI[Shared UI Components]
        end
        
        subgraph "State Management"
            ReactQuery[React Query - Server State]
            Zustand[Zustand - Client State]
            Context[React Context - Global State]
        end
        
        subgraph "Services"
            APIClient[API Client]
            SocketClient[Socket.IO Client]
            AuthClient[Auth Client]
        end
    end
    
    subgraph "Backend - API Services"
        subgraph "Next.js API Routes"
            AuthAPI[/api/auth/* - Authentication]
            SetupAPI[/api/setup/* - Initial Setup]
            DebugAPI[/api/debug/* - Development]
        end
        
        subgraph "Express.js API Server"
            LeagueAPI[/api/leagues/* - League Management]
            PlayerAPI[/api/players/* - Player Data]
            DraftAPI[/api/draft/* - Draft Operations]
            TradeAPI[/api/trades/* - Trading System]
            AIAPI[/api/ai/* - AI Recommendations]
        end
        
        subgraph "WebSocket Services"
            DraftWS[Draft Room Events]
            ChatWS[Real-time Chat]
            ScoreWS[Live Score Updates]
        end
    end
    
    Homepage --> Layout
    Dashboard --> DashUI
    Draft --> DraftUI
    Players --> PlayerUI
    
    DraftUI --> SocketClient
    PlayerUI --> APIClient
    DashUI --> ReactQuery
    
    APIClient --> AuthAPI
    APIClient --> LeagueAPI
    SocketClient --> DraftWS
    
    AuthAPI --> Context
    LeagueAPI --> ReactQuery
    DraftWS --> Zustand
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant API as API Server
    participant DB as Database
    participant WS as WebSocket
    participant Ext as External APIs
    
    Note over U,Ext: User Authentication Flow
    U->>UI: Login Request
    UI->>API: POST /api/auth/login
    API->>DB: Verify Credentials
    DB-->>API: User Data
    API->>API: Generate JWT
    API-->>UI: Token + User Data
    UI->>UI: Store Token
    
    Note over U,Ext: Real-time Draft Flow
    U->>UI: Join Draft Room
    UI->>WS: Connect with JWT
    WS->>DB: Verify User & Draft
    WS-->>UI: Draft State
    
    U->>UI: Make Draft Pick
    UI->>WS: Pick Player Event
    WS->>DB: Save Pick
    WS->>WS: Broadcast to Room
    WS-->>UI: Updated Draft State
    
    Note over U,Ext: Player Data Sync
    API->>Ext: Fetch Player Stats
    Ext-->>API: Player Data
    API->>DB: Update Player Records
    API->>WS: Notify Score Updates
    WS-->>UI: Live Score Updates
```

## Database Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ leagues : "commissioner"
    users ||--o{ teams : "owner"
    users ||--o{ accounts : "oauth"
    users ||--|| user_preferences : "settings"
    
    leagues ||--o{ teams : "contains"
    leagues ||--o{ drafts : "hosts"
    leagues ||--o{ matchups : "schedules"
    leagues ||--o{ chat_messages : "facilitates"
    
    teams ||--o{ roster_players : "roster"
    teams ||--o{ draft_picks : "selections"
    teams ||--o{ transactions : "activities"
    teams ||--o{ trade_proposals : "proposes"
    
    players ||--o{ roster_players : "assigned"
    players ||--o{ draft_picks : "selected"
    players ||--o{ player_stats : "statistics"
    players ||--o{ player_projections : "forecasts"
    players ||--o{ player_news : "updates"
    
    drafts ||--o{ draft_picks : "contains"
    drafts ||--o{ draft_order : "sequence"
    
    chat_messages ||--o{ message_reactions : "reactions"
    
    users {
        string id PK
        string email UK
        string name
        string role
        datetime createdAt
        boolean isAdmin
    }
    
    leagues {
        string id PK
        string name
        string commissionerId FK
        json settings
        int currentWeek
        string season
        boolean isActive
    }
    
    teams {
        string id PK
        string name
        string ownerId FK
        string leagueId FK
        int wins
        int losses
        float pointsFor
        int standing
    }
    
    players {
        string id PK
        string name
        string position
        string nflTeam
        int rank
        float adp
        boolean isActive
    }
    
    drafts {
        string id PK
        string leagueId FK
        string status
        int currentRound
        int timeRemaining
        datetime startedAt
    }
    
    roster_players {
        string id PK
        string teamId FK
        string playerId FK
        string position
        boolean isStarter
        datetime acquisitionDate
    }
```

## Authentication & Authorization Flow

```mermaid
flowchart TD
    Start([User Accesses App]) --> CheckToken{Token Exists?}
    
    CheckToken -->|No| Login[Redirect to Login]
    CheckToken -->|Yes| ValidateToken[Validate JWT Token]
    
    Login --> AuthMethod{Auth Method?}
    AuthMethod -->|Email/Password| EmailAuth[Email Authentication]
    AuthMethod -->|OAuth| OAuthAuth[OAuth Provider]
    
    EmailAuth --> ValidateCreds[Validate Credentials]
    OAuthAuth --> OAuthCallback[OAuth Callback]
    
    ValidateCreds -->|Success| GenerateToken[Generate JWT]
    ValidateCreds -->|Fail| LoginError[Show Login Error]
    
    OAuthCallback -->|Success| CreateUser[Create/Update User]
    OAuthCallback -->|Fail| OAuthError[Show OAuth Error]
    
    CreateUser --> GenerateToken
    GenerateToken --> StoreSession[Store Session in Redis]
    StoreSession --> SetToken[Set Token in Client]
    SetToken --> AccessGranted[Access Granted]
    
    ValidateToken -->|Valid| CheckExpiry{Token Expired?}
    ValidateToken -->|Invalid| Login
    
    CheckExpiry -->|No| AccessGranted
    CheckExpiry -->|Yes| RefreshToken[Refresh Token]
    
    RefreshToken -->|Success| AccessGranted
    RefreshToken -->|Fail| Login
    
    AccessGranted --> ProtectedResource[Access Protected Resources]
    
    LoginError --> Login
    OAuthError --> Login
```

## Real-time Communication Architecture

```mermaid
graph TB
    subgraph "Client Side"
        C1[Client 1 - Draft Room]
        C2[Client 2 - Draft Room]
        C3[Client 3 - Dashboard]
        C4[Client 4 - Mobile App]
    end
    
    subgraph "WebSocket Server"
        WS[Socket.IO Server]
        
        subgraph "Rooms"
            DraftRoom[Draft Room: draft_123]
            LeagueRoom[League Room: league_456]
            GlobalRoom[Global Notifications]
        end
        
        subgraph "Event Handlers"
            DraftHandler[Draft Event Handler]
            ChatHandler[Chat Event Handler]
            ScoreHandler[Score Event Handler]
        end
    end
    
    subgraph "Backend Services"
        DraftService[Draft Service]
        ChatService[Chat Service]
        ScoreService[Score Service]
        DB[(Database)]
        Cache[(Redis Cache)]
    end
    
    C1 -.->|Socket Connection| WS
    C2 -.->|Socket Connection| WS
    C3 -.->|Socket Connection| WS
    C4 -.->|Socket Connection| WS
    
    WS --> DraftRoom
    WS --> LeagueRoom
    WS --> GlobalRoom
    
    DraftRoom -.->|Events| C1
    DraftRoom -.->|Events| C2
    LeagueRoom -.->|Events| C3
    GlobalRoom -.->|Events| C4
    
    WS --> DraftHandler
    WS --> ChatHandler
    WS --> ScoreHandler
    
    DraftHandler --> DraftService
    ChatHandler --> ChatService
    ScoreHandler --> ScoreService
    
    DraftService --> DB
    ChatService --> DB
    ScoreService --> Cache
```

## API Request/Response Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as Middleware
    participant R as Route Handler
    participant S as Service Layer
    participant DB as Database
    participant Cache as Redis Cache
    
    Note over C,Cache: Standard API Request Flow
    
    C->>MW: HTTP Request + JWT
    MW->>MW: Rate Limiting Check
    MW->>MW: CORS Validation
    MW->>MW: JWT Verification
    MW->>MW: Input Validation
    
    alt Authentication Failed
        MW-->>C: 401 Unauthorized
    else Authentication Success
        MW->>R: Validated Request
        
        R->>S: Business Logic Call
        
        S->>Cache: Check Cache
        alt Cache Hit
            Cache-->>S: Cached Data
        else Cache Miss
            S->>DB: Database Query
            DB-->>S: Query Result
            S->>Cache: Store in Cache
        end
        
        S-->>R: Processed Data
        R-->>MW: Response Data
        MW-->>C: HTTP Response
    end
    
    Note over C,Cache: Error Handling
    alt Service Error
        S-->>R: Error
        R-->>MW: Error Response
        MW-->>C: Formatted Error
    end
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DevLocal[Local Development]
        DevDB[(Local PostgreSQL)]
        DevRedis[(Local Redis)]
    end
    
    subgraph "CI/CD Pipeline"
        GitHub[GitHub Repository]
        Actions[GitHub Actions]
        Tests[Automated Tests]
        Build[Build Process]
    end
    
    subgraph "Production Environment"
        subgraph "Frontend"
            Vercel[Vercel Deployment]
            CDN[Global CDN]
        end
        
        subgraph "Backend"
            APIServer[API Server - Railway/Render]
            SocketServer[WebSocket Server]
        end
        
        subgraph "Database"
            ProdDB[(PostgreSQL - Neon)]
            ProdRedis[(Redis - Upstash)]
        end
        
        subgraph "External Services"
            ESPN[ESPN API]
            Sentry[Error Monitoring]
            Analytics[Analytics Service]
        end
    end
    
    DevLocal --> GitHub
    GitHub --> Actions
    Actions --> Tests
    Tests --> Build
    Build --> Vercel
    Build --> APIServer
    
    Vercel --> CDN
    APIServer --> SocketServer
    
    APIServer --> ProdDB
    APIServer --> ProdRedis
    SocketServer --> ProdRedis
    
    APIServer --> ESPN
    Vercel --> Sentry
    APIServer --> Sentry
    
    CDN -.->|Static Assets| Users[End Users]
    Vercel -.->|Dynamic Pages| Users
    APIServer -.->|API Calls| Users
```

## Security Architecture

```mermaid
flowchart TB
    subgraph "Security Layers"
        subgraph "Frontend Security"
            CSP[Content Security Policy]
            HTTPS[HTTPS Enforcement]
            CORS[CORS Configuration]
            InputVal[Input Validation]
        end
        
        subgraph "Authentication Security"
            JWT[JWT Tokens]
            OAuth[OAuth Providers]
            Session[Session Management]
            MFA[Multi-Factor Auth]
        end
        
        subgraph "API Security"
            RateLimit[Rate Limiting]
            Helmet[Security Headers]
            Validation[Schema Validation]
            Sanitization[Input Sanitization]
        end
        
        subgraph "Database Security"
            Encryption[Data Encryption]
            Backup[Encrypted Backups]
            Access[Access Controls]
            Audit[Audit Logging]
        end
        
        subgraph "Infrastructure Security"
            WAF[Web Application Firewall]
            DDoS[DDoS Protection]
            VPN[VPN Access]
            Monitoring[Security Monitoring]
        end
    end
    
    Users[End Users] --> CSP
    CSP --> HTTPS
    HTTPS --> CORS
    CORS --> JWT
    
    JWT --> RateLimit
    RateLimit --> Helmet
    Helmet --> Validation
    
    Validation --> Encryption
    Encryption --> Access
    Access --> Audit
    
    WAF --> Users
    DDoS --> WAF
    Monitoring --> Audit
```

## Performance Optimization Flow

```mermaid
graph LR
    subgraph "Frontend Optimizations"
        CodeSplit[Code Splitting]
        LazyLoad[Lazy Loading]
        ImageOpt[Image Optimization]
        Caching[Browser Caching]
    end
    
    subgraph "API Optimizations"
        APICache[API Response Caching]
        DBIndex[Database Indexing]
        QueryOpt[Query Optimization]
        ConnPool[Connection Pooling]
    end
    
    subgraph "Infrastructure Optimizations"
        CDNOpt[CDN Distribution]
        LoadBalance[Load Balancing]
        Compression[Gzip Compression]
        Monitoring[Performance Monitoring]
    end
    
    Request[User Request] --> CodeSplit
    CodeSplit --> LazyLoad
    LazyLoad --> ImageOpt
    ImageOpt --> Caching
    
    Caching --> APICache
    APICache --> DBIndex
    DBIndex --> QueryOpt
    QueryOpt --> ConnPool
    
    ConnPool --> CDNOpt
    CDNOpt --> LoadBalance
    LoadBalance --> Compression
    Compression --> Response[Optimized Response]
    
    Monitoring --> Performance[Performance Metrics]
```

## Error Handling & Monitoring Flow

```mermaid
flowchart TD
    Error[Error Occurs] --> Type{Error Type?}
    
    Type -->|Frontend| FrontendError[Frontend Error]
    Type -->|API| APIError[API Error]
    Type -->|Database| DBError[Database Error]
    Type -->|External| ExternalError[External Service Error]
    
    FrontendError --> Sentry[Sentry Error Tracking]
    APIError --> Logger[Structured Logging]
    DBError --> Logger
    ExternalError --> Logger
    
    Sentry --> ErrorDB[(Error Database)]
    Logger --> LogDB[(Log Database)]
    
    ErrorDB --> Dashboard[Error Dashboard]
    LogDB --> Dashboard
    
    Dashboard --> Alert{Alert Threshold?}
    
    Alert -->|Yes| Notification[Send Alerts]
    Alert -->|No| Monitor[Continue Monitoring]
    
    Notification --> Team[Development Team]
    Team --> Fix[Error Resolution]
    Fix --> Deploy[Deploy Fix]
    Deploy --> Monitor
```

---

*These diagrams provide a comprehensive visual representation of AstralField v3.0's architecture, enabling developers and stakeholders to understand the system's design, data flow, and operational characteristics.*