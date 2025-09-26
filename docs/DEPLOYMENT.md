# AstralField v3.0 - Deployment Guide

## Overview

This comprehensive deployment guide covers all aspects of deploying AstralField v3.0 to production environments. The platform supports multiple deployment strategies and hosting providers, with detailed instructions for each approach.

## Deployment Architecture

AstralField v3.0 uses a **hybrid deployment architecture**:

- **Frontend**: Next.js application (Vercel, Netlify, or custom hosting)
- **API Server**: Express.js application (Railway, Render, AWS, or VPS)
- **Database**: PostgreSQL (Neon, Supabase, AWS RDS, or self-hosted)
- **Cache**: Redis (Upstash, Redis Cloud, or self-hosted)
- **CDN**: Vercel Edge Network, Cloudflare, or AWS CloudFront

## Quick Deployment Options

### Option 1: One-Click Vercel Deployment (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/astral-field-v1)

1. Click the deploy button above
2. Connect your GitHub account
3. Configure environment variables (see Environment Variables section)
4. Deploy!

### Option 2: Railway (Full-Stack)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/your-org/astral-field-v1)

### Option 3: Manual Deployment

Follow the detailed instructions below for custom deployment.

## Prerequisites

### Required Accounts & Services

```checklist
- [ ] GitHub account (for code repository)
- [ ] Hosting provider account (Vercel, Railway, etc.)
- [ ] Database provider account (Neon, Supabase, etc.)
- [ ] Redis provider account (Upstash, Redis Cloud, etc.)
- [ ] Domain name (optional but recommended)
- [ ] SSL certificate (automatic with most providers)
```

### Required Environment Variables

Create these environment variables in your hosting provider:

```env
# Database (Required)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Authentication (Required)
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-super-secret-key-minimum-32-characters-long"

# External APIs (Optional - has defaults)
ESPN_BASE_URL="https://site.api.espn.com/apis/site/v2/sports/football/nfl"

# Redis (Optional for basic functionality)
REDIS_URL="redis://user:password@host:6379"

# Feature Flags (Optional)
ENABLE_LIVE_SCORING="true"
ENABLE_AI_COACH="true"
ENABLE_REAL_TIME_CHAT="true"

# Production Settings
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Database Setup

### Option 1: Neon (Recommended)

Neon provides serverless PostgreSQL with automatic scaling and branching.

1. **Create Account**: Visit [neon.tech](https://neon.tech) and sign up
2. **Create Database**:
   ```bash
   # Create new project
   npx neon create-project astralfield-prod
   
   # Get connection string
   npx neon connection-string
   ```

3. **Configure Environment**:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/astralfield?sslmode=require"
   DIRECT_DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/astralfield?sslmode=require"
   ```

4. **Initialize Schema**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

### Option 2: Supabase

1. **Create Project**: Visit [supabase.com](https://supabase.com)
2. **Get Connection String**: Project Settings → Database
3. **Configure Environment**:
   ```env
   DATABASE_URL="postgresql://postgres:password@db.xyz.supabase.co:5432/postgres"
   ```

### Option 3: AWS RDS

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier astralfield-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username astralfield \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxx
```

## Frontend Deployment

### Vercel Deployment

#### Automatic Deployment

1. **Connect Repository**:
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Login and deploy
   vercel login
   vercel --prod
   ```

2. **Configure Build Settings**:
   ```json
   {
     "buildCommand": "npm run build:web",
     "outputDirectory": "apps/web/.next",
     "installCommand": "npm install",
     "devCommand": "npm run dev"
   }
   ```

3. **Environment Variables**:
   ```bash
   # Set via CLI
   vercel env add DATABASE_URL production
   vercel env add NEXTAUTH_SECRET production
   
   # Or via dashboard at vercel.com/dashboard
   ```

#### Manual Deployment

```bash
# Build application
npm run build:web

# Deploy to Vercel
cd apps/web
vercel --prod

# Configure domain (optional)
vercel domains add your-domain.com
```

### Netlify Deployment

1. **Build Configuration** (`netlify.toml`):
   ```toml
   [build]
     base = "apps/web"
     command = "npm run build"
     publish = ".next"
   
   [build.environment]
     NODE_VERSION = "18"
   
   [[redirects]]
     from = "/api/*"
     to = "https://your-api-domain.com/api/:splat"
     status = 200
   ```

2. **Deploy**:
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Build and deploy
   npm run build:web
   netlify deploy --prod --dir=apps/web/.next
   ```

### Self-Hosted Frontend

```dockerfile
# Dockerfile for frontend
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY apps/web ./apps/web
COPY packages ./packages
RUN npm run build:web

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t astralfield-frontend .
docker run -p 3000:3000 -e DATABASE_URL="..." astralfield-frontend
```

## Backend API Deployment

### Railway Deployment

1. **Create Service**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway link
   railway up
   ```

2. **Configure Service** (`railway.toml`):
   ```toml
   [build]
     builder = "nixpacks"
     buildCommand = "npm run build:api"
   
   [deploy]
     startCommand = "npm run start:api"
     healthcheckPath = "/api/health"
     healthcheckTimeout = 100
     restartPolicyType = "always"
   ```

### Render Deployment

1. **Create Web Service**:
   - Connect GitHub repository
   - Set build command: `npm run build:api`
   - Set start command: `npm run start:api`
   - Set environment variables

2. **Health Check**:
   ```json
   {
     "healthCheckPath": "/api/health",
     "port": 3001
   }
   ```

### AWS ECS Deployment

```dockerfile
# Dockerfile for API
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY apps/api ./apps/api
COPY prisma ./prisma
RUN npm run build:api
RUN npm run db:generate

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NODE_ENV=production
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Digital Ocean App Platform

```yaml
# .do/app.yaml
name: astralfield-api
services:
- name: api
  source_dir: /
  github:
    repo: your-org/astral-field-v1
    branch: main
  run_command: npm run start:api
  build_command: npm run build:api
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: DATABASE_URL
    value: ${DATABASE_URL}
  - key: NODE_ENV
    value: production
  health_check:
    http_path: /api/health
  http_port: 3001
```

## Redis Setup

### Option 1: Upstash (Recommended)

1. **Create Database**: Visit [upstash.com](https://upstash.com)
2. **Get Connection String**: Database → Details
3. **Configure Environment**:
   ```env
   REDIS_URL="rediss://user:password@host:6380"
   ```

### Option 2: Redis Cloud

```bash
# Get connection details from Redis Cloud dashboard
REDIS_URL="redis://user:password@host:port"
```

### Option 3: Self-Hosted Redis

```yaml
# docker-compose.redis.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --requirepass your-secure-password

volumes:
  redis_data:
```

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file or set in your hosting provider:

```env
# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-super-secret-key-minimum-32-characters-long"

# Redis (Optional)
REDIS_URL="redis://user:password@host:6379"

# External APIs
ESPN_BASE_URL="https://site.api.espn.com/apis/site/v2/sports/football/nfl"

# Feature Flags
ENABLE_LIVE_SCORING="true"
ENABLE_AI_COACH="true"
ENABLE_REAL_TIME_CHAT="true"

# Performance
DATABASE_POOL_SIZE="10"
REDIS_POOL_SIZE="5"
API_RATE_LIMIT="100"

# Monitoring
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
LOG_LEVEL="info"

# Security
CORS_ORIGIN="https://your-domain.com"
JWT_EXPIRY="7d"
SESSION_TIMEOUT="24h"
```

### Environment Variable Security

```bash
# Use strong secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
uuidgen                  # For database passwords

# Validate environment
npm run validate:env
```

## SSL and Domain Configuration

### Custom Domain Setup

1. **Add Domain to Hosting Provider**:
   ```bash
   # Vercel
   vercel domains add your-domain.com
   
   # Railway
   railway domain create your-domain.com
   ```

2. **Configure DNS**:
   ```dns
   # For Vercel
   CNAME www.your-domain.com cname.vercel-dns.com
   A your-domain.com 76.76.19.61
   
   # For Railway
   CNAME your-domain.com your-app.railway.app
   ```

3. **SSL Certificate**: Automatic with most providers

### Cloudflare Setup (Optional)

```bash
# Configure Cloudflare for additional security and performance
1. Add domain to Cloudflare
2. Update nameservers
3. Enable proxy (orange cloud)
4. Configure SSL/TLS: Full (strict)
5. Enable security features (WAF, DDoS protection)
```

## Database Migrations

### Production Migration Strategy

```bash
# 1. Backup current database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# 2. Run migrations
npm run db:migrate:prod

# 3. Verify migration
npm run db:validate

# 4. Seed production data (if needed)
npm run db:seed:prod
```

### Zero-Downtime Migrations

```bash
# Use Prisma's migration strategy
npx prisma migrate deploy

# For complex migrations, use blue-green deployment
1. Deploy new version to staging environment
2. Run migration on copy of production database
3. Test thoroughly
4. Switch traffic to new environment
5. Remove old environment
```

## Monitoring and Logging

### Health Checks

```typescript
// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      external: await checkExternalAPIs(),
    },
  }
  
  const isHealthy = Object.values(health.checks).every(Boolean)
  res.status(isHealthy ? 200 : 503).json(health)
})
```

### Error Monitoring

```bash
# Install Sentry
npm install @sentry/node @sentry/nextjs

# Configure Sentry
SENTRY_DSN="https://your-dsn@sentry.io/project-id"
```

### Performance Monitoring

```typescript
// Add performance monitoring
import { logger } from './lib/logger'

app.use((req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
    })
  })
  
  next()
})
```

## Backup and Disaster Recovery

### Database Backups

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="astralfield_backup_$DATE.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress and upload to S3
gzip $BACKUP_FILE
aws s3 cp $BACKUP_FILE.gz s3://your-backup-bucket/

# Cleanup local file
rm $BACKUP_FILE.gz

# Keep only last 30 days of backups
aws s3 ls s3://your-backup-bucket/ | grep backup | sort | head -n -30 | awk '{print $4}' | xargs -I {} aws s3 rm s3://your-backup-bucket/{}
```

### Disaster Recovery Plan

1. **Data Recovery**:
   ```bash
   # Restore from backup
   gunzip astralfield_backup_YYYYMMDD.sql.gz
   psql $DATABASE_URL < astralfield_backup_YYYYMMDD.sql
   ```

2. **Service Recovery**:
   ```bash
   # Redeploy services
   vercel --prod                    # Frontend
   railway up                       # API
   docker-compose up -d             # Self-hosted
   ```

3. **DNS Failover**: Configure DNS to point to backup infrastructure

## Performance Optimization

### Production Build Optimization

```json
// next.config.js
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
}
```

### Database Optimization

```sql
-- Create indexes for frequently queried fields
CREATE INDEX CONCURRENTLY idx_players_position_status ON players(position, status);
CREATE INDEX CONCURRENTLY idx_roster_team_starter ON roster_players(teamId, isStarter);
CREATE INDEX CONCURRENTLY idx_matchups_league_week ON matchups(leagueId, week);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM players WHERE position = 'QB' AND status = 'active';
```

### CDN Configuration

```yaml
# Cloudflare Workers or similar
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Cache static assets for 1 year
  if (request.url.includes('/static/')) {
    const response = await fetch(request)
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return new Response(response.body, { ...response, headers })
  }
  
  return fetch(request)
}
```

## Security Configuration

### Production Security Headers

```typescript
// Add security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}))
```

### Firewall Configuration

```bash
# Configure UFW (Ubuntu Firewall)
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Or use cloud provider security groups
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test
      - run: npm run typecheck
      - run: npm run lint

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: railway/cli@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          command: 'deploy'
```

### Deployment Validation

```bash
# Post-deployment validation script
#!/bin/bash

echo "Validating deployment..."

# Check health endpoints
curl -f https://your-domain.com/api/health || exit 1
curl -f https://your-api-domain.com/api/health || exit 1

# Run smoke tests
npm run test:smoke

# Check error rates
curl -f https://your-domain.com/api/metrics/errors || exit 1

echo "Deployment validation successful!"
```

## Troubleshooting Common Issues

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection limits
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Fix connection pool issues
export DATABASE_POOL_SIZE=5
```

### Memory Issues

```bash
# Check memory usage
free -h
docker stats

# Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=1024"
```

### SSL Certificate Issues

```bash
# Check certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Verify certificate chain
curl -I https://your-domain.com
```

## Rollback Procedures

### Quick Rollback

```bash
# Vercel rollback
vercel rollback https://your-domain.com

# Railway rollback
railway rollback

# Database rollback
psql $DATABASE_URL < backup-previous.sql
```

### Blue-Green Deployment Rollback

```bash
# Switch traffic back to previous environment
1. Update DNS records
2. Monitor error rates
3. Verify functionality
4. Cleanup new environment if stable
```

---

*This deployment guide provides comprehensive instructions for deploying AstralField v3.0 to production environments, ensuring a reliable, secure, and performant fantasy football platform.*