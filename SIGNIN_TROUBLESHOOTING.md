# 🔧 Signin Page Troubleshooting

## Issue
User is getting errors when trying to access the signin page.

## Root Cause Analysis

The signin page requires NextAuth to be properly configured with:
1. `AUTH_SECRET` or `NEXTAUTH_SECRET` environment variable (minimum 32 characters)
2. `DATABASE_URL` for Prisma client
3. Proper NextAuth handlers at `/api/auth/[...nextauth]`

## What's Already Set Up

### ✅ Local Development
- `.env` file exists with AUTH_SECRET
- Prisma client generated successfully
- Database seeded with 10 D'Amato Dynasty users

### ✅ Code Files
- `/apps/web/src/lib/auth.ts` - Main auth export
- `/apps/web/src/lib/auth-config.ts` - Auth configuration
- `/apps/web/src/app/api/auth/[...nextauth]/route.ts` - NextAuth API handler
- `/apps/web/src/app/auth/signin/page.tsx` - Signin page with Quick Select

## Required Environment Variables

### Production (Vercel)
These need to be set in Vercel dashboard:

```bash
# Required
AUTH_SECRET="[32+ character secret]"
NEXTAUTH_SECRET="[same as AUTH_SECRET]"
NEXTAUTH_URL="https://astral-field.vercel.app"
DATABASE_URL="[production database URL]"

# Recommended
AUTH_TRUST_HOST="true"
NODE_ENV="production"
```

### Local Development (.env)
```bash
DATABASE_URL="file:./apps/web/prisma/dev.db"
AUTH_SECRET="DuiQzmVW0XNnLPtS/FTZCYDiq9pnYxw2UqoPNmorLtE="
NEXTAUTH_SECRET="DuiQzmVW0XNnLPtS/FTZCYDiq9pnYxw2UqoPNmorLtE="
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
NODE_ENV="development"
```

## Fixing the Signin Page

### Option 1: Set Vercel Environment Variables
1. Go to https://vercel.com/[your-project]/settings/environment-variables
2. Add `AUTH_SECRET` with a secure 32+ character string
3. Add `NEXTAUTH_SECRET` (same value as AUTH_SECRET)
4. Add `NEXTAUTH_URL` = `https://astral-field.vercel.app`
5. Add `AUTH_TRUST_HOST` = `true`
6. Redeploy the application

### Option 2: Test Locally First
```bash
# Start local dev server
cd apps/web
npm run dev

# Visit http://localhost:3000/auth/signin
# Should see Quick Select page with 10 players
```

## Expected Behavior

### Signin Page Should Show:
1. "Quick Select" button in top right
2. Click it to see 10 D'Amato Dynasty player cards
3. Each card shows:
   - Player name
   - Team name
   - Colorful gradient avatar
   - Trophy or Crown icon
4. Click any player → instant login → redirect to dashboard

### What You Should NOT See:
- 500 errors
- "AUTH_SECRET" error messages
- Blank pages
- Authentication failures

## Testing Checklist

- [ ] Local signin works (`http://localhost:3000/auth/signin`)
- [ ] Quick Select button visible
- [ ] 10 player cards display
- [ ] Can click any player and login
- [ ] Redirects to dashboard after login
- [ ] Dashboard shows user's team
- [ ] Production signin works (`https://astral-field.vercel.app/auth/signin`)

## Common Errors & Solutions

### Error: "AUTH_SECRET must be at least 32 characters"
**Solution:** Set AUTH_SECRET environment variable in Vercel

### Error: "Cannot find module '@/lib/auth'"
**Solution:** Restart dev server or rebuild

### Error: "prisma.user.findUnique() - Unknown field"
**Solution:** Run `npx prisma generate` to regenerate client

### Error: "Database file not found"
**Solution:** Run seed script: `npx tsx scripts/seed-comprehensive-fantasy-football.ts`

## Quick Test Commands

```bash
# Test local signin
cd apps/web
npm run dev
# Visit http://localhost:3000/auth/signin

# Verify database
npx tsx scripts/verify-league-login.ts

# Rebuild if needed
npm run build
```

## Status
- **Local Development:** ✅ Should work (DATABASE_URL and AUTH_SECRET set)
- **Production (Vercel):** ⚠️  Need to verify environment variables are set

## Next Steps
1. Test local signin page
2. If local works, set Vercel environment variables
3. Redeploy to production
4. Test production signin page

