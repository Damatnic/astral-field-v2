# 🐛 Signin 500 Error - Debugging Guide

## Current Status
- ✅ Dev server running on port 3001
- ✅ Signin page loads (200 OK)
- ❌ 500 error occurs when clicking signin

## What to Check

### 1. Open Browser Console
When you visit http://localhost:3001/auth/signin, open Developer Tools (F12) and check:

```
Console Tab:
- Look for red error messages
- Check for "Failed to load resource" errors
- Look for JavaScript errors

Network Tab:
- Look for failed requests (red)
- Check which endpoint returns 500
- Look at the response body for error details
```

### 2. Check Terminal Output
In the terminal where `npm run dev` is running, look for error messages when you click signin. Common errors:

```bash
# Prisma errors
Error: PrismaClientValidationError

# NextAuth errors  
Error: AUTH_SECRET must be at least 32 characters

# Database errors
Error: Cannot find module './apps/web/prisma/dev.db'
```

### 3. Test Each Action Separately

#### Test 1: Click "Quick Select" Button
- Does the button work?
- Do you see the 10 player cards?
- Or does it immediately throw 500?

#### Test 2: Click a Player Card
- Can you click a player?
- Does it try to login?
- Where does the 500 happen?

#### Test 3: Manual Signin Form
- Enter email: nicholas@damato-dynasty.com
- Enter password: Dynasty2025!
- Click "Sign In"
- Where does the 500 happen?

## Common Issues & Fixes

### Issue 1: AUTH_SECRET Missing
**Symptoms:** "AUTH_SECRET must be at least 32 characters" in terminal

**Fix:**
```bash
# Create .env file in root directory
echo 'AUTH_SECRET="DuiQzmVW0XNnLPtS/FTZCYDiq9pnYxw2UqoPNmorLtE="' > .env
echo 'NEXTAUTH_SECRET="DuiQzmVW0XNnLPtS/FTZCYDiq9pnYxw2UqoPNmorLtE="' >> .env
echo 'DATABASE_URL="file:./apps/web/prisma/dev.db"' >> .env

# Restart dev server
cd apps/web
npm run dev
```

### Issue 2: Database Not Found
**Symptoms:** "Cannot find database" or Prisma errors

**Fix:**
```bash
# Check if database exists
ls apps/web/prisma/dev.db

# If not, seed it
npx tsx scripts/seed-comprehensive-fantasy-football.ts
```

### Issue 3: NextAuth Session Error
**Symptoms:** "Session callback error" in terminal

**Fix:** Check that auth-config.ts is using correct field names (ownerId vs userId)

### Issue 4: Missing Dependencies
**Symptoms:** "Cannot find module" errors

**Fix:**
```bash
cd apps/web
npm install
```

## Quick Diagnostic Commands

```bash
# 1. Check if AUTH_SECRET is set
cat .env | grep AUTH_SECRET

# 2. Check if database exists
ls -la apps/web/prisma/dev.db

# 3. Verify users in database
npx tsx scripts/verify-league-login.ts

# 4. Test NextAuth endpoint
curl http://localhost:3001/api/auth/providers

# 5. Rebuild if needed
cd apps/web
npm run build
```

## What to Tell Me

When reporting the error, please provide:

1. **Browser Console Error:**
   - Screenshot or copy/paste the red error message
   
2. **Terminal Error:**
   - What error appears in the terminal when you click signin?
   
3. **Which Action Fails:**
   - Clicking "Quick Select" button?
   - Clicking a player card?
   - Submitting signin form?
   
4. **Network Tab:**
   - Which API endpoint returns 500?
   - What's in the response body?

## Test Right Now

1. Open: http://localhost:3001/auth/signin
2. Open Developer Tools (F12)
3. Go to Console tab
4. Click "Quick Select" button
5. **Tell me: What error shows in console?**

OR

1. Click any player card
2. **Tell me: What error shows in console/terminal?**

