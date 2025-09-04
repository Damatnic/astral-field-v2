# 🛡️ Astral Field Project Standards

> **CRITICAL**: These standards MUST be followed by ANY AI agent working on this project. Violating these standards can break production deployments, expose sensitive data, or compromise user security.

## 🚨 SECURITY FIRST - NON-NEGOTIABLE RULES

### 🔐 Environment Variables & Secrets
- **NEVER** commit API keys, passwords, or secrets to the repository
- **ALWAYS** use `.env.local` for local development (never commit this file)
- **ONLY** update `.env.example` with new variable templates (using placeholder values)
- **NEVER** log or expose environment variables in code
- **ALWAYS** use server-side environment variables for sensitive data (no `NEXT_PUBLIC_` prefix)

### 📁 File Security
```bash
# ✅ SAFE FILES TO COMMIT
.env.example (template only)
src/**/*.ts
src/**/*.tsx
public/**/*

# ❌ NEVER COMMIT THESE
.env.local
.env.production
.env
*.key
*.pem
credentials.json
```

## 🏗️ CODE ARCHITECTURE STANDARDS

### 📂 File Structure - DO NOT BREAK
```
src/
├── app/                    # Next.js App Router pages
├── components/            
│   ├── features/          # Feature-specific components
│   └── ui/                # Reusable UI components
├── services/              # Business logic & API calls
│   ├── ai/                # AI-related services
│   ├── api/               # External API integrations
│   └── external/          # Third-party services
├── stores/                # Zustand state management
├── types/                 # TypeScript type definitions
└── lib/                   # Utilities & configuration
```

### 🎯 Component Standards

#### ✅ DO: Follow Existing Patterns
```typescript
// ✅ CORRECT: Follow existing component structure
'use client'

import React from 'react'
import { useStore } from '@/stores/exampleStore'
import { ExampleService } from '@/services/api/exampleService'

interface ExampleComponentProps {
  id: string
  variant?: 'primary' | 'secondary'
}

export function ExampleComponent({ id, variant = 'primary' }: ExampleComponentProps) {
  // Component logic here
  return <div>Component content</div>
}
```

#### ❌ DON'T: Break Patterns
```typescript
// ❌ WRONG: Don't use default exports for components
export default function BadComponent() { }

// ❌ WRONG: Don't import React as default
import React from 'react'

// ❌ WRONG: Don't use inline styles
<div style={{ color: 'red' }}>Bad</div>
```

### 🔄 State Management Rules

#### ✅ Use Zustand Stores
```typescript
// ✅ CORRECT: Follow existing store pattern
import { create } from 'zustand'

interface ExampleState {
  items: Item[]
  loading: boolean
  addItem: (item: Item) => void
  fetchItems: () => Promise<void>
}

export const useExampleStore = create<ExampleState>((set, get) => ({
  items: [],
  loading: false,
  addItem: (item) => set(state => ({ items: [...state.items, item] })),
  fetchItems: async () => {
    set({ loading: true })
    // API call logic
    set({ loading: false })
  }
}))
```

## 🔌 API INTEGRATION STANDARDS

### 🏈 SportsDataIO Integration
```typescript
// ✅ ALWAYS use the existing sportsDataService
import { sportsDataService } from '@/services/external/sportsDataService'

// ✅ NEVER expose API keys in client-side code
const data = await sportsDataService.getPlayers() // Uses secure proxy

// ❌ NEVER make direct API calls with exposed keys
const response = await fetch(`https://api.sportsdata.io/v3/nfl/players?key=${API_KEY}`)
```

### 🤖 AI Services Pattern
```typescript
// ✅ FOLLOW: Existing AI service patterns
export class ExampleAIService {
  private static instance: ExampleAIService
  
  public static getInstance(): ExampleAIService {
    if (!this.instance) {
      this.instance = new ExampleAIService()
    }
    return this.instance
  }
  
  async processQuery(query: string): Promise<Response> {
    // Service logic using environment variables securely
  }
}
```

## 🎨 UI/UX STANDARDS

### 🎯 Design System
- **ALWAYS** use existing Tailwind classes and design tokens
- **MAINTAIN** consistent spacing: `p-4`, `m-6`, `gap-3`
- **USE** existing color palette: `bg-gray-900`, `text-white`, `accent-blue-600`
- **FOLLOW** responsive patterns: mobile-first with `sm:`, `md:`, `lg:` breakpoints

### ♿ Accessibility Requirements
```typescript
// ✅ ALWAYS include proper accessibility
<button
  aria-label="Submit draft pick"
  className="focus:ring-2 focus:ring-blue-500"
  disabled={loading}
>
  {loading ? 'Submitting...' : 'Submit Pick'}
</button>
```

## 🗄️ DATABASE STANDARDS

### 📊 Supabase Integration
```typescript
// ✅ ALWAYS use the configured Supabase client
import { supabase } from '@/lib/supabase'

// ✅ FOLLOW: Existing query patterns
const { data, error } = await supabase
  .from('leagues')
  .select('*')
  .eq('owner_id', userId)

if (error) {
  console.error('Database error:', error.message)
  throw new Error('Failed to fetch leagues')
}
```

### 🔒 Row Level Security (RLS)
- **NEVER** bypass RLS policies
- **ALWAYS** filter by user ownership
- **USE** existing helper functions for auth checks

## 🧪 TESTING REQUIREMENTS

### ✅ Required Tests for New Features
```typescript
// ✅ Unit tests for services
describe('ExampleService', () => {
  it('should handle API calls correctly', async () => {
    // Test implementation
  })
})

// ✅ Component tests
describe('ExampleComponent', () => {
  it('should render correctly', () => {
    // Test implementation
  })
})
```

### 🎭 E2E Test Requirements
- **ALWAYS** add Playwright tests for new user flows
- **TEST** critical paths: draft, trades, roster management
- **MOCK** external API calls in tests

## 🚀 DEPLOYMENT STANDARDS

### 📦 Build Requirements
Before ANY commit:
```bash
npm run type-check  # ✅ Must pass
npm run lint        # ✅ Must pass  
npm run test        # ✅ Must pass
npm run build       # ✅ Must succeed
```

### 🌐 Production Checklist
- [ ] Environment variables properly configured
- [ ] No console.log statements in production code
- [ ] Error boundaries implemented for new features
- [ ] Loading states and error handling
- [ ] Mobile responsive design
- [ ] Accessibility compliance (WCAG 2.1 AA)

## 🔧 MODIFICATION GUIDELINES

### ✅ SAFE MODIFICATIONS
- Adding new components following existing patterns
- Extending existing services with new methods
- Adding new routes following App Router conventions
- Creating new Zustand stores following existing patterns
- Adding new database migrations (with proper testing)

### ⚠️ DANGEROUS MODIFICATIONS (REQUIRES APPROVAL)
- Changing authentication logic
- Modifying database schema
- Updating core configuration files (next.config.ts, netlify.toml)
- Changing API proxy configurations
- Modifying environment variable structure

### 🚫 FORBIDDEN MODIFICATIONS
- Breaking existing API contracts
- Removing security headers or configurations
- Exposing sensitive data or API keys
- Changing build or deployment configurations without testing
- Removing error boundaries or error handling
- Breaking responsive design or accessibility

## 📋 COMMIT STANDARDS

### ✅ Commit Message Format
```
type(scope): description

feat(draft): add AI-powered draft recommendations
fix(auth): resolve login redirect issue
docs(readme): update deployment instructions
refactor(api): optimize SportsDataIO service calls
test(draft): add unit tests for draft logic
```

### 🔍 Pre-Commit Checklist
- [ ] Code follows existing patterns and conventions
- [ ] All tests pass
- [ ] TypeScript compilation succeeds
- [ ] No sensitive data exposed
- [ ] Error handling implemented
- [ ] Loading states added for async operations
- [ ] Mobile responsive
- [ ] Accessible (ARIA labels, focus management)

## 🆘 EMERGENCY PROCEDURES

### 🔥 If You Break Something
1. **DON'T PANIC** - document the issue
2. **REVERT** the breaking changes immediately
3. **CHECK** CI/CD pipeline status
4. **TEST** the revert in development
5. **NOTIFY** about the incident and resolution

### 🛠️ Recovery Commands
```bash
git revert <commit-hash>  # Revert specific commit
git push --force-with-lease origin main  # Force push revert (emergency only)
npm run build  # Verify build works
```

## 📚 LEARNING RESOURCES

### 🔗 Essential Documentation
- **Next.js 15**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **SportsDataIO**: https://sportsdata.io/developers
- **TailwindCSS**: https://tailwindcss.com/docs
- **Zustand**: https://github.com/pmndrs/zustand

### 🎯 Project-Specific Patterns
- Study existing components in `src/components/features/`
- Review service patterns in `src/services/`
- Understand state management in `src/stores/`
- Follow database patterns in Supabase migrations

---

## ⚡ REMEMBER: WHEN IN DOUBT, ASK!

Better to ask questions than to break production. This project serves real users with fantasy football leagues - stability and security are paramount.

**The goal is to enhance, not break. Code defensively, test thoroughly, and maintain the high standards that make Astral Field the premier fantasy football platform.**