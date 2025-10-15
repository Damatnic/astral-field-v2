# 🚀 Quick Start - Production Deployment

## 5-Minute Setup

### 1. Clone & Install (1 min)
```bash
git clone <your-repo>
cd ASTRAL_FIELD_V1
npm install
```

### 2. Database Setup (2 min)
```bash
# Create Neon database at neon.tech (free)
# Copy connection string

# Add to apps/web/.env.local:
DATABASE_URL="postgresql://..."
DIRECT_DATABASE_URL="postgresql://..."

# Run migrations
cd apps/web
npx prisma db push
```

### 3. Auth Setup (1 min)
```bash
# Create Auth0 app at auth0.com (free)
# Add to apps/web/.env.local:
AUTH0_DOMAIN="your-domain.auth0.com"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_CLIENT_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3007"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
```

### 4. Deploy (1 min)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Add environment variables in Vercel dashboard
```

## Test Locally First

```bash
cd apps/web
npm run dev
# Visit http://localhost:3007
```

## Verify Deployment

1. Health check: `https://your-app.vercel.app/api/health`
2. Test login
3. Create test league

## Need Help?

- Full guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Checklist: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
