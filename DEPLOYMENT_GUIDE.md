# 🚀 AstralField Deployment Guide

Complete deployment automation system for the AstralField Fantasy Football Platform.

## 🎯 Quick Start

### One-Command Deployment
```bash
# Complete deployment with all features
./deploy.sh

# Skip optional steps
./deploy.sh --skip-tests --skip-github

# See what would be executed
./deploy.sh --dry-run
```

## 📋 Prerequisites

- Node.js 18+ installed
- npm package manager
- Git version control
- `.env.local` file with required environment variables
- Vercel account (for deployment)
- GitHub account (for repository hosting)

## 🔧 Environment Variables Required

Create a `.env.local` file with:

```env
# Database Configuration
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Authentication (Auth0)
AUTH0_DOMAIN="your-domain.auth0.com"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_CLIENT_SECRET="your-client-secret"
AUTH0_AUDIENCE="your-api-identifier"
NEXTAUTH_SECRET="your-nextauth-secret"

# ESPN API (Optional - defaults provided)
ESPN_BASE_URL="https://site.api.espn.com/apis/site/v2/sports/football/nfl"
ESPN_FANTASY_URL="https://fantasy.espn.com/apis/v3/games/ffl"

# Feature Flags (Optional)
ENABLE_LIVE_SCORING="true"
ENABLE_NEWS_FEED="true"
ENABLE_PLAYER_SYNC="true"
```

## 🏗️ Deployment System Architecture

### Master Deployment Script (`deploy.sh`)
- **Orchestrates** the entire deployment process
- **Validates** prerequisites and environment
- **Coordinates** all sub-systems
- **Provides** comprehensive logging and error handling

### Individual Components

#### 1. GitHub Repository Setup (`scripts/setup-github.sh`)
- Creates comprehensive `.gitignore`
- Generates project `README.md`
- Sets up `.env.example` template
- Configures Git attributes
- Initializes repository and pushes to GitHub

#### 2. Vercel Deployment (`scripts/deploy-vercel.sh`)
- Manages environment variables in Vercel
- Performs local build validation
- Deploys to production
- Updates deployment URLs automatically
- Runs basic health checks

#### 3. Deployment Monitoring (`scripts/monitor-deployment.js`)
- **Real-time monitoring** of deployment progress
- **Comprehensive health checks** across all endpoints
- **End-to-end testing** of critical functionality
- **Automatic diagnostics** on failure
- **Performance validation**

#### 4. Auto-Fix System (`scripts/fix-build.js`)
- **TypeScript error resolution**
- **Missing dependency detection**
- **Prisma client regeneration**
- **Environment variable validation**
- **Cache cleanup and optimization**

#### 5. Health Monitoring (`/api/monitoring/health`)
- **Database connectivity** testing
- **ESPN API integration** validation
- **Authentication system** checks
- **Memory and system** monitoring
- **Environment configuration** verification

#### 6. CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
- **Automated quality checks** (TypeScript, ESLint)
- **Security scanning** (npm audit, secrets detection)
- **Multi-environment deployment** (staging/production)
- **Health validation** post-deployment
- **Automatic rollback** on failure

## 🔄 Deployment Process Flow

```mermaid
graph TD
    A[Prerequisites Check] --> B[Install Dependencies]
    B --> C[Database Setup]
    C --> D[Build & Test]
    D --> E[GitHub Setup]
    E --> F[Vercel Deployment]
    F --> G[Health Monitoring]
    G --> H[Cleanup & Finalize]
    H --> I[Summary Report]
    
    F --> J[Auto-Monitor]
    J --> K{Health OK?}
    K -->|Yes| L[Success]
    K -->|No| M[Auto-Fix]
    M --> N[Retry Deployment]
```

## 📊 Monitoring & Health Checks

### Automated Health Checks
- **Main Application** - Homepage loading and React hydration
- **API Endpoints** - ESPN integration, authentication, player data
- **Database** - Connection, query performance, data integrity
- **Authentication** - Auth0 configuration, JWT token generation
- **System Health** - Memory usage, process uptime, environment variables

### Real-time Monitoring
```bash
# Check deployment status
curl https://your-app.vercel.app/api/health

# Comprehensive monitoring
curl https://your-app.vercel.app/api/monitoring/health
```

### Performance Benchmarks
- **Homepage load time**: < 3 seconds
- **API response time**: < 1 second
- **Health check response**: < 500ms
- **Database queries**: < 200ms average

## 🚨 Troubleshooting & Auto-Fixes

### Common Issues & Solutions

#### Build Failures
- **Auto-detected**: TypeScript errors, missing dependencies
- **Auto-fixed**: Dependency installation, type generation
- **Manual fix**: `node scripts/fix-build.js`

#### Environment Variables
- **Auto-detected**: Missing required variables
- **Auto-fixed**: Template generation, Vercel sync
- **Manual fix**: Update `.env.local` and redeploy

#### Database Issues
- **Auto-detected**: Connection failures, schema mismatches
- **Auto-fixed**: Schema push, client regeneration
- **Manual fix**: `npx prisma db push`

#### Deployment Timeouts
- **Auto-detected**: Vercel deployment hanging
- **Auto-fixed**: Retry with optimized build
- **Manual fix**: `vercel --prod --yes`

### Debug Commands
```bash
# View deployment logs
vercel logs

# Inspect current deployment
vercel inspect

# Check environment variables
vercel env ls

# Local development
npm run dev

# Manual health check
node scripts/monitor-deployment.js https://your-app.vercel.app
```

## 🎯 Production Validation

### Automatic Validation Steps
1. **Application Loading** - Homepage renders correctly
2. **API Functionality** - All endpoints respond appropriately
3. **Database Integration** - Data queries execute successfully
4. **Authentication Flow** - Login/logout processes work
5. **ESPN Integration** - Live data fetching operational
6. **Performance Metrics** - Response times within thresholds

### Manual Validation Checklist
- [ ] Visit application homepage
- [ ] Test user authentication
- [ ] Verify fantasy league data
- [ ] Check player statistics
- [ ] Confirm real-time scoring
- [ ] Test mobile responsiveness

## 📈 Performance Optimization

### Caching Strategy
- **API responses**: 5-minute cache for ESPN data
- **Player data**: Daily sync with smart caching
- **Static assets**: CDN delivery via Vercel
- **Database queries**: Connection pooling and optimization

### Monitoring Integration
- **Vercel Analytics**: Built-in performance monitoring
- **Health endpoints**: Custom application monitoring
- **Error tracking**: Comprehensive logging system
- **Performance budgets**: Automated performance validation

## 🔐 Security Features

### Automated Security Checks
- **Dependency scanning**: npm audit integration
- **Secret detection**: Pattern-based scanning
- **Environment isolation**: Separate staging/production
- **Authentication validation**: Auth0 configuration verification

### Security Headers
- **CSP**: Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME sniffing protection

## 📚 Additional Resources

### Scripts Reference
- `deploy.sh` - Master deployment orchestrator
- `scripts/setup-github.sh` - Repository initialization
- `scripts/deploy-vercel.sh` - Vercel deployment automation
- `scripts/monitor-deployment.js` - Real-time monitoring
- `scripts/fix-build.js` - Automatic issue resolution

### API Endpoints
- `/api/health` - Basic health check
- `/api/monitoring/health` - Comprehensive health monitoring
- `/api/espn/scoreboard` - ESPN scoreboard integration
- `/api/auth/test-login` - Test authentication system

### Configuration Files
- `vercel.json` - Vercel deployment configuration
- `.github/workflows/ci-cd.yml` - GitHub Actions pipeline
- `next.config.js` - Next.js application configuration
- `prisma/schema.prisma` - Database schema definition

---

## 🎉 Success Metrics

A successful deployment includes:
- ✅ **Zero build errors**
- ✅ **All health checks passing**
- ✅ **Sub-3-second page loads**
- ✅ **Real-time ESPN data integration**
- ✅ **Functional authentication system**
- ✅ **Comprehensive monitoring active**

For support or issues, check the deployment logs or run the monitoring script for detailed diagnostics.