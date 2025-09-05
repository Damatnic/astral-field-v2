# 🚀 Astral Field - Vercel Deployment Guide

This guide will help you deploy your fantasy football app to Vercel with full database functionality.

## Why Vercel Over Netlify?

- ✅ **Built for Next.js**: Native support for Next.js applications
- ✅ **Better Database Integration**: Seamless connection to PostgreSQL/Neon
- ✅ **Serverless Optimized**: Handles API routes and database connections perfectly
- ✅ **Environment Variables**: Much simpler to configure
- ✅ **Auto GitHub Deployment**: Automatic deployments on every push

## 📋 Prerequisites

- GitHub repository with your code (✅ Already done)
- Neon database (✅ Already set up)
- Vercel account (free)

## 🎯 Step-by-Step Deployment

### 1. Create Vercel Account
- Go to [vercel.com](https://vercel.com)
- Sign up with your GitHub account
- This will automatically connect your GitHub repositories

### 2. Import Your Project
- Click **"New Project"** in Vercel dashboard
- Find and select **"astral-field-v2"** repository
- Vercel will auto-detect it's a Next.js project

### 3. Configure Environment Variables
**IMPORTANT:** Add these in Vercel's environment variable settings:

```bash
# Database (REQUIRED) - Use your Neon connection string
DATABASE_URL=your_neon_database_connection_string_here

# AI APIs (Use your existing keys from .env.local)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here  
GEMINI_API_KEY=your_gemini_api_key_here

# Sports Data (Use your existing keys from .env.local)
NEXT_PUBLIC_SPORTSDATA_API_KEY=your_sportsdata_api_key_here
SPORTSDATA_SECRET_KEY=your_sportsdata_secret_key_here

# Debug (Optional - for troubleshooting)
DEBUG_KEY=astral2025
```

### 4. Deploy
- Click **"Deploy"**
- Vercel will build and deploy your app automatically
- First deployment takes 2-3 minutes

### 5. Test Your App
Once deployed, test with these credentials:
- **Email:** `nicholas.damato@astralfield.com`
- **Password:** `astral2025`

## 🔧 Troubleshooting

If login still doesn't work, visit these debug endpoints:

1. **Check Database Connection:**
   ```
   GET https://your-vercel-app.vercel.app/api/debug/users
   ```

2. **Test Login Function:**
   ```
   POST https://your-vercel-app.vercel.app/api/debug/login
   Content-Type: application/json
   
   {
     "email": "nicholas.damato@astralfield.com",
     "password": "astral2025"
   }
   ```

## 📊 What Makes This Better

| Feature | Netlify | Vercel |
|---------|---------|---------|
| Next.js Support | Basic | Native ⭐ |
| Database Connections | Complex | Simple ⭐ |
| API Routes | Limited | Full Support ⭐ |
| Environment Variables | Complex naming | Standard ⭐ |
| Serverless Functions | 10s timeout | 30s timeout ⭐ |
| Build Speed | Slower | Faster ⭐ |

## 🎉 Success!

Once deployed, your fantasy football app will have:
- ✅ Working authentication with all demo accounts
- ✅ Full database functionality
- ✅ All API endpoints working
- ✅ Automatic deployments on every GitHub push
- ✅ Professional hosting with global CDN

## 🔗 Useful Links

- **Vercel Dashboard:** [vercel.com/dashboard](https://vercel.com/dashboard)
- **Deployment Logs:** Available in your Vercel project dashboard
- **Domain Settings:** Configure custom domain in project settings