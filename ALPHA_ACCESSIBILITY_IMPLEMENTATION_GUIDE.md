# 🌟 Alpha: Accessibility Implementation Guide
## WCAG 2.1 AA Compliance for AstralField V3

**Priority**: CRITICAL - Immediate Implementation Required  
**Target**: WCAG 2.1 AA Compliance (4.5:1 contrast ratio, keyboard navigation, screen reader support)  
**Timeline**: 1-2 weeks for core implementation

---

## 🚨 Current Accessibility Gap Analysis

### Critical Issues Identified:
1. **Semantic HTML**: Limited use of proper HTML5 semantic elements
2. **ARIA Attributes**: Missing accessibility labels and descriptions
3. **Keyboard Navigation**: Incomplete tab order and focus management
4. **Color Contrast**: Some text combinations below WCAG standards
5. **Screen Reader Support**: Missing alternative text and descriptions

---

## 🎯 Implementation Plan

### Phase 1: Foundation (Days 1-3)

#### 1.1 Semantic HTML Structure
```jsx
// Before: Generic divs
<div className="navigation">
  <div className="nav-item">Dashboard</div>
</div>

// After: Semantic HTML
<nav role="navigation" aria-label="Main navigation">
  <ul role="list">
    <li>
      <a href="/dashboard" aria-current="page">
        Dashboard
      </a>
    </li>
  </ul>
</nav>
```

#### 1.2 Enhanced Button Component
```jsx
// apps/web/src/components/ui/accessible-button.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  ariaLabel?: string
  ariaDescribedBy?: string
  loading?: boolean
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ className, variant, size, asChild = false, ariaLabel, ariaDescribedBy, loading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <span className="mr-2" aria-hidden="true">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </span>
        )}
        {children}
      </button>
    )
  }
)
AccessibleButton.displayName = "AccessibleButton"

export { AccessibleButton, buttonVariants }
```

#### 1.3 Accessible Input Component
```jsx
// apps/web/src/components/ui/accessible-input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ className, type, label, error, helperText, required, id, ...props }, ref) => {
    const inputId = id || `input-${React.useId()}`
    const errorId = error ? `${inputId}-error` : undefined
    const helperId = helperText ? `${inputId}-helper` : undefined
    const describedBy = [errorId, helperId].filter(Boolean).join(' ')

    return (
      <div className="space-y-2">
        <label 
          htmlFor={inputId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-label="required">
              *
            </span>
          )}
        </label>
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        {helperText && (
          <p id={helperId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
AccessibleInput.displayName = "AccessibleInput"

export { AccessibleInput }
```

### Phase 2: Component Enhancement (Days 4-7)

#### 2.1 Accessible Player Card
```jsx
// apps/web/src/components/players/accessible-player-card.tsx
interface AccessiblePlayerCardProps {
  player: {
    id: string
    name: string
    position: string
    team: string
    projectedPoints: number
    status: 'active' | 'injured' | 'bye'
  }
  onSelect?: (playerId: string) => void
  selected?: boolean
}

export const AccessiblePlayerCard: React.FC<AccessiblePlayerCardProps> = ({
  player,
  onSelect,
  selected = false
}) => {
  const cardId = `player-card-${player.id}`
  const nameId = `player-name-${player.id}`
  const statsId = `player-stats-${player.id}`
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(player.id)
    }
  }

  const statusLabel = {
    active: 'Active player',
    injured: 'Injured player',
    bye: 'Player on bye week'
  }[player.status]

  return (
    <article
      id={cardId}
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors hover:bg-accent focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        selected && "bg-accent border-primary"
      )}
      aria-labelledby={nameId}
      aria-describedby={statsId}
      aria-pressed={selected}
      onClick={() => onSelect?.(player.id)}
      onKeyDown={handleKeyDown}
    >
      <header className="flex items-center justify-between mb-2">
        <h3 id={nameId} className="font-semibold text-lg">
          {player.name}
        </h3>
        <span 
          className={cn(
            "px-2 py-1 text-xs rounded-full",
            player.status === 'active' && "bg-green-100 text-green-800",
            player.status === 'injured' && "bg-red-100 text-red-800",
            player.status === 'bye' && "bg-yellow-100 text-yellow-800"
          )}
          aria-label={statusLabel}
        >
          {player.status.toUpperCase()}
        </span>
      </header>
      
      <div id={statsId} className="space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="sr-only">Position:</span>
          {player.position} - {player.team}
        </p>
        <p>
          <span className="sr-only">Projected points:</span>
          Projected: {player.projectedPoints} pts
        </p>
      </div>
      
      <div className="sr-only">
        {selected ? 'Selected' : 'Not selected'}. 
        Press Enter or Space to {selected ? 'deselect' : 'select'} this player.
      </div>
    </article>
  )
}
```

#### 2.2 Accessible Navigation
```jsx
// apps/web/src/components/navigation/accessible-nav.tsx
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon?: React.ReactNode
  ariaLabel?: string
}

interface AccessibleNavProps {
  items: NavItem[]
  currentPath: string
}

export const AccessibleNav: React.FC<AccessibleNavProps> = ({ items, currentPath }) => {
  return (
    <nav role="navigation" aria-label="Main navigation">
      <ul role="list" className="flex space-x-4">
        {items.map((item) => {
          const isCurrent = currentPath === item.href
          
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isCurrent 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={item.ariaLabel || item.label}
              >
                {item.icon && (
                  <span className="mr-2" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

### Phase 3: Advanced Features (Days 8-10)

#### 3.1 Skip Links
```jsx
// apps/web/src/components/accessibility/skip-links.tsx
export const SkipLinks: React.FC = () => {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute top-0 left-0 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-br-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="absolute top-0 left-24 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-br-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to navigation
      </a>
    </div>
  )
}
```

#### 3.2 Focus Management Hook
```tsx
// apps/web/src/hooks/use-focus-management.ts
import { useEffect, useRef } from 'react'

export const useFocusManagement = () => {
  const previousFocus = useRef<HTMLElement | null>(null)

  const saveFocus = () => {
    previousFocus.current = document.activeElement as HTMLElement
  }

  const restoreFocus = () => {
    if (previousFocus.current) {
      previousFocus.current.focus()
    }
  }

  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
    }
  }

  const trapFocus = (containerRef: React.RefObject<HTMLElement>) => {
    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      const firstFocusable = focusableElements[0] as HTMLElement
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return

        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault()
            lastFocusable.focus()
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault()
            firstFocusable.focus()
          }
        }
      }

      container.addEventListener('keydown', handleTabKey)
      return () => container.removeEventListener('keydown', handleTabKey)
    }, [containerRef])
  }

  return {
    saveFocus,
    restoreFocus,
    focusElement,
    trapFocus
  }
}
```

#### 3.3 Live Regions for Dynamic Content
```jsx
// apps/web/src/components/accessibility/live-region.tsx
interface LiveRegionProps {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  politeness = 'polite',
  atomic = false,
  relevant = 'additions text'
}) => {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {children}
    </div>
  )
}

// Usage for live scoring updates
export const LiveScoreUpdate: React.FC<{ score: string }> = ({ score }) => {
  return (
    <LiveRegion politeness="polite">
      Score updated: {score}
    </LiveRegion>
  )
}
```

### Phase 4: Color Contrast & Visual Improvements (Days 11-14)

#### 4.1 WCAG AA Compliant Color Palette
```css
/* apps/web/src/app/globals.css - Add color contrast improvements */
:root {
  /* WCAG AA compliant colors (4.5:1 ratio) */
  --accessible-primary: hsl(210, 100%, 40%); /* #0066CC */
  --accessible-primary-foreground: hsl(0, 0%, 100%); /* #FFFFFF */
  
  --accessible-secondary: hsl(210, 25%, 25%); /* #303D4A */
  --accessible-secondary-foreground: hsl(0, 0%, 100%); /* #FFFFFF */
  
  --accessible-accent: hsl(210, 75%, 50%); /* #2080F0 */
  --accessible-accent-foreground: hsl(0, 0%, 100%); /* #FFFFFF */
  
  --accessible-muted: hsl(210, 15%, 35%); /* #4A545C */
  --accessible-muted-foreground: hsl(0, 0%, 95%); /* #F2F2F2 */
  
  /* Error states with proper contrast */
  --accessible-destructive: hsl(0, 70%, 35%); /* #CC3333 */
  --accessible-destructive-foreground: hsl(0, 0%, 100%); /* #FFFFFF */
  
  /* Success states */
  --accessible-success: hsl(120, 60%, 30%); /* #2D7D2D */
  --accessible-success-foreground: hsl(0, 0%, 100%); /* #FFFFFF */
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --accessible-primary: hsl(210, 100%, 25%);
    --accessible-accent: hsl(210, 100%, 30%);
    --accessible-muted: hsl(210, 20%, 20%);
  }
}

/* Focus indicators */
.focus-visible:focus-visible {
  outline: 3px solid var(--accessible-accent);
  outline-offset: 2px;
}

/* Text size adjustments for readability */
.text-accessible {
  font-size: max(16px, 1rem);
  line-height: 1.5;
}

/* Touch target improvements */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 🧪 Testing Strategy

### Automated Testing
```javascript
// apps/web/__tests__/accessibility/accessibility.test.js
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { PlayerCard } from '@/components/players/player-card'

expect.extend(toHaveNoViolations)

describe('Accessibility Tests', () => {
  test('PlayerCard should not have accessibility violations', async () => {
    const { container } = render(
      <PlayerCard
        player={{
          id: '1',
          name: 'Test Player',
          position: 'QB',
          team: 'TEST',
          projectedPoints: 15.5,
          status: 'active'
        }}
      />
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('should have proper keyboard navigation', () => {
    render(<PlayerCard />)
    const card = screen.getByRole('button')
    
    expect(card).toHaveAttribute('tabIndex', '0')
    expect(card).toHaveAttribute('aria-labelledby')
    expect(card).toHaveAttribute('aria-describedby')
  })
})
```

### Manual Testing Checklist
- [ ] **Screen Reader**: Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] **Keyboard Navigation**: Tab through entire interface
- [ ] **Color Contrast**: Use WebAIM Contrast Checker
- [ ] **Zoom Test**: 200% zoom should maintain usability
- [ ] **Focus Indicators**: All interactive elements show focus
- [ ] **Alternative Text**: All images have descriptive alt text

---

## 📊 Success Metrics

### Accessibility Compliance Targets
- **WCAG 2.1 AA Compliance**: 100%
- **Automated Testing**: 0 axe violations
- **Keyboard Navigation**: 100% keyboard accessible
- **Screen Reader**: Full compatibility with NVDA/JAWS/VoiceOver
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text

### Implementation Timeline
- **Days 1-3**: Foundation and semantic HTML
- **Days 4-7**: Component enhancement
- **Days 8-10**: Advanced accessibility features
- **Days 11-14**: Visual improvements and testing

---

## 🎯 Post-Implementation Validation

### Final Accessibility Audit
1. **Automated Tools**: Run axe-core, Lighthouse accessibility audit
2. **Manual Testing**: Complete keyboard and screen reader testing
3. **User Testing**: Test with actual users who rely on assistive technology
4. **Documentation**: Update component documentation with accessibility features

This comprehensive accessibility implementation will bring AstralField V3 to full WCAG 2.1 AA compliance, ensuring the platform is usable by all users regardless of their abilities or the assistive technologies they use.