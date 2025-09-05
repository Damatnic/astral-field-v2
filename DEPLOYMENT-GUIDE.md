# 🚀 Astral Field - Production Deployment Guide

This guide provides comprehensive instructions for deploying Astral Field to Vercel with optimal performance and reliability.

## 📋 Quick Start

### Automated Deployment (Recommended)
```bash
# Deploy to preview environment
npm run deploy

# Deploy to production
npm run deploy:prod
```

The automated script handles:
- ✅ Dependency installation
- ✅ Code quality checks
- ✅ Production build
- ✅ Vercel deployment
- ✅ Database initialization
- ✅ Health checks

## 🔧 Manual Setup

### 1. Prerequisites
- [Vercel CLI](https://vercel.com/cli) installed: `npm i -g vercel`
- GitHub repository connected to Vercel
- Neon database with connection string

### 2. Environment Variables
Set these in your Vercel dashboard:

#### Required
```bash
DATABASE_URL=your_neon_connection_string
NODE_ENV=production
```

#### Optional (for full functionality)
```bash
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_SPORTSDATA_API_KEY=your_sportsdata_key
SPORTSDATA_SECRET_KEY=your_sportsdata_secret
ADMIN_SETUP_KEY=your_admin_key  # defaults to 'astral2025'
DEBUG_KEY=your_debug_key        # defaults to 'astral2025'
```

### 3. Deploy
```bash
# Login to Vercel (first time only)
vercel login

# Deploy to production
vercel --prod

# Or deploy to preview
vercel
```

### 4. Initialize Database
After deployment, run:
```bash
curl -X POST https://your-app.vercel.app/api/setup-users \
  -H "Authorization: Bearer astral2025"
```

## 🔍 Health Monitoring

### Health Check Endpoint
```bash
# Check application health
curl https://your-app.vercel.app/api/health
```

Response format:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 1234.5,
  "responseTime": "45ms",
  "checks": {
    "database": "pass",
    "environment": "pass"
  }
}
```

### Automated Monitoring
- Health checks run every 12 hours via Vercel Cron
- Failed health checks are logged for debugging
- Database connectivity is verified on each check

## 📊 Performance Optimizations

### Build Optimizations
- **Turbopack**: Enabled for faster builds and development
- **Package Optimization**: Key packages are pre-optimized
- **Bundle Splitting**: Vendors separated for better caching
- **Console Removal**: Console logs removed in production
- **Tree Shaking**: Unused code eliminated automatically

### Runtime Optimizations
- **Serverless Functions**: 30s timeout, 1GB memory
- **Database Connection Pooling**: Optimized for serverless
- **Image Optimization**: AVIF and WebP formats
- **Response Caching**: Appropriate cache headers

### Database Performance
- **Connection Pooling**: Max 3 connections, no idle connections
- **Query Timeout**: 5s timeout for cold starts
- **Automatic Cleanup**: Connections closed after idle timeout
- **Error Recovery**: Automatic retry with backoff

## 🛠 Development Scripts

```bash
# Local development
npm run dev

# Type checking
npm run type-check

# Environment validation
npm run validate:env

# Local database setup
npm run db:setup

# Health check
npm run health

# Build analysis
npm run build:analyze
```

## 🔒 Security Features

### Headers
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: origin-when-cross-origin

### Authentication
- **Secure Password Hashing**: bcrypt with salt rounds
- **Environment-based Access**: Admin endpoints protected
- **Rate Limiting**: Built into API endpoints

### Database Security
- **SSL Connections**: Required for production
- **Connection Timeouts**: Prevent hanging connections
- **Error Sanitization**: Sensitive data not exposed

## 📝 Logging & Debugging

### Log Levels
- **Development**: All logs with pretty printing
- **Production**: Structured JSON logs (INFO and above)

### Log Categories
- **API Requests**: Method, URL, status, duration
- **Database Queries**: Query time and errors
- **Authentication**: Login/logout events
- **Error Boundary**: React error catches
- **Health Checks**: System status monitoring

### Accessing Logs
```bash
# View Vercel function logs
vercel logs your-deployment-url

# Real-time logs during development
vercel dev
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check TypeScript errors
npm run type-check

# Check linting issues
npm run lint

# Validate environment
npm run validate:env
```

#### Database Connection Issues
```bash
# Test connection locally
npm run health

# Check environment variables in Vercel dashboard
# Ensure DATABASE_URL is set correctly
```

#### Authentication Problems
```bash
# Reset demo users
curl -X POST https://your-app.vercel.app/api/setup-users \
  -H "Authorization: Bearer astral2025"

# Test login endpoint
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nicholas.damato@astralfield.com","password":"astral2025"}'
```

### Getting Help
1. Check Vercel deployment logs
2. Verify all environment variables
3. Test API endpoints manually
4. Check database connectivity
5. Review error logs in Vercel dashboard

## 🎯 Production Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Build passes without errors
- [ ] Type checking passes
- [ ] Tests pass (if implemented)
- [ ] Health endpoint responds correctly
- [ ] Authentication works with demo accounts
- [ ] Security headers configured
- [ ] Performance monitoring enabled

## 📈 Post-Deployment

After successful deployment:

1. **Verify Health**: Check `/api/health` endpoint
2. **Test Authentication**: Login with demo credentials
3. **Monitor Logs**: Watch for errors in Vercel dashboard
4. **Performance Check**: Monitor response times
5. **Database Setup**: Ensure all demo users created

## 🔄 CI/CD Integration

For automated deployments, the deployment script can be integrated with:

- **GitHub Actions**: Trigger on push to main branch
- **Vercel Git Integration**: Automatic deployments
- **Custom Webhooks**: External deployment triggers

Example GitHub Action:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run deploy:prod
```

---

## 🎉 Success!

Your Astral Field application is now deployed and optimized for production use!

**Demo Credentials:**
- Email: `nicholas.damato@astralfield.com`
- Password: `astral2025`

**Useful Links:**
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Neon Database](https://neon.tech/docs)