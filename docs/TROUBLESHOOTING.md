# AstralField v3.0 - Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide covers common issues, debugging techniques, and solutions for AstralField v3.0. Whether you're experiencing development problems, deployment issues, or production errors, this guide provides systematic approaches to identify and resolve problems.

## Quick Diagnostic Checklist

When encountering issues, run through this quick checklist:

```checklist
- [ ] Check application health endpoints (/api/health)
- [ ] Verify environment variables are set correctly
- [ ] Confirm database connectivity
- [ ] Check logs for error messages
- [ ] Validate API authentication
- [ ] Test network connectivity
- [ ] Verify external service status (ESPN API, etc.)
- [ ] Check browser console for frontend errors
```

## Common Issues and Solutions

### 1. Authentication Issues

#### Issue: "Invalid credentials" on login
**Symptoms:**
- Users cannot log in with correct credentials
- API returns 401 Unauthorized
- Login form shows "Invalid credentials" error

**Diagnosis:**
```bash
# Check user exists in database
psql $DATABASE_URL -c "SELECT id, email, role FROM users WHERE email = 'user@example.com';"

# Check password hash
psql $DATABASE_URL -c "SELECT hashedPassword FROM users WHERE email = 'user@example.com';"

# Test password comparison
node -e "
const bcrypt = require('bcryptjs');
const hash = 'your-hash-from-db';
const password = 'user-input-password';
console.log(bcrypt.compareSync(password, hash));
"
```

**Solutions:**
```bash
# Reset user password
npm run reset-password -- --email user@example.com --password newpassword

# Check environment variables
echo $NEXTAUTH_SECRET
echo $JWT_SECRET

# Regenerate JWT secret
openssl rand -base64 32
```

#### Issue: JWT token validation failures
**Symptoms:**
- "Token expired" or "Invalid token" errors
- Users logged out unexpectedly
- API requests fail with 401 errors

**Diagnosis:**
```javascript
// Decode JWT token to check expiry
const jwt = require('jsonwebtoken');
const token = 'your-jwt-token';

try {
  const decoded = jwt.decode(token);
  console.log('Token expires at:', new Date(decoded.exp * 1000));
  console.log('Current time:', new Date());
  console.log('Token valid:', decoded.exp * 1000 > Date.now());
} catch (error) {
  console.error('Invalid token:', error.message);
}
```

**Solutions:**
```typescript
// Check token expiry settings
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Implement token refresh
export async function refreshToken(oldToken: string) {
  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET!);
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.JWT_SECRET!,
      { expiresIn: TOKEN_EXPIRY }
    );
    return newToken;
  } catch (error) {
    throw new Error('Token refresh failed');
  }
}
```

### 2. Database Connection Issues

#### Issue: "Connection refused" or "Database not found"
**Symptoms:**
- Application fails to start
- API returns 500 errors
- Prisma client errors

**Diagnosis:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check database exists
psql $DATABASE_URL -c "\\l"

# Verify connection string format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database?options
```

**Solutions:**
```bash
# Fix connection string format
export DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Reset database schema
npm run db:reset

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

#### Issue: "Too many connections" database error
**Symptoms:**
- Intermittent database connection failures
- Application becomes unresponsive
- Connection pool exhausted errors

**Diagnosis:**
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check connection limit
SELECT setting FROM pg_settings WHERE name = 'max_connections';

-- Show active connections by application
SELECT application_name, count(*)
FROM pg_stat_activity
GROUP BY application_name;
```

**Solutions:**
```typescript
// Configure connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
});

// Set connection pool limits
process.env.DATABASE_POOL_SIZE = "10";
process.env.DATABASE_POOL_TIMEOUT = "5000";
```

### 3. Frontend Issues

#### Issue: Next.js build failures
**Symptoms:**
- Build process fails with errors
- Pages don't render correctly
- TypeScript compilation errors

**Diagnosis:**
```bash
# Check build logs
npm run build 2>&1 | tee build.log

# Type check
npm run typecheck

# Check for circular dependencies
npx madge --circular src/

# Analyze bundle
npm run analyze
```

**Solutions:**
```bash
# Clear Next.js cache
rm -rf .next
rm -rf node_modules/.cache

# Update dependencies
npm update

# Fix TypeScript errors
npm run typecheck -- --noEmit

# Optimize bundle
# Add to next.config.js:
experimental: {
  optimizeCss: true,
  optimizeServerReact: true,
}
```

#### Issue: "Hydration mismatch" errors
**Symptoms:**
- Console warnings about hydration
- UI flickers on page load
- Components render differently on server/client

**Diagnosis:**
```typescript
// Check for server/client differences
useEffect(() => {
  console.log('Client-side value:', someValue);
}, []);

// Use dynamic imports for client-only components
const ClientOnlyComponent = dynamic(
  () => import('./ClientOnlyComponent'),
  { ssr: false }
);
```

**Solutions:**
```typescript
// Use suppressHydrationWarning for time-sensitive content
<div suppressHydrationWarning>
  {new Date().toLocaleString()}
</div>

// Use state to handle client-only logic
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null;
```

### 4. API Server Issues

#### Issue: Express server crashes or fails to start
**Symptoms:**
- Server exits with error codes
- API endpoints return connection errors
- Health check endpoint unreachable

**Diagnosis:**
```bash
# Check server logs
npm run dev:api 2>&1 | tee api.log

# Check port availability
lsof -i :3001
netstat -tulpn | grep :3001

# Verify environment variables
node -e "console.log(process.env.DATABASE_URL ? 'DB set' : 'DB missing')"
```

**Solutions:**
```bash
# Kill processes on port
kill -9 $(lsof -ti:3001)

# Use different port
export PORT=3002
npm run dev:api

# Check process manager
pm2 status
pm2 restart api
```

#### Issue: CORS errors preventing frontend requests
**Symptoms:**
- Browser console shows CORS errors
- API requests blocked
- "Access-Control-Allow-Origin" errors

**Diagnosis:**
```javascript
// Check CORS configuration
console.log('CORS origin:', process.env.CORS_ORIGIN);
console.log('Request origin:', req.headers.origin);
```

**Solutions:**
```typescript
// Update CORS configuration
app.use(cors({
  origin: [
    process.env.WEB_URL || "http://localhost:3000",
    process.env.ADMIN_URL || "http://localhost:3001",
    "https://your-production-domain.com"
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// For development, allow all origins temporarily
if (process.env.NODE_ENV === 'development') {
  app.use(cors({ origin: true, credentials: true }));
}
```

### 5. Real-time Features Issues

#### Issue: WebSocket connections failing
**Symptoms:**
- Draft room doesn't update in real-time
- Chat messages not appearing
- Socket connection timeouts

**Diagnosis:**
```javascript
// Client-side debugging
const socket = io('ws://localhost:3001', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

**Solutions:**
```typescript
// Server-side Socket.IO configuration
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.WEB_URL || "http://localhost:3000",
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Add connection debugging
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, reason);
  });
});
```

### 6. External API Issues

#### Issue: ESPN API requests failing
**Symptoms:**
- Player data not updating
- "Failed to fetch" errors
- API rate limit errors

**Diagnosis:**
```bash
# Test ESPN API directly
curl "https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes"

# Check rate limiting
curl -I "https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes"
```

**Solutions:**
```typescript
// Implement retry logic
async function fetchESPNData(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      
      if (response.status === 429) {
        // Rate limited, wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
}

// Cache API responses
const cache = new Map();
async function getCachedData(key: string, fetcher: () => Promise<any>) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetcher();
  cache.set(key, data);
  setTimeout(() => cache.delete(key), 5 * 60 * 1000); // 5 min cache
  
  return data;
}
```

## Performance Issues

### 1. Slow Page Load Times

**Diagnosis:**
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Check Core Web Vitals
lighthouse https://your-domain.com --view

# Profile API endpoints
time curl https://your-domain.com/api/players
```

**Solutions:**
```typescript
// Implement code splitting
const DraftRoom = dynamic(() => import('./DraftRoom'), {
  loading: () => <div>Loading...</div>
});

// Optimize images
import Image from 'next/image';

<Image
  src="/player-image.jpg"
  alt="Player"
  width={200}
  height={200}
  priority={false}
  placeholder="blur"
/>

// Add caching headers
res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
```

### 2. Database Query Performance

**Diagnosis:**
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_min_duration_statement = 100;

-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM players WHERE position = 'QB';

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'players';
```

**Solutions:**
```sql
-- Add strategic indexes
CREATE INDEX CONCURRENTLY idx_players_position_status ON players(position, status);
CREATE INDEX CONCURRENTLY idx_roster_team_starter ON roster_players(teamId, isStarter);

-- Optimize queries
SELECT p.id, p.name, p.position
FROM players p
WHERE p.position = 'QB' 
  AND p.status = 'active'
  AND p.isFantasyRelevant = true
ORDER BY p.rank ASC
LIMIT 20;
```

## Development Environment Issues

### 1. Node.js Version Conflicts

**Symptoms:**
- Package installation failures
- Build errors with native dependencies
- Runtime errors in development

**Diagnosis:**
```bash
# Check Node.js version
node --version
npm --version

# Check package requirements
cat package.json | grep '"node"'
cat .nvmrc
```

**Solutions:**
```bash
# Use Node Version Manager
nvm install 18
nvm use 18

# Update package.json engines
{
  "engines": {
    "node": ">=18.17.0",
    "npm": ">=9.0.0"
  }
}

# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 2. Port Conflicts

**Symptoms:**
- "Port already in use" errors
- Cannot start development servers
- Services fail to bind to ports

**Diagnosis:**
```bash
# Check what's using ports
lsof -i :3000
lsof -i :3001
netstat -tulpn | grep -E ":(3000|3001)"

# Find Node.js processes
ps aux | grep node
```

**Solutions:**
```bash
# Kill processes on ports
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:3001)

# Use different ports
export PORT=3002
export API_PORT=3003

# Update package.json scripts
"dev": "next dev --port 3002"
"dev:api": "tsx watch src/server.ts --port 3003"
```

## Production Environment Issues

### 1. Memory Leaks

**Symptoms:**
- Application memory usage continuously increases
- Server becomes unresponsive
- Out of memory errors

**Diagnosis:**
```bash
# Monitor memory usage
ps aux | grep node
htop
free -h

# Node.js memory profiling
node --inspect server.js
# Open chrome://inspect in Chrome
```

**Solutions:**
```typescript
// Set memory limits
process.env.NODE_OPTIONS = '--max-old-space-size=1024';

// Cleanup intervals
setInterval(() => {
  if (global.gc) {
    global.gc();
  }
}, 30000);

// Monitor memory usage
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
  });
}, 60000);
```

### 2. SSL Certificate Issues

**Symptoms:**
- "Certificate expired" errors
- "Unable to verify certificate" warnings
- HTTPS connections failing

**Diagnosis:**
```bash
# Check certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiry
openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Test SSL configuration
curl -I https://your-domain.com
```

**Solutions:**
```bash
# Renew Let's Encrypt certificate
certbot renew

# Check auto-renewal
certbot renew --dry-run

# Force certificate renewal
certbot certonly --force-renewal -d your-domain.com
```

## Debugging Tools and Techniques

### 1. Logging and Monitoring

```typescript
// Structured logging with Pino
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});
```

### 2. Error Tracking

```typescript
// Sentry integration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Custom error handling
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  Sentry.captureException(error);
  
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
});
```

### 3. Performance Profiling

```typescript
// API response time monitoring
const responseTimeThreshold = 1000; // 1 second

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
    
    if (duration > responseTimeThreshold) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`
      });
    }
  });
  
  next();
});
```

## Emergency Procedures

### 1. Service Outage Response

```bash
#!/bin/bash
# emergency-response.sh

echo "🚨 Emergency Response Procedure"

# 1. Check service health
curl -f https://your-domain.com/api/health || echo "❌ Frontend down"
curl -f https://api.your-domain.com/api/health || echo "❌ API down"

# 2. Check database connectivity
psql $DATABASE_URL -c "SELECT 1;" || echo "❌ Database down"

# 3. Check external dependencies
curl -f https://site.api.espn.com/apis/site/v2/sports/football/nfl || echo "❌ ESPN API down"

# 4. Restart services
vercel --prod                    # Redeploy frontend
railway restart                  # Restart API server

# 5. Check error rates
tail -n 100 /var/log/app.log | grep ERROR

echo "✅ Emergency response completed"
```

### 2. Database Failover

```bash
#!/bin/bash
# database-failover.sh

# 1. Create emergency backup
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Switch to backup database
export DATABASE_URL=$BACKUP_DATABASE_URL

# 3. Restart application services
pm2 restart all

# 4. Verify functionality
curl -f https://your-domain.com/api/health

echo "Database failover completed"
```

## Support and Escalation

### When to Escalate

1. **Security Issues**: Immediately escalate any suspected security breaches
2. **Data Loss**: Any situation involving potential data loss
3. **Extended Outages**: Service unavailable for more than 5 minutes
4. **Performance Degradation**: Response times > 5 seconds for critical endpoints

### Contact Information

- **Development Team**: #dev-team Slack channel
- **On-Call Engineer**: Use PagerDuty rotation
- **Database Admin**: database-team@company.com
- **Security Team**: security@company.com

### Escalation Script

```bash
#!/bin/bash
# escalate.sh

SEVERITY=$1
ISSUE_DESCRIPTION=$2

if [ "$SEVERITY" = "critical" ]; then
    # Page on-call engineer
    curl -X POST https://events.pagerduty.com/v2/enqueue \
        -H "Content-Type: application/json" \
        -d "{
            \"routing_key\": \"$PAGERDUTY_KEY\",
            \"event_action\": \"trigger\",
            \"payload\": {
                \"summary\": \"Critical Issue: $ISSUE_DESCRIPTION\",
                \"source\": \"AstralField\",
                \"severity\": \"critical\"
            }
        }"
fi

# Always notify team
slack-notify "#incidents" "🚨 Issue reported: $ISSUE_DESCRIPTION (Severity: $SEVERITY)"
```

---

*This troubleshooting guide provides systematic approaches to diagnosing and resolving issues in AstralField v3.0, ensuring minimal downtime and optimal user experience.*