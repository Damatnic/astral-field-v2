# AstralField v3.0 Design System

A comprehensive, production-ready design system built specifically for fantasy sports applications. Features zero placeholders, full TypeScript support, and complete accessibility compliance.

## ✨ Features

- 🎨 **Comprehensive Design Tokens** - Colors, typography, spacing, and more
- 🌙 **Dark/Light Mode** - Automatic system detection with manual override
- 🏈 **NFL Team Theming** - All 32 NFL team color schemes built-in
- ♿ **Accessibility First** - WCAG 2.1 AA compliant components
- 📱 **Responsive Design** - Mobile-first with comprehensive breakpoint system
- ⚡ **Tree Shakeable** - Import only what you need for optimal bundle size
- 🔧 **TypeScript Native** - Full type safety and IntelliSense support
- 🎯 **Fantasy Sports Optimized** - Specialized components for fantasy sports

## 🚀 Quick Start

```bash
npm install @astralfield/ui
```

```tsx
import { 
  ThemeProvider, 
  Container, 
  Heading, 
  Text, 
  Button,
  PlayerCard 
} from '@astralfield/ui';

function App() {
  return (
    <ThemeProvider defaultMode="system" defaultTeam="chiefs">
      <Container>
        <Heading>Welcome to AstralField</Heading>
        <Text>Your fantasy football command center.</Text>
        <Button variant="primary">Get Started</Button>
      </Container>
    </ThemeProvider>
  );
}
```

## 📚 Core Components

### Layout
- **Container** - Responsive container with consistent margins
- **Stack** - Vertical and horizontal spacing with gap control
- **Grid** - CSS Grid with auto-fit/fill and responsive columns
- **Flex** - Flexbox with comprehensive alignment options

### Typography
- **Heading** - Semantic headings (h1-h6) with size variants
- **Text** - Body text with semantic variants and utilities
- **Code** - Inline and block code with syntax highlighting
- **Quote** - Blockquotes, testimonials, and citations

### Forms
- **Button** - Primary, secondary, outline, and ghost variants
- **Input** - Text inputs with validation states
- **Select** - Custom select with search and multi-select
- **Checkbox/Radio** - Styled form controls with accessibility

### Data Display
- **Card** - Flexible card component with variants
- **Badge** - Status indicators and labels
- **Avatar** - User avatars with fallbacks
- **Table** - Sortable data tables with pagination

### Feedback
- **Alert** - Contextual messages and notifications
- **Toast** - Temporary notifications with actions
- **Progress** - Progress bars and loading states
- **Spinner** - Loading indicators

### Navigation
- **Breadcrumb** - Navigation breadcrumbs
- **Pagination** - Data pagination controls
- **Menu** - Dropdown and context menus
- **Tabs** - Tab navigation with keyboard support

### Overlays
- **Modal** - Accessible dialog overlays
- **Drawer** - Side panel overlays
- **Tooltip** - Contextual help tooltips
- **Popover** - Rich content overlays

### Charts
- **LineChart** - Time series and trend visualization
- **BarChart** - Categorical data comparison
- **AreaChart** - Filled line charts for cumulative data
- **PieChart** - Proportional data visualization

### Fantasy-Specific
- **PlayerCard** - Player information cards
- **TeamLogo** - NFL team logos with theming
- **StatTile** - Fantasy statistics display
- **MetricBadge** - Performance indicators
- **MiniGraph** - Compact trend visualizations

## 🎨 Design Tokens

### Colors
```tsx
import { colors, semanticColors } from '@astralfield/ui';

// Brand colors
colors.primary[500]    // #3b63ff
colors.secondary[500]  // #f07925

// Semantic colors
semanticColors.background.primary
semanticColors.text.primary
semanticColors.status.success
```

### Typography
```tsx
import { typography, fontSizes } from '@astralfield/ui';

// Typography scale
typography.heading.xl
typography.body.md
typography.fantasy.stat

// Font sizes
fontSizes.xs    // 0.75rem
fontSizes.base  // 1rem
fontSizes['4xl'] // 2.25rem
```

### Spacing
```tsx
import { spacing, semanticSpacing } from '@astralfield/ui';

// Spacing scale (4px/8px grid)
spacing[2]   // 0.5rem (8px)
spacing[4]   // 1rem (16px)
spacing[8]   // 2rem (32px)

// Semantic spacing
semanticSpacing.component.md
semanticSpacing.layout.lg
```

## 🌙 Theme System

### Basic Theme Usage
```tsx
import { ThemeProvider, useTheme } from '@astralfield/ui';

function App() {
  return (
    <ThemeProvider defaultMode="dark" defaultTeam="patriots">
      <YourApp />
    </ThemeProvider>
  );
}

function YourComponent() {
  const { mode, team, setMode, setTeam } = useTheme();
  
  return (
    <div>
      <button onClick={() => setMode('dark')}>Dark Mode</button>
      <button onClick={() => setTeam('chiefs')}>Go Chiefs!</button>
    </div>
  );
}
```

### Team Theming
```tsx
import { getAllTeams, getTeamColors } from '@astralfield/ui';

// Get all available teams
const teams = getAllTeams();

// Get specific team colors
const chiefsColors = getTeamColors('chiefs');
console.log(chiefsColors.primary); // '#e31837'
```

## 🎯 Fantasy Sports Components

### Player Card
```tsx
import { PlayerCard, FantasyPoints, PositionLabel } from '@astralfield/ui';

<PlayerCard>
  <PlayerCard.Header>
    <PlayerName>Josh Allen</PlayerName>
    <PositionLabel>QB</PositionLabel>
  </PlayerCard.Header>
  <PlayerCard.Stats>
    <FantasyPoints>24.5</FantasyPoints>
    <ProjectionText>Proj: 22.1</ProjectionText>
  </PlayerCard.Stats>
</PlayerCard>
```

### Team Logo
```tsx
import { TeamLogo } from '@astralfield/ui';

<TeamLogo team="chiefs" size="lg" />
<TeamLogo team="patriots" variant="helmet" />
```

## 🔧 Utility Functions

### Formatting
```tsx
import { 
  formatFantasyPoints, 
  formatPosition, 
  formatTeam,
  formatRecord 
} from '@astralfield/ui';

formatFantasyPoints(24.56)      // "24.6"
formatPosition('QB')            // "QB"
formatTeam('kansas city chiefs') // "KC"
formatRecord(10, 4, 1)          // "10-4-1"
```

### Validation
```tsx
import { 
  validateFantasyTeamName, 
  isValidPosition,
  isValidWeek 
} from '@astralfield/ui';

validateFantasyTeamName('My Team')  // { isValid: true }
isValidPosition('QB')               // true
isValidWeek(5)                      // true
```

## 🎮 Custom Hooks

### Theme Hook
```tsx
import { useTheme, useResolvedTheme } from '@astralfield/ui';

const { mode, team, setMode, setTeam } = useTheme();
const resolvedMode = useResolvedTheme(); // 'light' | 'dark'
```

### Media Query Hook
```tsx
import { useBreakpoints, useMediaQuery } from '@astralfield/ui';

const { isMobile, isDesktop } = useBreakpoints();
const isLarge = useMediaQuery('(min-width: 1024px)');
```

### Local Storage Hook
```tsx
import { useLocalStorage } from '@astralfield/ui';

const [favorites, setFavorites] = useLocalStorage('favorites', []);
```

### Clipboard Hook
```tsx
import { useFantasyClipboard } from '@astralfield/ui';

const { copyPlayerStats, copyLineup } = useFantasyClipboard();

copyPlayerStats({
  name: 'Josh Allen',
  position: 'QB',
  points: 24.5,
  projectedPoints: 22.1,
});
```

## 🎨 Customization

### Custom Theme
```tsx
import { createTeamTheme, lightTheme } from '@astralfield/ui';

const customTheme = createTeamTheme(lightTheme, 'chiefs');
```

### CSS Variables
```tsx
import { generateCSSVariables, applyCSSVariables } from '@astralfield/ui';

const variables = generateCSSVariables(customTheme);
applyCSSVariables(variables);
```

### Tailwind Integration
```js
// tailwind.config.js
import { generateTailwindConfig } from '@astralfield/ui/themes';

module.exports = {
  ...generateTailwindConfig(lightTheme),
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
};
```

## ♿ Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation** - Full keyboard support
- **Screen Reader Support** - Proper ARIA attributes
- **Focus Management** - Visible focus indicators
- **Color Contrast** - Minimum 4.5:1 contrast ratios
- **Reduced Motion** - Respects user preferences

## 📦 Bundle Size

The design system is fully tree-shakeable:

```tsx
// Only imports what you need
import { Button, Text } from '@astralfield/ui';

// Or import specific modules
import { Button } from '@astralfield/ui/forms';
import { colors } from '@astralfield/ui/tokens';
```

## 🤝 Contributing

This design system is built for the AstralField fantasy sports platform. For internal contributions:

1. Follow the established component patterns
2. Include comprehensive TypeScript types
3. Add accessibility attributes
4. Write documentation and examples
5. Test across all supported browsers

## 📄 License

Proprietary - AstralField Fantasy Sports Platform

---

Built with ❤️ for fantasy sports enthusiasts