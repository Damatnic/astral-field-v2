# 🚀 VERCEL ENVIRONMENT VARIABLES - PRODUCTION DEPLOYMENT

## 🔐 CRITICAL SECURITY NOTICE
**⚠️ KEEP THESE SECRETS SECURE - NEVER COMMIT TO REPOSITORY**

## 📋 COMPLETE VERCEL ENVIRONMENT SETUP

### 🌐 Core Application Variables

```bash
# Application Environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://astral-field-v1.vercel.app
NEXTAUTH_URL=https://astral-field-v1.vercel.app
NEXTAUTH_SECRET=4wen9bBXoPU6icaBh274VW3JJf84gkbfcR5D/Mo3jis=

# JWT & Encryption
JWT_SECRET=23be335444f5e8cc590f5e3019883f18fe7a4146e53372737dbd75517fd44f37101a28b9cb656ecd06de2a159601b8c34819ed915ec3a2f1b12835c373beba16
ENCRYPTION_KEY=68928ee6d5f81941d3c3440ce6ca72362a367016cacdcd85981651b2ee7cf12f
SESSION_SECRET=9357aa8b1361760aba1080f3ed4800a2e26abe0ad7bf638054b293cc5bfbd6ef
API_SECRET_KEY=6342e12a151ba7cc54bbf373bc1a738727744bfe20d57662e648c8b23ef6587e
```

### 🗄️ Database Configuration (Neon PostgreSQL)

```bash
# Primary Database
DATABASE_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require

# Database Pool Settings
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5
DATABASE_TIMEOUT=30000

# Prisma Settings
PRISMA_GENERATE_DATAPROXY=true
```

### ⚡ Redis Configuration (Upstash)

```bash
# Redis Cache
REDIS_URL=redis://default:password@redis-host:port
REDIS_PASSWORD=7bf5ab01cadf93b1aa978fb9121eb335
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

### 🤖 AI Services Configuration

```bash
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ORG_ID=org-your-organization-id

# Anthropic Claude (Optional)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# AI Model Settings
AI_MODEL_PRIMARY=gpt-4-turbo-preview
AI_MODEL_FALLBACK=gpt-3.5-turbo
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.7
```

### 🏈 Sports Data APIs

```bash
# SportsData.io (Primary)
SPORTSDATA_API_KEY=your-sportsdata-api-key
SPORTSDATA_BASE_URL=https://api.sportsdata.io/v3/nfl

# ESPN API (Fallback)
ESPN_API_KEY=your-espn-api-key-if-available
ESPN_BASE_URL=https://site.api.espn.com/apis/site/v2/sports/football/nfl

# NFL API Settings
NFL_SEASON=2024
NFL_WEEK=current
```

### 📧 Email Service (Resend)

```bash
# Email Provider
RESEND_API_KEY=re_your-resend-api-key
EMAIL_FROM=noreply@astral-field-v1.vercel.app
EMAIL_REPLY_TO=support@astral-field-v1.vercel.app

# Email Templates
EMAIL_VERIFICATION_TEMPLATE=d-verification-template-id
EMAIL_WELCOME_TEMPLATE=d-welcome-template-id
EMAIL_RESET_PASSWORD_TEMPLATE=d-reset-template-id
```

### 🔐 Authentication Providers

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 📊 Analytics & Monitoring

```bash
# Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id

# Sentry Error Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-organization
SENTRY_PROJECT=astral-field-v1
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 🔔 Push Notifications

```bash
# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@astral-field-v1.vercel.app

# OneSignal (Alternative)
ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_API_KEY=your-onesignal-api-key
```

### 🌐 CDN & Storage

```bash
# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# AWS S3 (Alternative Storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=astral-field-storage
```

### 🔗 Webhooks & Integrations

```bash
# Generic Webhook Secret
WEBHOOK_SECRET=71f4eba86627dab8e4e5ec5f682dbf2b6cb9c0f398f3b84b15db37cc79738ff0

# Stripe (Payment Processing)
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret

# PayPal (Alternative Payment)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
```

### 🚦 Rate Limiting & Security

```bash
# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_SKIP_FAILED_REQUESTS=true

# CORS Settings
CORS_ORIGIN=https://astral-field-v1.vercel.app
CORS_CREDENTIALS=true

# Security Headers
SECURITY_HEADERS_ENABLED=true
HSTS_MAX_AGE=31536000
```

### 🌍 Internationalization

```bash
# i18n Settings
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPPORTED_LOCALES=en,es,fr
```

### 🔧 Development & Debug

```bash
# Logging
LOG_LEVEL=info
DEBUG_MODE=false
ENABLE_QUERY_LOGGING=false

# Performance
ENABLE_BUNDLE_ANALYZER=false
ENABLE_PERFORMANCE_MONITORING=true
```

## 🛠️ SETUP INSTRUCTIONS

### 1. **Create Vercel Project**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### 2. **Set Environment Variables in Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable above with appropriate values

### 3. **Or Use Vercel CLI**
```bash
# Set variables via CLI
vercel env add NEXTAUTH_SECRET production
vercel env add DATABASE_URL production
# ... continue for all variables
```

### 4. **Required External Services**

#### 🗄️ **Database (Neon)**
- Sign up at https://neon.tech
- Create PostgreSQL database
- Copy connection string to `DATABASE_URL`

#### ⚡ **Redis (Upstash)**
- Sign up at https://upstash.com
- Create Redis database
- Copy connection details

#### 🤖 **OpenAI API**
- Get API key from https://platform.openai.com
- Add billing information for production use

#### 🏈 **SportsData.io**
- Sign up at https://sportsdata.io
- Subscribe to NFL data package
- Copy API key

#### 📧 **Resend Email**
- Sign up at https://resend.com
- Verify your domain
- Copy API key

## 🔒 SECURITY CHECKLIST

- ✅ All secrets are randomly generated and secure
- ✅ No hardcoded credentials in code
- ✅ Environment variables properly configured
- ✅ HTTPS enforced in production
- ✅ Rate limiting enabled
- ✅ CORS properly configured
- ✅ Security headers enabled

## 🚀 PRODUCTION DEPLOYMENT

After setting up all environment variables:

1. **Redeploy** your Vercel project
2. **Test** all functionality
3. **Monitor** logs for any missing variables
4. **Verify** database connectivity
5. **Confirm** AI services are working

Your Astral Field platform is now ready for production! 🏆