# 📖 AstralField v2.1 - Production Operations Runbook

**Version:** 2.1.0  
**Last Updated:** September 25, 2025  
**Environment:** Production (Vercel + PostgreSQL + Redis)  
**Responsibility:** DevOps & Engineering Team  
**Classification:** Internal Operations Manual  

---

## 🎯 OVERVIEW & PURPOSE

This runbook provides comprehensive operational procedures for AstralField v2.1 in production. It covers deployment, monitoring, troubleshooting, and maintenance procedures for the fantasy football platform.

### System Architecture
- **Frontend:** Next.js 14 App Router
- **Backend:** Next.js API Routes (118 endpoints)
- **Database:** PostgreSQL (Neon) with 25+ models
- **Cache:** Redis for session & data caching
- **Hosting:** Vercel with global edge network
- **Monitoring:** Sentry + Vercel Analytics + Custom metrics

---

## 🚀 DEPLOYMENT PROCEDURES

### Standard Deployment (Zero-Downtime)

#### Pre-Deployment Checklist
```bash
# 1. Verify codebase health
npm run build
npm run lint
npm run type-check

# 2. Run security scan
./scripts/security_scan.ps1

# 3. Execute load testing
./scripts/load_test.ps1

# 4. Database migration check
npx prisma migrate status
```

#### Deployment Steps
```bash
# Production Deployment Process

# 1. Final code preparation
git checkout master
git pull origin master
npm install --production

# 2. Environment validation
vercel env ls --scope production

# 3. Database backup (critical)
# Execute backup via Neon dashboard or API
curl -X POST https://your-neon-api/backup

# 4. Deploy to production
vercel --prod

# 5. Post-deployment verification
curl -f https://astralfield.com/api/health
curl -f https://astralfield.com/api/health/db
```

#### Post-Deployment Validation
```bash
# Smoke Testing Suite
npm run test:production-smoke

# Performance validation
./scripts/load_test.ps1 -BaseUrl "https://astralfield.com"

# Feature verification
curl -f https://astralfield.com/api/leagues
curl -f https://astralfield.com/api/draft
curl -f https://astralfield.com/api/auth/session
```

### Emergency Hotfix Deployment

#### Hotfix Process (< 30 minutes)
```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-fix-$(date +%Y%m%d)

# 2. Apply minimal fix
# (Make necessary changes)

# 3. Fast-track testing
npm run test:critical-path

# 4. Deploy with monitoring
vercel --prod --env HOTFIX_MODE=true

# 5. Monitor for 15 minutes
# Watch error rates, response times, user impact
```

---

## 📊 MONITORING & HEALTH CHECKS

### System Health Endpoints

#### Primary Health Checks
```bash
# Application health
curl -f https://astralfield.com/api/health
# Expected: {"status":"ok","timestamp":"...","uptime":"..."}

# Database connectivity  
curl -f https://astralfield.com/api/health/db
# Expected: {"database":"connected","latency":"<50ms"}

# Cache health
curl -f https://astralfield.com/api/health/cache
# Expected: {"redis":"connected","memory":"..."}

# External API status
curl -f https://astralfield.com/api/espn/health
# Expected: {"espn":"available","latency":"<500ms"}
```

#### Performance Monitoring Commands
```bash
# Real-time performance metrics
curl -f https://astralfield.com/api/metrics/performance

# Error rate monitoring
curl -f https://astralfield.com/api/metrics/errors

# User activity monitoring
curl -f https://astralfield.com/api/analytics/realtime
```

### Monitoring Thresholds & Alerts

#### Critical Alerts (Immediate Response)
- **Response Time:** >5s p95 (SLO: <2s)
- **Error Rate:** >1% (SLO: <0.1%)
- **Database Latency:** >500ms (SLO: <100ms)
- **Memory Usage:** >85% (Critical: >95%)
- **CPU Usage:** >80% sustained (Critical: >90%)

#### Warning Alerts (15-minute Response)
- **Response Time:** >2s p95
- **Error Rate:** >0.5%
- **Database Connections:** >80% pool usage
- **Cache Hit Rate:** <90%
- **Real-time Latency:** >100ms

#### Monitoring Commands
```bash
# Check current performance
curl -s https://astralfield.com/api/metrics/performance | jq '.'

# Monitor error trends
curl -s https://astralfield.com/api/errors/analytics | jq '.errorRate'

# Database performance
curl -s https://astralfield.com/api/health/db | jq '.queryMetrics'
```

---

## 🔧 TROUBLESHOOTING PROCEDURES

### Common Issues & Resolutions

#### 🚨 High Error Rate (>1%)

**Investigation Steps:**
```bash
# 1. Check recent error logs
curl -s https://astralfield.com/api/errors/recent | jq '.errors[:5]'

# 2. Identify error patterns
curl -s https://astralfield.com/api/errors/analytics | jq '.errorsByCategory'

# 3. Check system resource usage
curl -s https://astralfield.com/api/metrics/performance | jq '.systemMetrics'
```

**Common Causes & Fixes:**
- **Database Connection Pool Exhaustion**
  ```bash
  # Check connection count
  curl -s https://astralfield.com/api/health/db | jq '.connections'
  
  # Solution: Restart application or scale database
  vercel env add DATABASE_POOL_SIZE 20
  vercel --prod
  ```

- **External API Failures (ESPN)**
  ```bash
  # Check ESPN API status
  curl -f https://astralfield.com/api/espn/health
  
  # Enable fallback mode if needed
  vercel env add ESPN_FALLBACK_MODE true
  ```

#### ⏱️ Slow Response Times (>2s p95)

**Investigation Steps:**
```bash
# 1. Check slow endpoint identification
curl -s https://astralfield.com/api/metrics/performance | jq '.slowEndpoints'

# 2. Database query performance
curl -s https://astralfield.com/api/health/db | jq '.slowQueries'

# 3. Cache performance
curl -s https://astralfield.com/api/health/cache | jq '.hitRate'
```

**Optimization Actions:**
- **Database Query Optimization**
  ```sql
  -- Check for missing indexes
  SELECT schemaname, tablename, attname 
  FROM pg_stats 
  WHERE n_distinct < 0 AND avg_width > 32;
  ```

- **Cache Warming**
  ```bash
  # Warm frequently accessed data
  curl -X POST https://astralfield.com/api/admin/cache-warm
  ```

#### 🔄 WebSocket Connection Issues

**Diagnosis:**
```bash
# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" \
  -H "Sec-WebSocket-Version: 13" \
  https://astralfield.com/api/socket
```

**Resolution:**
```bash
# Restart WebSocket service
vercel env add WEBSOCKET_RESTART true
vercel --prod

# Monitor real-time connections
curl -s https://astralfield.com/api/metrics/realtime | jq '.activeConnections'
```

#### 📱 PWA Installation Issues

**Investigation:**
```bash
# Check PWA manifest
curl -s https://astralfield.com/manifest.json | jq '.'

# Validate service worker
curl -s https://astralfield.com/sw.js
```

**Common Fixes:**
- Update manifest.json with correct icon paths
- Regenerate service worker with latest assets
- Clear CDN cache for PWA resources

---

## 🗄️ DATABASE OPERATIONS

### Daily Database Maintenance

#### Automated Backup Verification
```bash
# Check latest backup status
curl -s https://api.neon.tech/v2/projects/$NEON_PROJECT_ID/branches/main/backups

# Verify backup integrity
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('$DATABASE_NAME'));"
```

#### Performance Monitoring
```sql
-- Check slow queries (run weekly)
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor connection usage
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Check database size growth
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Weekly Maintenance Tasks
```bash
# 1. Database statistics update
psql $DATABASE_URL -c "ANALYZE;"

# 2. Connection pool optimization
psql $DATABASE_URL -c "SELECT pg_stat_reset();"

# 3. Performance metrics review
curl -s https://astralfield.com/api/health/db | jq '.weeklyReport'
```

### Migration Procedures

#### Safe Migration Process
```bash
# 1. Create database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration on staging
DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy

# 3. Apply to production (during low-traffic window)
npx prisma migrate deploy

# 4. Verify data integrity
npm run test:data-integrity
```

#### Rollback Migration
```bash
# 1. Identify migration to rollback
npx prisma migrate status

# 2. Create pre-rollback backup
pg_dump $DATABASE_URL > pre_rollback_$(date +%Y%m%d_%H%M%S).sql

# 3. Execute rollback
psql $DATABASE_URL < backup_pre_migration.sql

# 4. Verify system functionality
curl -f https://astralfield.com/api/health/db
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### Cache Management

#### Redis Cache Operations
```bash
# Check cache status
redis-cli -u $REDIS_URL info memory

# Clear specific cache patterns
redis-cli -u $REDIS_URL --scan --pattern "user:*" | xargs redis-cli -u $REDIS_URL del

# Monitor cache hit rates
redis-cli -u $REDIS_URL info stats | grep keyspace_hits
```

#### Application-Level Caching
```bash
# Warm critical caches
curl -X POST https://astralfield.com/api/admin/cache-warm

# Clear application cache
curl -X POST https://astralfield.com/api/admin/cache-clear

# Cache performance metrics
curl -s https://astralfield.com/api/metrics/performance | jq '.cacheMetrics'
```

### Database Performance Tuning

#### Query Optimization
```sql
-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' AND n_distinct > 100
ORDER BY n_distinct DESC;

-- Monitor query performance
SELECT query, calls, total_time, mean_time, min_time, max_time
FROM pg_stat_statements
WHERE calls > 1000
ORDER BY total_time DESC
LIMIT 20;
```

#### Connection Pool Tuning
```bash
# Monitor connection pool status
curl -s https://astralfield.com/api/health/db | jq '.connectionPool'

# Optimize pool size based on load
vercel env add DATABASE_POOL_SIZE 25
vercel env add DATABASE_POOL_TIMEOUT 30000
```

---

## 🔐 SECURITY OPERATIONS

### Security Monitoring

#### Daily Security Checks
```bash
# Run comprehensive security scan
./scripts/security_scan.ps1

# Check for suspicious authentication attempts
curl -s https://astralfield.com/api/auth/security-report | jq '.suspiciousAttempts'

# Monitor rate limiting effectiveness
curl -s https://astralfield.com/api/metrics/security | jq '.rateLimitBlocks'
```

#### Weekly Security Review
```bash
# Vulnerability assessment
npm audit --audit-level high

# Review access logs
curl -s https://astralfield.com/api/admin/access-logs | jq '.adminAccess[-10:]'

# Check SSL certificate status
openssl s_client -connect astralfield.com:443 -servername astralfield.com < /dev/null | grep "Verify return code"
```

### Incident Response Procedures

#### Security Incident Classification
- **P0 (Critical):** Data breach, system compromise
- **P1 (High):** Authentication bypass, privilege escalation  
- **P2 (Medium):** Suspicious activity, failed attack attempts
- **P3 (Low):** Policy violations, minor vulnerabilities

#### Immediate Response Actions
```bash
# For P0/P1 incidents:
# 1. Enable security lockdown mode
vercel env add SECURITY_LOCKDOWN true

# 2. Force user session logout
curl -X POST https://astralfield.com/api/admin/force-logout-all

# 3. Enable enhanced monitoring
vercel env add ENHANCED_LOGGING true

# 4. Document incident details
curl -X POST https://astralfield.com/api/admin/security-incident \
  -d '{"severity":"P0","description":"..."}'
```

---

## 📈 SCALING & CAPACITY PLANNING

### Traffic Monitoring

#### Current Capacity Metrics
```bash
# Check concurrent user count
curl -s https://astralfield.com/api/analytics/realtime | jq '.activeUsers'

# Monitor resource utilization
curl -s https://astralfield.com/api/metrics/performance | jq '.resourceUsage'

# Database load assessment
curl -s https://astralfield.com/api/health/db | jq '.loadMetrics'
```

#### Scaling Triggers
- **Horizontal Scaling:** >80% CPU for 10+ minutes
- **Database Scaling:** >75% connection pool usage
- **Cache Scaling:** <85% hit rate sustained
- **CDN Scaling:** >1000 req/s per edge location

### Performance Optimization

#### Weekly Performance Review
```bash
# Generate performance report
curl -s https://astralfield.com/api/metrics/performance/weekly

# Analyze slow endpoints
curl -s https://astralfield.com/api/metrics/performance | jq '.slowEndpoints'

# Review database performance
curl -s https://astralfield.com/api/health/db | jq '.performanceMetrics'
```

#### Optimization Actions
```bash
# Enable advanced caching
vercel env add ADVANCED_CACHING true

# Optimize database queries
npm run db:optimize

# CDN cache optimization
curl -X POST https://astralfield.com/api/admin/cdn-optimize
```

---

## 🔄 BACKUP & RECOVERY

### Automated Backup Strategy

#### Daily Backups
- **Database:** Full PostgreSQL backup via Neon
- **User Data:** Incremental backup of critical user information
- **Configuration:** Environment variables and settings backup
- **Code:** Git repository with tagged releases

#### Backup Verification
```bash
# Check backup completion
curl -s https://api.neon.tech/v2/projects/$NEON_PROJECT_ID/branches/main/backups/latest

# Verify backup integrity
pg_restore --list backup_latest.dump | wc -l

# Test restore procedure (staging)
pg_restore -d $STAGING_DATABASE_URL backup_latest.dump
```

### Disaster Recovery

#### Recovery Time Objectives (RTO)
- **Database Recovery:** <15 minutes
- **Application Recovery:** <10 minutes
- **Full System Recovery:** <30 minutes

#### Recovery Point Objectives (RPO)
- **Critical Data:** <5 minutes
- **User Content:** <15 minutes
- **Analytics Data:** <1 hour

#### Recovery Procedures
```bash
# Emergency recovery steps:

# 1. Assess damage and impact
curl -f https://astralfield.com/api/health || echo "System down"

# 2. Initialize recovery process
vercel env add RECOVERY_MODE true

# 3. Restore database from latest backup
pg_restore -d $DATABASE_URL backup_latest.dump

# 4. Deploy stable code version
vercel rollback

# 5. Verify system functionality
npm run test:recovery-validation

# 6. Monitor system stability
watch -n 30 'curl -f https://astralfield.com/api/health'
```

---

## 📞 CONTACTS & ESCALATION

### On-Call Rotation
- **Primary:** Development Team Lead
- **Secondary:** Senior Backend Engineer
- **Database:** Database Administrator
- **Security:** Security Operations Team

### Emergency Escalation Matrix

#### Incident Severity Levels
- **P0 (Critical):** System down, data loss, security breach
  - **Response Time:** Immediate (15 minutes)
  - **Escalation:** Development Team Lead → Engineering Manager

- **P1 (High):** Major feature broken, performance degraded
  - **Response Time:** 1 hour
  - **Escalation:** On-call engineer → Team Lead

- **P2 (Medium):** Minor features impacted, non-critical errors
  - **Response Time:** 4 hours
  - **Escalation:** Standard rotation

- **P3 (Low):** Minor bugs, feature requests
  - **Response Time:** Next business day
  - **Escalation:** Standard bug triage

### Communication Channels
- **Slack:** #astralfield-production-alerts
- **Email:** ops-team@astralfield.com
- **Phone:** Emergency on-call number
- **Status Page:** https://status.astralfield.com

---

## 📚 MAINTENANCE SCHEDULES

### Daily Tasks (Automated)
- Health check monitoring
- Performance metrics collection
- Error rate analysis
- Backup verification
- Security log review

### Weekly Tasks (Manual)
- Performance optimization review
- Database maintenance (VACUUM, ANALYZE)
- Security vulnerability scan
- Capacity planning review
- User feedback analysis

### Monthly Tasks (Scheduled)
- Full security audit
- Performance benchmarking
- Disaster recovery testing
- Documentation updates
- Team training and procedures review

### Quarterly Tasks (Strategic)
- Architecture review
- Technology stack evaluation
- Scalability planning
- Security penetration testing
- Business continuity planning

---

## 🛠️ USEFUL COMMANDS REFERENCE

### Quick Health Checks
```bash
# System overview
curl -s https://astralfield.com/api/health | jq '.'

# Performance snapshot
curl -s https://astralfield.com/api/metrics/performance | jq '.summary'

# Error rate check
curl -s https://astralfield.com/api/metrics/errors | jq '.errorRate'

# Database status
curl -s https://astralfield.com/api/health/db | jq '.status'
```

### Emergency Commands
```bash
# Emergency maintenance mode
vercel env add MAINTENANCE_MODE true && vercel --prod

# Force cache clear
curl -X POST https://astralfield.com/api/admin/cache-clear-all

# Emergency user logout
curl -X POST https://astralfield.com/api/admin/emergency-logout

# System restart (Vercel redeploy)
vercel --prod --force
```

### Performance Commands
```bash
# Load testing
./scripts/load_test.ps1 -BaseUrl "https://astralfield.com"

# Security scan
./scripts/security_scan.ps1

# Database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Cache statistics
redis-cli -u $REDIS_URL info stats
```

---

## 📋 RUNBOOK CHECKLIST

### Pre-Deployment
- [ ] Code review completed
- [ ] Tests passing (unit, integration, E2E)
- [ ] Security scan completed
- [ ] Performance testing completed
- [ ] Database migrations reviewed
- [ ] Environment variables verified

### Deployment
- [ ] Backup created and verified
- [ ] Deployment executed successfully
- [ ] Health checks passing
- [ ] Performance metrics within SLOs
- [ ] No error spikes detected
- [ ] User experience validated

### Post-Deployment
- [ ] 24-hour monitoring period completed
- [ ] Performance trends analyzed
- [ ] User feedback reviewed
- [ ] Documentation updated
- [ ] Team notified of successful deployment

---

**📖 Runbook Version:** 2.1.0  
**Last Updated:** September 25, 2025  
**Next Review:** December 25, 2025  
**Owner:** AstralField Engineering Team  

*This runbook is a living document. Updates and improvements are tracked via GitHub issues and team retrospectives.*