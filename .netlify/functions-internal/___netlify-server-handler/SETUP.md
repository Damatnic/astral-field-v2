# 🚀 AstralField v2.1 - Quick Setup Guide

This guide will get your AstralField Fantasy Football Platform running in under 10 minutes.

## 📋 Prerequisites

- Node.js 18+ installed
- Git installed
- Vercel account (for deployment)
- Auth0 account (for authentication)

## ⚡ Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/astral-field-v2.1.git
cd astral-field-v2.1
npm install
```

### 2. Environment Setup
Copy the environment template:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials (see `ENVIRONMENT_VARIABLES_GUIDE.md` for details).

### 3. Database Setup
```bash
# Initialize database
npx prisma db push

# Seed with sample data (optional)
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see your app running!

## 🔗 Essential Documentation

- **[Environment Variables Guide](ENVIRONMENT_VARIABLES_GUIDE.md)** - Complete environment setup
- **[Sentry Setup](SENTRY_SETUP_COMPLETE.md)** - Error tracking configuration
- **[Production Readiness Checklist](PRODUCTION_READINESS_CHECKLIST.md)** - Pre-launch requirements
- **[README.md](README.md)** - Comprehensive project documentation

## 🚀 Production Deployment

1. **Configure Environment Variables** - Follow `ENVIRONMENT_VARIABLES_GUIDE.md`
2. **Set up Error Tracking** - Follow `SENTRY_SETUP_COMPLETE.md` 
3. **Deploy to Vercel**:
   ```bash
   npx vercel --prod
   ```
4. **Run Database Migration**:
   ```bash
   npx prisma db push
   ```

## 🆘 Need Help?

- Check existing documentation files
- Review error logs in development console
- Verify environment variables are correctly set
- Ensure database connection is working

## ✅ Success Indicators

- ✅ App loads at `http://localhost:3000`
- ✅ Authentication works (login/logout)
- ✅ Database queries execute successfully
- ✅ No console errors in browser
- ✅ Build completes without errors (`npm run build`)

**Time to setup**: ~10 minutes  
**Time to production**: ~30 minutes (including service configuration)