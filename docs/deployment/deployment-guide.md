# Deployment Guide

## Overview

This guide covers deploying Astral Field V2.1 to production environments, with primary focus on Vercel deployment and Neon Database. The platform is designed as a serverless application with automatic scaling capabilities.

## Prerequisites

### Required Accounts
- **Vercel Account** - For hosting and deployment
- **Neon Database** - PostgreSQL database hosting
- **GitHub Account** - Source code repository
- **Upstash Account** - Redis caching (optional)
- **Anthropic Account** - AI services API key
- **Resend Account** - Email service (optional)
- **Sentry Account** - Error monitoring (optional)

### Local Development Setup
- Node.js 18+ installed
- Git configured
- Environment variables configured
- Database seeded and tested

## Vercel Deployment

### 1. Initial Setup

#### Connect GitHub Repository
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
vercel link
```

#### Project Configuration
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm ci",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ]
}
```

### 2. Environment Variables

#### Production Environment Setup
Set these environment variables in Vercel dashboard:

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/astralfield_prod?sslmode=require&pgbouncer=true&connection_limit=20"
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/astralfield_prod?sslmode=require"

# Authentication
NEXTAUTH_SECRET="your-production-secret-min-32-characters-long"
NEXTAUTH_URL="https://your-domain.com"

# AI Services
ANTHROPIC_API_KEY="your-anthropic-api-key"

# External APIs
SLEEPER_API_KEY="your-sleeper-api-key"

# Caching (Optional)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"

# Analytics
NEXT_PUBLIC_GA_TRACKING_ID="G-XXXXXXXXXX"

# Email Service
RESEND_API_KEY="your-resend-api-key"

# Application Settings
NODE_ENV="production"
NEXT_PUBLIC_APP_ENV="production"
NEXT_PUBLIC_APP_VERSION="2.1.0"
```

#### Environment Variable Security
```bash
# Use Vercel CLI to add secrets
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add ANTHROPIC_API_KEY production

# Pull environment variables locally
vercel env pull .env.local
```

### 3. Database Setup

#### Neon Database Configuration

1. **Create Neon Project**
   ```bash
   # Via Neon Console
   # 1. Create new project
   # 2. Choose region closest to users
   # 3. Configure connection pooling
   # 4. Enable auto-suspend for cost optimization
   ```

2. **Database Migration**
   ```bash
   # Set production database URL
   export DATABASE_URL="your-production-database-url"
   
   # Generate Prisma client
   npx prisma generate
   
   # Deploy database schema
   npx prisma migrate deploy
   
   # Seed production database
   npx prisma db seed
   ```

3. **Connection Pooling Setup**
   ```typescript
   // lib/db.ts - Production configuration
   import { PrismaClient } from '@prisma/client'
   
   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined
   }
   
   export const prisma = globalForPrisma.prisma ?? new PrismaClient({
     log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
   })
   
   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
   ```

### 4. Deployment Process

#### Automatic Deployment
```bash
# Deploy to production
git add .
git commit -m "Production deployment"
git push origin main

# Vercel automatically deploys from main branch
```

#### Manual Deployment
```bash
# Deploy current directory
vercel --prod

# Deploy specific branch
vercel --prod --git-branch=production
```

#### Preview Deployments
```bash
# Create preview deployment
vercel

# Deploy specific branch as preview
git push origin feature-branch
# Automatically creates preview URL
```

### 5. Domain Configuration

#### Custom Domain Setup
```bash
# Add domain via Vercel CLI
vercel domains add your-domain.com

# Or via Vercel Dashboard:
# 1. Go to project settings
# 2. Add custom domain
# 3. Configure DNS records
```

#### DNS Configuration
```dns
# A Record
@ 76.76.19.61

# CNAME Record  
www your-domain.vercel.app

# For subdomain
api your-domain.vercel.app
```

#### SSL Certificate
- Automatically provisioned by Vercel
- Includes www and root domain
- Auto-renewal enabled

## Alternative Deployment Options

### AWS Deployment

#### Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize application
eb init astral-field-v2

# Create environment
eb create production

# Deploy
eb deploy
```

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Self-Hosted Deployment

#### PM2 Process Manager
```bash
# Install PM2 globally
npm install pm2 -g

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'astral-field',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/astral-field',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup auto-start
pm2 startup
```

#### Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/astral-field
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Performance Optimization

### Build Optimization

#### Next.js Configuration
```javascript
// next.config.js - Production optimizations
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  images: {
    domains: ['sleeper.app', 'sleepercdn.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 604800,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    return config
  },
}
```

#### Bundle Analysis
```bash
# Analyze bundle size
npm install --save-dev @next/bundle-analyzer

# Add to package.json
"analyze": "ANALYZE=true next build"

# Run analysis
npm run analyze
```

### Database Optimization

#### Connection Pooling
```typescript
// Optimal connection pool settings
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${process.env.DATABASE_URL}?pgbouncer=true&connection_limit=20`,
    },
  },
})
```

#### Query Optimization
```typescript
// Use database indexes effectively
const teams = await prisma.team.findMany({
  where: {
    leagueId,
    // Use indexed fields for filtering
  },
  include: {
    owner: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
  },
  orderBy: {
    pointsFor: 'desc', // Index on pointsFor for sorting
  },
})
```

### Caching Strategy

#### Redis Configuration
```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache implementation
export async function getCachedData<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  try {
    const cached = await redis.get(key)
    if (cached) return cached as T
    
    const data = await fetchFunction()
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
    return data
  } catch (error) {
    // Fallback to direct fetch on cache error
    return fetchFunction()
  }
}
```

## Monitoring and Observability

### Health Checks

#### Application Health Endpoint
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    // Database connectivity
    prisma.$queryRaw`SELECT 1`,
    
    // Redis connectivity (if configured)
    redis?.ping(),
    
    // External API health
    fetch('https://api.sleeper.app/v1/state/nfl'),
  ])
  
  const isHealthy = checks.every(check => check.status === 'fulfilled')
  
  return Response.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      database: checks[0].status,
      cache: checks[1]?.status || 'disabled',
      external_api: checks[2].status,
    },
  }, {
    status: isHealthy ? 200 : 503,
  })
}
```

### Error Monitoring

#### Sentry Integration
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out client-side noise
    if (event.exception) {
      const error = event.exception.values?.[0]
      if (error?.type === 'ChunkLoadError') {
        return null
      }
    }
    return event
  },
})
```

### Performance Monitoring

#### Vercel Analytics
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

## Security Configuration

### Headers and CORS

#### Security Headers
```typescript
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  return response
}
```

### Environment Security

#### Secret Management
```bash
# Use environment variables for all secrets
# Never commit secrets to version control
# Rotate secrets regularly
# Use different secrets per environment

# Vercel secret management
vercel env add SECRET_NAME production < secret.txt
```

## Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Check build logs
vercel logs

# Local build test
npm run build

# TypeScript errors
npm run type-check
```

#### Database Connection Issues
```bash
# Test database connection
npx prisma db push --preview-feature

# Check connection string format
echo $DATABASE_URL

# Verify SSL requirements
psql "$DATABASE_URL" -c "SELECT version();"
```

#### Performance Issues
```bash
# Monitor function execution time
vercel logs --follow

# Check database query performance
# Enable Prisma query logging
```

### Rollback Procedures

#### Quick Rollback
```bash
# Rollback to previous deployment
vercel rollback

# Rollback to specific deployment
vercel rollback <deployment-url>
```

#### Database Rollback
```bash
# Rollback database migration
npx prisma migrate resolve --rolled-back <migration-name>

# Restore from backup
pg_restore -d $DATABASE_URL backup_file.sql
```

## Maintenance

### Regular Updates
- Monitor dependency vulnerabilities
- Update Node.js and npm versions
- Keep Prisma and Next.js updated
- Review and rotate secrets

### Backup Strategy
- Database: Daily automated backups
- Code: Git repository with multiple remotes
- Environment: Document all configurations
- Media: Regular backup of uploaded assets

This deployment guide provides comprehensive instructions for deploying Astral Field V2.1 to production with optimal performance, security, and reliability.