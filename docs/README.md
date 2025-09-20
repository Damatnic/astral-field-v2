# Astral Field V2.1 - Fantasy Football Platform

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Documentation Index](#documentation-index)
- [Quick Reference](#quick-reference)
- [Support](#support)

## Overview

Astral Field V2.1 is a comprehensive fantasy football platform built with Next.js 13, providing real-time scoring, advanced analytics, AI-powered insights, and a complete league management system. The platform supports dynasty leagues, FAAB waivers, trade analysis, and live draft functionality.

### Key Features

- **Real-time Scoring & Live Updates** - Socket.io powered live game tracking
- **AI-Powered Insights** - Anthropic AI integration for lineup optimization and trade analysis
- **Advanced Analytics** - Performance metrics, trend analysis, and predictive modeling
- **Draft Management** - Live draft rooms with snake/linear/auction formats
- **Trade Center** - Advanced trade analyzer with AI-powered valuations
- **Waiver System** - FAAB and priority-based waiver claims
- **Mobile-First Design** - Responsive UI optimized for all devices
- **Dynasty League Support** - Multi-year league management
- **Social Features** - Chat, trash talk, and league activity feeds

### Technology Stack

- **Frontend**: Next.js 13, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Real-time**: Socket.io, WebSockets
- **Authentication**: Custom session-based auth with bcrypt
- **AI/ML**: Anthropic Claude API, OpenAI integration
- **Caching**: Redis, Upstash Redis
- **Deployment**: Vercel, Neon Database
- **Monitoring**: Sentry, Vercel Analytics
- **Testing**: Jest, Playwright, Testing Library

## Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Database      │
│   Next.js 13    │◄──►│   Next.js API   │◄──►│   PostgreSQL    │
│   React 18      │    │   Routes        │    │   Prisma ORM    │
│   TypeScript    │    │   Middleware    │    │   Neon Cloud    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Real-time     │    │   External APIs │    │   Caching       │
│   Socket.io     │    │   Sleeper API   │    │   Redis         │
│   WebSockets    │    │   Sports Data   │    │   Upstash       │
│   Live Updates  │    │   AI Services   │    │   In-Memory     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Modules

1. **Authentication & Authorization** (`/src/lib/auth.ts`)
   - Session-based authentication
   - Role-based access control (Admin, Commissioner, Player)
   - Password hashing with bcrypt

2. **Database Layer** (`/prisma/schema.prisma`)
   - 25+ models covering all fantasy football entities
   - Optimized indexes for performance
   - Relationship management

3. **API Layer** (`/src/app/api/`)
   - RESTful API endpoints
   - Real-time WebSocket handlers
   - External service integrations

4. **UI Components** (`/src/components/`)
   - Modular component architecture
   - Responsive design system
   - Accessibility features

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Redis instance (optional, for caching)
- Environment variables configured

### Quick Setup

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd astral-field-v2.1
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   - Open http://localhost:3007
   - Login with seeded user credentials

## Documentation Index

### Technical Documentation
- [Architecture Overview](./technical/architecture.md) - System design and components
- [API Documentation](./technical/api-reference.md) - Complete API endpoint reference
- [Database Schema](./technical/database-schema.md) - Database design and relationships
- [Authentication Guide](./technical/authentication.md) - Auth flows and security

### Deployment & Operations
- [Deployment Guide](./deployment/deployment-guide.md) - Production deployment instructions
- [Environment Setup](./deployment/environment-setup.md) - Configuration and variables
- [Performance Optimization](./deployment/performance.md) - Scaling and optimization
- [Monitoring & Alerts](./deployment/monitoring.md) - Error tracking and analytics

### Developer Resources
- [Getting Started](./developer/getting-started.md) - Developer onboarding
- [Code Guidelines](./developer/code-guidelines.md) - Standards and best practices
- [Testing Strategy](./developer/testing.md) - Test setup and execution
- [Troubleshooting](./developer/troubleshooting.md) - Common issues and solutions

### User Documentation
- [User Guide](./user/user-guide.md) - Platform features and usage
- [Admin Guide](./user/admin-guide.md) - Administrative functions
- [Mobile App Guide](./user/mobile-guide.md) - Mobile-specific features
- [FAQ](./user/faq.md) - Frequently asked questions

### Operations & Maintenance
- [Operations Manual](./operations/operations-manual.md) - System maintenance procedures
- [Backup & Recovery](./operations/backup-recovery.md) - Data protection strategies
- [Security Guidelines](./operations/security.md) - Security best practices
- [Scaling Guide](./operations/scaling.md) - Growth and performance planning

## Quick Reference

### Default Users (Development)
```
Admin: admin@damato.com
Commissioner: commissioner@damato.com  
Player: player@damato.com
Password: Available in seeded data
```

### Key Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run test suite
npm run db:seed      # Seed database
npm run prisma:push  # Update database schema
```

### Important URLs
```
Application: http://localhost:3007
API Docs: http://localhost:3007/api/docs
Health Check: http://localhost:3007/api/health
```

### Environment Variables
Key variables for development:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Session encryption key
- `ANTHROPIC_API_KEY` - AI service integration
- `REDIS_URL` - Caching service (optional)

## Support

### Getting Help
- Check [Troubleshooting Guide](./developer/troubleshooting.md)
- Review [FAQ](./user/faq.md)
- Examine error logs in development console
- Check database connectivity and migrations

### Contributing
- Follow [Code Guidelines](./developer/code-guidelines.md)
- Run test suite before submitting changes
- Update documentation for new features
- Follow semantic versioning for releases

---

**Version**: 2.1.0  
**Last Updated**: September 2024  
**License**: Private/Proprietary  
**Maintainer**: D'Amato Development Team