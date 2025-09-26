# Guardian Security Deployment Guide

> **Bulletproof Security for Astral Field Player Login System**
> Enterprise-grade authentication security with zero-trust architecture

## 🛡️ Security Overview

The Guardian Security System provides comprehensive protection for the Astral Field player login system with:

- **Multi-layer Authentication Security**
- **Advanced Brute Force Prevention** 
- **Real-time Threat Detection**
- **Enterprise Password Hashing**
- **Session Security & Token Management**
- **Input Validation & Injection Prevention**
- **Rate Limiting & DDoS Protection**
- **CSRF & XSS Protection**

## 🚀 Quick Start

### 1. Environment Configuration

Add these required environment variables to your `.env` file:

```bash
# JWT Security
JWT_SECRET=your-super-secure-jwt-secret-at-least-64-characters-long
PASSWORD_PEPPER=your-additional-password-pepper-secret

# Session Security
SESSION_SECRET=your-session-secret-different-from-jwt
COOKIE_DOMAIN=.yourdomain.com  # Optional: for subdomain cookies

# Security Configuration
NODE_ENV=production  # or development
WEB_URL=https://your-frontend-domain.com
API_URL=https://your-api-domain.com

# Optional: Geo-blocking
BLOCKED_COUNTRIES=CN,RU,KP  # Comma-separated country codes

# Redis for security monitoring
REDIS_URL=redis://localhost:6379
```

### 2. Database Schema Updates

Ensure your User model includes these security fields:

```sql
-- Add security fields to users table
ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN registration_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN registration_user_agent TEXT;
```

### 3. Integration Example

```typescript
// apps/api/src/server.ts
import { getGuardianSecurity } from './config/guardian-security'
import { enhancedAuthRoutes } from './routes/auth-enhanced'

const app = express()
const guardian = getGuardianSecurity()

// Apply Guardian Security
guardian.applySecurityMiddleware(app)

// Configure CORS with security
app.use(cors(guardian.getCorsConfig()))

// Use enhanced auth routes
app.use('/api/auth', enhancedAuthRoutes)

// Protected routes
app.use('/api/protected', guardian.createProtectedRoute())
```

## 🔒 Security Features

### Authentication Security

✅ **Enhanced Password Hashing**
- bcrypt with 14 rounds (enterprise-grade)
- Server-side pepper for additional security
- Timing attack protection

✅ **Secure Token Management**
- JWT with enhanced claims and checksums
- Session binding and validation
- Automatic token rotation
- Secure blacklisting on logout

✅ **Multi-factor Session Security**
- Concurrent session limiting (max 3)
- Device fingerprinting
- IP and user agent tracking
- Session metadata and monitoring

### Brute Force Protection

✅ **Account Lockout System**
- Progressive lockout (5 attempts = 15 min, escalating)
- IP-based rate limiting
- Automatic security event logging

✅ **Advanced Rate Limiting**
- Authentication: 5 attempts per 15 minutes
- Registration: 3 per hour per IP
- API calls: 100 per 15 minutes (adaptive)
- Admin operations: 50 per hour

✅ **Real-time Threat Detection**
- Behavioral analysis and scoring
- Automatic IP blocking for persistent threats
- Geolocation-based blocking (optional)

### Input Security

✅ **Comprehensive Validation**
- SQL injection pattern detection
- XSS payload filtering
- Path traversal prevention
- Command injection blocking

✅ **Data Sanitization**
- DOMPurify integration
- Input length limits
- Character encoding validation
- Suspicious pattern detection

### Session & Cookie Security

✅ **Secure Cookie Configuration**
- HttpOnly, Secure, SameSite=Strict
- __Host- prefix in production
- Domain binding and path restrictions

✅ **CSRF Protection**
- Double-submit cookie pattern
- Token validation with session binding
- Automatic token rotation

## 📊 Security Monitoring

### Real-time Security Dashboard

```typescript
// Get security status
GET /api/auth/security-status

// Response:
{
  "security": {
    "activeSessions": [...],
    "totalSessions": 2,
    "maxAllowedSessions": 3,
    "currentSessionId": "abc123..."
  }
}
```

### Security Event Logging

All security events are automatically logged with:
- Event type and severity
- IP address and user agent
- User ID (if authenticated)
- Detailed event metadata
- Automatic alerting for critical events

### Security Metrics

```typescript
// Security metrics endpoint
GET /api/admin/security/metrics

// Metrics tracked:
- Total security events (24h/7d)
- Events by type and severity
- Top attacker IPs
- Blocked request count
- Critical security incidents
```

## 🧪 Security Testing

Run the comprehensive security test suite:

```bash
# Run Guardian security tests
npx tsx scripts/guardian-security-test.ts

# Expected output:
🛡️ Guardian Security Testing Suite
===================================

🔐 Testing Password Hashing Security...
✓ PASS Weak Password Rejection: Weak password "password" correctly rejected
✓ PASS Strong Password Acceptance: Strong password correctly accepted

🛡️ Testing Brute Force Protection...
✓ PASS Rate Limiting: Rate limit triggered after 5 attempts

💉 Testing SQL Injection Protection...
✓ PASS SQL Injection Protection: SQL injection payload correctly blocked

🔍 Testing XSS Protection...
✓ PASS XSS Protection: XSS payload correctly blocked

📊 Guardian Security Test Report
=====================================
Total Tests: 25
Passed: 25
Failed: 0
Success Rate: 100%

🏆 EXCELLENT: Your system has enterprise-grade security!
```

## 🚨 Security Alerts

### Critical Events (Immediate Response)
- SQL injection attempts
- XSS attack attempts
- Multiple brute force failures
- Token tampering detected
- Privilege escalation attempts

### High Priority Events
- Rate limit exceeded
- Account enumeration attempts
- Suspicious geographic activity
- Invalid token usage

### Monitoring Events
- Failed login attempts
- New device logins
- Concurrent session limits
- Password changes

## 🔧 Configuration Options

### Security Levels

**Development Mode:**
```typescript
const guardian = new GuardianSecurityManager({
  enableCSRF: false,
  enableGeoBlocking: false,
  enableRateLimiting: true,
  blockedCountries: []
})
```

**Production Mode:**
```typescript
const guardian = new GuardianSecurityManager({
  enableCSRF: true,
  enableGeoBlocking: true, // Optional
  enableRateLimiting: true,
  blockedCountries: ['CN', 'RU', 'KP'], // Optional
  trustProxy: true
})
```

### Rate Limiting Customization

```typescript
// Custom rate limits
const customRateLimit = rateLimiter.createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  keyGenerator: (req) => req.ip
})
```

## 🛠️ Advanced Security Features

### Adaptive Security
- Dynamic rate limiting based on threat level
- Behavioral scoring and risk assessment
- Automatic threat response escalation

### Compliance Features
- GDPR-compliant data handling
- Security audit logging
- Encryption at rest and in transit
- Data retention policies

### Performance Optimizations
- Redis-based session storage
- Efficient security checks
- Minimal performance impact
- Scalable architecture

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database schema updated
- [ ] Redis instance available
- [ ] SSL/TLS certificates installed
- [ ] Security testing completed

### Security Configuration
- [ ] JWT secrets are cryptographically secure (64+ chars)
- [ ] Password pepper is unique and secure
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are applied

### Monitoring Setup
- [ ] Security event logging enabled
- [ ] Alert thresholds configured
- [ ] Dashboard access configured
- [ ] Backup and recovery tested

### Post-Deployment
- [ ] Security tests pass
- [ ] Monitoring is active
- [ ] Performance metrics normal
- [ ] Security events being logged
- [ ] Alert system functional

## 🆘 Security Incident Response

### Immediate Actions
1. **Identify the threat type and severity**
2. **Check security monitoring dashboard**
3. **Review security event logs**
4. **Block malicious IPs if necessary**
5. **Assess impact and affected users**

### Investigation
1. **Collect security event data**
2. **Analyze attack patterns**
3. **Identify vulnerabilities**
4. **Document findings**

### Response
1. **Implement immediate protections**
2. **Notify affected users if needed**
3. **Update security configurations**
4. **Deploy patches if required**

### Recovery
1. **Verify security measures**
2. **Monitor for continued attacks**
3. **Update security documentation**
4. **Conduct post-incident review**

## 📞 Support

For security-related issues:

1. **Check the security logs**: `/api/admin/security/events`
2. **Review security metrics**: `/api/admin/security/metrics`
3. **Run security tests**: `npm run test:security`
4. **Check Guardian status**: `/api/auth/security-status`

## 🔄 Updates & Maintenance

### Regular Security Tasks
- **Weekly**: Review security event logs
- **Monthly**: Update dependencies and run security tests
- **Quarterly**: Security configuration review
- **Annually**: Full security audit

### Security Monitoring
- Monitor failed login attempts
- Track rate limiting effectiveness
- Review security event patterns
- Update threat detection rules

---

**Guardian Security System v1.0**  
*Bulletproof protection for Astral Field*

> "Trust Nothing, Verify Everything, Protect Always"
