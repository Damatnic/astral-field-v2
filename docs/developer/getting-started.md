# Developer Getting Started Guide

## Overview

Welcome to the Astral Field V2.1 development team! This guide will help you set up your development environment, understand the codebase structure, and start contributing to the fantasy football platform.

## Prerequisites

### Required Software
- **Node.js 18+** - JavaScript runtime
- **npm 9+** - Package manager (comes with Node.js)
- **Git** - Version control
- **PostgreSQL 14+** - Database (or use Neon cloud)
- **Redis** - Caching (optional for development)
- **VS Code** - Recommended editor

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "esbenp.prettier-vscode",
    "ms-vscode.eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### Knowledge Requirements
- **TypeScript** - Primary language
- **React 18** - Frontend framework
- **Next.js 13** - Full-stack framework
- **Prisma** - Database ORM
- **Tailwind CSS** - Styling framework
- **PostgreSQL** - Database fundamentals

## Initial Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone <repository-url>
cd astral-field-v2.1

# Install dependencies
npm install

# Verify installation
npm run type-check
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

**Minimum required variables for development:**
```bash
# Database (use Neon free tier or local PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/astralfield_dev"

# Authentication secret (generate new one)
NEXTAUTH_SECRET="development-secret-change-this-32-chars-min"
NEXTAUTH_URL="http://localhost:3007"

# Optional: AI features (get free tier key)
ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# Development settings
NODE_ENV="development"
DEBUG="app:*"
LOG_LEVEL="debug"
```

### 3. Database Setup

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb astralfield_dev

# Create user
psql astralfield_dev -c "CREATE USER astralfield WITH PASSWORD 'password';"
psql astralfield_dev -c "GRANT ALL PRIVILEGES ON DATABASE astralfield_dev TO astralfield;"
```

#### Option B: Neon Cloud Database (Recommended)

1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string to `DATABASE_URL`

### 4. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed development data
npx prisma db seed

# Verify setup
npx prisma studio
```

### 5. Start Development Server

```bash
# Start development server
npm run dev

# Server will start on http://localhost:3007
```

### 6. Verify Setup

Visit http://localhost:3007 and:

1. **Check homepage loads** - Verify basic functionality
2. **Test authentication** - Try login with seeded users
3. **View database** - Use Prisma Studio to verify data
4. **Check API endpoints** - Visit `/api/health` for health check

## Codebase Structure

### Project Architecture

```
astral-field-v2.1/
├── docs/                    # Documentation
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma       # Database model definitions
│   ├── seed.ts            # Development data seeding
│   └── migrations/        # Database migration files
├── public/                 # Static assets
├── scripts/               # Utility scripts
├── src/                   # Source code
│   ├── app/              # Next.js 13 App Router
│   │   ├── (auth)/       # Route groups
│   │   ├── api/          # API route handlers
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Homepage
│   ├── components/       # React components
│   │   ├── ui/          # Base UI components
│   │   ├── forms/       # Form components
│   │   ├── dashboard/   # Dashboard widgets
│   │   ├── league/      # League management
│   │   ├── team/        # Team management
│   │   ├── player/      # Player components
│   │   ├── trade/       # Trading interface
│   │   └── draft/       # Draft room
│   ├── lib/             # Utility libraries
│   │   ├── auth.ts      # Authentication logic
│   │   ├── db.ts        # Database connection
│   │   ├── utils.ts     # Utility functions
│   │   └── validations.ts # Form validation
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript definitions
│   └── styles/          # Additional styles
├── __tests__/           # Test files
├── .env.example         # Environment template
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind CSS config
├── tsconfig.json        # TypeScript config
└── package.json         # Dependencies and scripts
```

### Key Directories

#### `/src/app` - Next.js App Router
- **Route groups** - Organize routes with `(groupName)`
- **API routes** - Backend endpoints in `/api` directory
- **Layouts** - Shared layouts for route groups
- **Pages** - Individual page components

#### `/src/components` - React Components
- **Modular architecture** - Small, reusable components
- **Feature-based organization** - Group by functionality
- **TypeScript props** - Strict type definitions
- **Accessible design** - ARIA compliance

#### `/src/lib` - Core Libraries
- **Authentication** - Session management and auth logic
- **Database** - Prisma client and query utilities
- **Validation** - Zod schemas for form validation
- **Utils** - Common utility functions

### Component Patterns

#### Base Component Structure

```typescript
// components/ui/button.tsx
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { ButtonHTMLAttributes, forwardRef } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

export { Button, buttonVariants }
```

#### Feature Component Example

```typescript
// components/team/TeamCard.tsx
import { Team, User } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TeamCardProps {
  team: Team & {
    owner: User
  }
  isCurrentUser?: boolean
}

export function TeamCard({ team, isCurrentUser = false }: TeamCardProps) {
  return (
    <Card className={cn('transition-all hover:shadow-lg', {
      'ring-2 ring-primary': isCurrentUser
    })}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {team.name}
          {isCurrentUser && <Badge variant="default">Your Team</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Owner: {team.owner.name}
          </p>
          <div className="flex justify-between text-sm">
            <span>Record: {team.wins}-{team.losses}</span>
            <span>Points: {team.pointsFor.toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push changes
git push origin feature/new-feature-name

# Create pull request via GitHub
```

### Commit Message Convention

Follow conventional commits:

```
feat: add new feature
fix: resolve bug
docs: update documentation
style: format code
refactor: improve code structure
test: add test cases
chore: update dependencies
```

### Code Quality Tools

#### ESLint Configuration

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

#### Prettier Configuration

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

#### TypeScript Checking

```bash
# Type check without building
npm run type-check

# Type check in watch mode
npm run type-check:watch
```

### Testing

#### Test Structure

```typescript
// __tests__/components/TeamCard.test.tsx
import { render, screen } from '@testing-library/react'
import { TeamCard } from '@/components/team/TeamCard'

const mockTeam = {
  id: 'team_1',
  name: 'Test Team',
  wins: 8,
  losses: 4,
  pointsFor: 1456.78,
  owner: {
    id: 'user_1',
    name: 'John Doe',
  },
}

describe('TeamCard', () => {
  it('renders team information correctly', () => {
    render(<TeamCard team={mockTeam} />)
    
    expect(screen.getByText('Test Team')).toBeInTheDocument()
    expect(screen.getByText('Owner: John Doe')).toBeInTheDocument()
    expect(screen.getByText('Record: 8-4')).toBeInTheDocument()
  })

  it('shows current user badge when appropriate', () => {
    render(<TeamCard team={mockTeam} isCurrentUser={true} />)
    
    expect(screen.getByText('Your Team')).toBeInTheDocument()
  })
})
```

#### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Database Development

#### Schema Changes

```bash
# After modifying schema.prisma
npx prisma db push         # Push changes to dev database
npx prisma generate        # Regenerate client
npx prisma migrate dev     # Create migration for production
```

#### Database Utilities

```bash
# View database in browser
npx prisma studio

# Reset database and reseed
npx prisma migrate reset

# Seed database with fresh data
npx prisma db seed
```

#### Query Examples

```typescript
// lib/queries/teams.ts
import { prisma } from '@/lib/db'

export async function getTeamWithRoster(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      roster: {
        include: {
          player: {
            select: {
              id: true,
              name: true,
              position: true,
              nflTeam: true,
              status: true,
            },
          },
        },
        orderBy: {
          rosterSlot: 'asc',
        },
      },
    },
  })
}
```

## API Development

### Creating API Routes

```typescript
// app/api/teams/[id]/route.ts
import { NextRequest } from 'next/server'
import { authenticateFromRequest } from '@/lib/auth'
import { getTeamWithRoster } from '@/lib/queries/teams'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().cuid(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await authenticateFromRequest(request)
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate parameters
    const { id } = paramsSchema.parse(params)

    // Fetch data
    const team = await getTeamWithRoster(id)
    if (!team) {
      return Response.json({ error: 'Team not found' }, { status: 404 })
    }

    return Response.json({ success: true, data: team })
  } catch (error) {
    console.error('API Error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### API Testing with curl

```bash
# Test API endpoints
curl -X GET http://localhost:3007/api/health

# Test authenticated endpoints
curl -X GET http://localhost:3007/api/teams/team_123 \
  -H "Authorization: Bearer <session-token>"
```

## Debugging

### Development Tools

#### VS Code Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Next.js: debug client-side",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

#### Database Debugging

```bash
# View query logs
DEBUG="prisma:query" npm run dev

# Analyze slow queries
npx prisma migrate dev --create-only
```

#### API Debugging

```typescript
// Enable detailed API logging
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('Request headers:', Object.fromEntries(request.headers))
  console.log('Request URL:', request.url)
  
  // Your API logic here
}
```

### Common Issues

#### Database Connection
```bash
# Check connection
npx prisma db pull

# Reset if corrupted
npx prisma migrate reset --force
```

#### TypeScript Errors
```bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
npx prisma generate

# Check types
npm run type-check
```

## Best Practices

### Code Organization
- **Feature-based structure** - Group related components
- **Small, focused components** - Single responsibility
- **Consistent naming** - Use descriptive names
- **Export conventions** - Named exports for components

### Performance
- **Server components by default** - Use client components only when needed
- **Optimize images** - Use Next.js Image component
- **Lazy loading** - Load components on demand
- **Memoization** - Use React.memo for expensive components

### Security
- **Input validation** - Validate all inputs with Zod
- **Authentication checks** - Protect all API routes
- **SQL injection prevention** - Use Prisma ORM
- **Environment variables** - Never commit secrets

### Accessibility
- **Semantic HTML** - Use proper HTML elements
- **ARIA labels** - Add accessibility attributes
- **Keyboard navigation** - Support keyboard-only users
- **Color contrast** - Ensure sufficient contrast

## Getting Help

### Resources
- **Documentation** - Check `/docs` folder
- **Component Library** - Browse `/src/components/ui`
- **API Reference** - See `/docs/technical/api-reference.md`
- **Database Schema** - Review `/prisma/schema.prisma`

### Troubleshooting Steps
1. Check console for errors
2. Verify environment variables
3. Test database connection
4. Check API endpoints
5. Review recent changes
6. Ask team for help

### Team Communication
- **Daily standups** - Share progress and blockers
- **Code reviews** - Learn from team feedback
- **Documentation** - Keep docs updated
- **Knowledge sharing** - Share learnings with team

Welcome to the team! Start with small changes to get familiar with the codebase, then gradually take on larger features as you become more comfortable with the architecture and patterns.