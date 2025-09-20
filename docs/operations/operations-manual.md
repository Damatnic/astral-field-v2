# Operations Manual

## Overview

This operations manual provides comprehensive guidance for maintaining, monitoring, and scaling the Astral Field V2.1 fantasy football platform in production. It covers day-to-day operations, incident response, maintenance procedures, and optimization strategies.

## System Monitoring

### Health Monitoring

#### Application Health Checks

**Automated Health Endpoints**
```bash
# Primary health check
curl https://your-domain.com/api/health

# Detailed system status
curl https://your-domain.com/api/health/detailed

# Database connectivity
curl https://your-domain.com/api/health/database

# External services status
curl https://your-domain.com/api/health/external
```

**Health Check Response Format**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-12-01T12:00:00Z",
  "version": "2.1.0",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "lastCheck": "2024-12-01T12:00:00Z"
    },
    "redis": {
      "status": "healthy", 
      "responseTime": 12,
      "memory": "85%"
    },
    "external_apis": {
      "sleeper": "healthy",
      "anthropic": "healthy"
    }
  }
}
```

#### Key Performance Indicators (KPIs)

**Application Metrics**
- **Response Time** - API endpoint response times (target: <200ms)
- **Error Rate** - Percentage of failed requests (target: <1%)
- **Throughput** - Requests per second during peak usage
- **Availability** - Uptime percentage (target: 99.9%)

**Database Metrics**
- **Connection Pool** - Active/idle connections
- **Query Performance** - Slow query identification (>1s)
- **Database Size** - Growth rate and storage usage
- **Index Efficiency** - Query plan analysis

**Cache Metrics**
- **Hit Rate** - Redis cache hit percentage (target: >90%)
- **Memory Usage** - Redis memory consumption
- **Eviction Rate** - Cache key evictions per minute
- **Connection Count** - Active Redis connections

### Monitoring Tools Setup

#### Sentry Error Tracking

**Configuration**
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance monitoring
  tracesSampleRate: 0.1,
  
  // Error filtering
  beforeSend(event) {
    // Filter out noise
    if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
      return null
    }
    return event
  },
  
  // Custom tags
  tags: {
    component: 'astral-field-v2',
    version: process.env.NEXT_PUBLIC_APP_VERSION,
  }
})
```

**Alert Configuration**
```
Critical Alerts:
- Error rate > 5% over 5 minutes
- Response time > 2000ms average over 5 minutes
- Database connection failures

Warning Alerts:
- Error rate > 1% over 10 minutes
- Response time > 1000ms average over 10 minutes
- Cache hit rate < 80%
```

#### Vercel Analytics

**Built-in Monitoring**
- **Real User Metrics (RUM)** - Actual user experience data
- **Core Web Vitals** - Performance metrics
- **Function Execution** - Serverless function performance
- **Edge Network** - CDN performance and cache rates

**Custom Analytics Events**
```typescript
// Track custom events
import { track } from '@vercel/analytics'

// User actions
track('lineup_set', { user_id: userId, week: currentWeek })
track('trade_proposed', { proposer_id: userId, value: tradeValue })
track('waiver_claimed', { user_id: userId, player_id: playerId })

// Performance events
track('page_load_time', { page: 'dashboard', load_time: loadTime })
track('api_response_time', { endpoint: '/api/teams', response_time: responseTime })
```

#### Database Monitoring

**Neon Database Monitoring**
```sql
-- Query performance monitoring
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Connection monitoring
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;

-- Database size monitoring
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as size;
```

**Prisma Monitoring**
```typescript
// Enable query logging in development
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
})

// Log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn(`Slow query detected: ${e.duration}ms`, e.query)
  }
})
```

## Incident Response

### Incident Classification

#### Severity Levels

**Critical (P0)**
- Platform completely unavailable
- Data loss or corruption
- Security breaches
- Payment processing failures

**High (P1)**
- Core features unavailable
- Performance severely degraded
- Database connectivity issues
- Authentication failures

**Medium (P2)**
- Non-critical features impacted
- Performance moderately degraded
- External API failures
- Some user workflows affected

**Low (P3)**
- Minor bugs or issues
- Cosmetic problems
- Non-essential feature issues
- Documentation updates needed

#### Response Times

```
Critical (P0): 15 minutes
High (P1): 1 hour
Medium (P2): 4 hours
Low (P3): 24 hours
```

### Incident Response Procedures

#### Initial Response (First 15 minutes)

1. **Incident Detection**
   - Automated alert triggers
   - User reports via support channels
   - Monitoring system notifications
   - Social media mentions

2. **Initial Assessment**
   - Verify incident scope and impact
   - Classify incident severity
   - Determine affected systems
   - Estimate user impact

3. **Immediate Actions**
   - Acknowledge incident internally
   - Begin incident log documentation
   - Notify key stakeholders
   - Start status page updates

#### Investigation and Resolution

**Information Gathering**
```bash
# Check system status
curl -I https://your-domain.com/api/health

# Review recent deployments
vercel logs --since=1h

# Check database performance
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Verify external services
curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages

# Check error rates
# Review Sentry dashboard for error spikes
```

**Common Issue Diagnostics**

**Database Issues**
```sql
-- Check for blocking queries
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Check connection pool status
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;
```

**Performance Issues**
```bash
# Check function execution times
vercel logs --since=1h | grep "Duration:"

# Monitor memory usage
# Available in Vercel dashboard

# Check cache performance
redis-cli info memory
redis-cli info stats
```

#### Communication

**Status Page Updates**
```
Incident Identified: [Time]
We are investigating reports of [issue description]. 
We will provide updates every 30 minutes.

Update 1: [Time]
We have identified the root cause as [description].
Engineering team is implementing a fix.

Resolution: [Time]
The issue has been resolved. All systems are operating normally.
Post-mortem will be available within 24 hours.
```

**Internal Communication**
- Slack incident channel
- Email notifications to stakeholders
- Phone calls for critical incidents
- Executive briefings for major outages

### Post-Incident Procedures

#### Post-Mortem Process

1. **Timeline Documentation**
   - Incident start and detection time
   - All actions taken and by whom
   - Resolution time and method
   - Communication timeline

2. **Root Cause Analysis**
   - Technical investigation
   - Process failure identification
   - Contributing factors analysis
   - Similar incident prevention

3. **Action Items**
   - Immediate fixes required
   - Monitoring improvements
   - Process enhancements
   - Documentation updates

4. **Post-Mortem Report**
   ```markdown
   # Incident Post-Mortem
   
   ## Summary
   Brief description of incident impact and resolution
   
   ## Timeline
   - [Time]: Incident detected
   - [Time]: Investigation began
   - [Time]: Root cause identified
   - [Time]: Fix implemented
   - [Time]: Incident resolved
   
   ## Root Cause
   Detailed technical explanation
   
   ## Impact
   - Users affected: X%
   - Duration: X minutes
   - Revenue impact: $X
   
   ## Action Items
   - [ ] Immediate fix (Owner: X, Due: Date)
   - [ ] Monitoring improvement (Owner: Y, Due: Date)
   - [ ] Process update (Owner: Z, Due: Date)
   ```

## Maintenance Procedures

### Routine Maintenance

#### Daily Tasks

**System Health Checks**
```bash
#!/bin/bash
# Daily health check script

echo "=== Daily Health Check $(date) ==="

# Check application health
echo "Checking application health..."
curl -s https://your-domain.com/api/health | jq '.'

# Check database connectivity
echo "Checking database..."
psql $DATABASE_URL -c "SELECT 1;" > /dev/null && echo "Database: OK" || echo "Database: ERROR"

# Check Redis connectivity
echo "Checking Redis..."
redis-cli ping && echo "Redis: OK" || echo "Redis: ERROR"

# Check recent error rates
echo "Checking error rates..."
# Query Sentry API for recent errors

# Check performance metrics
echo "Checking performance..."
# Query analytics for response times

echo "=== Health Check Complete ==="
```

**Database Maintenance**
```sql
-- Daily maintenance queries
-- Update table statistics
ANALYZE;

-- Check for unused indexes
SELECT 
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- Monitor slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;
```

#### Weekly Tasks

**Performance Review**
- Analyze response time trends
- Review error rate patterns
- Check cache performance metrics
- Monitor database growth rates
- Review user engagement statistics

**Security Updates**
```bash
# Check for dependency vulnerabilities
npm audit

# Update dependencies (after testing)
npm update

# Check for environment variable changes
# Review access logs for suspicious activity
```

**Data Backup Verification**
```bash
#!/bin/bash
# Weekly backup verification

echo "Verifying database backups..."

# List recent backups
aws s3 ls s3://your-backup-bucket/database/ --recursive | tail -7

# Test backup restoration (on staging)
pg_restore -d $STAGING_DATABASE_URL latest_backup.sql

echo "Backup verification complete"
```

#### Monthly Tasks

**Comprehensive System Review**
1. **Performance Analysis**
   - Monthly performance report
   - Capacity planning review
   - Cost optimization analysis
   - User growth impact assessment

2. **Security Audit**
   - Access control review
   - Dependency security scan
   - Infrastructure security check
   - Data privacy compliance review

3. **Documentation Updates**
   - Update runbooks and procedures
   - Review and update monitoring alerts
   - Update disaster recovery plans
   - Refresh team contact information

### Deployment Procedures

#### Production Deployment Checklist

**Pre-Deployment**
- [ ] Code review completed and approved
- [ ] All tests passing (unit, integration, e2e)
- [ ] Database migrations tested on staging
- [ ] Performance impact assessed
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

**Deployment Steps**
1. **Database Migration (if needed)**
   ```bash
   # Run on production database
   npx prisma migrate deploy
   
   # Verify migration success
   npx prisma migrate status
   ```

2. **Application Deployment**
   ```bash
   # Deploy to production
   vercel --prod
   
   # Verify deployment
   curl https://your-domain.com/api/health
   ```

3. **Post-Deployment Verification**
   ```bash
   # Check all critical endpoints
   curl -s https://your-domain.com/api/health
   curl -s https://your-domain.com/api/league
   curl -s https://your-domain.com/api/players
   
   # Monitor error rates for 30 minutes
   # Check Sentry for new errors
   # Verify key user workflows
   ```

**Rollback Procedure**
```bash
# Quick rollback via Vercel
vercel rollback

# Database rollback (if migration deployed)
npx prisma migrate resolve --rolled-back <migration-name>

# Verify rollback success
curl https://your-domain.com/api/health
```

### Scaling Operations

#### Horizontal Scaling

**Database Scaling**
```sql
-- Monitor connection usage
SELECT 
  count(*) as total_connections,
  max_conn.setting as max_connections,
  round(count(*) * 100.0 / max_conn.setting::int, 2) as percent_used
FROM pg_stat_activity, 
     (SELECT setting FROM pg_settings WHERE name = 'max_connections') max_conn
GROUP BY max_conn.setting;

-- Monitor query performance
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC;
```

**Redis Scaling**
```bash
# Monitor Redis memory usage
redis-cli info memory | grep used_memory_human

# Monitor connection count
redis-cli info clients | grep connected_clients

# Check hit rates
redis-cli info stats | grep keyspace_hits
redis-cli info stats | grep keyspace_misses
```

#### Vertical Scaling

**Performance Monitoring for Scaling Decisions**
```typescript
// Monitor API response times
export async function logResponseTime(req: NextRequest, res: Response) {
  const start = Date.now()
  
  // Process request
  
  const duration = Date.now() - start
  
  // Log slow requests
  if (duration > 1000) {
    console.warn(`Slow request: ${req.url} took ${duration}ms`)
  }
  
  // Track metrics
  track('api_response_time', {
    endpoint: req.url,
    method: req.method,
    duration,
    status: res.status
  })
}
```

**Auto-scaling Triggers**
- CPU utilization > 80% for 5 minutes
- Memory usage > 85% for 5 minutes
- Response time > 2000ms average for 10 minutes
- Error rate > 5% for 5 minutes

## Backup and Recovery

### Backup Strategy

#### Database Backups

**Automated Daily Backups**
```bash
#!/bin/bash
# Automated backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="astralfield_backup_$DATE.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp "$BACKUP_FILE.gz" s3://your-backup-bucket/database/

# Clean up local files
rm "$BACKUP_FILE.gz"

# Keep only last 30 days of backups
aws s3 ls s3://your-backup-bucket/database/ | head -n -30 | awk '{print $4}' | xargs -I {} aws s3 rm s3://your-backup-bucket/database/{}

echo "Backup completed: $BACKUP_FILE.gz"
```

**Point-in-Time Recovery**
```bash
# Restore to specific point in time
pg_restore \
  --clean \
  --no-owner \
  --no-privileges \
  --dbname=$DATABASE_URL \
  backup_file.sql
```

#### Application State Backup

**Configuration Backup**
```bash
#!/bin/bash
# Backup environment variables and configuration

# Export environment variables (excluding secrets)
env | grep -E "^(NEXT_|NODE_|VERCEL_)" > config_backup.env

# Backup Vercel configuration
vercel env pull .env.backup

# Upload to secure storage
aws s3 cp config_backup.env s3://your-backup-bucket/config/
aws s3 cp .env.backup s3://your-backup-bucket/config/
```

### Disaster Recovery

#### Recovery Time Objectives (RTO)

```
Critical Systems: 1 hour
Database: 30 minutes
Application: 15 minutes
Static Assets: 5 minutes
```

#### Recovery Point Objectives (RPO)

```
Database: 1 hour (hourly backups)
Configuration: 24 hours (daily backups)
Application Code: 0 (git repository)
User Data: 1 hour (database backups)
```

#### Disaster Recovery Procedures

**Complete System Recovery**
1. **Assess Damage**
   - Determine scope of data loss
   - Identify recovery point needed
   - Estimate recovery time

2. **Infrastructure Recovery**
   ```bash
   # Recreate Vercel project
   vercel link
   
   # Restore environment variables
   vercel env add DATABASE_URL production < backup_env.txt
   
   # Deploy latest code
   vercel --prod
   ```

3. **Database Recovery**
   ```bash
   # Restore from latest backup
   pg_restore --clean --no-owner --dbname=$NEW_DATABASE_URL backup.sql
   
   # Update connection strings
   vercel env add DATABASE_URL production
   ```

4. **Verification**
   ```bash
   # Test all critical endpoints
   curl https://your-domain.com/api/health
   curl https://your-domain.com/api/auth/session
   curl https://your-domain.com/api/league
   
   # Verify user authentication
   # Test core workflows
   # Monitor for errors
   ```

## Cost Optimization

### Resource Usage Monitoring

#### Vercel Function Usage
```bash
# Monitor function execution time
vercel logs --since=24h | grep Duration | awk '{print $4}' | sort -n

# Check function invocation count
vercel logs --since=24h | grep -c "START RequestId"
```

#### Database Cost Optimization
```sql
-- Identify expensive queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 20;

-- Monitor connection usage
SELECT 
  count(*) as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;
```

#### Cache Optimization
```bash
# Monitor Redis memory usage
redis-cli info memory | grep used_memory_peak_human

# Check cache hit rates
redis-cli info stats | grep -E "(keyspace_hits|keyspace_misses)"

# Identify memory usage by key pattern
redis-cli --bigkeys
```

### Cost Reduction Strategies

#### Function Optimization
```typescript
// Optimize cold starts
export const config = {
  runtime: 'nodejs18.x',
  maxDuration: 30, // Reduce from default 60s
}

// Implement caching to reduce function calls
import { unstable_cache } from 'next/cache'

export const getCachedLeagueData = unstable_cache(
  async (leagueId: string) => {
    return await prisma.league.findUnique({
      where: { id: leagueId },
      include: { teams: true }
    })
  },
  ['league-data'],
  { revalidate: 300 } // Cache for 5 minutes
)
```

#### Database Optimization
```sql
-- Create indexes for expensive queries
CREATE INDEX CONCURRENTLY idx_teams_league_points 
ON teams(league_id, points_for DESC);

-- Optimize connection pooling
-- Use connection pooling with pgbouncer
-- Monitor and adjust pool sizes based on usage
```

This operations manual provides comprehensive guidance for maintaining a production-ready fantasy football platform. Regular review and updates ensure optimal performance, reliability, and user experience.