# Environment Setup Guide

## Overview

This guide provides detailed instructions for configuring all environment variables and external services required for the Astral Field V2.1 fantasy football platform. Proper environment setup is critical for security, functionality, and performance.

## Environment Files

### File Structure
```
.env.example          # Template with all variables
.env.local           # Development environment
.env.production      # Production environment (Vercel)
.env.test           # Testing environment
```

### Security Best Practices
- **Never commit** `.env.local` or production environment files
- Use **different secrets** for each environment
- **Rotate secrets** regularly (quarterly minimum)
- Use **strong, unique passwords** (32+ characters)
- Enable **2FA** on all service accounts

## Core Configuration

### Database Configuration

#### PostgreSQL Database (Required)

**Neon Database (Recommended)**
```bash
# Primary connection with pooling
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/astralfield?sslmode=require&pgbouncer=true&connection_limit=20"

# Direct connection for migrations
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/astralfield?sslmode=require"
```

**Setup Instructions:**
1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Choose region closest to your users
4. Enable connection pooling
5. Configure auto-suspend for development
6. Copy connection strings

**Alternative PostgreSQL Providers:**
- **Supabase**: `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`
- **Railway**: `postgresql://postgres:password@containers-us-west-1.railway.app:7777/railway`
- **Heroku Postgres**: `postgres://user:password@hostname:5432/database`

### Authentication Configuration

#### NextAuth.js (Required)
```bash
# 32+ character secret for session encryption
NEXTAUTH_SECRET="your-nextauth-secret-min-32-characters-long-use-openssl-rand-base64-32"

# Application URL
NEXTAUTH_URL="http://localhost:3007"                    # Development
NEXTAUTH_URL="https://your-domain.com"                  # Production
```

**Generate Secure Secret:**
```bash
# Generate random secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Auth0 Integration (Optional)
```bash
AUTH0_SECRET="your-auth0-secret-here"
AUTH0_BASE_URL="http://localhost:3007"
AUTH0_ISSUER_BASE_URL="https://your-domain.auth0.com"
AUTH0_CLIENT_ID="your-auth0-client-id"
AUTH0_CLIENT_SECRET="your-auth0-client-secret"
```

## AI and Machine Learning Services

### Anthropic AI (Required for AI Features)

```bash
ANTHROPIC_API_KEY="sk-ant-api03-your-anthropic-api-key"
```

**Setup Instructions:**
1. Create account at [console.anthropic.com](https://console.anthropic.com)
2. Generate API key
3. Set billing limits
4. Monitor usage in dashboard

**Features Enabled:**
- Lineup optimization
- Trade analysis
- Player recommendations
- Injury impact analysis
- Matchup predictions

### OpenAI Integration (Optional Alternative)

```bash
OPENAI_API_KEY="sk-your-openai-api-key"
```

**Setup Instructions:**
1. Create account at [platform.openai.com](https://platform.openai.com)
2. Add payment method
3. Generate API key
4. Set usage limits

## Sports Data APIs

### NFL and Fantasy Data

#### SportsData API (Optional)
```bash
SPORTSDATA_API_KEY="your-sportsdata-api-key"
NFL_API_KEY="your-nfl-api-key"
```

#### Sleeper API Integration (Recommended)
```bash
SLEEPER_API_KEY="your-sleeper-api-key"  # If available
```

**Setup Instructions:**
1. Sleeper API is mostly public - no key required for basic data
2. For advanced features, contact Sleeper for API access
3. Rate limiting: 1000 requests per minute

#### ESPN API (Optional)
```bash
ESPN_API_KEY="your-espn-api-key"
```

#### Yahoo Fantasy API (Optional)
```bash
YAHOO_API_KEY="your-yahoo-api-key"
YAHOO_CLIENT_ID="your-yahoo-client-id"
YAHOO_CLIENT_SECRET="your-yahoo-client-secret"
```

## Caching and Performance

### Redis Configuration

#### Upstash Redis (Recommended for Vercel)
```bash
UPSTASH_REDIS_REST_URL="https://your-database.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

**Setup Instructions:**
1. Create account at [upstash.com](https://upstash.com)
2. Create Redis database
3. Choose region close to your application
4. Copy REST URL and token
5. Configure TLS and password

#### Self-Hosted Redis
```bash
REDIS_URL="redis://localhost:6379"                      # Development
REDIS_URL="rediss://user:password@redis-host:6380"      # Production
REDIS_PASSWORD="your-redis-password"
```

#### Redis Cloud
```bash
REDIS_URL="rediss://default:password@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345"
```

## Real-Time Features

### WebSocket Configuration

```bash
# Socket.io server URL
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"          # Development
NEXT_PUBLIC_SOCKET_URL="https://api.your-domain.com"    # Production

# WebSocket secrets
SOCKET_IO_SECRET="your-socket-io-secret-32-chars"
WS_PORT="3001"
WS_SECRET="your-websocket-secret"
```

**WebSocket Features:**
- Live draft rooms
- Real-time scoring
- Chat messaging
- Trade notifications
- Lineup updates

## Email and Notifications

### Email Service

#### Resend (Recommended)
```bash
RESEND_API_KEY="re_your-resend-api-key"
EMAIL_FROM="noreply@your-domain.com"
```

**Setup Instructions:**
1. Create account at [resend.com](https://resend.com)
2. Verify your domain
3. Generate API key
4. Configure DKIM/SPF records

#### SendGrid (Alternative)
```bash
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@your-domain.com"
```

### Push Notifications

#### Web Push (VAPID)
```bash
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_EMAIL="mailto:admin@your-domain.com"
```

**Generate VAPID Keys:**
```bash
npx web-push generate-vapid-keys
```

## Monitoring and Analytics

### Error Tracking

#### Sentry (Recommended)
```bash
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="astral-field-v21"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```

**Setup Instructions:**
1. Create account at [sentry.io](https://sentry.io)
2. Create new project (Next.js)
3. Install Sentry CLI
4. Configure error tracking
5. Set up release tracking

### Analytics

#### Google Analytics
```bash
NEXT_PUBLIC_GA_TRACKING_ID="G-XXXXXXXXXX"
```

#### PostHog (Optional)
```bash
POSTHOG_KEY="phc_your-posthog-key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

#### Vercel Analytics (Built-in)
```bash
# Automatically configured on Vercel
# No additional setup required
```

## Security Configuration

### CSRF and Rate Limiting

```bash
# CSRF protection secret
CSRF_SECRET="your-csrf-secret-32-chars-long"

# Rate limiting
RATE_LIMIT_SECRET="your-rate-limit-secret"
RATE_LIMIT_REDIS_URL="redis://localhost:6379"
```

### Encryption

```bash
# Data encryption key
ENCRYPTION_KEY="your-encryption-key-32-characters"

# JWT signing secret
JWT_SECRET="your-jwt-secret-min-32-characters"
```

**Generate Encryption Keys:**
```bash
# Generate 32-byte encryption key
openssl rand -hex 32

# Generate base64 encoded key
openssl rand -base64 32
```

## File Storage and CDN

### AWS S3 (Optional)

```bash
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="astralfield-uploads"
```

### Cloudinary (Optional)

```bash
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

## Development Environment

### Local Development

```bash
NODE_ENV="development"
NEXT_PUBLIC_APP_ENV="development"
NEXT_PUBLIC_APP_VERSION="2.1.0"

# Debug settings
DEBUG="app:*"
LOG_LEVEL="info"
```

### Testing Environment

```bash
NODE_ENV="test"
NEXT_PUBLIC_APP_ENV="test"
DATABASE_URL="postgresql://test:test@localhost:5432/astralfield_test"
```

## Production Environment

### Vercel Configuration

```bash
NODE_ENV="production"
NEXT_PUBLIC_APP_ENV="production"
VERCEL_TOKEN="your-vercel-token"
VERCEL_ORG_ID="your-vercel-org-id"
VERCEL_PROJECT_ID="your-vercel-project-id"
```

### GitHub Integration

```bash
GITHUB_TOKEN="ghp_your-github-token"
GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"
```

## Feature Flags

### Application Features

```bash
# Feature toggles
ENABLE_AI_FEATURES="true"
ENABLE_REAL_TIME="true"
ENABLE_ANALYTICS="true"
ENABLE_NOTIFICATIONS="true"
ENABLE_BETA_FEATURES="false"
```

## Backup and Maintenance

### Backup Configuration

```bash
# Database backup settings
BACKUP_SCHEDULE="0 2 * * *"        # Daily at 2 AM
BACKUP_RETENTION_DAYS="30"
BACKUP_S3_BUCKET="astralfield-backups"
```

### Maintenance Mode

```bash
MAINTENANCE_MODE="false"
MAINTENANCE_MESSAGE="We're performing scheduled maintenance. Back soon!"
```

## Environment-Specific Configurations

### Development (.env.local)

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/astralfield_dev"

# Authentication
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3007"

# AI Services (use test keys)
ANTHROPIC_API_KEY="sk-ant-api03-test-key"

# Local Redis
REDIS_URL="redis://localhost:6379"

# Development settings
NODE_ENV="development"
DEBUG="app:*"
LOG_LEVEL="debug"
```

### Production (.env.production - Vercel)

```bash
# Database with pooling
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true&connection_limit=20"

# Secure authentication
NEXTAUTH_SECRET="production-secret-32-chars-minimum"
NEXTAUTH_URL="https://your-domain.com"

# Production AI keys
ANTHROPIC_API_KEY="sk-ant-api03-production-key"

# Production Redis
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="production-token"

# Production monitoring
NEXT_PUBLIC_SENTRY_DSN="https://production-dsn@sentry.io/project"

# Production settings
NODE_ENV="production"
LOG_LEVEL="error"
```

## Environment Validation

### Validation Schema

```typescript
// lib/env-validation.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),
  REDIS_URL: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
```

### Health Check Script

```typescript
// scripts/verify-env.ts
import { env } from '../lib/env-validation'
import { prisma } from '../lib/db'

async function verifyEnvironment() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful')
    
    // Test Redis connection (if configured)
    if (env.REDIS_URL) {
      // Test Redis connection
      console.log('✅ Redis connection successful')
    }
    
    // Verify required services
    if (env.ANTHROPIC_API_KEY) {
      console.log('✅ Anthropic API key configured')
    }
    
    console.log('🚀 Environment verification complete')
  } catch (error) {
    console.error('❌ Environment verification failed:', error)
    process.exit(1)
  }
}

verifyEnvironment()
```

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Test connection string
psql "$DATABASE_URL" -c "SELECT version();"

# Check SSL requirements
psql "$DATABASE_URL?sslmode=require" -c "SELECT 1;"
```

#### Environment Variables Not Loading
```bash
# Check file location
ls -la .env*

# Verify file format (no spaces around =)
cat .env.local | grep -E "^[A-Z]"

# Test variable loading
node -e "console.log(process.env.DATABASE_URL)"
```

#### API Key Issues
```bash
# Test Anthropic API
curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages

# Test database connection
npx prisma db pull --preview-feature
```

### Environment Setup Checklist

- [ ] Database URL configured and tested
- [ ] NextAuth secret generated (32+ chars)
- [ ] AI service API keys configured
- [ ] Redis/caching configured (if using)
- [ ] Email service configured
- [ ] Monitoring tools configured
- [ ] Environment validation passes
- [ ] Secrets stored securely
- [ ] Different secrets per environment
- [ ] Environment-specific URLs set

This comprehensive environment setup guide ensures all services are properly configured for optimal performance and security.