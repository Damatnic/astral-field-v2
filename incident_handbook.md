# 🚨 AstralField v2.1 - Incident Response Handbook

**Version:** 2.1.0  
**Last Updated:** September 25, 2025  
**Environment:** Production Systems  
**Classification:** Critical Operations Manual  
**Emergency Contact:** ops-emergency@astralfield.com  

---

## 🎯 INCIDENT RESPONSE OVERVIEW

This handbook provides comprehensive procedures for responding to production incidents in AstralField v2.1. It covers detection, assessment, response, resolution, and post-incident analysis.

### Incident Classification System
- **P0 (Critical):** System completely down, data loss, security breach
- **P1 (High):** Major features broken, severe performance degradation
- **P2 (Medium):** Minor features impacted, moderate performance issues
- **P3 (Low):** Minor bugs, cosmetic issues, feature requests

### Response Time Objectives
- **P0:** 15 minutes (24/7 immediate response)
- **P1:** 1 hour (24/7 response)
- **P2:** 4 hours (business hours)
- **P3:** Next business day

---

## 🚨 IMMEDIATE RESPONSE PROCEDURES

### P0 CRITICAL INCIDENT RESPONSE

#### Phase 1: Detection & Alert (0-5 minutes)
```bash
# Automated detection triggers:
# - Health check failures
# - Error rate >5%
# - Response time >10s
# - Zero user activity for >10 minutes

# Manual verification commands:
curl -f https://astralfield.com/api/health || echo "SYSTEM DOWN"
curl -s https://astralfield.com/api/metrics/errors | jq '.errorRate'
curl -s https://astralfield.com/api/metrics/performance | jq '.responseTime.p95'
```

#### Phase 2: Immediate Stabilization (5-15 minutes)
```bash
# 1. ACTIVATE INCIDENT COMMANDER
# Primary: Development Team Lead
# Secondary: Senior Engineer

# 2. ENABLE EMERGENCY MODE
vercel env add EMERGENCY_MODE true
vercel env add MAINTENANCE_MODE true
vercel --prod

# 3. PRESERVE SYSTEM STATE
# Create immediate diagnostic snapshot
curl -s https://astralfield.com/api/admin/system-snapshot > incident_$(date +%Y%m%d_%H%M%S).json

# 4. IDENTIFY IMPACT SCOPE
curl -s https://astralfield.com/api/analytics/realtime | jq '.affectedUsers'
curl -s https://astralfield.com/api/metrics/performance | jq '.impactedEndpoints'
```

#### Phase 3: Investigation & Mitigation (15-45 minutes)
```bash
# PARALLEL INVESTIGATION TRACKS:

# Track 1: Recent Changes Analysis
git log --oneline -10
curl -s https://astralfield.com/api/admin/recent-deployments

# Track 2: System Health Analysis
curl -s https://astralfield.com/api/health/db | jq '.status'
curl -s https://astralfield.com/api/health/cache | jq '.status'
curl -s https://astralfield.com/api/errors/recent | jq '.errors[:10]'

# Track 3: External Dependencies
curl -f https://astralfield.com/api/espn/health
curl -f $DATABASE_URL -c "SELECT 1;" 2>/dev/null && echo "DB OK" || echo "DB FAILED"

# MITIGATION ACTIONS:
# If code-related: Immediate rollback
vercel rollback --yes

# If database-related: Enable read-only mode
vercel env add READ_ONLY_MODE true

# If cache-related: Clear and restart cache
curl -X POST https://astralfield.com/api/admin/cache-clear-all
```

---

## 🔥 INCIDENT RESPONSE PLAYBOOKS

### PLAYBOOK 1: System Completely Down

#### Symptoms
- Health check returning 5xx errors
- Zero user activity
- All API endpoints unresponsive

#### Response Steps
```bash
# Step 1: Immediate assessment (2 minutes)
curl -I https://astralfield.com  # Check if domain resolves
curl -f https://astralfield.com/api/health  # Check application

# Step 2: Platform-level checks (3 minutes)
# Check Vercel deployment status
vercel ls --prod
vercel inspect --prod

# Check DNS propagation
nslookup astralfield.com
dig astralfield.com

# Step 3: Emergency restoration (10 minutes)
# Option A: Rollback to last known good deployment
vercel rollback --yes

# Option B: Emergency redeploy from stable branch
git checkout stable
vercel --prod --force

# Step 4: Verify restoration
curl -f https://astralfield.com/api/health
curl -f https://astralfield.com/
```

#### Root Cause Investigation
```bash
# Check deployment logs
vercel logs --prod --since 1h

# Review recent commits
git log --oneline --since="2 hours ago"

# Database connectivity test
psql $DATABASE_URL -c "SELECT NOW();"

# External API dependencies
curl -f "https://api.espn.com/v1/sports/football/nfl"
```

---

### PLAYBOOK 2: High Error Rate (>5%)

#### Symptoms
- Error rate spike in monitoring
- User reports of failed actions
- Partial system functionality

#### Response Steps
```bash
# Step 1: Error pattern analysis (5 minutes)
curl -s https://astralfield.com/api/errors/analytics | jq '{
  errorRate: .errorRate,
  topErrors: .errors[:5],
  affectedEndpoints: .affectedEndpoints
}'

# Step 2: Identify error source
curl -s https://astralfield.com/api/errors/recent | jq '.errors[:10] | map({
  message: .message,
  endpoint: .url,
  count: .count
})'

# Step 3: Quick mitigation based on error type

# Database errors:
if [[ $(curl -s https://astralfield.com/api/health/db | jq '.status') != "\"healthy\"" ]]; then
  echo "Database issue detected"
  # Enable connection pool scaling
  vercel env add DATABASE_POOL_SIZE 50
  vercel --prod
fi

# Authentication errors:
if [[ $(curl -s https://astralfield.com/api/errors/analytics | jq '.authErrors') -gt 10 ]]; then
  echo "Auth system issue detected"
  # Clear auth cache and restart
  curl -X POST https://astralfield.com/api/admin/auth-cache-clear
fi

# External API errors:
if [[ $(curl -s https://astralfield.com/api/espn/health | jq '.status') != "\"ok\"" ]]; then
  echo "ESPN API issue detected"
  # Enable fallback mode
  vercel env add ESPN_FALLBACK_MODE true
  vercel --prod
fi
```

---

### PLAYBOOK 3: Performance Degradation

#### Symptoms
- Response times >5s p95
- User complaints of slow loading
- Timeout errors increasing

#### Response Steps
```bash
# Step 1: Performance analysis (5 minutes)
curl -s https://astralfield.com/api/metrics/performance | jq '{
  responseTime: .responseTime,
  slowEndpoints: .slowEndpoints[:5],
  systemLoad: .systemLoad
}'

# Step 2: Resource utilization check
curl -s https://astralfield.com/api/health/db | jq '{
  connectionPool: .connectionPool,
  slowQueries: .slowQueries[:3],
  loadAverage: .loadAverage
}'

# Step 3: Immediate optimization actions

# Database optimization:
psql $DATABASE_URL -c "SELECT pg_stat_reset();"  # Reset stats
psql $DATABASE_URL -c "VACUUM ANALYZE;"  # Optimize tables

# Cache optimization:
curl -X POST https://astralfield.com/api/admin/cache-warm  # Warm critical caches
redis-cli -u $REDIS_URL FLUSHDB  # Clear stale cache if hit rate <70%

# Connection scaling:
vercel env add DATABASE_POOL_SIZE 25
vercel env add CACHE_POOL_SIZE 15
vercel --prod

# Step 4: Monitor improvement
watch -n 30 'curl -s https://astralfield.com/api/metrics/performance | jq .responseTime.p95'
```

---

### PLAYBOOK 4: Security Incident

#### Symptoms
- Suspicious authentication attempts
- Unexpected data access patterns
- External security alerts

#### Response Steps
```bash
# Step 1: IMMEDIATE LOCKDOWN (2 minutes)
vercel env add SECURITY_LOCKDOWN true
vercel env add ENHANCED_LOGGING true
vercel --prod

# Step 2: Evidence preservation (5 minutes)
curl -s https://astralfield.com/api/admin/security-snapshot > security_incident_$(date +%Y%m%d_%H%M%S).json

# Step 3: Threat assessment
curl -s https://astralfield.com/api/auth/security-report | jq '{
  suspiciousLogins: .suspiciousLogins,
  failedAttempts: .failedAttempts,
  anomalousActivity: .anomalousActivity
}'

# Step 4: Containment actions

# Force logout all users
curl -X POST https://astralfield.com/api/admin/force-logout-all

# Disable compromised accounts (if identified)
curl -X POST https://astralfield.com/api/admin/disable-user \
  -H "Content-Type: application/json" \
  -d '{"userId": "COMPROMISED_USER_ID", "reason": "security_incident"}'

# Enable IP blocking for suspicious sources
curl -X POST https://astralfield.com/api/admin/block-ip \
  -H "Content-Type: application/json" \
  -d '{"ip": "SUSPICIOUS_IP", "duration": 3600}'
```

---

### PLAYBOOK 5: Database Issues

#### Symptoms
- Database connection failures
- Query timeouts
- Data inconsistency reports

#### Response Steps
```bash
# Step 1: Database health assessment (3 minutes)
curl -s https://astralfield.com/api/health/db | jq '{
  status: .status,
  connections: .connections,
  responseTime: .responseTime,
  errorCount: .errorCount
}'

# Direct database connection test
psql $DATABASE_URL -c "SELECT NOW(), version();" || echo "DB CONNECTION FAILED"

# Step 2: Connection pool management
# Check current connections
psql $DATABASE_URL -c "
SELECT count(*) as total_connections,
       count(*) FILTER (WHERE state = 'active') as active,
       count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;"

# Kill long-running queries if necessary
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND query NOT LIKE '%pg_stat_activity%';"

# Step 3: Emergency scaling
vercel env add DATABASE_POOL_SIZE 40
vercel env add DATABASE_STATEMENT_TIMEOUT 30000
vercel --prod

# Step 4: Backup verification
# Ensure latest backup is available for emergency restore
curl -s "https://api.neon.tech/v2/projects/$NEON_PROJECT_ID/branches/main/backups" | jq '.backups[0]'
```

---

## 📊 MONITORING & DETECTION

### Automated Alert Triggers

#### Critical Alerts (P0/P1)
```bash
# Health check failures
curl -f https://astralfield.com/api/health || TRIGGER_P0_ALERT

# Error rate threshold
ERROR_RATE=$(curl -s https://astralfield.com/api/metrics/errors | jq '.errorRate')
if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
  TRIGGER_P1_ALERT
fi

# Response time degradation
RESPONSE_TIME=$(curl -s https://astralfield.com/api/metrics/performance | jq '.responseTime.p95')
if (( $(echo "$RESPONSE_TIME > 5000" | bc -l) )); then
  TRIGGER_P1_ALERT
fi

# Database connectivity
curl -s https://astralfield.com/api/health/db | jq '.status' | grep -q "healthy" || TRIGGER_P0_ALERT
```

#### Warning Alerts (P2/P3)
```bash
# Performance degradation
RESPONSE_TIME=$(curl -s https://astralfield.com/api/metrics/performance | jq '.responseTime.p95')
if (( $(echo "$RESPONSE_TIME > 2000" | bc -l) )); then
  TRIGGER_P2_ALERT
fi

# Cache performance
CACHE_HIT_RATE=$(curl -s https://astralfield.com/api/health/cache | jq '.hitRate')
if (( $(echo "$CACHE_HIT_RATE < 0.85" | bc -l) )); then
  TRIGGER_P2_ALERT
fi

# Unusual traffic patterns
ACTIVE_USERS=$(curl -s https://astralfield.com/api/analytics/realtime | jq '.activeUsers')
if (( $(echo "$ACTIVE_USERS > 1000" | bc -l) )); then
  TRIGGER_P2_ALERT  # Potential DDoS or viral growth
fi
```

### Manual Monitoring Commands

#### System Health Dashboard
```bash
# Create real-time monitoring dashboard
watch -n 10 '
echo "=== AstralField System Status ===="
echo "Timestamp: $(date)"
echo ""
echo "Health Status:"
curl -s https://astralfield.com/api/health | jq "."
echo ""
echo "Performance Metrics:"
curl -s https://astralfield.com/api/metrics/performance | jq "{responseTime, errorRate, activeUsers}"
echo ""
echo "Database Status:"
curl -s https://astralfield.com/api/health/db | jq "{status, connections, responseTime}"
echo ""
echo "Recent Errors:"
curl -s https://astralfield.com/api/errors/recent | jq ".errors[:3]"
'
```

---

## 🔄 ESCALATION PROCEDURES

### Escalation Matrix

#### P0 (Critical) Escalation Path
1. **Immediate (0-15 minutes):**
   - On-call engineer receives alert
   - Incident Commander activated
   - Begin immediate response procedures

2. **15-30 minutes:**
   - Engineering Manager notified
   - Additional engineering resources called in
   - Customer communication initiated

3. **30-60 minutes:**
   - CTO notified if not resolved
   - External vendor escalation if needed
   - Legal/compliance team notified for security incidents

#### P1 (High) Escalation Path
1. **0-1 hour:** On-call engineer response
2. **1-2 hours:** Team Lead involvement
3. **4+ hours:** Engineering Manager escalation

### Communication Protocols

#### Internal Communication
```bash
# Slack notifications (automated)
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "channel": "#production-alerts",
    "username": "AstralField-Bot",
    "text": "🚨 P0 INCIDENT: System Down - Response team activated",
    "icon_emoji": ":warning:"
  }'

# Email notifications for critical incidents
curl -X POST https://astralfield.com/api/admin/send-incident-notification \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "P0",
    "title": "Production System Down",
    "description": "Health checks failing across all endpoints",
    "timestamp": "'$(date -Iseconds)'"
  }'
```

#### External Communication (Customer-Facing)
```bash
# Status page update
curl -X POST https://api.statuspage.io/pages/YOUR_PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {
      "name": "Service Degradation",
      "status": "investigating",
      "message": "We are investigating reports of slow loading times."
    }
  }'

# Social media notification (for major outages)
# Twitter/X announcement prepared for P0 incidents
```

---

## 📋 POST-INCIDENT PROCEDURES

### Immediate Post-Resolution (0-2 hours)

#### System Verification
```bash
# Comprehensive system health check
curl -f https://astralfield.com/api/health
curl -f https://astralfield.com/api/health/db
curl -f https://astralfield.com/api/health/cache

# Performance validation
./scripts/load_test.ps1 -Duration "30s" -VUs 10

# User experience validation
curl -f https://astralfield.com/api/leagues
curl -f https://astralfield.com/api/draft
curl -f https://astralfield.com/api/auth/session
```

#### Monitoring Period
```bash
# Enhanced monitoring for 2 hours post-resolution
watch -n 60 '
echo "Post-Incident Monitoring - $(date)"
curl -s https://astralfield.com/api/metrics/performance | jq "{responseTime, errorRate}"
curl -s https://astralfield.com/api/metrics/errors | jq ".errorRate"
curl -s https://astralfield.com/api/analytics/realtime | jq ".activeUsers"
'
```

### Post-Incident Review (24-48 hours)

#### Data Collection
```bash
# Generate incident timeline
curl -s https://astralfield.com/api/admin/incident-timeline \
  -G -d "start=$(date -d '4 hours ago' -Iseconds)" \
  -d "end=$(date -Iseconds)" > incident_timeline.json

# Collect performance metrics
curl -s https://astralfield.com/api/metrics/incident-analysis \
  -G -d "incident_id=INC-$(date +%Y%m%d)" > incident_metrics.json

# Export relevant logs
curl -s https://astralfield.com/api/errors/incident-logs \
  -G -d "incident_id=INC-$(date +%Y%m%d)" > incident_logs.json
```

#### Root Cause Analysis Template
```markdown
# Post-Incident Review: INC-YYYYMMDD-001

## Incident Summary
- **Date/Time:** YYYY-MM-DD HH:MM UTC
- **Duration:** X hours Y minutes
- **Severity:** P0/P1/P2/P3
- **Impact:** X users affected, Y% service degradation

## Timeline
- **Detection:** Automated alert / User report
- **Response:** First responder action time
- **Mitigation:** Steps taken to reduce impact
- **Resolution:** Root cause fix implemented

## Root Cause
- **Primary Cause:** [Technical issue description]
- **Contributing Factors:** [System/process factors]
- **Detection Gap:** [Why wasn't this caught earlier]

## Action Items
- [ ] **Immediate:** Fix deployed and verified
- [ ] **Short-term:** Monitoring/alerting improvements
- [ ] **Long-term:** Architecture/process changes
```

---

## 🎓 INCIDENT RESPONSE TRAINING

### Required Training Modules
1. **Incident Classification:** Understanding P0-P3 severity levels
2. **Response Tools:** Command-line tools and monitoring dashboards
3. **Communication:** Internal and external communication protocols
4. **Documentation:** Incident logging and post-mortem procedures

### Regular Drills
- **Monthly:** P2 incident simulation
- **Quarterly:** P1 incident drill with full team
- **Semi-annually:** P0 disaster recovery exercise
- **Annually:** Security incident tabletop exercise

### Training Commands
```bash
# Practice incident response with test environment
export TEST_ENVIRONMENT="https://staging.astralfield.com"

# Simulate system health issues
curl -X POST $TEST_ENVIRONMENT/api/admin/simulate-incident \
  -H "Content-Type: application/json" \
  -d '{"type": "database_slowdown", "severity": "moderate"}'

# Practice monitoring and detection
curl -s $TEST_ENVIRONMENT/api/health | jq '.'
curl -s $TEST_ENVIRONMENT/api/metrics/performance | jq '.'

# Practice resolution procedures
curl -X POST $TEST_ENVIRONMENT/api/admin/resolve-simulation
```

---

## 🔧 TOOLS & RESOURCES

### Essential Commands Reference
```bash
# Quick system status
curl -f https://astralfield.com/api/health

# Performance check
curl -s https://astralfield.com/api/metrics/performance | jq '.summary'

# Error investigation
curl -s https://astralfield.com/api/errors/recent | jq '.errors[:5]'

# Database health
curl -s https://astralfield.com/api/health/db | jq '.'

# Emergency deployment rollback
vercel rollback --yes

# Clear all caches
curl -X POST https://astralfield.com/api/admin/cache-clear-all

# Force user logout (security)
curl -X POST https://astralfield.com/api/admin/force-logout-all
```

### Monitoring Dashboards
- **System Health:** https://astralfield.com/admin/dashboard
- **Error Tracking:** Sentry dashboard
- **Performance:** Vercel Analytics
- **Database:** Neon monitoring console
- **User Activity:** Real-time analytics dashboard

### External Resources
- **Vercel Status:** https://vercel-status.com
- **Neon Status:** https://neon.tech/status
- **ESPN API Status:** Monitor via health checks
- **CDN Status:** Vercel edge network status

---

## 🚨 EMERGENCY CONTACT INFORMATION

### On-Call Rotation
- **Primary Engineer:** +1-XXX-XXX-XXXX (SMS/Call)
- **Secondary Engineer:** +1-XXX-XXX-XXXX (SMS/Call)
- **Incident Commander:** +1-XXX-XXX-XXXX (Call only)
- **Engineering Manager:** +1-XXX-XXX-XXXX (Call only)

### External Contacts
- **Vercel Support:** support@vercel.com (Enterprise)
- **Neon Support:** support@neon.tech
- **DNS Provider:** [Provider support contact]
- **Security Vendor:** [Security partner contact]

### Communication Channels
- **Slack:** #production-incidents (primary)
- **Email:** incidents@astralfield.com
- **Phone Bridge:** [Conference line for P0 incidents]
- **Status Updates:** status.astralfield.com

---

## 📝 INCIDENT LOG TEMPLATE

```bash
# Incident logging command
curl -X POST https://astralfield.com/api/admin/incident-log \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "INC-'$(date +%Y%m%d-%H%M)'",
    "severity": "P1",
    "title": "High Error Rate on Authentication Endpoints",
    "description": "Error rate increased to 3.2% on /api/auth/* endpoints",
    "detected_at": "'$(date -Iseconds)'",
    "detected_by": "automated_monitoring",
    "responder": "on_call_engineer",
    "status": "investigating"
  }'
```

---

**📚 Handbook Version:** 2.1.0  
**Last Updated:** September 25, 2025  
**Next Review:** December 25, 2025  
**Emergency Hotline:** Available 24/7 for P0/P1 incidents  

*This handbook is tested regularly through incident drills and updated based on real-world incident learnings.*