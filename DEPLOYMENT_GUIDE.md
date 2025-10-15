# 🚀 AstralField v3.0 - Production Deployment Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon, Supabase, or self-hosted)
- Auth0 account (free tier available)
- Vercel account (recommended) or alternative hosting

## Step 1: Database Setup

### Option A: Neon (Recommended)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Add to `.env.local`:
```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

### Option B: Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings > Database
4. Copy connection string (use "Connection pooling" for DATABASE_URL)
5. Add to `.env.local`

## Step 2: Authentication Setup

### Auth0 Configuration

1. Create account at [auth0.com](https://auth0.com)
2. Create new application (Regular Web Application)
3. Configure settings:
   - **Allowed Callback URLs**: `https://yourdomain.com/api/auth/callback/auth0`
   - **Allowed Logout URLs**: `https://yourdomain.com`
   - **Allowed Web Origins**: `https://yourdomain.com`

4. Copy credentials to `.env.local`:
```env
AUTH0_DOMAIN="your-domain.auth0.com"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_CLIENT_SECRET="your-client-secret"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

## Step 3: Environment Variables

Create `.env.local` with all required variables:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_DATABASE_URL="postgresql://..."

# Auth
AUTH0_DOMAIN="..."
AUTH0_CLIENT_ID="..."
AUTH0_CLIENT_SECRET="..."
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="..."

# Application
NODE_ENV="production"
```

## Step 4: Database Migration

Run Prisma migrations:

```bash
cd apps/web
npx prisma generate
npx prisma db push
```

## Step 5: Deploy to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual Deploy

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

4. Add environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all variables from `.env.local`

## Step 6: Post-Deployment

### Verify Deployment

1. Check health endpoint: `https://yourdomain.com/api/health`
2. Test authentication flow
3. Create test league
4. Verify all features work

### Monitor Application

1. Check Vercel logs for errors
2. Monitor database connections
3. Test API endpoints
4. Verify real-time features

## Step 7: Custom Domain (Optional)

1. Go to Vercel Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `NEXTAUTH_URL` environment variable

## Troubleshooting

### Build Fails

- Check Node.js version (18+)
- Verify all dependencies installed
- Check TypeScript errors: `npm run typecheck`

### Database Connection Issues

- Verify connection string format
- Check SSL mode requirement
- Test connection with Prisma Studio: `npx prisma studio`

### Authentication Not Working

- Verify Auth0 callback URLs match deployment URL
- Check NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches deployment URL

### Performance Issues

- Enable caching in Vercel
- Check database query performance
- Monitor API response times

## Production Checklist

- [ ] Database configured and migrated
- [ ] Auth0 configured with production URLs
- [ ] All environment variables set
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Health check endpoint responding
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Test all critical user flows

## Rollback Plan

If issues occur:

1. Revert to previous deployment in Vercel
2. Check error logs
3. Fix issues locally
4. Test thoroughly
5. Redeploy

## Support

- Documentation: `/docs`
- GitHub Issues: [Report Issue](https://github.com/yourusername/astralfield/issues)
- Email: support@astralfield.com

## Next Steps

After successful deployment:

1. Monitor for 24 hours
2. Gather user feedback
3. Implement analytics
4. Set up automated backups
5. Configure CI/CD pipeline
