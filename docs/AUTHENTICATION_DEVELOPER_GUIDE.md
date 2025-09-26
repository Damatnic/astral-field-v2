# AstralField Authentication Developer Guide
## Complete Implementation & Integration Guide

> **Comprehensive developer guide for implementing, extending, and troubleshooting the AstralField authentication system**

---

## 📋 Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Component Integration](#component-integration)
4. [Security Implementation](#security-implementation)
5. [Performance Optimization](#performance-optimization)
6. [Testing Strategies](#testing-strategies)
7. [Deployment Guide](#deployment-guide)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Advanced Topics](#advanced-topics)

---

## 🚀 Quick Start Guide

### Prerequisites

```bash
# Required versions
Node.js >= 18.0.0
npm >= 9.0.0
PostgreSQL >= 14.0
Redis >= 6.0 (optional but recommended)
```

### Environment Setup

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd astralfield
npm install

# 2. Set up environment variables
cp .env.example .env.local
```

#### Essential Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/astralfield"
DIRECT_URL="postgresql://user:password@localhost:5432/astralfield"

# Authentication
NEXTAUTH_SECRET="your-super-secure-secret-here-minimum-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Security (Guardian)
JWT_SECRET="your-jwt-secret-minimum-64-characters-for-production-security"
PASSWORD_PEPPER="your-additional-password-pepper-secret-different-from-jwt"
SESSION_SECRET="your-session-secret-different-from-others"

# Performance (Phoenix & Catalyst)
REDIS_URL="redis://localhost:6379"

# Optional: Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Database Setup

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Run migrations
npx prisma migrate deploy

# 3. Seed demo users (D'Amato Dynasty League)
npx prisma db seed
```

### Quick Development Start

```bash
# Start development server
npm run dev

# In another terminal - run Phoenix database optimization
npm run db:optimize

# Run comprehensive test suite
npm run test:auth
```

---

## 🏗️ Architecture Deep Dive

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │   BACKEND       │    │   DATABASE      │
│                 │    │                 │    │                 │
│ • SignIn Form   │───▶│ • NextAuth.js   │───▶│ • Neon Postgres │
│ • Quick Login   │    │ • Auth Config   │    │ • Phoenix Index │
│ • Session Mgmt  │    │ • Middleware    │    │ • User Schema   │
│ • Error Handler │    │ • Security      │    │ • Session Store │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SECURITY      │    │   PERFORMANCE   │    │   MONITORING    │
│                 │    │                 │    │                 │
│ • Guardian      │    │ • Catalyst      │    │ • Zenith Tests  │
│ • Rate Limiting │    │ • Cache Layers  │    │ • Audit Logs    │
│ • Audit Logging │    │ • Phoenix DB    │    │ • Metrics       │
│ • CSRF/XSS      │    │ • Optimization  │    │ • Health Checks │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Structure

```
apps/web/src/
├── app/
│   ├── api/auth/
│   │   ├── [...nextauth]/route.ts        # NextAuth.js handler
│   │   ├── verify-password/route.ts      # Catalyst password verification
│   │   ├── quick-login/route.ts          # Demo player quick login
│   │   └── verify-quick-login/route.ts   # Quick login verification
│   └── auth/
│       ├── signin/page.tsx               # Catalyst-optimized signin form
│       ├── signup/page.tsx               # User registration
│       └── error/page.tsx                # Error handling
├── lib/
│   ├── auth-config.ts                    # Main authentication configuration
│   ├── auth.ts                           # NextAuth.js setup
│   ├── middleware.ts                     # Route protection middleware
│   ├── security/                         # Guardian security components
│   │   ├── session-manager.ts            # Session management
│   │   ├── audit-logger.ts               # Security event logging
│   │   ├── account-protection.ts         # Account lockout protection
│   │   ├── rate-limiter.ts               # Rate limiting
│   │   └── security-headers.ts           # Security headers
│   └── cache-manager.ts                  # Catalyst multi-tier caching
└── components/auth/                      # Authentication UI components
```

---

## 🔧 Component Integration

### 1. **NextAuth.js Configuration**

The core authentication is built on NextAuth.js with custom optimizations:

```typescript
// lib/auth-config.ts
import { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // Guardian Security: Enhanced input validation
        if (!credentials?.email || !credentials?.password) {
          throw new Error('INVALID_CREDENTIALS')
        }

        // Catalyst Performance: Optimized user lookup with caching
        const email = (credentials.email as string).toLowerCase().trim()
        
        // Phoenix Database: Optimized query with selective fields
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            teamName: true,
            hashedPassword: true
          }
        })

        if (!user || !user.hashedPassword) {
          // Guardian Security: Timing attack prevention
          await new Promise(resolve => setTimeout(resolve, 100))
          throw new Error('INVALID_CREDENTIALS')
        }

        // Guardian Security: Account lockout check
        const lockoutStatus = await guardianAccountProtection.isAccountLocked(user.id)
        if (lockoutStatus.isLocked) {
          throw new Error(`ACCOUNT_LOCKED:${lockoutStatus.remainingTime || 0}`)
        }

        // Catalyst Performance: Cached password verification
        const isPasswordValid = await verifyPassword(
          credentials.password as string,
          user.hashedPassword
        )

        if (!isPasswordValid) {
          // Guardian Security: Record failed attempt
          await guardianAccountProtection.recordFailedAttempt(user.id, user.email)
          throw new Error('INVALID_CREDENTIALS')
        }

        // Guardian Security: Create secure session
        const sessionData = await guardianSessionManager.createSession({
          userId: user.id,
          email: user.email,
          ip: req?.headers?.get?.('x-forwarded-for') || 'unknown'
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamName: user.teamName,
          sessionId: sessionData.sessionId
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 60, // 30 minutes
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.sessionId = user.sessionId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.sessionId = token.sessionId as string
      }
      return session
    }
  }
} satisfies NextAuthConfig
```

### 2. **Frontend Integration**

#### SignIn Form Component

```typescript
// components/auth/signin-form.tsx
'use client'

import { useState, useCallback, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Catalyst Performance: Optimized submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    startTransition(async () => {
      try {
        const result = await signIn('credentials', {
          email: email.toLowerCase().trim(),
          password,
          redirect: false,
        })

        if (result?.error) {
          // Handle authentication errors
          console.error('Authentication failed:', result.error)
        } else {
          // Success - redirect to dashboard
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Login error:', error)
      } finally {
        setLoading(false)
      }
    })
  }, [email, password, router])

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button 
        type="submit" 
        disabled={loading || isPending}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  )
}
```

#### Protected Route Component

```typescript
// components/auth/protected-route.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRole = [], 
  fallback 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (requiredRole.length > 0 && session?.user?.role) {
      if (!requiredRole.includes(session.user.role)) {
        router.push('/unauthorized')
        return
      }
    }
  }, [session, status, router, requiredRole])

  if (status === 'loading') {
    return fallback || <div>Loading...</div>
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (requiredRole.length > 0 && session?.user?.role) {
    if (!requiredRole.includes(session.user.role)) {
      return null
    }
  }

  return <>{children}</>
}
```

### 3. **Middleware Configuration**

```typescript
// middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth(async (req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // Catalyst Performance: Optimized route matching
  const protectedPaths = new Set([
    '/dashboard', '/team', '/players', '/analytics'
  ])
  
  const isProtectedRoute = protectedPaths.has(nextUrl.pathname)

  // Guardian Security: Apply security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Redirect to signin if accessing protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname)
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${callbackUrl}`, nextUrl)
    )
  }

  return response
})

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

---

## 🛡️ Security Implementation

### 1. **Guardian Security Features**

#### Account Protection

```typescript
// lib/security/account-protection.ts
export class GuardianAccountProtection {
  private maxFailedAttempts = 5
  private lockoutDuration = 15 * 60 * 1000 // 15 minutes

  async isAccountLocked(userId: string): Promise<{
    isLocked: boolean
    remainingTime?: number
  }> {
    const lockoutData = await this.getLockoutData(userId)
    
    if (!lockoutData) {
      return { isLocked: false }
    }

    const now = Date.now()
    if (now > lockoutData.lockedUntil) {
      // Lockout expired, clear it
      await this.clearLockout(userId)
      return { isLocked: false }
    }

    return {
      isLocked: true,
      remainingTime: Math.ceil((lockoutData.lockedUntil - now) / 1000)
    }
  }

  async recordFailedAttempt(userId: string, email: string): Promise<{
    shouldLock: boolean
    lockoutDuration?: number
  }> {
    const attempts = await this.getFailedAttempts(userId)
    const newAttemptCount = attempts + 1

    await this.updateFailedAttempts(userId, newAttemptCount)

    if (newAttemptCount >= this.maxFailedAttempts) {
      await this.lockAccount(userId)
      
      // Log security event
      await guardianAuditLogger.logSecurityEvent(
        'ACCOUNT_LOCKED',
        userId,
        { email, attemptCount: newAttemptCount }
      )

      return {
        shouldLock: true,
        lockoutDuration: this.lockoutDuration / 1000
      }
    }

    return { shouldLock: false }
  }
}
```

#### Rate Limiting

```typescript
// lib/security/rate-limiter.ts
export class GuardianRateLimiter {
  private limits = {
    auth: { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
    api: { requests: 100, window: 15 * 60 * 1000 }  // 100 requests per 15 minutes
  }

  async checkRateLimit(
    identifier: string,
    type: 'auth' | 'api'
  ): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
  }> {
    const limit = this.limits[type]
    const window = Math.floor(Date.now() / limit.window)
    const key = `rate_limit:${type}:${identifier}:${window}`

    const current = await cacheManager.get(key) || 0
    const remaining = Math.max(0, limit.requests - current - 1)

    if (current >= limit.requests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: (window + 1) * limit.window
      }
    }

    // Increment counter
    await cacheManager.set(key, current + 1, limit.window / 1000)

    return {
      allowed: true,
      remaining,
      resetTime: (window + 1) * limit.window
    }
  }
}
```

### 2. **Security Headers**

```typescript
// lib/security/security-headers.ts
export const guardianSecurityHeaders = {
  generateHeaders: (isProduction: boolean) => ({
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...(isProduction && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'"
    })
  })
}
```

---

## ⚡ Performance Optimization

### 1. **Catalyst Frontend Optimizations**

#### Password Verification Caching

```typescript
// lib/cache/password-cache.ts
class PasswordVerificationCache {
  private cache = new Map<string, { result: boolean; timestamp: number }>()
  private readonly TTL = 30 * 1000 // 30 seconds

  generateKey(passwordHash: string, password: string): string {
    // Create secure key without storing actual password
    return `pwd_${passwordHash.slice(-12)}_${password.length}_${password.slice(0,2)}${password.slice(-2)}`
  }

  get(passwordHash: string, password: string): boolean | null {
    const key = this.generateKey(passwordHash, password)
    const cached = this.cache.get(key)

    if (!cached || Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return cached.result
  }

  set(passwordHash: string, password: string, result: boolean): void {
    const key = this.generateKey(passwordHash, password)
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    })

    // Cleanup old entries
    this.cleanup()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.cache.delete(key)
      }
    }
  }
}

export const passwordCache = new PasswordVerificationCache()
```

#### Optimized Password Verification

```typescript
// api/auth/verify-password/route.ts
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const startTime = Date.now()

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing credentials' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { hashedPassword: true }
    })

    if (!user?.hashedPassword) {
      return NextResponse.json(
        { success: false, valid: false },
        { status: 401 }
      )
    }

    // Check cache first (Catalyst optimization)
    const cachedResult = passwordCache.get(user.hashedPassword, password)
    if (cachedResult !== null) {
      return NextResponse.json({
        success: true,
        valid: cachedResult,
        performance: {
          verificationTime: Date.now() - startTime,
          cacheHit: true,
          method: 'cached_verification'
        }
      })
    }

    // Perform bcrypt verification
    const isValid = await bcrypt.compare(password, user.hashedPassword)
    
    // Cache result
    passwordCache.set(user.hashedPassword, password, isValid)

    return NextResponse.json({
      success: true,
      valid: isValid,
      performance: {
        verificationTime: Date.now() - startTime,
        cacheHit: false,
        method: 'bcrypt_verification'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    )
  }
}
```

### 2. **Phoenix Database Optimizations**

#### Optimized Database Queries

```sql
-- Create optimized indexes for authentication
CREATE INDEX CONCURRENTLY "idx_users_email_hash_lookup" 
ON "users" ("email") 
INCLUDE ("hashedPassword", "role", "id");

-- Session management optimization
CREATE INDEX CONCURRENTLY "idx_sessions_token_active" 
ON "sessions" ("sessionToken") 
WHERE "expires" > NOW();

-- Active user filtering
CREATE INDEX CONCURRENTLY "idx_users_auth_active" 
ON "users" ("email", "updatedAt") 
WHERE "hashedPassword" IS NOT NULL;
```

#### Connection Pool Configuration

```typescript
// lib/database/connection-pool.ts
export const databaseConfig = {
  maxConnections: process.env.NODE_ENV === 'production' ? 100 : 10,
  minConnections: 5,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 10000,
  
  // Query optimization
  statementTimeout: 5000,
  queryTimeout: 10000,
  
  // Connection retry logic
  retryOnFailure: true,
  maxRetries: 3,
  retryDelay: 1000
}
```

---

## 🧪 Testing Strategies

### 1. **Unit Testing**

```typescript
// __tests__/components/auth/signin-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SignInForm } from '@/components/auth/signin-form'

describe('SignInForm', () => {
  it('should render form elements', () => {
    render(<SignInForm />)
    
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    render(<SignInForm />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
    })
  })

  it('should handle successful login', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ error: null })
    jest.mock('next-auth/react', () => ({
      signIn: mockSignIn
    }))

    render(<SignInForm />)
    
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false
      })
    })
  })
})
```

### 2. **Integration Testing**

```typescript
// __tests__/integration/api/auth.integration.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/auth/verify-password/route'

describe('/api/auth/verify-password', () => {
  it('should verify valid credentials', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'correct-password'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.valid).toBe(true)
  })

  it('should reject invalid credentials', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'wrong-password'
      }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(false)
    expect(data.valid).toBe(false)
  })
})
```

### 3. **End-to-End Testing**

```typescript
// e2e/auth-comprehensive.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should complete full login journey', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/signin')
    
    // Fill in credentials
    await page.fill('[placeholder="Email"]', 'nicholas@damato-dynasty.com')
    await page.fill('[placeholder="Password"]', 'Dynasty2025!')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard')
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toContainText('Nicholas')
  })

  test('should handle quick login for demo users', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Click quick select
    await page.click('text=Quick Select')
    
    // Select a demo user
    await page.click('text=Nick Hartley')
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard')
    
    // Verify correct user logged in
    await expect(page.locator('[data-testid="team-name"]')).toContainText("Hartley's Heroes")
  })
})
```

### 4. **Performance Testing**

```typescript
// __tests__/performance/auth-performance.test.ts
import { performance } from 'perf_hooks'

describe('Authentication Performance', () => {
  it('should authenticate within performance thresholds', async () => {
    const startTime = performance.now()
    
    const response = await fetch('/api/auth/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test-password'
      })
    })
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(500) // Should complete within 500ms
    
    const data = await response.json()
    expect(data.performance.verificationTime).toBeLessThan(100) // Server processing < 100ms
  })

  it('should handle concurrent authentication requests', async () => {
    const concurrentRequests = 10
    const promises = Array.from({ length: concurrentRequests }, () =>
      fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test-password'
        })
      })
    )

    const results = await Promise.all(promises)
    
    // All requests should succeed
    results.forEach(response => {
      expect(response.status).toBe(200)
    })
  })
})
```

---

## 🚀 Deployment Guide

### 1. **Environment Configuration**

#### Production Environment Variables

```bash
# Production .env
NODE_ENV=production

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host.neon.tech:5432/astralfield?sslmode=require"
DIRECT_URL="postgresql://user:password@host.neon.tech:5432/astralfield?sslmode=require"

# Authentication
NEXTAUTH_SECRET="production-secret-minimum-64-characters-cryptographically-secure"
NEXTAUTH_URL="https://astralfield.com"

# Security
JWT_SECRET="production-jwt-secret-minimum-64-characters-different-from-nextauth"
PASSWORD_PEPPER="production-pepper-secret-different-from-jwt"
SESSION_SECRET="production-session-secret-unique"

# Performance
REDIS_URL="redis://production-redis:6379"

# Monitoring
LOG_LEVEL="info"
SENTRY_DSN="your-sentry-dsn"
```

### 2. **Vercel Deployment**

#### vercel.json Configuration

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "functions": {
    "app/api/auth/[...nextauth]/route.ts": {
      "maxDuration": 30
    },
    "app/api/auth/verify-password/route.ts": {
      "maxDuration": 10
    }
  },
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret",
    "JWT_SECRET": "@jwt-secret",
    "REDIS_URL": "@redis-url"
  }
}
```

### 3. **Database Migration**

```bash
# Production deployment script
#!/bin/bash

echo "🚀 Deploying AstralField Authentication System..."

# 1. Run database migrations
echo "📊 Running database migrations..."
npx prisma migrate deploy

# 2. Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# 3. Run Phoenix database optimization
echo "⚡ Optimizing database performance..."
npm run db:optimize

# 4. Seed demo users (if needed)
if [ "$SEED_DEMO_USERS" = "true" ]; then
    echo "👥 Seeding demo users..."
    npx prisma db seed
fi

# 5. Run health checks
echo "🏥 Running health checks..."
npm run health-check

# 6. Run security validation
echo "🛡️ Validating security configuration..."
npm run security:validate

echo "✅ Deployment complete!"
```

### 4. **Monitoring Setup**

```typescript
// lib/monitoring/health-check.ts
export async function runHealthCheck() {
  const checks = {
    database: await checkDatabaseHealth(),
    redis: await checkRedisHealth(),
    authentication: await checkAuthenticationHealth(),
    security: await checkSecurityHealth()
  }

  const overallHealth = Object.values(checks).every(check => check.healthy)

  return {
    healthy: overallHealth,
    timestamp: new Date().toISOString(),
    checks
  }
}

async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true, responseTime: '< 10ms' }
  } catch (error) {
    return { healthy: false, error: error.message }
  }
}

async function checkAuthenticationHealth() {
  try {
    // Test authentication endpoint
    const response = await fetch('/api/auth/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'health-check@test.com',
        password: 'test-password'
      })
    })

    return {
      healthy: response.status === 401, // Expected for non-existent user
      responseTime: '< 50ms'
    }
  } catch (error) {
    return { healthy: false, error: error.message }
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. **Authentication Failures**

**Problem**: Users cannot log in with correct credentials

**Diagnostic Steps**:
```bash
# Check authentication logs
tail -f logs/auth.log | grep ERROR

# Validate user in database
npm run auth:validate-user nicholas@damato-dynasty.com

# Test password verification
npm run auth:test-password nicholas@damato-dynasty.com Dynasty2025!

# Check database connectivity
npm run db:health-check
```

**Common Causes & Solutions**:
- **Password hash mismatch**: Re-hash passwords using the same bcrypt rounds (14)
- **Database connection issues**: Verify DATABASE_URL and connection pool settings
- **Cache inconsistency**: Clear password verification cache
- **Rate limiting**: Check if user/IP is rate limited

#### 2. **Session Issues**

**Problem**: Sessions expire too quickly or don't persist

**Diagnostic Steps**:
```bash
# Check session configuration
npm run auth:check-session-config

# Validate JWT tokens
npm run auth:validate-jwt

# Check Redis connectivity (if using Redis for sessions)
redis-cli ping

# Monitor session creation/destruction
npm run auth:monitor-sessions
```

**Solutions**:
- Verify `NEXTAUTH_SECRET` is set correctly
- Check session maxAge configuration
- Ensure cookies are being set with correct domain/path
- Validate Redis connection for session storage

#### 3. **Performance Issues**

**Problem**: Slow authentication responses

**Diagnostic Steps**:
```bash
# Monitor authentication performance
npm run perf:auth-monitor

# Check database query performance
npm run db:slow-queries

# Analyze cache hit rates
npm run cache:stats

# Monitor connection pool
npm run db:pool-status
```

**Solutions**:
- Enable Phoenix database optimizations
- Configure Catalyst caching properly
- Optimize database indexes
- Tune connection pool settings

#### 4. **Security Alerts**

**Problem**: High rate of failed login attempts or security events

**Diagnostic Steps**:
```bash
# Check security events
npm run security:events --last=24h

# Monitor rate limiting
npm run security:rate-limit-status

# Check account lockouts
npm run security:lockout-status

# Validate security headers
npm run security:headers-test
```

**Solutions**:
- Review Guardian security configurations
- Adjust rate limiting thresholds
- Implement additional CAPTCHA if needed
- Review and update security headers

#### 5. **Demo User Issues**

**Problem**: Quick login not working for D'Amato Dynasty League players

**Diagnostic Steps**:
```bash
# Verify demo users exist
npm run auth:check-demo-users

# Test quick login API
curl -X POST http://localhost:3000/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"email":"nick@damato-dynasty.com"}'

# Check quick login rate limits
npm run auth:quick-login-limits
```

**Solutions**:
- Re-seed demo users if missing
- Verify quick login API endpoints are working
- Check rate limiting for quick login
- Validate demo user passwords

### Debug Tools & Scripts

```bash
# Authentication debug toolkit
npm run auth:debug          # Complete auth system debug
npm run auth:test-all       # Run all authentication tests
npm run auth:performance    # Performance benchmarking
npm run auth:security-scan  # Security vulnerability scan
npm run auth:logs           # Tail authentication logs
npm run auth:metrics        # Show performance metrics
```

---

## 📋 Best Practices

### 1. **Security Best Practices**

- **Never log sensitive data**: Passwords, tokens, or personal information
- **Use environment variables**: For all secrets and configuration
- **Implement proper validation**: Client and server-side input validation
- **Regular security audits**: Run automated security scans
- **Monitor failed attempts**: Set up alerts for suspicious activity
- **Use HTTPS everywhere**: Ensure all authentication happens over HTTPS

### 2. **Performance Best Practices**

- **Enable caching**: Use Catalyst multi-layer caching for optimal performance
- **Optimize database queries**: Use Phoenix indexes and query optimization
- **Connection pooling**: Configure appropriate connection pool sizes
- **Monitor metrics**: Track authentication response times and success rates
- **Implement circuit breakers**: Fail fast when dependencies are down

### 3. **Development Best Practices**

- **Test-driven development**: Write tests before implementing features
- **Environment parity**: Keep development and production environments similar
- **Version control**: Use semantic versioning for authentication system changes
- **Documentation**: Keep documentation updated with code changes
- **Code reviews**: Require security-focused code reviews for auth changes

### 4. **Deployment Best Practices**

- **Blue-green deployments**: Use zero-downtime deployment strategies
- **Database migrations**: Test migrations thoroughly before production
- **Monitoring setup**: Implement comprehensive monitoring and alerting
- **Rollback procedures**: Have clear rollback procedures for failed deployments
- **Health checks**: Implement comprehensive health checks for all components

---

## 🔬 Advanced Topics

### 1. **Custom Authentication Providers**

```typescript
// lib/auth/custom-provider.ts
import { OAuthConfig } from "next-auth/providers"

export function CustomProvider<P extends Record<string, any> = {}>(
  options: OAuthConfig<P> & { customConfig?: any }
): OAuthConfig<P> {
  return {
    id: "custom",
    name: "Custom Provider",
    type: "oauth",
    authorization: {
      url: "https://custom-provider.com/oauth/authorize",
      params: {
        scope: "read:user user:email",
        response_type: "code",
      },
    },
    token: "https://custom-provider.com/oauth/token",
    userinfo: "https://custom-provider.com/api/user",
    profile(profile) {
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.avatar_url,
        role: profile.role || "user",
      }
    },
    ...options,
  }
}
```

### 2. **Multi-Factor Authentication (MFA)**

```typescript
// lib/auth/mfa.ts
export class MFAManager {
  async generateTOTPSecret(userId: string): Promise<string> {
    const secret = speakeasy.generateSecret({
      name: `AstralField (${userId})`,
      issuer: 'AstralField',
      length: 32
    })

    // Store secret in database
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret.base32 }
    })

    return secret.base32
  }

  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true }
    })

    if (!user?.totpSecret) {
      return false
    }

    return speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 1
    })
  }
}
```

### 3. **Advanced Session Management**

```typescript
// lib/auth/advanced-session.ts
export class AdvancedSessionManager {
  async createSession(sessionData: SessionData): Promise<Session> {
    const session = {
      id: crypto.randomUUID(),
      userId: sessionData.userId,
      deviceFingerprint: sessionData.deviceFingerprint,
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      location: await this.getLocation(sessionData.ipAddress),
      riskScore: await this.calculateRiskScore(sessionData),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      lastActivity: new Date()
    }

    // Store in Redis for fast access
    await redis.setex(
      `session:${session.id}`,
      1800, // 30 minutes
      JSON.stringify(session)
    )

    return session
  }

  private async calculateRiskScore(sessionData: SessionData): Promise<number> {
    let riskScore = 0.1 // Base risk

    // Check for new device
    const isKnownDevice = await this.isKnownDevice(
      sessionData.userId,
      sessionData.deviceFingerprint
    )
    if (!isKnownDevice) riskScore += 0.3

    // Check for unusual location
    const isUnusualLocation = await this.isUnusualLocation(
      sessionData.userId,
      sessionData.ipAddress
    )
    if (isUnusualLocation) riskScore += 0.2

    // Check time of day
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) riskScore += 0.1 // Unusual hours

    return Math.min(riskScore, 1.0)
  }
}
```

### 4. **Audit Logging & Compliance**

```typescript
// lib/auth/audit-logger.ts
export class AuditLogger {
  async logAuthEvent(
    eventType: string,
    userId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const auditLog = {
      id: crypto.randomUUID(),
      eventType,
      userId,
      timestamp: new Date(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      sessionId: metadata.sessionId,
      success: metadata.success,
      riskScore: metadata.riskScore,
      metadata: {
        location: metadata.location,
        deviceFingerprint: metadata.deviceFingerprint,
        additionalContext: metadata.additionalContext
      }
    }

    // Store in database for compliance
    await prisma.auditLog.create({
      data: auditLog
    })

    // Store in Elasticsearch for search and analytics
    await elasticsearch.index({
      index: 'audit-logs',
      body: auditLog
    })

    // Alert on high-risk events
    if (auditLog.riskScore > 0.7) {
      await this.sendSecurityAlert(auditLog)
    }
  }

  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    return {
      totalEvents: logs.length,
      successfulLogins: logs.filter(l => l.eventType === 'LOGIN_SUCCESS').length,
      failedLogins: logs.filter(l => l.eventType === 'LOGIN_FAILURE').length,
      securityIncidents: logs.filter(l => l.riskScore > 0.7).length,
      uniqueUsers: new Set(logs.map(l => l.userId)).size,
      periodStart: startDate,
      periodEnd: endDate
    }
  }
}
```

---

This comprehensive developer guide provides everything needed to implement, extend, and maintain the AstralField authentication system. For additional support or advanced customization, refer to the specific component documentation or reach out to the development team.

---

*Generated by Echo - Elite Project Analysis, Assessment & Documentation Expert*  
*"Illuminate the Unknown, Document the Complex, Elevate Understanding"*