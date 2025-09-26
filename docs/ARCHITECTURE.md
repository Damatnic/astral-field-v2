# AstralField v3.0 - System Architecture Documentation

## Project Overview

**AstralField v3.0** is a production-ready, AI-powered fantasy football platform built with modern web technologies. The system provides comprehensive league management, real-time scoring, AI-driven insights, and seamless user experience across all devices.

## Architecture Summary

### System Architecture Type
- **Hybrid Monorepo Architecture** with separated concerns
- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Backend**: Dual API approach (Next.js API routes + Express.js server)
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO for live features
- **Authentication**: NextAuth 5.0 with multiple providers

### Technology Stack Analysis

#### Frontend Stack
```
Next.js 14.0.0          - React framework with App Router
React 18.2.0            - UI library
TypeScript 5.3.3        - Type safety
Tailwind CSS 3.4.1     - Utility-first styling
Framer Motion 11.18.2   - Animations
Zustand 4.5.0           - State management
React Query 5.89.0      - Server state management
Socket.IO Client 4.8.1  - Real-time communication
```

#### Backend Stack
```
Express.js 4.18.2       - API server framework
Prisma 5.7.1           - Database ORM
PostgreSQL             - Primary database
Redis (IORedis 5.7.0)  - Caching and sessions
Socket.IO 4.8.1        - Real-time server
JWT (jsonwebtoken 9.0.2) - Authentication tokens
bcryptjs 2.4.3         - Password hashing
Pino 9.11.0            - Structured logging
```

#### Infrastructure & DevOps
```
Turbo Repo             - Monorepo management
Prisma                 - Database migrations
Jest 29.7.0            - Unit testing
Playwright 1.55.1      - E2E testing
ESLint + Prettier      - Code quality
GitHub Actions         - CI/CD pipeline
```

## Monorepo Structure

```
astral-field-v1/
├── apps/
│   ├── web/              # Next.js frontend application
│   └── api/              # Express.js API server
├── packages/
│   └── ui/               # Shared UI components
├── providers/
│   └── sleeper/          # External provider integrations
├── prisma/               # Database schema and migrations
├── scripts/              # Automation and deployment scripts
└── docs/                 # Documentation
```

### Apps Directory Breakdown

#### Web Application (apps/web/)
```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/          # Authentication routes
│   ├── api/             # Next.js API routes
│   ├── dashboard/       # Dashboard pages
│   ├── draft/           # Draft room interface
│   ├── players/         # Player management
│   └── layout.tsx       # Root layout
├── components/          # React components
│   ├── ui/              # Base UI components
│   ├── dashboard/       # Dashboard-specific components
│   ├── draft/           # Draft room components
│   ├── players/         # Player components
│   └── providers.tsx    # Context providers
├── lib/                 # Utilities and configurations
│   ├── auth.ts          # Authentication configuration
│   ├── prisma.ts        # Database client
│   └── utils.ts         # Helper functions
└── styles/
    └── globals.css      # Global styles
```

#### API Server (apps/api/)
```
src/
├── routes/              # API route handlers
│   ├── auth.ts          # Authentication endpoints
│   ├── ai.ts            # AI coaching endpoints
│   └── [feature].ts     # Feature-specific routes
├── middleware/          # Express middleware
│   ├── auth.ts          # JWT authentication
│   ├── validation.ts    # Request validation
│   ├── error.ts         # Error handling
│   └── logger.ts        # Request logging
├── services/            # Business logic
│   ├── ai-coach.ts      # AI recommendations
│   └── websocket.ts     # Real-time features
├── schemas/             # Validation schemas
└── server.ts            # Main server configuration
```

## Component Architecture

### Frontend Component Hierarchy

```
App Layout
├── Providers (Auth, Theme, Query)
├── Navigation
│   ├── Header
│   ├── Sidebar
│   └── Mobile Menu
├── Main Content
│   ├── Dashboard
│   │   ├── League Overview
│   │   ├── Team Stats
│   │   ├── Recent Activity
│   │   └── Quick Actions
│   ├── Draft Room
│   │   ├── Draft Board
│   │   ├── Player Queue
│   │   ├── Team Rosters
│   │   └── Timer/Controls
│   ├── Players
│   │   ├── Player Search
│   │   ├── Player List
│   │   ├── Player Details
│   │   └── Watchlist
│   └── Settings
│       ├── League Settings
│       ├── Team Settings
│       └── User Preferences
└── Toast Notifications
```

### Backend Service Architecture

```
Express Server
├── Security Layer
│   ├── Helmet (Security headers)
│   ├── CORS (Cross-origin requests)
│   ├── Rate Limiting
│   └── Input Validation
├── Authentication Layer
│   ├── JWT Verification
│   ├── Session Management (Redis)
│   ├── Role-based Access
│   └── Token Blacklisting
├── API Routes
│   ├── Auth Routes (/api/auth/*)
│   ├── League Routes (/api/leagues/*)
│   ├── Player Routes (/api/players/*)
│   ├── Draft Routes (/api/draft/*)
│   ├── AI Routes (/api/ai/*)
│   └── Admin Routes (/api/admin/*)
├── WebSocket Layer
│   ├── Real-time Chat
│   ├── Live Scoring Updates
│   ├── Draft Updates
│   └── Notifications
└── Data Layer
    ├── Prisma ORM
    ├── PostgreSQL Database
    ├── Redis Cache
    └── External APIs (ESPN)
```

## Data Flow Patterns

### Authentication Flow
```
1. User Login Request → NextAuth → Database Verification
2. JWT Token Generation → Redis Session Storage
3. Protected Route Access → JWT Verification → API Access
4. Token Refresh → Session Validation → New Token
```

### Real-time Data Flow
```
1. User Action → Frontend Event
2. Socket.IO Emission → Server Processing
3. Database Update → Real-time Broadcast
4. Client Reception → UI Update
```

### API Data Flow
```
1. Frontend Request → API Route
2. Authentication Middleware → Authorization Check
3. Validation Middleware → Request Processing
4. Business Logic → Database Operations
5. Response Formatting → Client Response
```

## Key Architectural Decisions

### 1. Hybrid API Approach
- **Next.js API Routes**: Authentication, simple CRUD operations
- **Express.js Server**: Complex business logic, real-time features
- **Reasoning**: Leverages Next.js simplicity while maintaining Express flexibility

### 2. Database Design
- **Single PostgreSQL Database**: Centralized data management
- **Prisma ORM**: Type-safe database access with migration support
- **Redis Cache**: Session storage and performance optimization

### 3. Authentication Strategy
- **NextAuth 5.0**: Industry-standard authentication
- **JWT + Redis Sessions**: Scalable session management
- **Role-based Access**: Granular permission control

### 4. Real-time Architecture
- **Socket.IO**: Bidirectional real-time communication
- **Event-driven Updates**: Efficient real-time data synchronization
- **Room-based Broadcasting**: Isolated league communications

### 5. State Management
- **React Query**: Server state management and caching
- **Zustand**: Client-side state management
- **Context Providers**: Shared application state

## Performance Optimizations

### Frontend Optimizations
- **Next.js App Router**: Automatic code splitting and optimization
- **Image Optimization**: Next.js built-in image optimization
- **Bundle Analysis**: Webpack optimization and tree shaking
- **Static Generation**: Pre-built pages for better performance

### Backend Optimizations
- **Database Indexing**: Strategic database indexes for query performance
- **Redis Caching**: Frequently accessed data caching
- **Connection Pooling**: Efficient database connection management
- **Rate Limiting**: API protection and resource management

### Real-time Optimizations
- **Room-based Events**: Targeted event broadcasting
- **Connection Management**: Efficient WebSocket connection handling
- **Message Queuing**: Reliable message delivery

## Security Architecture

### Frontend Security
- **Content Security Policy**: XSS protection
- **HTTPS Enforcement**: Secure data transmission
- **Input Sanitization**: Client-side validation
- **Secure Storage**: Safe token storage practices

### Backend Security
- **Helmet.js**: Security headers configuration
- **CORS Configuration**: Controlled cross-origin access
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Prisma ORM protection
- **Password Security**: bcrypt hashing with salt rounds
- **Session Security**: Redis-based session management
- **Rate Limiting**: API abuse prevention

### Authentication Security
- **JWT Security**: Secure token generation and validation
- **Session Management**: Redis-based session storage
- **Token Blacklisting**: Secure logout implementation
- **Password Policies**: Strong password requirements
- **Account Lockout**: Brute force protection

## Scalability Considerations

### Horizontal Scaling
- **Stateless API Design**: Easy horizontal scaling
- **Redis Clustering**: Distributed session management
- **Database Sharding**: Future database scaling options
- **Load Balancing**: Multiple instance support

### Vertical Scaling
- **Efficient Queries**: Optimized database operations
- **Memory Management**: Proper resource utilization
- **Connection Pooling**: Database connection optimization
- **Caching Strategy**: Reduced database load

## Monitoring and Observability

### Logging
- **Structured Logging**: Pino for JSON-structured logs
- **Request Logging**: Comprehensive API request tracking
- **Error Logging**: Centralized error collection
- **Performance Logging**: Response time and performance metrics

### Health Monitoring
- **Health Check Endpoints**: System status monitoring
- **Database Health**: Connection and query monitoring
- **External Service Health**: Third-party service status
- **Real-time Connection Health**: WebSocket connection monitoring

## Deployment Architecture

### Development Environment
- **Local Development**: Docker Compose setup
- **Hot Reloading**: Real-time development updates
- **Environment Variables**: Secure configuration management
- **Database Migrations**: Automated schema updates

### Production Environment
- **Containerization**: Docker-based deployment
- **CI/CD Pipeline**: Automated testing and deployment
- **Environment Separation**: Isolated production environment
- **Database Backup**: Automated backup strategies
- **Monitoring**: Production monitoring and alerting

## Future Architecture Considerations

### Microservices Migration
- **Service Decomposition**: Breaking down monolithic API
- **API Gateway**: Centralized API management
- **Inter-service Communication**: Service mesh implementation
- **Data Consistency**: Distributed transaction management

### Advanced Features
- **Machine Learning Pipeline**: Enhanced AI recommendations
- **Event Sourcing**: Audit trail and data recovery
- **GraphQL API**: Flexible data querying
- **Mobile Applications**: Native app development
- **Real-time Analytics**: Advanced analytics pipeline

---

*This architecture documentation provides a comprehensive overview of AstralField v3.0's system design, enabling developers to understand, maintain, and extend the platform effectively.*