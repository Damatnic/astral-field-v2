# AstralField Authentication System

A clean, production-ready authentication system for the AstralField fantasy football platform.

## Overview

This authentication system provides:
- Cookie-based sessions with secure configuration
- Role-based access control (Admin, Commissioner, Player)
- Rate limiting and CSRF protection
- Clean TypeScript interfaces
- Next.js 14 App Router compatibility

## Files Structure

```
src/
├── lib/
│   └── auth.ts                 # Main authentication logic
├── middleware.ts               # Route protection middleware
└── app/api/auth/
    ├── login/route.ts          # Login endpoint
    ├── logout/route.ts         # Logout endpoint
    └── me/route.ts             # Current user endpoint
```

## User Profiles

### Admins (2 users)
- **Alex Johnson** - alex.johnson@astralfield.com (admin123!)
- **Sarah Chen** - sarah.chen@astralfield.com (admin123!)

### Commissioners (2 users)  
- **Mike Wilson** - mike.wilson@league.com (comm123!)
- **Emily Davis** - emily.davis@league.com (comm123!)

### Players (6 users)
- **Chris Brown** - chris.brown@players.com (player123!)
- **Jessica Miller** - jessica.miller@players.com (player123!)
- **David Lee** - david.lee@players.com (player123!)
- **Amanda White** - amanda.white@players.com (player123!)
- **Ryan Taylor** - ryan.taylor@players.com (player123!)
- **Nicole Garcia** - nicole.garcia@players.com (player123!)

## API Endpoints

### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "alex.johnson@astralfield.com",
  "password": "admin123!"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "admin-001",
    "email": "alex.johnson@astralfield.com",
    "name": "Alex Johnson",
    "role": "admin",
    "avatar": "/api/avatars/alex-johnson.jpg",
    "lastLoginAt": "2024-12-15T..."
  },
  "message": "Login successful"
}
```

### POST /api/auth/logout
Logout and clear session.

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### GET /api/auth/me
Get current authenticated user.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "admin-001",
    "email": "alex.johnson@astralfield.com",
    "name": "Alex Johnson",
    "role": "admin",
    "avatar": "/api/avatars/alex-johnson.jpg",
    "createdAt": "2024-01-01T...",
    "lastLoginAt": "2024-12-15T..."
  }
}
```

## Route Protection

The middleware automatically protects routes based on patterns:

### Admin Only
- `/admin/*`
- `/api/admin/*`

### Commissioner+ Only
- `/leagues/[id]/commissioner/*`
- `/api/leagues/[id]/commissioner/*`
- `/api/leagues/create`
- `/api/leagues/[id]/settings`

### Authenticated Only
- `/dashboard`
- `/leagues/*`
- `/api/user/*`
- `/api/leagues/*`
- `/api/draft/*`
- `/api/players/*`

### Public Routes
- `/`
- `/login`
- `/register`
- `/api/auth/*`
- `/api/health`

## Security Features

### Cookie Configuration
- `httpOnly: true` - Prevents XSS access
- `secure: true` - HTTPS only in production
- `sameSite: 'strict'` - CSRF protection
- `maxAge: 7 days` - Session duration

### Rate Limiting
- 5 login attempts per 15 minutes per IP
- In production, use Redis for distributed rate limiting

### Input Validation
- Email format validation
- Input sanitization
- Type checking

### Session Management
- Automatic session cleanup
- Secure session ID generation
- Session expiration handling

## Usage Examples

### In API Routes
```typescript
import { getCurrentUser, requireRole } from '../../lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Use user.role, user.id, etc.
}
```

### With Middleware Headers
```typescript
import { getUserFromHeaders, requireRole } from '../../middleware';

export async function POST(request: NextRequest) {
  const user = requireRole(request, 'admin'); // Throws if not admin
  // Proceed with admin-only logic
}
```

### Role Checking
```typescript
import { hasPermission, canAccessRole } from '../../lib/auth';

// Check specific roles
if (hasPermission(user, ['admin', 'commissioner'])) {
  // Allow access
}

// Check role hierarchy
if (canAccessRole(user.role, 'commissioner')) {
  // User is commissioner or admin
}
```

## Production Considerations

### Database Integration
- Replace in-memory storage with database
- Use proper password hashing (bcrypt)
- Implement user registration

### Caching
- Use Redis for sessions
- Implement distributed rate limiting
- Cache user data

### Security Enhancements
- Add 2FA support
- Implement password reset
- Add audit logging
- Use environment variables for secrets

### Monitoring
- Add authentication metrics
- Log security events
- Monitor failed login attempts

## Environment Variables

```env
# Required for production
NODE_ENV=production
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL=your-database-url
REDIS_URL=your-redis-url
```