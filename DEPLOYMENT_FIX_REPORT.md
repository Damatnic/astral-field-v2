# Vercel Deployment Fix

## Issues Found
1. **CSP Font Blocking**: Perplexity font `https://r2cdn.perplexity.ai/fonts/FKGroteskNeue.woff2` blocked by CSP
2. **404 Errors**: Missing CSP report endpoint and other routing issues
3. **Deployment Configuration**: Potential monorepo build issues

## Fixes Applied

### 1. Enhanced CSP Configuration
- **File**: `apps/web/src/middleware.ts`
- **Changes**: 
  - Added `https://r2cdn.perplexity.ai` to `font-src` directive
  - Added comprehensive font source support including Google Fonts
  - Enhanced development vs production CSP policies
  - Improved CSP violation handling

### 2. Enhanced CSP Report Endpoint
- **File**: `apps/web/src/app/api/security/csp-report/route.ts`
- **Changes**:
  - Added `dynamic = 'force-dynamic'` for Edge Runtime compatibility
  - Enhanced content-type handling for different CSP report formats
  - Improved error logging and violation detail extraction
  - Better error handling and response formatting

### 3. Deployment Configuration Verification
- **File**: `vercel.json`
- **Status**: ✅ Correctly configured for monorepo (`apps/web`)
- **Build Command**: ✅ Points to web app correctly

## Deployment Steps

1. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Fix CSP font blocking and enhance security headers"
   git push
   ```

2. **Verify Deployment**:
   - Check Vercel dashboard for successful build
   - Monitor CSP violation reports
   - Test font loading in production

3. **Clear Browser Cache**:
   - Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
   - Clear site data in DevTools
   - Test in incognito/private mode

## Expected Results

- ✅ Perplexity fonts load without CSP violations
- ✅ CSP report endpoint responds correctly (200/405 instead of 404)
- ✅ Enhanced security headers in production
- ✅ Better CSP violation monitoring and debugging

## Monitoring

After deployment, monitor:
1. Browser console for CSP violations
2. Network tab for blocked resources
3. `/api/security/csp-report` endpoint logs
4. Vercel function logs for CSP reports

## Rollback Plan

If issues persist:
1. Temporarily disable CSP: Comment out CSP headers in middleware.ts
2. Use permissive CSP: Switch to development CSP policy
3. Check browser extensions: Disable ad blockers and extensions
4. Verify correct deployment: Ensure Vercel is building from apps/web